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
      const ch = new BroadcastChannel(`cograd_${pin.trim()}`);
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

// ---- GAME LOOKUP ----

export async function checkGameExists(pin: string): Promise<{ exists: boolean; game?: Game; error?: string }> {
  const cleanPin = pin.trim();
  if (!cleanPin || cleanPin.length !== 6) {
    return { exists: false, error: "Please enter a 6-digit PIN." };
  }

  // 1. Check local server
  try {
    const res = await fetch(`/api/game?pin=${cleanPin}`);
    if (res.ok) {
      const data = await res.json();
      if (data.game) {
        return { exists: true, game: data.game };
      }
    }
  } catch (err) {
    console.warn("Local check failed:", err);
  }

  // 2. Check Firebase if configured
  if (isFirebaseConfigured()) {
    try {
      const gameRef = ref(rtdb, `games/${cleanPin}`);
      const snapshot = await get(gameRef);
      if (snapshot.exists()) {
        return { exists: true, game: snapshot.val() as Game };
      }
    } catch (err) {
      console.warn("Firebase lookup failed:", err);
    }
  }

  return { exists: false, error: "Game not found. Make sure the host has created the game." };
}

export async function getActiveGames(): Promise<Array<{ pin: string; title: string; playerCount: number; status: string }>> {
  try {
    const res = await fetch(`/api/game?list=true`);
    if (res.ok) {
      const data = await res.json();
      return data.activeGames || [];
    }
  } catch {
    // ignore
  }
  return [];
}

// ---- HOST ACTIONS ----

export async function createGame(settings: GameSettings, hostId: string): Promise<string> {
  // Always create locally so localhost multiplayer is 100% reliable
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", settings, hostId }),
  });
  const data = await res.json();
  if (!res.ok || !data.pin) {
    throw new Error(data.error || "Failed to create game locally.");
  }

  const pin = data.pin;
  notifyChannel(pin, data.game);

  // Also sync to Firebase in background if configured
  if (isFirebaseConfigured()) {
    try {
      await set(ref(rtdb, `games/${pin}`), data.game);
    } catch (err) {
      console.warn("Firebase sync failed (continuing with local engine):", err);
    }
  }

  return pin;
}

export async function startGame(pin: string): Promise<void> {
  const cleanPin = pin.trim();
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", pin: cleanPin }),
  });
  const data = await res.json();
  notifyChannel(cleanPin, data.game);

  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${cleanPin}`), {
        status: "starting",
        startedAt: Date.now(),
      });
      setTimeout(async () => {
        await nextQuestion(cleanPin, 0);
      }, 3000);
    } catch {
      // ignore
    }
  }
}

export async function nextQuestion(pin: string, questionIndex: number): Promise<void> {
  const cleanPin = pin.trim();
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "nextQuestion", pin: cleanPin, questionIndex }),
  });
  const data = await res.json();
  notifyChannel(cleanPin, data.game);

  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${cleanPin}`), {
        status: "question",
        currentQuestion: questionIndex,
        questionStartTime: Date.now(),
      });
    } catch {
      // ignore
    }
  }
}

export async function showResults(pin: string): Promise<void> {
  const cleanPin = pin.trim();
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "showResults", pin: cleanPin }),
  });
  const data = await res.json();
  notifyChannel(cleanPin, data.game);

  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${cleanPin}`), { status: "results" });
    } catch {
      // ignore
    }
  }
}

export async function endGame(pin: string): Promise<void> {
  const cleanPin = pin.trim();
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "endGame", pin: cleanPin }),
  });
  const data = await res.json();
  notifyChannel(cleanPin, data.game);

  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${cleanPin}`), {
        status: "ended",
        endedAt: Date.now(),
      });
    } catch {
      // ignore
    }
  }
}

export async function kickPlayer(pin: string, playerId: string): Promise<void> {
  const cleanPin = pin.trim();
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "kickPlayer", pin: cleanPin, playerId }),
  });
  const data = await res.json();
  notifyChannel(cleanPin, data.game);

  if (isFirebaseConfigured()) {
    try {
      await update(ref(rtdb, `games/${cleanPin}/players/${playerId}`), {
        kicked: true,
        status: "kicked",
      });
    } catch {
      // ignore
    }
  }
}

// ---- PLAYER ACTIONS ----

