// =============================================
// COGRAD QUEST — Game Engine
// Developed by Divyanshu
// Supports both Realtime Firebase & Zero-Config Localhost Multiplayer
// =============================================

import { ref, set, get, update, onValue, off } from "firebase/database";
import { rtdb, isFirebaseConfigured } from "./firebase";
import type { Game, Player, Answer, GameSettings } from "@/types/game";

// ---- UTILITY ----

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateHostId(): string {
  return `host_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function notifyChannel(pin: string, game?: Game | null) {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const ch = new BroadcastChannel(`cograd_${pin}`);
      ch.postMessage({ type: "GAME_UPDATE", game });
      setTimeout(() => ch.close(), 100);
    } catch {
      // ignore
    }
  }
}

// ---- SCORING ----

export function calculateScore(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitSec: number,
  basePoints: number = 1000,
  negativeMarking: boolean = false,
  negativePoints: number = 250,
  doublePoints: boolean = false
): number {
  if (!isCorrect) {
    return negativeMarking ? -negativePoints : 0;
  }
  const timeLimitMs = timeLimitSec * 1000;
  const timeRemaining = Math.max(0, timeLimitMs - responseTimeMs);
  const speedBonus = Math.round((timeRemaining / Math.max(1, timeLimitMs)) * 500);
  const total = basePoints + speedBonus;
  return doublePoints ? total * 2 : total;
}

// ---- HOST ACTIONS ----

export async function createGame(settings: GameSettings, hostId: string): Promise<string> {
  // Try Firebase only if actually configured
  if (isFirebaseConfigured()) {
    try {
      let pin = generatePin();
      for (let i = 0; i < 10; i++) {
        const existing = await get(ref(rtdb, `games/${pin}`));
        if (!existing.exists()) break;
        pin = generatePin();
      }

      const gameData: Game = {
        pin,
        hostId,
        title: settings.title,
        topic: settings.topic,
        status: "lobby",
        settings,
        currentQuestion: -1,
        questionStartTime: null,
        players: {},
        createdAt: Date.now(),
        startedAt: null,
        endedAt: null,
        questionCount: settings.questionIds.length,
      };

      await set(ref(rtdb, `games/${pin}`), gameData);
      return pin;
    } catch (err) {
      console.warn("Firebase create failed, falling back to local store:", err);
    }
  }

  // Local multiplayer fallback
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", settings, hostId }),
  });
  const data = await res.json();
  if (!res.ok || !data.pin) {
    throw new Error(data.error || "Failed to create game locally.");
  }
  notifyChannel(data.pin, data.game);
  return data.pin;
}

export async function startGame(pin: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${pin}`), {
        status: "starting",
        startedAt: Date.now(),
      });
      setTimeout(async () => {
        await nextQuestion(pin, 0);
      }, 3000);
      return;
    } catch (err) {
      console.warn("Firebase startGame failed, falling back to local:", err);
    }
  }

  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", pin }),
  });
  const data = await res.json();
  notifyChannel(pin, data.game);
}

export async function nextQuestion(pin: string, questionIndex: number): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${pin}`), {
        status: "question",
        currentQuestion: questionIndex,
        questionStartTime: Date.now(),
      });
      return;
    } catch (err) {
      console.warn("Firebase nextQuestion failed, falling back to local:", err);
    }
  }

  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "nextQuestion", pin, questionIndex }),
  });
  const data = await res.json();
  notifyChannel(pin, data.game);
}

export async function showResults(pin: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${pin}`), { status: "results" });
      return;
    } catch (err) {
      console.warn("Firebase showResults failed, falling back to local:", err);
    }
  }

  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "showResults", pin }),
  });
  const data = await res.json();
  notifyChannel(pin, data.game);
}

