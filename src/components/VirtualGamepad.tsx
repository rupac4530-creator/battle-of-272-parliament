import React, { useRef } from 'react';
import { MessageSquare, Zap, Flame, Shield, Swords, ArrowUp, Footprints } from 'lucide-react';
import { padLayout } from '../game/logic';
import { PAD } from '../game/balance';

export type PadAction = 'strike' | 'kick' | 'special' | 'line' | 'super';
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

/** Short haptic tick. Not every browser has it (iOS Safari does not), so it must never throw. */
const buzz = () => {
  try {
    navigator.vibrate?.(PAD.vibrateMs);
  } catch {
    /* haptics are optional */
  }
};

interface BtnProps {
  icon?: React.ReactNode;
  label: string;
  labelPx: number;
  cls: string;
  size: number;
  onDown: () => void;
  onUp?: () => void;
  extra?: string;
}

const PadButton: React.FC<BtnProps> = ({ icon, label, labelPx, cls, size, onDown, onUp, extra = '' }) => (
  <button
    type="button"
    style={{ width: size, height: size, touchAction: 'none' }}
    className={`rounded-full border-2 text-white font-black flex flex-col items-center justify-center leading-none shadow-xl active:scale-90 transition-all duration-150 select-none ${cls} ${extra}`}
    onPointerDown={e => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      buzz();
      onDown();
    }}
    onPointerUp={() => onUp?.()}
    onPointerCancel={() => onUp?.()}
    onContextMenu={e => e.preventDefault()}
  >
    {icon && <span className="flex items-center justify-center">{icon}</span>}
    <span style={{ fontSize: labelPx }} className="mt-0.5 opacity-90 whitespace-nowrap">{label}</span>
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
  const { stick, big, small, label, bigLabel, iconSmall, iconBig, showIcons } = padLayout(areaW, areaH, variant);
  const maxR = stick / 2 - 14;

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
  const tap = (a: PadAction) => () => onAction(a);
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
      <span className="absolute top-1 text-[11px] text-[#ffd700]/70 font-black">▲ JUMP</span>
      <span className="absolute bottom-1 text-[11px] text-[#ffd700]/70 font-black">▼ BLOCK</span>
      <span className="absolute left-1.5 text-[11px] text-white/50">◀</span>
      <span className="absolute right-1.5 text-[11px] text-white/50">▶</span>
      <div
        ref={knobRef}
        style={{ width: stick * 0.42, height: stick * 0.42 }}
        className={`rounded-full border-2 border-white shadow-lg pointer-events-none transition-transform duration-75 ${
          player === 1 ? 'bg-gradient-to-b from-[#58a6ff] to-[#1f6feb]' : 'bg-gradient-to-b from-[#ff7b72] to-[#c62828]'
        }`}
      />
    </div>
  );

  const bLine = <PadButton key="line" icon={showIcons ? <MessageSquare size={iconSmall} /> : undefined} label="LINE" labelPx={label} size={small} cls="bg-gradient-to-br from-[#8957e5] to-[#5a32a3] border-[#bc8cff]" onDown={tap('line')} />;
  const bSpec = <PadButton key="spec" icon={showIcons ? <Zap size={iconSmall} /> : undefined} label="SPEC" labelPx={label} size={small} cls="bg-gradient-to-br from-[#138808] to-[#0e5b06] border-[#56d364]" onDown={tap('special')} />;
  const bSuper = (
    <PadButton
      key="super"
      icon={showIcons ? <Flame size={iconSmall} /> : undefined}
      label="SUPER"
      labelPx={label}
      size={small}
      cls="bg-gradient-to-br from-[#ffd700] to-[#ff9933] border-white !text-black"
      extra={isSuperReady ? 'animate-pulse shadow-[0_0_26px_#ffd700]' : 'opacity-60'}
      onDown={tap('super')}
    />
  );
  const bBlock = <PadButton key="block" icon={showIcons ? <Shield size={iconSmall} /> : undefined} label="BLOCK" labelPx={label} size={small} cls="bg-gradient-to-br from-[#1f6feb] to-[#0b3d91] border-[#79c0ff]" onDown={hold('block', true)} onUp={hold('block', false)} />;
  const bStrike = <PadButton key="strike" icon={showIcons ? <Swords size={iconBig} /> : undefined} label="STRIKE" labelPx={bigLabel} size={big} cls="bg-gradient-to-br from-[#e63946] to-[#9b1c1c] border-[#ff7b72]" onDown={tap('strike')} />;
  const bKick = <PadButton key="kick" icon={showIcons ? <Footprints size={iconSmall} /> : undefined} label="KICK" labelPx={label} size={small} cls="bg-gradient-to-br from-[#f77f00] to-[#b85c00] border-[#ffb703]" onDown={tap('kick')} />;
  const bJump = <PadButton key="jump" icon={showIcons ? <ArrowUp size={iconSmall} /> : undefined} label="JUMP" labelPx={label} size={small} cls="bg-gradient-to-br from-[#455a64] to-[#263238] border-[#90a4ae]" onDown={hold('jump', true)} onUp={hold('jump', false)} />;

  // A row of 3 over a row of 4. STRIKE (the biggest) sits in the middle of the bottom row, where the thumb rests.
  const rows = [[bLine, bSpec, bSuper], [bBlock, bStrike, bKick, bJump]];
  const buttons = (
    <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
      {rows.map((row, i) => (
        <div key={i} className="flex items-end gap-1.5">
          {row}
        </div>
      ))}
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
