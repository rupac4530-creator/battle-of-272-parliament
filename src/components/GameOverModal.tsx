import React, { useEffect, useMemo, useRef } from 'react';
import { GameEnding } from '../game/types';
import { drawPolitician } from '../game/renderer';
import { winnerPortraitLayout, makeConfetti, ConfettiPiece } from '../game/logic';
import { GAME_OVER } from '../game/balance';
import { useModalA11y } from '../hooks/useModalA11y';
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
  // Rolled once per game-over screen: a re-render (the sidebar log, the AI tick) must not re-roll the confetti.
  const confetti: ConfettiPiece[] = useMemo(() => makeConfetti(CONFETTI_COLORS), []);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Focus stays inside; no Esc here, because both ways out (Rematch, Return to Map) are real choices.
  useModalA11y(dialogRef, { active: !!ending });

  useEffect(() => {
    if (!ending) return;
    let animId: number;
    const render = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Scale and feet are chosen so the whole fighter, head included, fits inside the portrait frame.
          const fit = winnerPortraitLayout(canvas.width, canvas.height);
          drawPolitician(ctx, ending.winner.c, fit.x, fit.baselineY, 1, {
            scale: fit.scale,
            time: performance.now() * 0.001,
            isSuper: true,
            superPhase: 0.6
          });
        }
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [ending]);

  if (!ending) return null;

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-hidden">
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

      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gameover-title" className="w-full max-w-lg max-h-app-92 overflow-y-auto glass border-2 border-[#ffd700] rounded-2xl p-4 sm:p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#138808]/20 border border-[#138808] text-[#56d364] text-[11px] font-black uppercase tracking-wider rounded-full mb-2">
          <Trophy size={13} />
          SESSION ADJOURNED
        </div>

        {/* Crown icon above title */}
        <div className="flex justify-center mb-0.5">
          <Crown size={24} className="text-[#ffd700] animate-float sm:hidden" />
          <Crown size={28} className="text-[#ffd700] animate-float hidden sm:block" />
        </div>

        <h2 id="gameover-title" className="text-xl sm:text-3xl font-extrabold text-gradient-gold font-serif tracking-tight">
          {ending.title}
        </h2>

        <div className="text-xs sm:text-sm font-bold text-white mt-1 flex items-center justify-center gap-1.5">
          {ending.winner.c.name} Wins ({ending.reason})
        </div>

        <div className="flex justify-center my-2 sm:my-3">
          <canvas
            ref={canvasRef}
            width={GAME_OVER.portraitW}
            height={GAME_OVER.portraitH}
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