export async function endGame(pin: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${pin}`), {
        status: "ended",
        endedAt: Date.now(),
      });
      return;
    } catch (err) {
      console.warn("Firebase endGame failed, falling back to local:", err);
    }
  }

  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "endGame", pin }),
  });
  const data = await res.json();
  notifyChannel(pin, data.game);
}

export async function kickPlayer(pin: string, playerId: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${pin}/players/${playerId}`), {
        kicked: true,
        status: "kicked",
      });
      return;
    } catch (err) {
      console.warn("Firebase kickPlayer failed, falling back to local:", err);
    }
  }

  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "kickPlayer", pin, playerId }),
  });
  const data = await res.json();
  notifyChannel(pin, data.game);
}

// ---- PLAYER ACTIONS ----

export async function joinGame(
  pin: string,
  nickname: string,
  avatar: string
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  if (isFirebaseConfigured()) {
    try {
      const gameRef = ref(rtdb, `games/${pin}`);
      const snapshot = await get(gameRef);

      if (!snapshot.exists()) {
        return { success: false, error: "Game not found. Check your PIN." };
      }

      const game = snapshot.val() as Game;

      if (game.status === "ended") {
        return { success: false, error: "This game has already ended." };
      }

      if (game.status !== "lobby") {
        return { success: false, error: "Game has already started. You cannot join now." };
      }

      const players = game.players || {};
      const duplicateNick = Object.values(players).find(
        (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase() && !p.kicked
      );
      if (duplicateNick) {
        return { success: false, error: "Nickname already taken. Choose another." };
      }

      const playerId = generatePlayerId();
      const playerData: Player = {
        id: playerId,
        nickname,
        avatar,
        score: 0,
        streak: 0,
        maxStreak: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        totalResponseTime: 0,
        answers: {},
        joinedAt: Date.now(),
        status: "active",
        kicked: false,
        powerUps: { doublePoints: 1, safeAnswer: 1, timeBoost: 0 },
      };

      await set(ref(rtdb, `games/${pin}/players/${playerId}`), playerData);
      return { success: true, playerId };
    } catch (err: any) {
      console.warn("Firebase joinGame failed, falling back to local:", err);
    }
  }

  // Local multiplayer join
  try {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", pin, nickname, avatar }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to join game." };
    }
    notifyChannel(pin, data.game);
    return { success: true, playerId: data.playerId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to join game." };
  }
}

export async function submitAnswer(
  pin: string,
  playerId: string,
  questionId: string,
  questionIndex: number,
  answerIndex: number,
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitSec: number,
  negativeMarking: boolean,
  useDoublePoints: boolean = false
): Promise<number> {
  const points = calculateScore(
    isCorrect,
    responseTimeMs,
    timeLimitSec,
    1000,
    negativeMarking,
    250,
    useDoublePoints
  );

  if (isFirebaseConfigured()) {
    try {
      const answerData: Answer = {
        questionId,
        questionIndex,
        answer: answerIndex,
        isCorrect,
        responseTimeMs,
        points,
        submittedAt: Date.now(),
      };

      const playerRef = ref(rtdb, `games/${pin}/players/${playerId}`);
      const snapshot = await get(playerRef);
      if (!snapshot.exists()) return 0;

      const player = snapshot.val() as Player;
      if (player.answers?.[questionId]) {
        return 0;
      }

      const newScore = (player.score || 0) + points;
      const newStreak = isCorrect ? (player.streak || 0) + 1 : 0;
      const maxStreak = Math.max(player.maxStreak || 0, newStreak);
      const newCorrect = (player.correctAnswers || 0) + (isCorrect ? 1 : 0);
      const newWrong = (player.wrongAnswers || 0) + (!isCorrect ? 1 : 0);
      const newTotalTime = (player.totalResponseTime || 0) + responseTimeMs;

      await update(playerRef, {
        score: newScore,
        streak: newStreak,
        maxStreak,
        correctAnswers: newCorrect,
        wrongAnswers: newWrong,
        totalResponseTime: newTotalTime,
        [`answers/${questionId}`]: answerData,
      });

      return points;
    } catch (err) {
      console.warn("Firebase submitAnswer failed, falling back to local:", err);
    }
  }

  // Local multiplayer submit
  try {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitAnswer",
        pin,
        playerId,
        questionId,
        questionIndex,
        answerIndex,
        isCorrect,
        responseTimeMs,
        timeLimitSec,
        negativeMarking,
        useDoublePoints,
      }),
    });
    const data = await res.json();
    notifyChannel(pin, data.game);
    return data.points ?? points;
  } catch {
    return points;
  }
}

