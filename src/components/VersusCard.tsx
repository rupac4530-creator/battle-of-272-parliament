import React from 'react';
import { Shuffle, ArrowLeft } from 'lucide-react';
import type { Politician } from '../game/types';
import { POLITICIANS } from '../game/logic';
import { VS } from '../game/balance';

interface VersusCardProps {
  /** 'pick': Player 2 chooses a fighter (2-Player). 'vs': the matchup is shown for a moment, then the match starts. */
  phase: 'pick' | 'vs';
  p1: Politician;
  p2: Politician | null;
  is2Player: boolean;
  onPick: (p: Politician) => void;
  onShuffle: () => void;
  /** A tap anywhere on the card (the App decides whether it is too early to count). */
  onTapCard: () => void;
  onBack: () => void;
}

const Side: React.FC<{ p: Politician; label: string; align: 'left' | 'right' }> = ({ p, label, align }) => (
  <div
    className={`flex-1 min-w-0 rounded-xl border-2 px-3 py-2 sm:px-5 sm:py-4 ${align === 'left' ? 'text-left' : 'text-right'}`}
    style={{ borderColor: p.col, background: `linear-gradient(${align === 'left' ? '100deg' : '260deg'}, ${p.col}55, #0a1410 70%)` }}
  >
    <div className="text-[11px] font-bold tracking-widest text-[#ffd700]">{label}</div>
    <div className="font-serif font-extrabold text-white leading-tight text-lg sm:text-3xl truncate">{p.name}</div>
    <div className="text-[12px] sm:text-sm text-[#d7e0d3] truncate">{p.nameHi} • {p.state}</div>
    <div className="text-[12px] sm:text-sm text-[#f5eedb] mt-1 truncate">{p.title}</div>
    <div className="text-[11px] sm:text-xs text-[#ff9933] mt-1 truncate">Super: {p.superName}</div>
  </div>
);

export const VersusCard: React.FC<VersusCardProps> = ({ phase, p1, p2, is2Player, onPick, onShuffle, onTapCard, onBack }) => {
  if (phase === 'pick') {
    return (
      <div className="absolute inset-0 z-[60] bg-[#050a07] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Player 2: pick your fighter">
        <div className="min-h-full flex flex-col items-center justify-center gap-3 p-3 sm:p-6">
          <div className="text-[#ffd700] font-black tracking-widest text-sm sm:text-lg">PLAYER 2: PICK YOUR FIGHTER</div>
          <div className="text-[12px] text-[#d7e0d3]">Player 1 is <strong className="text-white">{p1.name}</strong></div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 w-full max-w-3xl" data-vs-grid>
            {POLITICIANS.map(p => {
              const taken = p.id === p1.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-vs-chip={p.id}
                  disabled={taken}
                  aria-label={taken ? `${p.name} (Player 1's fighter)` : `Pick ${p.name}`}
                  onClick={() => onPick(p)}
                  className="flex items-center justify-center gap-2 rounded-xl border px-2 font-bold text-[13px] text-[#f5eedb] glass border-[#1e3327] enabled:hover:border-[#ffd700] disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ minHeight: VS.chipHeight }}
                >
                  <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: p.col, boxShadow: `0 0 0 2px ${p.colSecondary}` }} />
                  <span className="truncate">{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 text-[13px] font-bold text-[#f5eedb]"
            style={{ minHeight: VS.chipHeight }}
          >
            <ArrowLeft size={14} /> Back to map
          </button>
        </div>
      </div>
    );
  }

  if (!p2) return null;
  return (
    <div
      className="absolute inset-0 z-[60] bg-[#050a07] overflow-y-auto cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label={`${p1.name} versus ${p2.name}`}
      data-vs-card
      onClick={onTapCard}
    >
      <div className="min-h-full flex flex-col items-center justify-center gap-3 p-3 sm:p-6">
        <div className="flex items-stretch gap-2 sm:gap-4 w-full max-w-4xl">
          <Side p={p1} label={is2Player ? 'PLAYER 1' : 'YOU'} align="left" />
          <div className="self-center font-serif font-black italic text-3xl sm:text-5xl text-[#ffd700] drop-shadow">VS</div>
          <Side p={p2} label={is2Player ? 'PLAYER 2' : 'CPU'} align="right" />
        </div>
        <div className="w-full max-w-md h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
          <div
            key={`${p1.id}-${p2.id}`}
            className="h-full bg-[#ff9933]"
            style={{ animation: `vs-bar ${VS.autoStartSeconds}s linear forwards` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {!is2Player && (
            <button
              type="button"
              data-vs-shuffle
              onClick={e => { e.stopPropagation(); e.currentTarget.blur(); onShuffle(); }}
              className="flex items-center gap-2 rounded-xl border border-[#ffd700] glass px-4 text-[13px] font-bold text-[#ffd700]"
              style={{ minHeight: VS.chipHeight }}
            >
              <Shuffle size={14} /> Shuffle opponent
            </button>
          )}
          <button
            type="button"
            data-vs-back
            onClick={e => { e.stopPropagation(); onBack(); }}
            className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 text-[13px] font-bold text-[#f5eedb]"
            style={{ minHeight: VS.chipHeight }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        <div className="text-[12px] text-[#8ea396]">Tap or press Enter to start now • Esc to go back</div>
      </div>
    </div>
  );
};
