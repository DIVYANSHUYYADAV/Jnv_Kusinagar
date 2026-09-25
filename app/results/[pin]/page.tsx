"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { subscribeToGame } from "@/lib/gameEngine";
import type { Game, Player } from "@/types/game";

export default function ResultsPage() {
  const params = useParams();
  const pin = params.pin as string;
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!pin) return;
    const unsub = subscribeToGame(pin, setGame);
    return unsub;
  }, [pin]);

  if (!game) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  const players = Object.values(game.players || {}).filter(p => !p.kicked).sort((a,b)=>(b.score||0)-(a.score||0));

  return (
    <div className="min-h-screen gradient-hero px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Image src="/images/cograd-logo.jpeg" alt="Cograd" width={120} height={40}
            className="h-10 w-auto object-contain rounded-xl mx-auto mb-6"/>
          <h1 className="text-4xl font-black font-display gradient-text mb-2">Final Results</h1>
          <p className="text-gray-400">{game.title}</p>
        </div>

        {/* Podium */}
        {players.length >= 1 && (
          <div className="glass-card p-8 mb-6 text-center">
            <h2 className="text-xl font-black mb-6 font-display">🏆 Top Players</h2>
            <div className="flex items-end justify-center gap-4">
              {players[1] && (
                <div className="text-center">
                  <div className="text-3xl mb-1">{players[1].avatar}</div>
                  <div className="font-bold text-sm mb-2">{players[1].nickname}</div>
                  <div className="podium-2nd rounded-t-xl flex items-end justify-center pb-2">🥈</div>
                  <div className="text-sm font-bold text-gray-300">{(players[1].score||0).toLocaleString()}</div>
                </div>
              )}
              {players[0] && (
                <div className="text-center">
                  <div className="text-4xl mb-1 animate-float">{players[0].avatar}</div>
                  <div className="font-bold mb-2 text-yellow-300">{players[0].nickname}</div>
                  <div className="podium-1st rounded-t-xl flex items-end justify-center pb-2">🥇</div>
                  <div className="text-lg font-black text-yellow-400">{(players[0].score||0).toLocaleString()}</div>
                </div>
              )}
              {players[2] && (
                <div className="text-center">
                  <div className="text-3xl mb-1">{players[2].avatar}</div>
                  <div className="font-bold text-sm mb-2">{players[2].nickname}</div>
                  <div className="podium-3rd rounded-t-xl flex items-end justify-center pb-2">🥉</div>
                  <div className="text-sm font-bold text-amber-600">{(players[2].score||0).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full list */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-black mb-4">All Players</h2>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 glass rounded-xl">
                <span className="w-6 text-center font-bold text-gray-400">{i+1}</span>
                <span className="text-xl">{p.avatar}</span>
                <span className="flex-1 font-medium">{p.nickname}</span>
                <span className="font-black text-yellow-400">{(p.score||0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center space-y-3">
          <Link href="/" className="btn-primary w-full py-3 rounded-xl block text-center">
            🏠 Back to Home
          </Link>
          <p className="text-gray-600 text-xs">Built with ❤️ by Divyanshu · Powered by Cograd</p>
        </div>
      </div>
    </div>
  );
}
