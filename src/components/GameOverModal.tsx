import React, { useEffect, useRef } from 'react';
import { GameEnding } from '../game/types';
import { drawPolitician } from '../game/renderer';

interface GameOverModalProps {
  ending: GameEnding | null;
  onRematch: () => void;
  onReturnToMap: () => void;
}

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

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0c1812] border-2 border-[#ffd700] rounded-2xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="inline-block px-3 py-1 bg-[#138808]/20 border border-[#138808] text-[#56d364] text-xs font-black uppercase tracking-wider rounded-full mb-2">
          SESSION ADJOURNED
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffd700] font-serif">
          {ending.title}
        </h1>

        <div className="text-sm font-bold text-white mt-1">
          {ending.winner.c.name} Wins ({ending.reason})
        </div>

        <div className="flex justify-center my-4">
          <canvas
            ref={canvasRef}
            width={120}
            height={150}
            className="rounded-xl border-2 border-[#ffd700] bg-[#14231a] shadow-xl"
          />
        </div>

        <p className="text-xs sm:text-sm text-[#d8e5dc] max-w-md mx-auto leading-relaxed bg-[#08120d] p-3 rounded-xl border border-[#1e3327]">
          {ending.narrative}
        </p>

        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            type="button"
            data-start="true"
            onClick={onRematch}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#ff9933] to-[#e65100] border border-[#ffd700] hover:brightness-110 active:scale-95 transition shadow-lg shadow-[#ff9933]/25"
          >
            Rematch Session ⚔️
          </button>
          <button
            type="button"
            onClick={onReturnToMap}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#15221b] hover:bg-[#1e3327] text-[#f5eedb] border border-[#2d4737] transition"
          >
            Return to India Map 🗺️
          </button>
        </div>
      </div>
    </div>
  );
};
