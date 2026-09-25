// =============================================
// COGRAD QUEST — Local In-Memory Game Store
// Allows 100% offline & localhost multiplayer without Firebase
// Developed by Divyanshu
// =============================================

import type { Game, Player, Answer, GameSettings } from "@/types/game";

declare global {
  var __cograd_games: Map<string, Game> | undefined;
}

if (!globalThis.__cograd_games) {
  globalThis.__cograd_games = new Map<string, Game>();
}

const games = globalThis.__cograd_games;

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

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

export function localCreateGame(settings: GameSettings, hostId: string): Game {
  let pin = generatePin();
  let tries = 0;
  while (games.has(pin) && tries < 100) {
    pin = generatePin();
    tries++;
  }

  const game: Game = {
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

  games.set(pin, game);
  return game;
}

export function localGetGame(pin: string): Game | null {
  return games.get(pin) || null;
}

export function localStartGame(pin: string): Game | null {
  const game = games.get(pin);
  if (!game) return null;
  game.status = "starting";
  game.startedAt = Date.now();

  // Transition to first question after 3 seconds
  setTimeout(() => {
    const current = games.get(pin);
    if (current && current.status === "starting") {
      current.status = "question";
      current.currentQuestion = 0;
      current.questionStartTime = Date.now();
    }
  }, 3000);

  return game;
}

export function localNextQuestion(pin: string, questionIndex: number): Game | null {
  const game = games.get(pin);
  if (!game) return null;
  game.status = "question";
  game.currentQuestion = questionIndex;
  game.questionStartTime = Date.now();
  return game;
}

export function localShowResults(pin: string): Game | null {
  const game = games.get(pin);
  if (!game) return null;
  game.status = "results";
  return game;
}

export function localEndGame(pin: string): Game | null {
  const game = games.get(pin);
  if (!game) return null;
  game.status = "ended";
  game.endedAt = Date.now();
  return game;
}

export function localKickPlayer(pin: string, playerId: string): Game | null {
  const game = games.get(pin);
  if (!game || !game.players[playerId]) return null;
  game.players[playerId].kicked = true;
  game.players[playerId].status = "kicked";
  return game;
}

export function localJoinGame(
  pin: string,
  nickname: string,
  avatar: string
): { success: boolean; playerId?: string; error?: string; game?: Game } {
  const game = games.get(pin);
  if (!game) {
    return { success: false, error: "Game not found. Check your PIN." };
  }
  if (game.status === "ended") {
    return { success: false, error: "This game has already ended." };
  }
  if (game.status !== "lobby") {
    return { success: false, error: "Game has already started. You cannot join now." };
  }

  const duplicate = Object.values(game.players).find(
    (p) => p.nickname.toLowerCase() === nickname.toLowerCase() && !p.kicked
  );
  if (duplicate) {
    return { success: false, error: "Nickname already taken. Choose another." };
  }

  const playerId = generatePlayerId();
  const player: Player = {
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

  game.players[playerId] = player;
  return { success: true, playerId, game };
}

export function localSubmitAnswer(
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
): { points: number; game: Game | null } {
  const game = games.get(pin);
  if (!game) return { points: 0, game: null };

  const player = game.players[playerId];
  if (!player || player.kicked) return { points: 0, game };

  // Avoid duplicate answer
  if (player.answers && player.answers[questionId]) {
    return { points: 0, game };
  }

  const points = calculateScore(
    isCorrect,
    responseTimeMs,
    timeLimitSec,
    1000,
    negativeMarking,
    250,
    useDoublePoints
  );

  const answerData: Answer = {
    questionId,
    questionIndex,
    answer: answerIndex,
    isCorrect,
    responseTimeMs,
    points,
    submittedAt: Date.now(),
  };

  player.score = (player.score || 0) + points;
  player.streak = isCorrect ? (player.streak || 0) + 1 : 0;
  player.maxStreak = Math.max(player.maxStreak || 0, player.streak);
  player.correctAnswers = (player.correctAnswers || 0) + (isCorrect ? 1 : 0);
  player.wrongAnswers = (player.wrongAnswers || 0) + (!isCorrect ? 1 : 0);
  player.totalResponseTime = (player.totalResponseTime || 0) + responseTimeMs;
  if (!player.answers) player.answers = {};
  player.answers[questionId] = answerData;

  return { points, game };
}
