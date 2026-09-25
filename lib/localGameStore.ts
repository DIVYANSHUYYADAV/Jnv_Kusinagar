// =============================================
// COGRAD QUEST — Local Persistent Game Store
// Allows 100% offline & localhost multiplayer with disk persistence
// Developed by Divyanshu
// =============================================

import fs from "fs";
import path from "path";
import type { Game, Player, Answer, GameSettings } from "@/types/game";

declare global {
  var __cograd_games: Map<string, Game> | undefined;
}

if (!globalThis.__cograd_games) {
  globalThis.__cograd_games = new Map<string, Game>();
}

const games = globalThis.__cograd_games;
const DATA_DIR = path.join(process.cwd(), "data");
const GAMES_FILE = path.join(DATA_DIR, "active_games.json");

function ensureDirectoryExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore in environments without write access
  }
}

function loadGamesFromDisk() {
  try {
    ensureDirectoryExists();
    if (fs.existsSync(GAMES_FILE)) {
      const content = fs.readFileSync(GAMES_FILE, "utf-8");
      if (content.trim()) {
        const parsed = JSON.parse(content) as Record<string, Game>;
        for (const [pin, game] of Object.entries(parsed)) {
          // Keep active or recent games (within 24 hours)
          if (Date.now() - (game.createdAt || 0) < 86400000) {
            games.set(pin, game);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load games from disk:", err);
  }
}

function saveGamesToDisk() {
  try {
    ensureDirectoryExists();
    const obj: Record<string, Game> = {};
    games.forEach((game, pin) => {
      obj[pin] = game;
    });
    fs.writeFileSync(GAMES_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save games to disk:", err);
  }
}

// Initial load on server start
loadGamesFromDisk();

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
  loadGamesFromDisk();
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
  saveGamesToDisk();
  return game;
}

export function localGetGame(rawPin: string): Game | null {
  const pin = rawPin.trim();
  let game = games.get(pin);
  if (!game) {
    loadGamesFromDisk();
    game = games.get(pin);
  }
  return game || null;
}

export function localListActiveGames(): Array<{ pin: string; title: string; playerCount: number; status: string; createdAt: number }> {
  loadGamesFromDisk();
  const list: Array<{ pin: string; title: string; playerCount: number; status: string; createdAt: number }> = [];
  games.forEach((game, pin) => {
    if (game.status === "lobby" || game.status === "question" || game.status === "results") {
      list.push({
        pin,
        title: game.title,
        playerCount: Object.values(game.players || {}).filter((p: any) => !p.kicked).length,
        status: game.status,
        createdAt: game.createdAt,
      });
    }
  });
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export function localStartGame(rawPin: string): Game | null {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) return null;
  game.status = "starting";
  game.startedAt = Date.now();
  saveGamesToDisk();

  // Transition to first question after 3 seconds
  setTimeout(() => {
    const current = localGetGame(pin);
    if (current && current.status === "starting") {
      current.status = "question";
      current.currentQuestion = 0;
      current.questionStartTime = Date.now();
      saveGamesToDisk();
    }
  }, 3000);

  return game;
}

export function localNextQuestion(rawPin: string, questionIndex: number): Game | null {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) return null;
  game.status = "question";
  game.currentQuestion = questionIndex;
  game.questionStartTime = Date.now();
  saveGamesToDisk();
  return game;
}

export function localShowResults(rawPin: string): Game | null {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) return null;
  game.status = "results";
  saveGamesToDisk();
  return game;
}

export function localEndGame(rawPin: string): Game | null {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) return null;
  game.status = "ended";
  game.endedAt = Date.now();
  saveGamesToDisk();
  return game;
}

export function localKickPlayer(rawPin: string, playerId: string): Game | null {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game || !game.players[playerId]) return null;
  game.players[playerId].kicked = true;
  game.players[playerId].status = "kicked";
  saveGamesToDisk();
  return game;
}

export function localJoinGame(
  rawPin: string,
  nickname: string,
  avatar: string
): { success: boolean; playerId?: string; error?: string; game?: Game } {
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) {
    return { success: false, error: "Game not found. Check your PIN." };
  }
  if (game.status === "ended") {
    return { success: false, error: "This game has already ended." };
  }
  if (game.status !== "lobby") {
    return { success: false, error: "Game has already started. You cannot join now." };
  }

  const cleanNick = nickname.trim();
  const duplicate = Object.values(game.players || {}).find(
    (p) => p.nickname.toLowerCase() === cleanNick.toLowerCase() && !p.kicked
  );
  if (duplicate) {
    return { success: false, error: "Nickname already taken. Choose another." };
  }

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    nickname: cleanNick,
    avatar: avatar || "🧠",
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

  if (!game.players) game.players = {};
  game.players[playerId] = player;
  saveGamesToDisk();
  return { success: true, playerId, game };
}

export function localSubmitAnswer(
  rawPin: string,
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
  const pin = rawPin.trim();
  const game = localGetGame(pin);
  if (!game) return { points: 0, game: null };

  const player = game.players?.[playerId];
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

  saveGamesToDisk();
  return { points, game };
}
