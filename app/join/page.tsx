"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { joinGame, checkGameExists, getActiveGames } from "@/lib/gameEngine";
import { AVATARS } from "@/types/game";
import toast from "react-hot-toast";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🧠");
  const [loading, setLoading] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [step, setStep] = useState<"pin" | "details">("pin");
  const [gameTitle, setGameTitle] = useState<string>("");
  const [activeGames, setActiveGames] = useState<Array<{ pin: string; title: string; playerCount: number; status: string }>>([]);

  // Load any currently active games waiting in the lobby
  useEffect(() => {
    getActiveGames().then((games) => {
      setActiveGames(games.filter((g) => g.status === "lobby"));
    });
  }, []);

  // If PIN came from query param, auto-verify
  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && urlPin.trim().length === 6) {
      verifyAndAdvance(urlPin.trim());
    }
  }, [searchParams]);

  const verifyAndAdvance = async (targetPin: string) => {
    const clean = targetPin.trim().replace(/\D/g, "");
    if (clean.length !== 6) {
      toast.error("Please enter a valid 6-digit PIN.");
      return;
    }

    setVerifyingPin(true);
    const res = await checkGameExists(clean);
    setVerifyingPin(false);

    if (res.exists && res.game) {
      setPin(clean);
      setGameTitle(res.game.title);
      setStep("details");
      toast.success(`Game found: ${res.game.title}`);
    } else {
      toast.error(res.error || `Game PIN "${clean}" not found.`);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyAndAdvance(pin);
  };

  const handleSelectActiveGame = (activePin: string, title: string) => {
    setPin(activePin);
    setGameTitle(title);
    setStep("details");
    toast.success(`Selected: ${title}`);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      toast.error("Please enter a nickname!");
      return;
    }

    setLoading(true);
    const result = await joinGame(pin, cleanNick, avatar);
    if (result.success && result.playerId) {
      localStorage.setItem(`cogradPlayer_${pin}`, result.playerId);
      localStorage.setItem(`cogradNickname_${pin}`, cleanNick);
      localStorage.setItem(`cogradAvatar_${pin}`, avatar);
      toast.success("You're in! 🎉");
      router.push(`/game/${pin}?player=${result.playerId}`);
    } else {
      toast.error(result.error || "Failed to join. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-10">
      {/* Background dots */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              left: `${8 + i * 8}%`,
              top: `${10 + Math.sin(i) * 35}%`,
              width: 6,
              height: 6,
              background: i % 2 === 0 ? "#3B82F6" : "#7C3AED",
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <Link href="/" className="mb-6 z-10">
        <Image
          src="/images/cograd-logo.jpeg"
          alt="Cograd"
          width={140}
          height={48}
          className="h-12 w-auto object-contain rounded-xl"
        />
      </Link>

      {step === "pin" ? (
        /* ─── STEP 1: Enter PIN ─── */
        <div className="glass-card p-8 w-full max-w-sm animate-scale-in z-10">
          <h1 className="text-3xl font-black text-center mb-2 font-display gradient-text">Join Game</h1>
          <p className="text-gray-400 text-center text-sm mb-6">Enter the 6-digit Game PIN</p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                className="input-field text-center text-3xl font-black tracking-[0.3em] py-5 font-mono"
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoFocus
                aria-label="Game PIN"
              />
              {pin.length > 0 && pin.length < 6 && (
                <p className="text-xs text-gray-500 text-center mt-2">{6 - pin.length} more digits</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pin.length !== 6 || verifyingPin}
              className="w-full btn-primary py-4 text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifyingPin ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking Game PIN...</span>
                </>
              ) : (
                <span>Continue →</span>
              )}
            </button>
          </form>

          {/* Active Games detected on local server */}
          {activeGames.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 text-center">
                🟢 Live Games in Lobby
              </p>
              <div className="space-y-2">
                {activeGames.map((g) => (
                  <button
                    key={g.pin}
                    type="button"
                    onClick={() => handleSelectActiveGame(g.pin, g.title)}
                    className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-gray-200 truncate">{g.title}</div>
                      <div className="text-[11px] text-gray-400">{g.playerCount} player(s) joined</div>
                    </div>
                    <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded text-xs">
                      PIN: {g.pin}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-gray-600 text-xs mt-6">
            Cograd Quest · Developed by Divyanshu
          </p>
        </div>
      ) : (
        /* ─── STEP 2: Choose nickname & avatar ─── */
        <div className="glass-card p-8 w-full max-w-sm animate-scale-in z-10">
          {/* PIN display & game title */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-1.5 mb-2">
              {pin.split("").map((ch, i) => (
                <div key={i} className="pin-char">
                  {ch}
                </div>
              ))}
            </div>
            {gameTitle && <p className="text-xs text-blue-400 font-medium truncate">{gameTitle}</p>}
          </div>

          <h2 className="text-2xl font-black text-center mb-6 font-display">Your Identity</h2>

          <form onSubmit={handleJoin} className="space-y-5">
            {/* Nickname */}
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-medium">Nickname</label>
              <input
                className="input-field text-lg font-bold"
                placeholder="e.g. SuperSolver"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
                aria-label="Your nickname"
              />
              <p className="text-xs text-gray-600 mt-1">{nickname.length}/20</p>
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-medium">Pick Your Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    aria-label={`Avatar ${a}`}
                    className={`text-2xl h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
                      avatar === a
                        ? "bg-blue-600/40 border-2 border-blue-400 scale-110"
                        : "bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="text-3xl">{avatar}</div>
              <div className="min-w-0">
                <div className="font-bold truncate">{nickname || "Your Name"}</div>
                <div className="text-xs text-gray-500 font-mono">Game PIN: {pin}</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="w-full btn-success py-4 text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>🚀</span> <span>Join Game!</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep("pin")}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              ← Change PIN
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen gradient-hero flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
