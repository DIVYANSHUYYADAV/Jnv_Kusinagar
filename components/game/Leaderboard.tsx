"use client";
import type { Player } from "@/types/game";

interface LeaderboardProps {
  players: Player[];
  currentPlayerId?: string;
  maxShow?: number;
  compact?: boolean;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "border-yellow-400 bg-yellow-400/10",
  "border-gray-400 bg-gray-400/10",
  "border-amber-600 bg-amber-600/10",
];

export default function Leaderboard({ players, currentPlayerId, maxShow = 10, compact = false }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, maxShow);

  return (
    <div className="space-y-2" role="list" aria-label="Leaderboard">
      {sorted.map((player, idx) => {
        const isCurrent = player.id === currentPlayerId;
        const isTop3 = idx < 3;

        return (
          <div
            key={player.id}
            className={`leaderboard-item flex items-center gap-3 animate-slide-in ${
              isCurrent ? "border-blue-500/60 bg-blue-500/10" : ""
            } ${isTop3 ? RANK_COLORS[idx] : ""}`}
            style={{ animationDelay: `${idx * 0.05}s` }}
            role="listitem"
            aria-label={`Rank ${idx + 1}: ${player.nickname}, ${player.score} points`}
          >
            {/* Rank */}
            <div className={`flex-shrink-0 font-black text-center ${compact ? "w-6 text-sm" : "w-8"}`}>
              {isTop3 ? (
                <span className="text-lg">{RANK_ICONS[idx]}</span>
              ) : (
                <span className="text-gray-500 text-sm">#{idx + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <div className={`flex-shrink-0 ${compact ? "text-lg" : "text-2xl"}`}>
              {player.avatar}
            </div>

            {/* Name + streak */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-bold truncate ${compact ? "text-sm" : ""} ${isCurrent ? "text-blue-300" : "text-white"}`}>
                  {player.nickname}
                  {isCurrent && <span className="text-xs text-blue-400 ml-1">(You)</span>}
                </span>
                {(player.streak || 0) >= 2 && (
                  <span className="streak-badge text-xs">
                    🔥 {player.streak}
                  </span>
                )}
              </div>
              {!compact && (
                <div className="text-xs text-gray-500">
                  ✓{player.correctAnswers || 0} ✗{player.wrongAnswers || 0}
                </div>
              )}
            </div>

            {/* Score */}
            <div className={`font-black tabular-nums flex-shrink-0 ${compact ? "text-sm" : "text-lg"}`}
              style={{color: isTop3 ? ["#FBBF24","#9CA3AF","#B45309"][idx] : (isCurrent ? "#60A5FA" : "white")}}>
              {(player.score || 0).toLocaleString()}
            </div>
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="text-center text-gray-500 py-8 text-sm">
          No players yet...
        </div>
      )}
    </div>
  );
}
