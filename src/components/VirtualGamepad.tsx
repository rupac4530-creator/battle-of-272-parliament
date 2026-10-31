import React, { useRef } from 'react';
import { playSound } from '../game/audio';

interface VirtualGamepadProps {
  onJoystickMove: (dx: number, dy: number) => void;
  onJoystickRelease: () => void;
  onAction: (action: 'strike' | 'special' | 'line' | 'super') => void;
  isSuperReady: boolean;
  isVisible: boolean;
}

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({
  onJoystickMove,
  onJoystickRelease,
  onAction,
  isSuperReady,
  isVisible
}) => {
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const maxRadius = 36;

  if (!isVisible) return null;

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!joyBaseRef.current || !joyKnobRef.current) return;
    const rect = joyBaseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    joyKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    onJoystickMove(dx / maxRadius, dy / maxRadius);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    playSound(300, 0.05, 'triangle', 0.02);
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    pointerIdRef.current = null;
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onJoystickRelease();
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-30 select-none">
      {/* Left: Analog Joystick */}
      <div className="pointer-events-auto">
        <div
          ref={joyBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={e => {
            if (pointerIdRef.current === e.pointerId) handlePointerMove(e.clientX, e.clientY);
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-28 h-28 rounded-full bg-gradient-to-b from-[#14201a]/90 to-[#08100c]/95 border-2 border-[#ffd700]/50 relative flex items-center justify-center shadow-2xl touch-none cursor-crosshair"
          title="Drag to Move"
        >
          <div
            ref={joyKnobRef}
            className="w-12 h-12 rounded-full bg-gradient-to-b from-[#58a6ff] to-[#1f6feb] border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
          />
        </div>
      </div>

      {/* Right: Tactile Action Buttons Cluster */}
      <div className="pointer-events-auto">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onAction('special')}
            onPointerDown={e => {
              e.preventDefault();
              onAction('special');
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#138808] to-[#0e5b06] border-2 border-[#56d364] text-white font-black text-[9px] flex flex-col items-center justify-center shadow-xl active:scale-90 transition"
            title="Special Move [K]"
          >
            <span className="text-sm">⚡</span>
            <span>SPECIAL</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('strike')}
            onPointerDown={e => {
              e.preventDefault();
              onAction('strike');
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e63946] to-[#b71c1c] border-2 border-[#ff7b72] text-white font-black text-[9px] flex flex-col items-center justify-center shadow-xl active:scale-90 transition"
            title="Strike [J / Space]"
          >
            <span className="text-sm">⚔️</span>
            <span>STRIKE</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('line')}
            onPointerDown={e => {
              e.preventDefault();
              onAction('line');
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8957e5] to-[#5a32a3] border-2 border-[#bc8cff] text-white font-black text-[9px] flex flex-col items-center justify-center shadow-xl active:scale-90 transition"
            title="Pickup Line [F]"
          >
            <span className="text-sm">💬</span>
            <span>LINE</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('super')}
            onPointerDown={e => {
              e.preventDefault();
              onAction('super');
            }}
            className={`w-14 h-14 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff9933] border-2 border-white text-black font-black text-[9px] flex flex-col items-center justify-center shadow-xl active:scale-90 transition ${
              isSuperReady ? 'animate-pulse shadow-[0_0_24px_#ffd700] scale-105' : 'opacity-70'
            }`}
            title="Meme Super [Q / L]"
          >
            <span className="text-sm">🔥</span>
            <span>SUPER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