// ---- REALTIME SUBSCRIPTIONS ----

export function subscribeToGame(pin: string, callback: (game: Game | null) => void) {
  if (isFirebaseConfigured()) {
    try {
      const gameRef = ref(rtdb, `games/${pin}`);
      onValue(gameRef, (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
      });
      return () => off(gameRef);
    } catch (err) {
      console.warn("Firebase subscribeToGame failed, using local polling:", err);
    }
  }

  // Local Polling + BroadcastChannel
  let active = true;

  const fetchState = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/game?pin=${pin}`);
      if (res.ok) {
        const data = await res.json();
        if (active) callback(data.game || null);
      }
    } catch {
      // ignore
    }
  };

  fetchState();
  const pollInterval = setInterval(fetchState, 750);

  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(`cograd_${pin}`);
      channel.onmessage = (event) => {
        if (!active) return;
        if (event.data?.game) {
          callback(event.data.game);
        } else {
          fetchState();
        }
      };
    } catch {
      // ignore
    }
  }

  return () => {
    active = false;
    clearInterval(pollInterval);
    if (channel) {
      channel.close();
    }
  };
}

export function subscribeToPlayers(pin: string, callback: (players: Record<string, Player>) => void) {
  return subscribeToGame(pin, (game) => {
    callback(game?.players || {});
  });
}

export function subscribeToPlayer(
  pin: string,
  playerId: string,
  callback: (player: Player | null) => void
) {
  return subscribeToGame(pin, (game) => {
    callback(game?.players?.[playerId] || null);
  });
}

// ---- ANALYTICS ----

export function computeLeaderboard(players: Record<string, Player>): Player[] {
  return Object.values(players)
    .filter((p) => !p.kicked)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function computeAnalytics(players: Record<string, Player>, questions: any[]) {
  const playerList = computeLeaderboard(players);
  const totalPlayers = playerList.length;

  const avgAccuracy =
    totalPlayers > 0
      ? playerList.reduce((acc, p) => {
          const total = (p.correctAnswers || 0) + (p.wrongAnswers || 0);
          return acc + (total > 0 ? (p.correctAnswers || 0) / total : 0);
        }, 0) / totalPlayers
      : 0;

  const avgResponseTime =
    totalPlayers > 0
      ? playerList.reduce((acc, p) => {
          const total = (p.correctAnswers || 0) + (p.wrongAnswers || 0);
          return acc + (total > 0 ? (p.totalResponseTime || 0) / total : 0);
        }, 0) / totalPlayers
      : 0;

  // Question-wise stats
  const questionStats = questions.map((q: any) => {
    let correct = 0;
    let attempted = 0;
    playerList.forEach((p) => {
      const ans = p.answers?.[q.id];
      if (ans) {
        attempted++;
        if (ans.isCorrect) correct++;
      }
    });
    return {
      id: q.id,
      question: q.question,
      attempted,
      correct,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
    };
  });

  const hardestQuestion = [...questionStats].sort((a, b) => a.accuracy - b.accuracy)[0];
  const easiestQuestion = [...questionStats].sort((a, b) => b.accuracy - a.accuracy)[0];

  return {
    playerList,
    totalPlayers,
    avgAccuracy: avgAccuracy * 100,
    avgResponseTime,
    questionStats,
    hardestQuestion,
    easiestQuestion,
  };
}
