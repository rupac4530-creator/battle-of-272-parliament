import React from 'react';
import { RotateCw, Maximize2, Landmark, Smartphone, ChevronRight } from 'lucide-react';

interface OrientationLockPromptProps {
  isPortrait: boolean;
  isForceRotated: boolean;
  onToggleForceRotate: () => void;
  onRequestFullscreen: () => void;
  onDismiss: () => void;
}

export const OrientationLockPrompt: React.FC<OrientationLockPromptProps> = ({
  isPortrait,
  isForceRotated,
  onToggleForceRotate,
  onRequestFullscreen,
  onDismiss
}) => {
  // If not in portrait and not force rotated, no prompt needed
  if (!isPortrait || isForceRotated) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-[#040906]/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 text-center select-none text-[#f5eedb] animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center gap-2 px-4 py-1.5 glass rounded-full border border-[#ffd700]/30 shadow-lg mt-2">
        <Landmark size={14} className="text-[#ffd700]" />
        <span className="text-[11px] font-mono font-black text-[#ffd700] tracking-wider uppercase">
          संसद्-भवनम् • MOBILE ADAPTIVE MODE
        </span>
      </div>

      {/* Center Visual: Animated Rotating Phone */}
      <div className="my-auto flex flex-col items-center max-w-sm px-4">
        <div className="relative w-36 h-36 flex items-center justify-center mb-6">
          {/* Pulsing circular background rings */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffd700]/30 animate-spin-slow" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#122319] to-[#040906] border border-[#ffd700]/40 shadow-[0_0_35px_rgba(255,215,0,0.25)] flex items-center justify-center" />

          {/* Animated Rotating Smartphone Graphic */}
          <div className="relative z-10 flex items-center justify-center animate-device-rotate">
            <Smartphone size={56} className="text-[#ffd700] stroke-[1.7]" />
          </div>

          {/* Curved rotation arrows */}
          <div className="absolute -top-1 -right-1 p-2 bg-[#ff9933] text-black rounded-full shadow-lg animate-bounce">
            <RotateCw size={18} />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-gradient-gold font-serif tracking-tight mb-2">
          ROTATE YOUR PHONE
        </h2>

        <p className="text-xs sm:text-sm text-[#d8e5dc] leading-relaxed mb-3">
          The <strong className="text-white">Lok Sabha Chamber Arena</strong> is built for widescreen landscape view.
          Please rotate your device horizontally for dual-stick gamepad controls & full 60 FPS combat.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#8ea396] font-mono mb-4">
          <span className="px-2 py-0.5 glass rounded-full border border-[#1e3327]">📱 16:9 Arena</span>
          <span className="px-2 py-0.5 glass rounded-full border border-[#1e3327]">🕹️ Dual Gamepad</span>
          <span className="px-2 py-0.5 glass rounded-full border border-[#1e3327]">⚡ Explainable AI</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={onRequestFullscreen}
            className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-black text-black bg-gradient-to-r from-[#ffd700] via-[#ffaa00] to-[#ff9933] border-2 border-white shadow-[0_4px_25px_rgba(255,215,0,0.35)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 btn-shimmer"
          >
            <Maximize2 size={16} />
            <span>ENABLE FULLSCREEN & AUTO-ROTATE</span>
          </button>

          <button
            type="button"
            onClick={onToggleForceRotate}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold glass text-white hover:text-[#ffd700] border border-[#ffd700]/50 hover:border-[#ffd700] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCw size={15} className="text-[#ff9933]" />
            <span>FORCE ROTATE 90° (PLAY HORIZONTALLY NOW)</span>
          </button>
        </div>
      </div>

      {/* Bottom Dismiss / Continue in Portrait Link */}
      <div className="mb-2">
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] text-[#8ea396] hover:text-white underline underline-offset-4 decoration-[#8ea396]/40 flex items-center gap-1 transition-colors"
        >
          <span>Continue in portrait mode anyway</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};
