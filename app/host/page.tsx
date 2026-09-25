"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createGame, generateHostId } from "@/lib/gameEngine";
import { getAdminSession, logoutAdmin, type AdminUser } from "@/lib/adminAuth";
import questions from "@/data/questions/graphs_coordinates.json";
import type { GameSettings, GameMode } from "@/types/game";
import toast from "react-hot-toast";

const TOPICS = [
  { id: "graphs_coordinates", name: "Graphs & Coordinates", icon: "📐", subject: "Mathematics" },
];

const TIME_OPTIONS = [10, 15, 20, 30, 45, 60];
const DIFFICULTY_OPTIONS = ["mixed", "easy", "medium", "hard"] as const;

export default function HostPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    title: "Cograd Quest — Graphs & Coordinates",
    topic: "graphs_coordinates",
    questionIds: questions.map((q: any) => q.id).slice(0, 15),
    questionCount: 15,
    timeLimit: 20,
    difficulty: "mixed",
    negativeMarking: false,
    negativePoints: 250,
    showLeaderboard: true,
    soundEnabled: true,
    gameMode: "classic",
    powerUpsEnabled: true,
    showExplanations: true,
  });

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.replace("/host/login");
    } else {
      setAdmin(session);
      setAuthChecking(false);
    }
  }, [router]);

  const filteredQuestions = () => {
    let qs = questions as any[];
    if (settings.difficulty !== "mixed") {
      qs = qs.filter((q: any) => q.difficulty === settings.difficulty);
    }
    return qs.slice(0, settings.questionCount);
  };

  const handleCreate = async () => {
    if (!getAdminSession()) {
      toast.error("Admin session expired. Please log in again.");
      router.push("/host/login");
      return;
    }

    if (!settings.title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }
    setLoading(true);
    try {
      const hostId = generateHostId();
      const finalSettings = {
        ...settings,
        questionIds: filteredQuestions().map((q: any) => q.id),
        questionCount: filteredQuestions().length,
      };
      localStorage.setItem("cogradHostId", hostId);
      const pin = await createGame(finalSettings, hostId);
      localStorage.setItem(`cogradHost_${pin}`, hostId);
      toast.success("Game created! Redirecting to lobby...");
      router.push(`/host/game/${pin}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create game. Check Firebase config.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    toast.success("Logged out successfully");
    router.push("/host/login");
  };

  const qCount = filteredQuestions().length;

  if (authChecking) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Verifying Admin Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen gradient-hero">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={100} height={34}
            className="h-9 w-auto object-contain rounded-lg" />
          <span className="text-white font-bold font-display">Quest</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs">
            <span className="text-yellow-400">👑</span>
            <span className="font-semibold text-gray-200">{admin?.name || "Admin"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary text-xs py-1.5 px-3 hover:border-red-500/50 hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>👑</span> Admin Host Console
          </div>
          <h1 className="text-4xl font-black mb-2 font-display gradient-text">Host a Game</h1>
          <p className="text-gray-400">Set up your quiz and generate the PIN for your students</p>
        </div>

        <div className="space-y-6">
          {/* Quiz Title */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">Quiz Title</label>
            <input className="input-field" placeholder="e.g., Chapter 3 — Graphs & Coordinates"
              value={settings.title}
              onChange={e => setSettings(s => ({...s, title: e.target.value}))} />
          </div>

          {/* Topic Selection */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Topic</label>
            <div className="space-y-2">
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => setSettings(s => ({...s, topic: t.id}))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    settings.topic === t.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}>
                  <span className="text-2xl mr-3">{t.icon}</span>
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-gray-400 text-sm ml-2">({t.subject})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Settings */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-gray-200">Question Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Count */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Number of Questions</label>
                <input type="range" min={5} max={30} value={settings.questionCount}
                  onChange={e => setSettings(s => ({...s, questionCount: parseInt(e.target.value)}))}
                  className="w-full accent-blue-500 mb-1" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span className="text-blue-400 font-bold text-sm">{settings.questionCount} ({qCount} available)</span>
                  <span>30</span>
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Time per Question</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIME_OPTIONS.map(t => (
                    <button key={t} onClick={() => setSettings(s => ({...s, timeLimit: t}))}
                      className={`py-2 text-sm font-bold rounded-lg transition-all ${
                        settings.timeLimit === t
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-gray-300 hover:bg-white/15"
                      }`}>
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} onClick={() => setSettings(s => ({...s, difficulty: d}))}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                      settings.difficulty === d
                        ? d === "easy" ? "bg-green-600 text-white"
                          : d === "medium" ? "bg-yellow-600 text-white"
                          : d === "hard" ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/15"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game Mode */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-gray-200">Game Mode</h3>
            <div className="space-y-2">
              {[
                {id:"classic",name:"Classic Quiz",desc:"Everyone answers simultaneously",icon:"📝"},
                {id:"speed",name:"Speed Challenge",desc:"Faster answers = bigger bonus",icon:"⚡"},
                {id:"survival",name:"Survival",desc:"3 lives — wrong answers cost a life!",icon:"❤️"},
              ].map(mode => (
                <button key={mode.id}
                  onClick={() => setSettings(s => ({...s, gameMode: mode.id as GameMode}))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    settings.gameMode === mode.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}>
                  <span className="text-2xl">{mode.icon}</span>
                  <div>
                    <div className="font-semibold">{mode.name}</div>
                    <div className="text-sm text-gray-400">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-gray-200">Options</h3>
            <div className="space-y-4">
              {[
                {key:"negativeMarking", label:"Negative Marking", desc:"Wrong answers deduct 250 pts", icon:"⚠️"},
                {key:"showLeaderboard", label:"Live Leaderboard", desc:"Show ranking after each question", icon:"🏆"},
                {key:"soundEnabled", label:"Sound Effects", desc:"Audio cues for host display", icon:"🔊"},
                {key:"powerUpsEnabled", label:"Power-Ups", desc:"Students can use power-ups", icon:"⚡"},
                {key:"showExplanations", label:"Show Explanations", desc:"Display answer explanations", icon:"💡"},
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({...s, [opt.key]: !(s as any)[opt.key]}))}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      (settings as any)[opt.key] ? "bg-blue-600" : "bg-gray-700"
                    }`}
                    aria-label={`Toggle ${opt.label}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      (settings as any)[opt.key] ? "left-7" : "left-1"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button onClick={handleCreate} disabled={loading}
            className="w-full btn-primary text-xl py-5 rounded-2xl flex items-center justify-center gap-3"
            style={{background:"linear-gradient(135deg,#1A3FD8,#7C3AED)"}}>
            {loading ? (
              <><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Creating Game...</>
            ) : (
              <><span className="text-2xl">🚀</span> Create Game &amp; Get PIN</>
            )}
          </button>

          <p className="text-center text-gray-600 text-xs">
            Developed by Divyanshu · Powered by Cograd
          </p>
        </div>
      </div>
    </main>
  );
}
