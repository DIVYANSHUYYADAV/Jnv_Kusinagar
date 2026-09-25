// =============================================
// COGRAD QUEST — Sound Engine
// Simple procedural sounds using Web Audio API
// Developed by Divyanshu
// =============================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export const sounds = {
  correct() {
    playTone(523, 0.15, "sine", 0.4);
    setTimeout(() => playTone(659, 0.15, "sine", 0.4), 150);
    setTimeout(() => playTone(784, 0.3, "sine", 0.4), 300);
  },
  wrong() {
    playTone(220, 0.2, "sawtooth", 0.3);
    setTimeout(() => playTone(196, 0.4, "sawtooth", 0.2), 200);
  },
  countdown() {
    playTone(440, 0.1, "sine", 0.25);
  },
  urgentCountdown() {
    playTone(880, 0.08, "square", 0.3);
  },
  gameStart() {
    [0, 150, 300, 450].forEach((delay, i) => {
      setTimeout(() => playTone([392, 440, 523, 659][i], 0.2, "sine", 0.35), delay);
    });
  },
  leaderboard() {
    [0, 100, 200].forEach((delay, i) => {
      setTimeout(() => playTone([523, 587, 659][i], 0.25, "sine", 0.3), delay);
    });
  },
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4, "sine", 0.4), i * 200);
    });
  },
  join() {
    playTone(440, 0.1, "sine", 0.2);
    setTimeout(() => playTone(550, 0.1, "sine", 0.2), 120);
  },
};
