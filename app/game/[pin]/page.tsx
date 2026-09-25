"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { subscribeToGame, submitAnswer } from "@/lib/gameEngine";
import type { Game, Player, Question } from "@/types/game";
import { STREAK_THRESHOLDS } from "@/types/game";
import allQuestions from "@/data/questions/graphs_coordinates.json";
import CircularTimer from "@/components/game/CircularTimer";
import CoordinatePlane from "@/components/game/CoordinatePlane";
import Leaderboard from "@/components/game/Leaderboard";
import toast from "react-hot-toast";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = [
  { bg: "#EF4444", light: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)" },
  { bg: "#3B82F6", light: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.5)" },
  { bg: "#F59E0B", light: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.5)" },
  { bg: "#10B981", light: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.5)" },
];

function StreakBadge({ streak }: { streak: number }) {
  const threshold = [...STREAK_THRESHOLDS].reverse().find((t) => streak >= t.count);
  if (!threshold) return null;
  return (
    <div className="streak-badge animate-scale-in">
      {threshold.emoji} {threshold.label}
    </div>
  );
}

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pin = params.pin as string;
  const playerId = searchParams.get("player") || localStorage.getItem(`cogradPlayer_${pin}`) || "";

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    points: number;
    correctAnswer: string;
    explanation: string;
    timedOut?: boolean;
  } | null>(null);
  const [connected, setConnected] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef<number>(0);
  const answerSubmittedRef = useRef(false);
  const lastQIndexRef = useRef<number>(-1);

  // Subscribe to game
  useEffect(() => {
    if (!pin) return;
    const unsub = subscribeToGame(pin, (g) => {
      if (!g) {
        setConnected(false);
        return;
      }
      setConnected(true);
      setGame(g);

      // Update current player
      if (playerId && g.players?.[playerId]) {
        setCurrentPlayer(g.players[playerId]);
        if (g.players[playerId].kicked) {
          toast.error("You were removed from the game.");
          router.push("/");
        }
      }

      // When transitioning to results, clear question timer
      if (g.status === "results") {
        if (timerRef.current) clearInterval(timerRef.current);
      }

      // Handle question change
      if (g.status === "question" && g.currentQuestion >= 0) {
        if (lastQIndexRef.current !== g.currentQuestion) {
          lastQIndexRef.current = g.currentQuestion;
          const qIds = g.settings.questionIds;
          const qIdx = g.currentQuestion;
          if (qIdx < qIds.length) {
            const q = (allQuestions as any[]).find((item) => item.id === qIds[qIdx]);
            if (q) {
              setCurrentQuestion(q);
              setSelectedAnswer(null);
              setHasAnswered(false);
              setLastResult(null);
              answerSubmittedRef.current = false;
              questionStartRef.current = g.questionStartTime || Date.now();
              setElapsedSeconds(0);
            }
          }
        }
      }
    });
    return unsub;
  }, [pin, playerId, router]);

  // Question Timer: updates circular timer and visual countdown
  useEffect(() => {
    if (!game || game.status !== "question" || !game.questionStartTime || !currentQuestion) return;
    const startTime = game.questionStartTime;
    const limit = currentQuestion.timeLimit || game.settings.timeLimit || 20;

    if (timerRef.current) clearInterval(timerRef.current);

    const intId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(Math.min(elapsed, limit));

      if (elapsed >= limit && !hasAnswered) {
        setHasAnswered(true);
      }
    }, 500);
    timerRef.current = intId;

    return () => {
      clearInterval(intId);
    };
  }, [game?.status, game?.currentQuestion, game?.questionStartTime, currentQuestion, hasAnswered]);


  const handleAnswer = useCallback(
    async (answerIdx: number) => {
      if (hasAnswered || !currentQuestion || !game || answerSubmittedRef.current) return;
      answerSubmittedRef.current = true;

      const responseTimeMs = Date.now() - questionStartRef.current;
      const isCorrect = answerIdx === currentQuestion.correctAnswer;

      setSelectedAnswer(answerIdx);
      setHasAnswered(true);

      if (timerRef.current) clearInterval(timerRef.current);

      let pts = 0;
      try {
        pts = await submitAnswer(
          pin,
          playerId,
          currentQuestion.id,
          game.currentQuestion,
          answerIdx,
          isCorrect,
          responseTimeMs,
          currentQuestion.timeLimit,
          game.settings.negativeMarking
        );
      } catch (e) {
        console.error("Submit error:", e);
      }

      setLastResult({
        isCorrect,
        points: pts,
        correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
        explanation: currentQuestion.explanation,
      });
    },
    [hasAnswered, currentQuestion, game, pin, playerId]
  );

  if (!connected) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="glass-card p-10 text-center">
          <div className="text-5xl mb-4 animate-bounce">📡</div>
          <h2 className="text-2xl font-bold mb-2">Connection Interrupted</h2>
          <p className="text-gray-400 mb-6">Attempting to reconnect...</p>
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

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

  // ─── LOBBY ───────────────────────────────────────────────────────────────
  if (game.status === "lobby") {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-scale-in">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/cograd-logo.jpeg"
              alt="Cograd"
              width={120}
              height={40}
              className="h-10 w-auto object-contain rounded-xl"
            />
          </div>

          <div className="text-6xl mb-3 animate-float">{currentPlayer?.avatar || "🧠"}</div>
          <h1 className="text-2xl font-black mb-1 font-display">{currentPlayer?.nickname || "Player"}</h1>
          <p className="text-green-400 text-sm font-semibold mb-6 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-ping" />
            You&apos;re In!
          </p>

          <div className="glass rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 mb-1">Game</div>
            <div className="font-bold text-sm text-gray-300 truncate">{game.title}</div>
          </div>

          <div className="flex justify-around mb-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blue-400">
                {Object.values(game.players || {}).filter((p) => !p.kicked).length}
              </div>
              <div className="text-xs text-gray-500">Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-purple-400">{game.questionCount}</div>
              <div className="text-xs text-gray-500">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-400">{game.settings.timeLimit}s</div>
              <div className="text-xs text-gray-500">Per Q</div>
            </div>
          </div>

          <div className="animate-pulse text-gray-400 text-sm">⏳ Waiting for host to start the game...</div>
        </div>
      </div>
    );
  }

  // ─── STARTING ────────────────────────────────────────────────────────────
  if (game.status === "starting") {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="text-8xl mb-4 animate-bounce-in">🚀</div>
          <h1 className="text-5xl font-black mb-2 font-display gradient-text">Game Starting!</h1>
          <p className="text-gray-400">Get ready for Question 1...</p>
        </div>
      </div>
    );
  }

  // ─── RESULTS & LEADERBOARD BETWEEN QUESTIONS ─────────────────────────────
  if (game.status === "results") {
    const sorted = Object.values(game.players || {})
      .filter((p) => !p.kicked)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.id === playerId) + 1;

    const currentQId = game && game.currentQuestion >= 0 ? game.settings.questionIds[game.currentQuestion] : null;
    const answeredInfo = currentQId ? currentPlayer?.answers?.[currentQId] : null;
    const reviewResult = lastResult || (answeredInfo ? {
      isCorrect: answeredInfo.isCorrect,
      points: answeredInfo.points,
      correctAnswer: currentQuestion ? currentQuestion.options[currentQuestion.correctAnswer] : "",
      explanation: currentQuestion?.explanation || "",
      timedOut: false,
    } : currentQuestion ? {
      isCorrect: false,
      points: 0,
      correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
      explanation: currentQuestion.explanation || "",
      timedOut: true,
    } : null);

    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-8">
        <div className="glass-card p-6 max-w-md w-full animate-scale-in">
          {/* Result card */}
          {reviewResult ? (
            <div
              className={`rounded-2xl p-5 mb-5 text-center border ${
                reviewResult.isCorrect
                  ? "bg-green-500/10 border-green-500/40 shadow-lg shadow-green-500/10"
                  : "bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10"
              }`}
            >
              <div className="text-4xl mb-1">{reviewResult.isCorrect ? "🎉" : reviewResult.timedOut ? "⏰" : "❌"}</div>
              <h3
                className={`text-2xl font-black font-display ${
                  reviewResult.isCorrect ? "text-green-400" : "text-red-400"
                }`}
              >
                {reviewResult.isCorrect ? "Correct!" : reviewResult.timedOut ? "Time's Up!" : "Wrong!"}
              </h3>
              <div className="text-3xl font-black text-yellow-400 my-1 font-display">
                {reviewResult.points > 0 ? `+${reviewResult.points.toLocaleString()} pts` : "0 pts"}
              </div>
              {!reviewResult.isCorrect && reviewResult.correctAnswer && (
                <div className="text-xs text-gray-300 mt-2 bg-black/20 p-2.5 rounded-lg text-left">
                  <span className="text-gray-400 block mb-0.5">Correct Answer:</span>
                  <span className="font-bold text-green-400 text-sm">{reviewResult.correctAnswer}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-4 mb-5 text-center border border-white/10 bg-white/5">
              <h3 className="text-lg font-bold text-gray-300">Round Review</h3>
            </div>
          )}

          {/* Standings Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-black font-display gradient-text uppercase tracking-wider">
              🏆 Current Standings
            </h2>
            {myRank > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                You: #{myRank} of {sorted.length}
              </span>
            )}
          </div>

          <Leaderboard players={sorted} currentPlayerId={playerId} maxShow={5} />

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400 animate-pulse flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Next question starting soon...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── ENDED ───────────────────────────────────────────────────────────────
  if (game.status === "ended") {
    const players = Object.values(game.players || {}).filter((p) => !p.kicked);
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.id === playerId) + 1;
    const total = (currentPlayer?.correctAnswers || 0) + (currentPlayer?.wrongAnswers || 0);
    const accuracy = total > 0 ? Math.round(((currentPlayer?.correctAnswers || 0) / total) * 100) : 0;

    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-10">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-scale-in">
          <div className="text-6xl mb-4">
            {myRank === 1 ? "🏆" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🎮"}
          </div>
          <h1 className="text-3xl font-black mb-1 font-display gradient-text">Game Complete!</h1>
          <p className="text-gray-400 mb-6">Great effort, {currentPlayer?.nickname}!</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-yellow-400">#{myRank}</div>
              <div className="text-xs text-gray-500">Your Rank</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-blue-400">
                {(currentPlayer?.score || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total Score</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-green-400">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-orange-400">{currentPlayer?.maxStreak || 0}</div>
              <div className="text-xs text-gray-500">Best Streak</div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 mb-4">
            <h3 className="font-bold mb-3">Final Leaderboard</h3>
            <Leaderboard players={sorted} currentPlayerId={playerId} maxShow={5} compact />
          </div>

          <p className="text-xs text-gray-600 mt-4">Powered by Cograd · Dev: Divyanshu</p>
        </div>
      </div>
    );
  }

  // ─── ACTIVE QUESTION ─────────────────────────────────────────────────────
  if (game.status === "question" && currentQuestion) {
    const qNum = (game.currentQuestion || 0) + 1;
    const qTotal = game.questionCount;
    const timeLimit = currentQuestion.timeLimit || game.settings.timeLimit || 20;

    return (
      <div className="min-h-screen gradient-hero flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-sm font-medium text-gray-400">
            Q{qNum}/{qTotal}
          </div>
          <CircularTimer totalSeconds={timeLimit} elapsedSeconds={elapsedSeconds} size={60} />
          <div className="text-right">
            <div className="text-sm font-black text-yellow-400">
              {(currentPlayer?.score || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">points</div>
          </div>
        </header>

        {/* Streak */}
        {(currentPlayer?.streak || 0) >= 2 && (
          <div className="flex justify-center py-2">
            <StreakBadge streak={currentPlayer?.streak || 0} />
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000"
            style={{ width: `${(qNum / qTotal) * 100}%` }}
          />
        </div>

        {/* Question content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full">
          {/* Difficulty badge */}
          <div className="flex items-center justify-between mb-3">
            <span className={`badge badge-${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{currentQuestion.concept}</span>
          </div>

          {/* Question Text */}
          <div className="glass-card p-5 mb-4">
            <p className="text-lg font-bold leading-relaxed text-white">{currentQuestion.question}</p>
          </div>

          {/* Graph visual if available */}
          {currentQuestion.graphData && (
            <div className="flex justify-center mb-4">
              <CoordinatePlane
                data={currentQuestion.graphData}
                width={280}
                height={280}
                className="animate-scale-in"
              />
            </div>
          )}

          {/* Answer confirmation banner if answered */}
          {hasAnswered && (
            <div className="glass-card p-3 mb-4 text-center border border-blue-500/30 bg-blue-500/10 animate-fade-in">
              <p className="text-sm font-bold text-blue-400">
                ✓ Answer submitted! Waiting for other players...
              </p>
            </div>
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={hasAnswered}
                  style={{
                    background: isSelected ? color.bg : color.light,
                    borderColor: isSelected ? "#fff" : color.border,
                    transform: isSelected ? "scale(1.02)" : undefined,
                  }}
                  className={`p-4 rounded-xl border-2 text-left font-medium transition-all active:scale-95 disabled:cursor-not-allowed ${
                    hasAnswered && !isSelected ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: isSelected ? "#fff" : color.bg, color: isSelected ? "#000" : "#fff" }}
                    >
                      {OPTION_LABELS[idx]}
                    </span>
                    <span className="text-sm font-semibold leading-snug">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading question...</p>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen gradient-hero flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