export async function joinGame(
  pin: string,
  nickname: string,
  avatar: string
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const cleanPin = pin.trim();
  const cleanNick = nickname.trim();

  // 1. Try Local Game first
  try {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", pin: cleanPin, nickname: cleanNick, avatar }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      notifyChannel(cleanPin, data.game);

      // If Firebase is configured, mirror to Firebase in background
      if (isFirebaseConfigured()) {
        try {
          await set(ref(rtdb, `games/${cleanPin}/players/${data.playerId}`), data.game.players[data.playerId]);
        } catch {
          // ignore
        }
      }

      return { success: true, playerId: data.playerId };
    }

    // If error is about nickname or game state, return that
    if (data.error && data.error !== "Game not found. Check your PIN.") {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.warn("Local join failed, checking fallback:", err);
  }

  // 2. Fallback to Firebase only if local didn't find the game and Firebase is configured
  if (isFirebaseConfigured()) {
    try {
      const gameRef = ref(rtdb, `games/${cleanPin}`);
      const snapshot = await get(gameRef);

      if (snapshot.exists()) {
        const game = snapshot.val() as Game;

        if (game.status === "ended") {
          return { success: false, error: "This game has already ended." };
        }

        if (game.status !== "lobby") {
          return { success: false, error: "Game has already started. You cannot join now." };
        }

        const players = game.players || {};
        const duplicateNick = Object.values(players).find(
          (p: any) => p.nickname.toLowerCase() === cleanNick.toLowerCase() && !p.kicked
        );
        if (duplicateNick) {
          return { success: false, error: "Nickname already taken. Choose another." };
        }

        const playerId = generatePlayerId();
        const playerData: Player = {
          id: playerId,
          nickname: cleanNick,
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

        await set(ref(rtdb, `games/${cleanPin}/players/${playerId}`), playerData);
        return { success: true, playerId };
      }
    } catch (err: any) {
      console.warn("Firebase joinGame error:", err);
    }
  }

  return { success: false, error: `Game PIN "${cleanPin}" not found. Please check with the host.` };
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
  const cleanPin = pin.trim();
  const points = calculateScore(
    isCorrect,
    responseTimeMs,
    timeLimitSec,
    1000,
    negativeMarking,
    250,
    useDoublePoints
  );

  // 1. Submit to local
  try {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitAnswer",
        pin: cleanPin,
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
    notifyChannel(cleanPin, data.game);
    if (data.points !== undefined) {
      return data.points;
    }
  } catch {
    // fallback
  }

  // 2. Submit to Firebase if configured
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

      const playerRef = ref(rtdb, `games/${cleanPin}/players/${playerId}`);
      const snapshot = await get(playerRef);
      if (snapshot.exists()) {
        const player = snapshot.val() as Player;
        if (!player.answers?.[questionId]) {
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
        }
      }
    } catch {
      // ignore
    }
  }

  return points;
}

// ---- REALTIME SUBSCRIPTIONS ----

export function subscribeToGame(pin: string, callback: (game: Game | null) => void) {
  const cleanPin = pin.trim();
  let active = true;
  let lastKnownGame: Game | null = null;

  const fetchState = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/game?pin=${cleanPin}`);
      if (res.ok) {
        const data = await res.json();
        if (active && data.game) {
          lastKnownGame = data.game;
          callback(data.game);
        }
      }
    } catch {
      // ignore
    }
  };

  // Initial fetch and polling
  fetchState();
  const pollInterval = setInterval(fetchState, 750);

  // Instant local multi-tab sync via BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(`cograd_${cleanPin}`);
      channel.onmessage = (event) => {
        if (!active) return;
        if (event.data?.game) {
          lastKnownGame = event.data.game;
          callback(event.data.game);
        } else {
          fetchState();
        }
      };
    } catch {
      // ignore
    }
  }

  // Firebase listener as secondary if available
  let firebaseUnsub: (() => void) | null = null;
  if (isFirebaseConfigured()) {
    try {
      const gameRef = ref(rtdb, `games/${cleanPin}`);
      onValue(gameRef, (snapshot) => {
        if (!active) return;
        if (snapshot.exists()) {
          lastKnownGame = snapshot.val();
          callback(lastKnownGame);
        }
      });
      firebaseUnsub = () => off(gameRef);
    } catch {
      // ignore
    }
  }

  return () => {
    active = false;
    clearInterval(pollInterval);
    if (channel) channel.close();
    if (firebaseUnsub) firebaseUnsub();
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
