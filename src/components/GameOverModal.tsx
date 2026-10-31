import React, { useEffect, useRef } from 'react';
import { GameEnding } from '../game/types';
import { drawPolitician } from '../game/renderer';
import { Swords, Map, Trophy, Crown } from 'lucide-react';

interface GameOverModalProps {
  ending: GameEnding | null;
  onRematch: () => void;
  onReturnToMap: () => void;
}

const CONFETTI_COLORS = ['#ffd700', '#ff9933', '#138808', '#56d364', '#58a6ff', '#ffffff'];

export const GameOverModal: React.FC<GameOverModalProps> = ({
  ending,
  onRematch,
  onReturnToMap
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ending || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPolitician(ctx, ending.winner.c, canvas.width / 2, canvas.height - 6, 1, { scale: 1.4 });
  }, [ending]);

  if (!ending) return null;

  // Generate confetti particles
  const confetti = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 3}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
    size: 4 + Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Confetti */}
      {confetti.map((c, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: c.left,
            top: '-10px',
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animationDelay: c.delay,
            animationDuration: c.duration,
            transform: `rotate(${c.rotation}deg)`,
          }}
        />
      ))}

      <div className="w-full max-w-lg max-h-app-92 overflow-y-auto glass border-2 border-[#ffd700] rounded-2xl p-4 sm:p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#138808]/20 border border-[#138808] text-[#56d364] text-[11px] font-black uppercase tracking-wider rounded-full mb-2">
          <Trophy size={13} />
          SESSION ADJOURNED
        </div>

        {/* Crown icon above title */}
        <div className="flex justify-center mb-0.5">
          <Crown size={24} className="text-[#ffd700] animate-float sm:hidden" />
          <Crown size={28} className="text-[#ffd700] animate-float hidden sm:block" />
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-gradient-gold font-serif tracking-tight">
          {ending.title}
        </h1>

        <div className="text-xs sm:text-sm font-bold text-white mt-1 flex items-center justify-center gap-1.5">
          {ending.winner.c.name} Wins ({ending.reason})
        </div>

        <div className="flex justify-center my-2 sm:my-3">
          <canvas
            ref={canvasRef}
            width={100}
            height={125}
            className="rounded-xl border-2 border-[#ffd700] bg-[#14231a] shadow-xl glow-gold w-20 h-25 sm:w-28 sm:h-35"
          />
        </div>

        <p className="text-[11px] sm:text-xs md:text-sm text-[#d8e5dc] max-w-md mx-auto leading-relaxed glass-dark p-2.5 sm:p-3.5 rounded-xl border border-[#1e3327]">
          {ending.narrative}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-5">
          <button
            type="button"
            data-start="true"
            onClick={onRematch}
            className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#ff9933] to-[#e65100] border border-[#ffd700] hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-[#ff9933]/25 flex items-center gap-1.5 btn-shimmer"
          >
            Rematch Session <Swords size={15} />
          </button>
          <button
            type="button"
            onClick={onReturnToMap}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold glass hover:bg-[#1e3327] text-[#f5eedb] border border-[#2d4737] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
          >
            Return to India Map <Map size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
