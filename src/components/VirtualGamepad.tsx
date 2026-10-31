import React, { useRef } from 'react';
import { playSound } from '../game/audio';
import { MessageSquare, Zap, Flame, Shield, Swords, ArrowUp } from 'lucide-react';

export type PadAction = 'strike' | 'special' | 'line' | 'super';
export type PadHold = 'block' | 'jump';

interface VirtualGamepadProps {
  player: 1 | 2;
  variant: 'split' | 'left' | 'right';
  isVisible: boolean;
  isSuperReady: boolean;
  isForceRotated?: boolean;
  onMove: (dx: number, dy: number) => void;
  onHold: (k: PadHold, on: boolean) => void;
  onAction: (a: PadAction) => void;
}

interface BtnProps {
  icon: React.ReactNode;
  label: string;
  cls: string;
  size: number;
  onDown: () => void;
  onUp?: () => void;
  extra?: string;
}

const PadButton: React.FC<BtnProps> = ({ icon, label, cls, size, onDown, onUp, extra = '' }) => (
  <button
    type="button"
    style={{ width: size, height: size, touchAction: 'none' }}
    className={`rounded-full border-2 text-white font-black flex flex-col items-center justify-center leading-none shadow-xl active:scale-90 transition-all duration-150 select-none ${cls} ${extra}`}
    onPointerDown={e => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onDown();
    }}
    onPointerUp={() => onUp?.()}
    onPointerCancel={() => onUp?.()}
    onContextMenu={e => e.preventDefault()}
  >
    <span className="flex items-center justify-center">{icon}</span>
    <span style={{ fontSize: Math.max(8, size * 0.14) }} className="mt-0.5 opacity-90">{label}</span>
  </button>
);

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({
  player,
  variant,
  isVisible,
  isSuperReady,
  isForceRotated = false,
  onMove,
  onHold,
  onAction
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pidRef = useRef<number | null>(null);

  // Size controls from the game area the player actually sees (swapped when the UI is rotated)
  const areaH = typeof window !== 'undefined' ? (isForceRotated ? window.innerWidth : window.innerHeight) : 768;
  const areaW = typeof window !== 'undefined' ? (isForceRotated ? window.innerHeight : window.innerWidth) : 1024;
  const isMobileScreen = areaH <= 520 || areaW <= 768;
  const compact = variant !== 'split' || isMobileScreen;
  const stick = compact ? (isMobileScreen ? 88 : 96) : 124;
  const big = compact ? (isMobileScreen ? 48 : 52) : 68;
  const small = compact ? (isMobileScreen ? 38 : 42) : 52;
  const maxR = stick / 2 - 14;
  const iconSmall = Math.max(14, small * 0.34);
  const iconBig = Math.max(16, big * 0.34);

  if (!isVisible) return null;

  const drag = (cx: number, cy: number) => {
    if (!baseRef.current || !knobRef.current) return;
    const r = baseRef.current.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);

    // If forced 90-degree CSS rotation is active, rotate pointer delta
    if (isForceRotated) {
      const rotDx = dy;
      const rotDy = -dx;
      dx = rotDx;
      dy = rotDy;
    }

    const d = Math.hypot(dx, dy);
    if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / maxR, dy / maxR);
  };
  const release = () => {
    pidRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    onMove(0, 0);
  };
  const tap = (a: PadAction) => () => { playSound(380, 0.05, 'triangle', 0.03); onAction(a); };
  const hold = (k: PadHold, on: boolean) => () => onHold(k, on);

  const joystick = (
    <div
      ref={baseRef}
      style={{ width: stick, height: stick, touchAction: 'none' }}
      className="rounded-full bg-[radial-gradient(circle,#1a2b21_0%,#08100c_75%)] border-2 border-[#ffd700]/60 relative flex items-center justify-center shadow-2xl pointer-events-auto"
      onPointerDown={e => {
        e.preventDefault();
        pidRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag(e.clientX, e.clientY);
      }}
      onPointerMove={e => { if (pidRef.current === e.pointerId) drag(e.clientX, e.clientY); }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={e => e.preventDefault()}
    >
      <span className="absolute top-1 text-[9px] text-[#ffd700]/70 font-black">▲ JUMP</span>
      <span className="absolute bottom-1 text-[9px] text-[#ffd700]/70 font-black">▼ BLOCK</span>
      <span className="absolute left-1.5 text-[10px] text-white/50">◀</span>
      <span className="absolute right-1.5 text-[10px] text-white/50">▶</span>
      <div
        ref={knobRef}
        style={{ width: stick * 0.42, height: stick * 0.42 }}
        className={`rounded-full border-2 border-white shadow-lg pointer-events-none transition-transform duration-75 ${
          player === 1 ? 'bg-gradient-to-b from-[#58a6ff] to-[#1f6feb]' : 'bg-gradient-to-b from-[#ff7b72] to-[#c62828]'
        }`}
      />
    </div>
  );

  const buttons = (
    <div className="grid grid-cols-3 gap-1.5 items-center justify-items-center pointer-events-auto">
      <PadButton icon={<MessageSquare size={iconSmall} />} label="LINE" size={small} cls="bg-gradient-to-br from-[#8957e5] to-[#5a32a3] border-[#bc8cff]" onDown={tap('line')} />
      <PadButton icon={<Zap size={iconSmall} />} label="SPECIAL" size={small} cls="bg-gradient-to-br from-[#138808] to-[#0e5b06] border-[#56d364]" onDown={tap('special')} />
      <PadButton
        icon={<Flame size={iconSmall} />}
        label="SUPER"
        size={small}
        cls="bg-gradient-to-br from-[#ffd700] to-[#ff9933] border-white !text-black"
        extra={isSuperReady ? 'animate-pulse shadow-[0_0_26px_#ffd700]' : 'opacity-60'}
        onDown={tap('super')}
      />
      <PadButton icon={<Shield size={iconSmall} />} label="BLOCK" size={small} cls="bg-gradient-to-br from-[#1f6feb] to-[#0b3d91] border-[#79c0ff]" onDown={hold('block', true)} onUp={hold('block', false)} />
      <PadButton icon={<Swords size={iconBig} />} label="STRIKE" size={big} cls="bg-gradient-to-br from-[#e63946] to-[#9b1c1c] border-[#ff7b72]" onDown={tap('strike')} />
      <PadButton icon={<ArrowUp size={iconSmall} />} label="JUMP" size={small} cls="bg-gradient-to-br from-[#455a64] to-[#263238] border-[#90a4ae]" onDown={hold('jump', true)} onUp={hold('jump', false)} />
    </div>
  );

  const layout =
    variant === 'split'
      ? 'justify-between left-2 right-2 sm:left-4 sm:right-4'
      : variant === 'left'
      ? 'justify-start gap-2 left-2 sm:left-4'
      : 'justify-start gap-2 right-2 sm:right-4 flex-row-reverse';

  return (
    <div
      style={{
        paddingBottom: 'max(0.25rem, var(--sa-bottom, 6px))',
        paddingLeft: 'max(0.5rem, var(--sa-left, 8px))',
        paddingRight: 'max(0.5rem, var(--sa-right, 8px))'
      }}
      className={`absolute bottom-1 sm:bottom-3 flex items-end pointer-events-none z-30 select-none ${layout}`}
    >
      {joystick}
      {buttons}
    </div>
  );
};
