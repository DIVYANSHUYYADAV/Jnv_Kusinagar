"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// ─── Animated coordinate plane background ───────────────────────────────────
function CoordinateBg() {
  const [dots, setDots] = useState<Array<{x:number;y:number;delay:number;size:number}>>([]);
  const [lines, setLines] = useState<Array<{x1:number;y1:number;x2:number;y2:number;delay:number}>>([]);

  useEffect(() => {
    setDots(Array.from({length:16}, (_,i) => ({
      x: 5 + (i%4)*25 + Math.random()*10,
      y: 10 + Math.floor(i/4)*22 + Math.random()*8,
      delay: i * 0.3,
      size: 3 + Math.random()*4,
    })));
    setLines(Array.from({length:6}, (_,i) => ({
      x1: Math.random()*100, y1: Math.random()*100,
      x2: Math.random()*100, y2: Math.random()*100,
      delay: i * 0.5,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3B82F6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* Axis lines */}
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.15"/>
        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.15"/>
      </svg>

      {/* Animated floating dots */}
      {dots.map((d, i) => (
        <div key={i} className="absolute rounded-full animate-float"
          style={{
            left: `${d.x}%`, top: `${d.y}%`,
            width: d.size, height: d.size,
            background: i%3===0 ? "#3B82F6" : i%3===1 ? "#7C3AED" : "#06B6D4",
            opacity: 0.6,
            animationDelay: `${d.delay}s`,
            animationDuration: `${2.5 + d.delay}s`,
          }}
        />
      ))}

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
        style={{background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)", filter:"blur(40px)"}} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)", filter:"blur(60px)"}} />
      <div className="absolute top-2/3 left-1/2 w-48 h-48 rounded-full opacity-10"
        style={{background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)", filter:"blur(30px)"}} />

      {/* Moving graph line */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" style={{animation:"fade 4s ease-in-out infinite"}}>
        <polyline points="5%,80% 20%,60% 35%,70% 50%,40% 65%,55% 80%,25% 95%,35%"
          fill="none" stroke="#06B6D4" strokeWidth="2" strokeDasharray="8 4"/>
      </svg>

      {/* Math symbols */}
      {["x", "y", "f(x)", "∑", "π", "√", "∫", "Δ"].map((sym, i) => (
        <div key={i} className="absolute text-blue-400 opacity-[0.07] font-mono font-bold select-none"
          style={{
            left: `${10 + (i%4)*25}%`, top: `${15 + Math.floor(i/4)*40}%`,
            fontSize: `${20 + i*3}px`,
            animation: `float ${3+i*0.5}s ease-in-out infinite`,
            animationDelay: `${i*0.4}s`,
          }}>
          {sym}
        </div>
      ))}
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────
function FeatureCard({icon, title, desc}:{icon:string;title:string;desc:string}) {
  return (
    <div className="glass-card p-6 text-center group cursor-default">
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-bold text-lg mb-2 font-display">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── How to Play Step ────────────────────────────────────────────────────────
function HowStep({num, title, desc, icon}:{num:number;title:string;desc:string;icon:string}) {
  return (
    <div className="flex items-start gap-4 animate-slide-in" style={{animationDelay:`${num*0.1}s`}}>
      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
        style={{background:"linear-gradient(135deg,#1A3FD8,#7C3AED)"}}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold mb-1 font-display">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [joinPin, setJoinPin] = useState("");
  const [showHow, setShowHow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleJoinQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = joinPin.replace(/\D/g, "").slice(0,6);
    if (pin.length === 6) router.push(`/join?pin=${pin}`);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen gradient-hero relative flex flex-col">
      <CoordinateBg />

      {/* ─── NAV ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={120} height={40}
            className="h-10 w-auto object-contain rounded-lg" />
          <span className="text-gray-400 text-sm hidden sm:block">×</span>
          <span className="text-white font-bold text-lg font-display hidden sm:block gradient-text">Quest</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHow(!showHow)}
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors hidden md:block">
            How to Play
          </button>
          <Link href="/host" className="btn-primary text-sm py-2 px-5">Host a Game</Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="animate-slide-in" style={{animationDelay:"0.1s"}}>
          {/* Cograd Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
                style={{background:"linear-gradient(135deg,#1A3FD8,#7C3AED)"}} />
              <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={200} height={70}
                className="relative h-14 w-auto object-contain rounded-2xl" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-black mb-4 font-display leading-none">
            <span className="gradient-text">Cograd</span>
            <br />
            <span className="text-white">Quest</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2 font-medium font-display">
            Learn. Think. Compete.
          </p>
          <p className="text-gray-500 text-sm mb-10">
            The ultimate classroom quiz experience — powered by Cograd
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href="/host" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-xl">
              <span>🎯</span> Host a Game
            </Link>
            <Link href="/join" className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-xl">
              <span>🎮</span> Join a Game
            </Link>
          </div>

          {/* Quick Join */}
          <div className="glass rounded-2xl p-6 max-w-sm mx-auto">
            <p className="text-sm text-gray-400 mb-3 font-medium">Have a Game PIN?</p>
            <form onSubmit={handleJoinQuick} className="flex gap-2">
              <input
                className="input-field text-center text-xl font-bold tracking-widest"
                placeholder="000000"
                value={joinPin}
                onChange={e => setJoinPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                maxLength={6}
                inputMode="numeric"
                aria-label="Enter Game PIN"
              />
              <button type="submit"
                className="btn-primary px-5 py-3 rounded-xl flex-shrink-0"
                disabled={joinPin.length !== 6}>
                →
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 px-6 py-16 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center mb-12 font-display gradient-text">
          Why Cograd Quest?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FeatureCard icon="⚡" title="Real-time Play" desc="Instant synchronization across all devices" />
          <FeatureCard icon="🏆" title="Live Leaderboard" desc="Rankings update after every question" />
          <FeatureCard icon="📊" title="Deep Analytics" desc="Detailed scorecards for every student" />
          <FeatureCard icon="📱" title="Mobile First" desc="Optimized for phones and tablets" />
          <FeatureCard icon="🔥" title="Streak System" desc="Reward consecutive correct answers" />
          <FeatureCard icon="⚙️" title="3 Game Modes" desc="Classic, Speed Challenge, Survival" />
          <FeatureCard icon="📈" title="Visual Graphs" desc="Interactive coordinate plane questions" />
          <FeatureCard icon="🎯" title="Power-Ups" desc="Double points, time boost & more" />
        </div>
      </section>

      {/* ─── HOW TO PLAY ─── */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center mb-12 font-display gradient-text">How to Play</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-6 text-blue-400 font-display flex items-center gap-2">
              <span className="text-2xl">👨‍🏫</span> For Teachers / Hosts
            </h3>
            <div className="space-y-5">
              <HowStep num={1} icon="🎯" title="Create a Game" desc="Click 'Host a Game', set up your quiz settings, choose topic and time limit." />
              <HowStep num={2} icon="📋" title="Share PIN" desc="Get a 6-digit Game PIN. Share it with students or let them scan a QR code." />
              <HowStep num={3} icon="▶️" title="Start the Game" desc="Watch students join the lobby, then press Start when ready." />
              <HowStep num={4} icon="📊" title="View Analytics" desc="After the game, download detailed scorecards and question-wise analytics." />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6 text-purple-400 font-display flex items-center gap-2">
              <span className="text-2xl">🧑‍🎓</span> For Students
            </h3>
            <div className="space-y-5">
              <HowStep num={1} icon="🔑" title="Enter PIN" desc="Get the 6-digit PIN from your teacher or scan the QR code." />
              <HowStep num={2} icon="😎" title="Pick a Nickname" desc="Choose a fun nickname and avatar to represent you in the game." />
              <HowStep num={3} icon="⚡" title="Answer Fast!" desc="Questions appear on screen. Answer quickly to earn speed bonuses!" />
              <HowStep num={4} icon="🏆" title="Climb the Leaderboard" desc="Build streaks, use power-ups, and reach the top of the leaderboard." />
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT COGRAD ─── */}
      <section className="relative z-10 px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <div className="glass-card p-10">
          <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={160} height={54}
            className="h-12 w-auto object-contain rounded-xl mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4 font-display">About Cograd</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            Cograd — <em>Connecting Grads</em> — is India's innovative ed-tech platform
            transforming how students learn. Cograd Quest is our interactive classroom
            gaming platform, making education engaging, competitive, and fun.
          </p>
          <p className="text-sm text-gray-500">
            🎓 Making every classroom a stage for learning
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-8 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={80} height={28}
              className="h-7 w-auto object-contain rounded-lg" />
            <span className="text-gray-500 text-sm">Cograd Quest v1.0</span>
          </div>
          <div className="text-gray-500 text-sm text-center">
            <span className="gradient-text font-bold">Learn. Think. Compete.</span>
          </div>
          <div className="text-gray-600 text-xs">
            Built with ❤️ by <span className="text-blue-400 font-semibold">Divyanshu</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
