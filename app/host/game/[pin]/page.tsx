"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  subscribeToGame,
  subscribeToPlayers,
  startGame,
  nextQuestion,
  showResults,
  endGame,
  kickPlayer,
  computeLeaderboard,
  computeAnalytics,
} from "@/lib/gameEngine";
import { getAdminSession } from "@/lib/adminAuth";
import type { Game, Player } from "@/types/game";
import allQuestions from "@/data/questions/graphs_coordinates.json";
import CircularTimer from "@/components/game/CircularTimer";
import Leaderboard from "@/components/game/Leaderboard";
import CoordinatePlane from "@/components/game/CoordinatePlane";
import toast from "react-hot-toast";

export default function HostGamePage() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [view, setView] = useState<"lobby" | "game" | "analytics">("lobby");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [resultsCountdown, setResultsCountdown] = useState(6);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resultsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextFiredRef = useRef(false);

  useEffect(() => {
    if (!pin) return;
    const hostId = localStorage.getItem(`cogradHost_${pin}`);
    setIsHost(!!hostId);

    const unsub1 = subscribeToGame(pin, setGame);
    const unsub2 = subscribeToPlayers(pin, setPlayers);
    return () => {
      unsub1();
      unsub2();
    };
  }, [pin]);

  const activePlayers = Object.values(players).filter((p) => !p.kicked);
  const currentQ =
    game && game.currentQuestion >= 0
      ? (allQuestions as any[]).find((q) => q.id === game.settings.questionIds[game.currentQuestion])
      : null;
  const answeredCount = currentQ
    ? activePlayers.filter((p) => p.answers?.[currentQ.id]).length
    : 0;

  // Advance from question to results
  const handleShowResults = useCallback(async () => {
    if (!game) return;
    await showResults(pin);
  }, [game, pin]);

  // Advance from results to next question or end
  const handleGoToNextQuestion = useCallback(async () => {
    if (!game) return;
    if (resultsTimerRef.current) clearInterval(resultsTimerRef.current);
    const nextIdx = (game.currentQuestion || 0) + 1;
    if (nextIdx >= game.questionCount) {
      await endGame(pin);
    } else {
      await nextQuestion(pin, nextIdx);
    }
  }, [game, pin]);

  // Main question timer & auto-advance when answered or time up
  useEffect(() => {
    if (!game) return;

    if (game.status === "question" && game.questionStartTime) {
      autoNextFiredRef.current = false;
      if (resultsTimerRef.current) clearInterval(resultsTimerRef.current);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - game.questionStartTime!) / 1000);
        setElapsedSeconds(elapsed);
        const limit = game.settings.timeLimit || 20;

        // Auto-show results when time is up
        if (elapsed >= limit && !autoNextFiredRef.current) {
          autoNextFiredRef.current = true;
          handleShowResults();
        }
      }, 500);
    }

    // Auto-advance to results when ALL active players have answered
    if (
      game.status === "question" &&
      activePlayers.length > 0 &&
      answeredCount >= activePlayers.length &&
      !autoNextFiredRef.current
    ) {
      autoNextFiredRef.current = true;
      const timeoutId = setTimeout(() => {
        handleShowResults();
      }, 1200);
      return () => clearTimeout(timeoutId);
    }

    // When in "results" state, run a visible countdown to next question
    if (game.status === "results") {
      if (timerRef.current) clearInterval(timerRef.current);
      setResultsCountdown(6);

      resultsTimerRef.current = setInterval(() => {
        setResultsCountdown((prev) => {
          if (prev <= 1) {
            if (resultsTimerRef.current) clearInterval(resultsTimerRef.current);
            handleGoToNextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (game.status === "ended") {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resultsTimerRef.current) clearInterval(resultsTimerRef.current);
      const qs = game.settings.questionIds
        .map((id) => (allQuestions as any[]).find((q) => q.id === id))
        .filter(Boolean);
      setAnalytics(computeAnalytics(players, qs));
      setView("analytics");
    }

    if (game.status === "lobby") setView("lobby");

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resultsTimerRef.current) clearInterval(resultsTimerRef.current);
    };
  }, [
    game?.status,
    game?.questionStartTime,
    game?.currentQuestion,
    answeredCount,
    activePlayers.length,
    handleShowResults,
    handleGoToNextQuestion,
  ]);

  const handleStart = async () => {
    if (!game) return;
    if (activePlayers.length === 0) {
      toast.error("At least 1 player must join before starting.");
      return;
    }
    await startGame(pin);
    setView("game");
    toast.success("Game started! 🚀");
  };

  const handleEnd = async () => {
    if (confirm("End the game now and view final results?")) {
      await endGame(pin);
    }
  };

  const handleKick = async (playerId: string, nick: string) => {
    if (confirm(`Remove ${nick} from the game?`)) {
      await kickPlayer(pin, playerId);
      toast.success(`${nick} removed.`);
    }
  };

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join?pin=${pin}` : `/join?pin=${pin}`;

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    toast.success("PIN copied!");
  };
  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Link copied!");
  };

  const downloadCSV = () => {
    if (!analytics) return;
    const rows = [
      ["Rank", "Name", "Score", "Accuracy", "Correct", "Wrong", "Avg Response Time", "Best Streak"],
      ...analytics.playerList.map((p: Player, i: number) => {
        const total = (p.correctAnswers || 0) + (p.wrongAnswers || 0);
        const acc = total > 0 ? Math.round(((p.correctAnswers || 0) / total) * 100) : 0;
        const avgTime = total > 0 ? Math.round((p.totalResponseTime || 0) / total / 1000) : 0;
        return [
          i + 1,
          p.nickname,
          p.score,
          `${acc}%`,
          p.correctAnswers || 0,
          p.wrongAnswers || 0,
          `${avgTime}s`,
          p.maxStreak || 0,
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cograd-quest-${pin}-results.csv`;
    a.click();
    toast.success("Scorecard downloaded!");
  };

  if (!game) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // ─── ANALYTICS VIEW ───────────────────────────────────────────────────────
  if (view === "analytics" && analytics) {
    return (
      <div className="min-h-screen gradient-hero">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/cograd-logo.jpeg"
              alt="Cograd"
              width={100}
              height={34}
              className="h-9 w-auto object-contain rounded-lg"
            />
            <span className="font-bold text-gray-400 font-display">Quest · Results</span>
          </div>
          <Link href="/" className="btn-secondary py-2 px-4 text-sm">
            ← Home
          </Link>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">📊</div>
            <h1 className="text-3xl font-black font-display gradient-text mb-1">Game Complete!</h1>
            <p className="text-gray-400">{game.title}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Players", val: analytics.totalPlayers, icon: "👥", color: "text-blue-400" },
              { label: "Avg Accuracy", val: `${Math.round(analytics.avgAccuracy)}%`, icon: "🎯", color: "text-green-400" },
              { label: "Avg Response", val: `${Math.round(analytics.avgResponseTime / 1000)}s`, icon: "⏱", color: "text-yellow-400" },
              { label: "Questions", val: game.questionCount, icon: "📝", color: "text-purple-400" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-5 text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card p-8 mb-8">
            <h2 className="text-xl font-black mb-6 font-display text-center gradient-text">🏆 Champions</h2>
            <div className="flex items-end justify-center gap-4 mb-6">
              {analytics.playerList[1] && (
                <div className="text-center flex-1 max-w-[140px]">
                  <div className="text-3xl mb-2">{analytics.playerList[1].avatar}</div>
                  <div className="font-bold text-sm truncate mb-2">{analytics.playerList[1].nickname}</div>
                  <div className="podium-2nd rounded-t-lg flex items-end justify-center pb-2">
                    <span className="text-3xl">🥈</span>
                  </div>
                  <div className="text-sm font-bold text-gray-300">
                    {(analytics.playerList[1].score || 0).toLocaleString()}
                  </div>
                </div>
              )}
              {analytics.playerList[0] && (
                <div className="text-center flex-1 max-w-[140px]">
                  <div className="text-4xl mb-2 animate-float">{analytics.playerList[0].avatar}</div>
                  <div className="font-bold truncate mb-2 text-yellow-300">{analytics.playerList[0].nickname}</div>
                  <div className="podium-1st rounded-t-lg flex items-end justify-center pb-2">
                    <span className="text-4xl">🥇</span>
                  </div>
                  <div className="text-lg font-black text-yellow-400">
                    {(analytics.playerList[0].score || 0).toLocaleString()}
                  </div>
                </div>
              )}
              {analytics.playerList[2] && (
                <div className="text-center flex-1 max-w-[140px]">
                  <div className="text-3xl mb-2">{analytics.playerList[2].avatar}</div>
                  <div className="font-bold text-sm truncate mb-2">{analytics.playerList[2].nickname}</div>
                  <div className="podium-3rd rounded-t-lg flex items-end justify-center pb-2">
                    <span className="text-3xl">🥉</span>
                  </div>
                  <div className="text-sm font-bold text-amber-600">
                    {(analytics.playerList[2].score || 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black font-display">Full Scorecard</h2>
              <button onClick={downloadCSV} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                <span>📥</span> Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    {["Rank", "Avatar", "Name", "Score", "✓", "✗", "Accuracy", "Avg Time", "Best Streak"].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.playerList.map((p: Player, i: number) => {
                    const total = (p.correctAnswers || 0) + (p.wrongAnswers || 0);
                    const acc = total > 0 ? Math.round(((p.correctAnswers || 0) / total) * 100) : 0;
                    const avgTime = total > 0 ? Math.round((p.totalResponseTime || 0) / total / 1000) : 0;
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-bold">{["🥇", "🥈", "🥉"][i] || `#${i + 1}`}</td>
                        <td className="py-3 pr-4 text-xl">{p.avatar}</td>
                        <td className="py-3 pr-4 font-medium">{p.nickname}</td>
                        <td className="py-3 pr-4 font-black text-yellow-400">{(p.score || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-green-400">{p.correctAnswers || 0}</td>
                        <td className="py-3 pr-4 text-red-400">{p.wrongAnswers || 0}</td>
                        <td className="py-3 pr-4">
                          <span className={`badge ${acc >= 70 ? "badge-easy" : acc >= 40 ? "badge-medium" : "badge-hard"}`}>
                            {acc}%
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{avgTime}s</td>
                        <td className="py-3 pr-4 text-orange-400">{p.maxStreak || 0}🔥</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-gray-600 text-sm">
            <Image
              src="/images/cograd-logo.jpeg"
              alt="Cograd"
              width={80}
              height={28}
              className="h-7 w-auto object-contain rounded-lg mx-auto mb-2"
            />
            Cograd Quest · Developed by Divyanshu
          </div>
        </div>
      </div>
    );
  }

  // ─── LOBBY VIEW ───────────────────────────────────────────────────────────
  if (view === "lobby") {
    return (
      <div className="min-h-screen gradient-hero">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/cograd-logo.jpeg"
              alt="Cograd"
              width={100}
              height={34}
              className="h-9 w-auto object-contain rounded-lg"
            />
            <span className="font-bold font-display">Quest · Lobby</span>
          </div>
          <div className="flex items-center gap-3">
            {isHost && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-yellow-400">
                👑 Admin Host
              </span>
            )}
            {isHost && (
              <button onClick={() => setView("game")} className="text-gray-400 text-sm hover:text-white">
                Skip to Game →
              </button>
            )}
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: PIN & QR */}
            <div className="space-y-4">
              <div className="glass-card p-6 text-center">
                <p className="text-sm text-gray-400 mb-3 font-medium">Game PIN — Share with students</p>
                <div className="flex justify-center gap-2 mb-4">
                  {pin.split("").map((ch, i) => (
                    <div key={i} className="pin-char">
                      {ch}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyPin} className="flex-1 btn-secondary py-2 text-sm">
                    📋 Copy PIN
                  </button>
                  <button onClick={copyLink} className="flex-1 btn-secondary py-2 text-sm">
                    🔗 Copy Link
                  </button>
                </div>
              </div>

              <div className="glass-card p-6 text-center">
                <p className="text-sm text-gray-400 mb-4">Scan to Join</p>
                <div className="bg-white p-4 rounded-xl inline-block">
                  <QRCodeSVG value={joinUrl} size={160} />
                </div>
                <p className="text-xs text-gray-600 mt-3 break-all">{joinUrl}</p>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-bold mb-3 text-gray-200">Game Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Questions</span>
                    <span className="font-semibold">{game.questionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time/Question</span>
                    <span className="font-semibold">{game.settings.timeLimit}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mode</span>
                    <span className="font-semibold capitalize">{game.settings.gameMode}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Players & Start */}
            <div className="space-y-4">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-200">
                    Players <span className="text-blue-400">({activePlayers.length})</span>
                  </h3>
                  <div className="text-xs text-gray-500">Joined</div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activePlayers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6 animate-pulse">
                      Waiting for students to join...
                    </p>
                  ) : (
                    activePlayers.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-3 glass rounded-xl animate-slide-in"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        <span className="text-xl">{p.avatar}</span>
                        <span className="flex-1 font-medium truncate">{p.nickname}</span>
                        {isHost && (
                          <button
                            onClick={() => handleKick(p.id, p.nickname)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 hover:bg-red-400/10 rounded"
                            aria-label={`Remove ${p.nickname}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isHost && (
                <button
                  onClick={handleStart}
                  className="w-full btn-success text-xl py-5 rounded-2xl flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">▶</span> Start Game ({activePlayers.length} players)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── GAME / RESULTS VIEW ──────────────────────────────────────────────────
  const sorted = computeLeaderboard(Object.fromEntries(activePlayers.map((p) => [p.id, p])));
  const isLastQuestion = game.currentQuestion >= game.questionCount - 1;

  return (
    <div className="min-h-screen gradient-hero">
      <nav className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image
            src="/images/cograd-logo.jpeg"
            alt="Cograd"
            width={80}
            height={28}
            className="h-8 w-auto object-contain rounded-lg"
          />
          <span className="font-bold text-gray-400 text-sm">
            PIN: <span className="text-white font-black">{pin}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {game.status === "question" && currentQ && (
            <div className="text-sm text-gray-400">
              Q{(game.currentQuestion || 0) + 1}/{game.questionCount} ·{" "}
              <span className="text-green-400 font-semibold">
                {answeredCount}/{activePlayers.length} answered
              </span>
            </div>
          )}
          {game.status === "results" && (
            <div className="text-sm text-yellow-400 font-semibold">
              Question {(game.currentQuestion || 0) + 1} Complete
            </div>
          )}
          {isHost && (
            <button onClick={handleEnd} className="btn-danger py-1.5 px-4 text-sm">
              End Game
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6 grid md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2">
          {/* ── QUESTION STATE ── */}
          {game.status === "question" && currentQ && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm text-gray-400">
                    Question {(game.currentQuestion || 0) + 1} of {game.questionCount}
                  </span>
                  <div className={`badge badge-${currentQ.difficulty} ml-2`}>{currentQ.difficulty}</div>
                </div>
                <CircularTimer
                  totalSeconds={currentQ.timeLimit || game.settings.timeLimit}
                  elapsedSeconds={elapsedSeconds}
                  size={70}
                />
              </div>

              {/* Answer Progress Bar */}
              <div className="h-2 bg-white/10 rounded-full mb-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                  style={{ width: `${(answeredCount / Math.max(activePlayers.length, 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-4">
                <span>
                  {answeredCount} of {activePlayers.length} players answered
                </span>
                {answeredCount === activePlayers.length && activePlayers.length > 0 && (
                  <span className="text-green-400 font-bold animate-pulse">All answered! Revealing...</span>
                )}
              </div>

              <div className="glass rounded-xl p-5 mb-4">
                <p className="text-xl font-bold leading-relaxed">{currentQ.question}</p>
              </div>

              {currentQ.graphData && (
                <div className="flex justify-center mb-4">
                  <CoordinatePlane data={currentQ.graphData} width={260} height={260} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                {currentQ.options.map((opt: string, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-2 text-sm font-medium ${
                      [
                        "border-red-400 bg-red-400/10",
                        "border-blue-400 bg-blue-400/10",
                        "border-yellow-400 bg-yellow-400/10",
                        "border-green-400 bg-green-400/10",
                      ][idx]
                    }`}
                  >
                    <span className="font-black mr-2 text-base">{["A", "B", "C", "D"][idx]}.</span>
                    {opt}
                  </div>
                ))}
              </div>

              {isHost && (
                <button
                  onClick={handleShowResults}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold"
                >
                  <span>📊</span> Show Leaderboard &amp; Results
                </button>
              )}
            </div>
          )}

          {/* ── RESULTS & LEADERBOARD INTERMEDIATE STATE ── */}
          {game.status === "results" && (
            <div className="glass-card p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-blue-400 font-bold">
                    Round {(game.currentQuestion || 0) + 1} Review
                  </span>
                  <h2 className="text-2xl font-black font-display gradient-text">Question Complete!</h2>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-2xl font-black text-yellow-400">{resultsCountdown}s</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Next Question</div>
                </div>
              </div>

              {/* Correct Answer Box */}
              {currentQ && (
                <div className="space-y-4 mb-6">
                  <div className="glass rounded-xl p-4 border border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm mb-1">
                      <span>✅ Correct Answer:</span>
                      <span className="text-lg">
                        {["A", "B", "C", "D"][currentQ.correctAnswer]}. {currentQ.options[currentQ.correctAnswer]}
                      </span>
                    </div>
                    {currentQ.explanation && (
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                        <span className="font-semibold text-gray-400">Explanation:</span> {currentQ.explanation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress to next */}
              <div className="h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-1000"
                  style={{ width: `${((6 - resultsCountdown) / 6) * 100}%` }}
                />
              </div>

              {/* Action Button: Instant Advance */}
              {isHost && (
                <button
                  onClick={handleGoToNextQuestion}
                  className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg"
                  style={{ background: "linear-gradient(135deg,#1A3FD8,#7C3AED)" }}
                >
                  {isLastQuestion ? (
                    <>
                      <span>🏆</span> View Final Results &amp; Podium
                    </>
                  ) : (
                    <>
                      <span>⏭</span> Proceed to Question {(game.currentQuestion || 0) + 2} →
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── STARTING STATE ── */}
          {game.status === "starting" && (
            <div className="glass-card p-10 text-center animate-scale-in">
              <div className="text-7xl mb-4 animate-bounce">🚀</div>
              <h2 className="text-3xl font-black gradient-text font-display mb-2">Get Ready!</h2>
              <p className="text-gray-400">First question starting in 3 seconds...</p>
            </div>
          )}
        </div>

        {/* Sidebar: Live Leaderboard */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-black mb-4 font-display gradient-text text-sm uppercase tracking-wider flex items-center justify-between">
              <span>🏆 Live Leaderboard</span>
              <span className="text-xs text-gray-400 font-normal">Rankings</span>
            </h3>
            <Leaderboard players={sorted} maxShow={10} />
          </div>

          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-black text-blue-400">{activePlayers.length}</div>
            <div className="text-xs text-gray-500">Active Players</div>
          </div>
        </div>
      </div>
    </div>
  );
}
