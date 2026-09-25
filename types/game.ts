// =============================================
// COGRAD QUEST — Type Definitions
// Developed by Divyanshu
// =============================================

export type GameStatus =
  | "lobby"
  | "starting"
  | "question"
  | "results"
  | "leaderboard"
  | "ended";

export type QuestionType = "mcq" | "truefalse" | "coordinate";
export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "speed" | "survival";

export interface GraphPoint {
  label: string;
  x: number;
  y: number;
  color: string;
}

export interface GraphData {
  points: GraphPoint[];
  gridRange?: number;
  polygon?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: Difficulty;
  concept: string;
  explanation: string;
  timeLimit: number;
  points: number;
  graphData: GraphData | null;
}

export interface GameSettings {
  title: string;
  topic: string;
  questionIds: string[];
  questionCount: number;
  timeLimit: number;
  difficulty: "mixed" | Difficulty;
  negativeMarking: boolean;
  negativePoints: number;
  showLeaderboard: boolean;
  soundEnabled: boolean;
  gameMode: GameMode;
  powerUpsEnabled: boolean;
  showExplanations: boolean;
}

export interface Answer {
  questionId: string;
  questionIndex: number;
  answer: number;
  isCorrect: boolean;
  responseTimeMs: number;
  points: number;
  submittedAt: number;
}

export interface PowerUps {
  doublePoints: number;
  safeAnswer: number;
  timeBoost: number;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  maxStreak: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalResponseTime: number;
  answers: Record<string, Answer>;
  joinedAt: number;
  status: "active" | "disconnected" | "kicked";
  kicked: boolean;
  powerUps: PowerUps;
  lives?: number; // For survival mode
}

export interface Game {
  pin: string;
  hostId: string;
  title: string;
  topic: string;
  status: GameStatus;
  settings: GameSettings;
  currentQuestion: number;
  questionStartTime: number | null;
  players: Record<string, Player>;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  questionCount: number;
}

export interface LeaderboardEntry extends Player {
  rank: number;
  accuracy: number;
  avgResponseTime: number;
}

export interface QuestionStat {
  id: string;
  question: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface GameAnalytics {
  playerList: Player[];
  totalPlayers: number;
  avgAccuracy: number;
  avgResponseTime: number;
  questionStats: QuestionStat[];
  hardestQuestion: QuestionStat | null;
  easiestQuestion: QuestionStat | null;
}

export interface QuizTopic {
  id: string;
  name: string;
  description: string;
  subject: string;
  questionCount: number;
  icon: string;
}

export const AVATARS = ["🧠", "🚀", "🎯", "🤖", "📚", "⚡", "🔥", "🧩", "🎮", "🌟", "🦁", "🐉"];
export const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
  "#98D8C8", "#F7DC6F", "#BB8FCE", "#52BE80"
];

export const STREAK_THRESHOLDS = [
  { count: 2, label: "Hot Streak", emoji: "🔥" },
  { count: 3, label: "Super Streak", emoji: "🔥🔥" },
  { count: 5, label: "Mega Streak", emoji: "🔥🔥🔥" },
  { count: 7, label: "Legendary!", emoji: "⚡🔥⚡" },
  { count: 10, label: "UNSTOPPABLE!", emoji: "💥🔥💥" },
];

export const GAME_MODES: { id: GameMode; name: string; description: string; icon: string }[] = [
  {
    id: "classic",
    name: "Classic Quiz",
    description: "Everyone answers simultaneously. Points based on correctness + speed.",
    icon: "📝",
  },
  {
    id: "speed",
    name: "Speed Challenge",
    description: "Race against time! Faster answers = much higher bonuses.",
    icon: "⚡",
  },
  {
    id: "survival",
    name: "Survival Mode",
    description: "3 lives only. Wrong answers cost a life. Last one standing wins!",
    icon: "❤️",
  },
];
