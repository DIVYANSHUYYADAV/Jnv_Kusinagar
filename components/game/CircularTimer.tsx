"use client";
import { useEffect, useState } from "react";

interface CircularTimerProps {
  totalSeconds: number;
  elapsedSeconds: number;
  size?: number;
}

export default function CircularTimer({ totalSeconds, elapsedSeconds, size = 100 }: CircularTimerProps) {
  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = remaining / totalSeconds;
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (remaining > totalSeconds * 0.5) return "#10B981"; // green
    if (remaining > totalSeconds * 0.25) return "#F59E0B"; // yellow
    return "#EF4444"; // red
  };

  const isUrgent = remaining <= 5 && remaining > 0;
  const color = getColor();

  return (
    <div
      className={`relative flex items-center justify-center ${isUrgent ? "animate-timer-pulse" : ""}`}
      style={{ width: size, height: size }}
      aria-label={`${remaining} seconds remaining`}
      role="timer"
    >
      <svg
        width={size}
        height={size}
        className="timer-ring"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          className="timer-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={8}
        />
        {/* Progress */}
        <circle
          className="timer-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 1s linear, stroke 0.5s ease",
            filter: isUrgent ? `drop-shadow(0 0 8px ${color})` : "none",
          }}
        />
      </svg>

      {/* Number */}
      <div
        className="absolute font-black font-display tabular-nums"
        style={{
          fontSize: size * 0.28,
          color,
          textShadow: isUrgent ? `0 0 12px ${color}` : "none",
        }}
      >
        {remaining}
      </div>
    </div>
  );
}
