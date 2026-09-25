import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0A0E27",
          blue: "#1A3FD8",
          electric: "#3B82F6",
          purple: "#7C3AED",
          cyan: "#06B6D4",
          gold: "#F59E0B",
          green: "#10B981",
          red: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "bounce-slow": "bounce 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "gradient": "gradient 4s ease infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "confetti": "confetti 0.6s ease-out",
        "timer-pulse": "timerPulse 1s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        timerPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.8" },
        },
      },
      backgroundSize: {
        "200%": "200% 200%",
      },
    },
  },
  plugins: [],
};
export default config;
