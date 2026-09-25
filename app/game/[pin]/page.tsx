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
  const threshold = [...STREAK_THRESHOLDS].reverse().find(t => streak >= t.count);
  if (!threshold) return null;
  return (
    <div className="streak-badge animate-scale-in">
      {threshold.emoji} {threshold.label}
    </div>
  );
}

function FeedbackOverlay({
  isCorrect, points, correctAnswer, explanation, onNext
}: { isCorrect: boolean; points: number; correctAnswer: string; explanation: string; onNext: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{background:"rgba(10,14,39,0.97)"}}>
      <div className="glass-card p-8 max-w-md w-full text-center animate-scale-in">
        {/* Result icon */}
        <div className="text-7xl mb-4 animate-bounce-in">
          {isCorrect ? "✅" : "❌"}
        </div>
        <h2 className="text-3xl font-black mb-2 font-display"
          style={{color: isCorrect ? "#10B981" : "#EF4444"}}>
          {isCorrect ? "Correct!" : "Wrong!"}
        </h2>

        {/* Points */}
        <div className={`text-5xl font-black mb-6 font-display ${isCorrect ? "text-yellow-400" : "text-red-400"}`}>
          {points > 0 ? `+${points.toLocaleString()}` : points !== 0 ? points.toLocaleString() : "0"} pts
        </div>

        {/* Correct answer */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-400 mb-1">Correct Answer</div>
          <div className="font-bold text-green-400 text-lg">{correctAnswer}</div>
        </div>

        {/* Explanation */}
        {explanation && (
          <div className="glass rounded-xl p-4 mb-6 text-left">
            <div className="text-xs text-gray-400 mb-1">💡 Explanation</div>
            <div className="text-sm text-gray-300 leading-relaxed">{explanation}</div>
          </div>
        )}

        <button onClick={onNext} className="btn-primary w-full py-3 text-lg rounded-xl">
          Continue →
        </button>
      </div>
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{isCorrect:boolean;points:number;correctAnswer:string;explanation:string}|null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [connected, setConnected] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef<number>(0);
  const answerSubmittedRef = useRef(false);

  // Subscribe to game
  useEffect(() => {
    if (!pin) return;
    const unsub = subscribeToGame(pin, (g) => {
      if (!g) { setConnected(false); return; }
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

      // Handle question change
      if (g.status === "question" && g.currentQuestion >= 0) {
        const qIds = g.settings.questionIds;
        const qIdx = g.currentQuestion;
        if (qIdx < qIds.length) {
          const q = (allQuestions as any[]).find(q => q.id === qIds[qIdx]);
          if (q) {
            setCurrentQuestion(q);
            setSelectedAnswer(null);
            setHasAnswered(false);
            setShowFeedback(false);
            answerSubmittedRef.current = false;
            questionStartRef.current = g.questionStartTime || Date.now();
            setElapsedSeconds(Math.floor((Date.now() - (g.questionStartTime || Date.now())) / 1000));
          }
        }
      }

      if (g.status === "leaderboard") {
        setShowLeaderboard(true);
        setTimeout(() => setShowLeaderboard(false), 5000);
      }
    });
    return unsub;
  }, [pin, playerId]);

  // Timer
  useEffect(() => {
    if (!game || game.status !== "question" || !game.questionStartTime) return;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - game.questionStartTime!) / 1000);
      setElapsedSeconds(elapsed);
      // Auto-submit after time
      if (elapsed >= (currentQuestion?.timeLimit || 20) && !answerSubmittedRef.current) {
        handleAutoSubmit();
      }
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [game?.status, game?.currentQuestion, game?.questionStartTime]);

  const handleAutoSubmit = useCallback(() => {
    if (answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;
    // Time's up — treat as wrong (no answer)
    if (!hasAnswered && currentQuestion) {
      const isCorrect = false;
      const points = 0;
      setLastResult({
        isCorrect,
        points,
        correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
        explanation: currentQuestion.explanation,
      });
      setShowFeedback(true);
    }
  }, [hasAnswered, currentQuestion]);

  const handleAnswer = useCallback(async (answerIdx: number) => {
    if (hasAnswered || !currentQuestion || !game || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    const responseTimeMs = Date.now() - questionStartRef.current;
    const isCorrect = answerIdx === currentQuestion.correctAnswer;

    setSelectedAnswer(answerIdx);
    setHasAnswered(true);

    if (timerRef.current) clearInterval(timerRef.current);

    // Submit to Firebase
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

    setTimeout(() => setShowFeedback(true), 300);
  }, [hasAnswered, currentQuestion, game, pin, playerId]);

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
          <p className="text-gray-400">Connecting to game...</p>
        </div>
      </div>
    );
  }

  // ─── LOBBY ───────────────────────────────────────────────────────────────
  if (game.status === "lobby") {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-10">
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={120} height={40}
            className="h-10 w-auto object-contain rounded-xl mx-auto mb-6" />
          <div className="text-5xl mb-3 animate-float">{currentPlayer?.avatar || "🎮"}</div>
          <h2 className="text-2xl font-black mb-1 font-display">{currentPlayer?.nickname}</h2>
          <p className="text-gray-400 text-sm mb-6">Waiting for host to start...</p>

          <div className="glass rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 mb-1">Game</div>
            <div className="font-bold text-lg truncate">{game.title}</div>
          </div>

          <div className="flex justify-around mb-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blue-400">
                {Object.values(game.players || {}).filter(p => !p.kicked).length}
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

          <div className="animate-pulse text-gray-500 text-sm">
            ⏳ Waiting for host to start the game...
          </div>
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
          <p className="text-gray-400">Get ready...</p>
        </div>
      </div>
    );
  }

  // ─── ENDED ───────────────────────────────────────────────────────────────
  if (game.status === "ended") {
    const players = Object.values(game.players || {}).filter(p => !p.kicked);
    const sorted = [...players].sort((a,b)=>(b.score||0)-(a.score||0));
    const myRank = sorted.findIndex(p => p.id === playerId) + 1;
    const total = (currentPlayer?.correctAnswers||0) + (currentPlayer?.wrongAnswers||0);
    const accuracy = total > 0 ? Math.round(((currentPlayer?.correctAnswers||0)/total)*100) : 0;

    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-10">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-scale-in">
          <div className="text-6xl mb-4">{myRank === 1 ? "🏆" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🎮"}</div>
          <h1 className="text-3xl font-black mb-1 font-display gradient-text">Game Complete!</h1>
          <p className="text-gray-400 mb-6">Great effort, {currentPlayer?.nickname}!</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-yellow-400">#{myRank}</div>
              <div className="text-xs text-gray-500">Your Rank</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-blue-400">{(currentPlayer?.score||0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Score</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-green-400">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-black text-orange-400">{currentPlayer?.maxStreak||0}</div>
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

  // ─── LEADERBOARD between questions ───────────────────────────────────────
  if (showLeaderboard && game.settings.showLeaderboard) {
    const sorted = Object.values(game.players||{}).filter(p=>!p.kicked).sort((a,b)=>(b.score||0)-(a.score||0));
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full animate-scale-in">
          <h2 className="text-2xl font-black text-center mb-6 font-display gradient-text">🏆 Leaderboard</h2>
          <Leaderboard players={sorted} currentPlayerId={playerId} maxShow={8} />
          <p className="text-center text-gray-500 text-sm mt-4 animate-pulse">Next question coming up...</p>
        </div>
      </div>
    );
  }

  // ─── QUESTION ────────────────────────────────────────────────────────────
  if (game.status === "question" && currentQuestion) {
    const qNum = (game.currentQuestion || 0) + 1;
    const qTotal = game.questionCount;
    const timeLimit = currentQuestion.timeLimit || game.settings.timeLimit;

    return (
      <div className="min-h-screen gradient-hero flex flex-col">
        {/* Feedback overlay */}
        {showFeedback && lastResult && (
          <FeedbackOverlay
            isCorrect={lastResult.isCorrect}
            points={lastResult.points}
            correctAnswer={lastResult.correctAnswer}
            explanation={lastResult.explanation}
            onNext={() => setShowFeedback(false)}
          />
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-sm font-medium text-gray-400">
            Q{qNum}/{qTotal}
          </div>
          <CircularTimer totalSeconds={timeLimit} elapsedSeconds={elapsedSeconds} size={60} />
          <div className="text-right">
            <div className="text-sm font-black text-yellow-400">{(currentPlayer?.score||0).toLocaleString()}</div>
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
          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000"
            style={{width: `${(qNum/qTotal)*100}%`}} />
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

          {/* Question */}
          <div className="glass-card p-5 mb-4">
            <p className="text-lg font-bold leading-relaxed text-white">
              {currentQuestion.question}
            </p>
          </div>

          {/* Graph */}
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

          {/* Answer options */}
          <div className="grid grid-cols-1 gap-3 pb-6">
            {currentQuestion.options.map((opt, idx) => {
              const col = OPTION_COLORS[idx];
              const isSelected = selectedAnswer === idx;
              const isDisabled = hasAnswered;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isDisabled}
                  aria-label={`Option ${OPTION_LABELS[idx]}: ${opt}`}
                  className={`answer-option answer-option-${OPTION_LABELS[idx]} ${isSelected ? "selected" : ""} ${isDisabled && !isSelected ? "disabled" : ""}`}
                  style={{
                    borderColor: isSelected ? col.bg : `rgba(255,255,255,0.1)`,
                    background: isSelected ? col.light : "rgba(255,255,255,0.04)",
                    boxShadow: isSelected ? `0 0 20px ${col.border}` : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{background: col.bg, color:"white", fontSize:"14px"}}>
                      {OPTION_LABELS[idx]}
                    </span>
                    <span className="font-medium">{opt}</span>
                    {isSelected && <span className="ml-auto text-xl">✓</span>}
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
        <p className="text-gray-400">Loading game state...</p>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-hero flex items-center justify-center text-white">Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
