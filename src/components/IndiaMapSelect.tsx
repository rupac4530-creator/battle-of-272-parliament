import React, { useEffect, useRef, useState } from 'react';
import { Politician } from '../game/types';
import { POLITICIANS } from '../game/logic';
import { drawPolitician } from '../game/renderer';
import { speakPoliticianVoice } from '../game/audio';
import { INDIA_PATH, ISLANDS, CITIES, REGIONS, LEADER_LOC, proj } from '../game/indiaGeo';

interface IndiaMapSelectProps {
  selectedPolitician: Politician;
  onSelect: (p: Politician) => void;
  onStartGame: () => void;
  is2PlayerMode: boolean;
  onToggle2Player: (is2P: boolean) => void;
  onOpenRulebook: () => void;
}

export const IndiaMapSelect: React.FC<IndiaMapSelectProps> = ({
  selectedPolitician,
  onSelect,
  onStartGame,
  is2PlayerMode,
  onToggle2Player,
  onOpenRulebook
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick(n => n + 1);
    window.addEventListener('fighter3d-ready', f);
    return () => window.removeEventListener('fighter3d-ready', f);
  }, []);

  // Render preview portrait whenever selectedPolitician changes
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPolitician(ctx, selectedPolitician, canvas.width / 2, canvas.height - 4, 1, { scale: 0.95 });
  }, [selectedPolitician, tick]);

  const handlePick = (p: Politician) => {
    onSelect(p);
    speakPoliticianVoice(p.speechText, p.voicePitch, p.voiceRate, true, p.id);
  };

  const handlePlayVoiceOnly = () => {
    speakPoliticianVoice(
      selectedPolitician.speechText,
      selectedPolitician.voicePitch,
      selectedPolitician.voiceRate,
      true,
      selectedPolitician.id
    );
  };

  return (
    <div className="fixed inset-0 lg:absolute lg:inset-0 bg-[#040906]/95 z-50 flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto">
      {/* Title Header */}
      <div className="text-center max-w-2xl my-1 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-[#138808]/20 border border-[#138808] text-[#56d364] text-[11px] font-black uppercase tracking-wider rounded-full mb-1">
          🇮🇳 संसद्-भवनम् • THE PARLIAMENT HOUSE
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#ffd700] tracking-wide font-serif">
          CHOOSE YOUR NETA — MAP OF INDIA
        </h1>
        <p className="text-[#8ea396] text-[11px] sm:text-xs">
          Tap a leader on their home turf. Pins sit at their real cities.
        </p>

        {/* Mode Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onToggle2Player(false)}
            className={`px-3.5 py-1 rounded-full text-xs font-bold border transition ${
              !is2PlayerMode
                ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                : 'bg-[#15221b] text-[#f5eedb] border-[#1e3327] hover:bg-[#1f382a]'
            }`}
          >
            🎮 1P vs Explainable AI
          </button>
          <button
            type="button"
            onClick={() => onToggle2Player(true)}
            className={`px-3.5 py-1 rounded-full text-xs font-bold border transition ${
              is2PlayerMode
                ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                : 'bg-[#15221b] text-[#f5eedb] border-[#1e3327] hover:bg-[#1f382a]'
            }`}
          >
            👥 2-Player Local PvP
          </button>
          <button
            type="button"
            onClick={onOpenRulebook}
            className="px-3 py-1 rounded-full text-xs font-bold bg-[#1e3327] text-[#ffd700] border border-[#ffd700]/40 hover:bg-[#284434]"
          >
            📖 Rule 267
          </button>
          <a
            href="https://github.com/rupac4530-creator/battle-of-272-parliament"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-full text-xs font-bold bg-[#1e3327] text-white border border-[#56d364]/40 hover:bg-[#284434] flex items-center gap-1.5 transition"
            title="GitHub Repository"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>

      {/* Main Map & Dossier Workspace */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-6 w-full max-w-5xl my-auto py-2">
        {/* Full Cartographic Map of India */}
        <div className="relative w-[340px] sm:w-[410px] aspect-[500/580] bg-[#050b07] border-2 border-[#1e3327] rounded-2xl overflow-hidden shadow-2xl shrink-0">
          <svg viewBox="0 0 500 580" className="w-full h-full block" role="img" aria-label="Complete Map of India">
            <defs>
              <pattern id="fullGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#102517" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="indiaLandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e5c38" />
                <stop offset="50%" stopColor="#14462a" />
                <stop offset="100%" stopColor="#0b2818" />
              </linearGradient>
              <radialGradient id="delhiGlow" cx="36%" cy="29%" r="15%">
                <stop offset="0%" stopColor="rgba(255, 215, 0, 0.35)" />
                <stop offset="100%" stopColor="rgba(255, 215, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Background Grid */}
            <rect width="500" height="580" fill="#040906" />
            <rect width="500" height="580" fill="url(#fullGrid)" />

            {/* Delhi Capital National Glow */}
            <rect width="500" height="580" fill="url(#delhiGlow)" />

            {/* Sea glow + official India outline */}
            <path d={INDIA_PATH} fill="none" stroke="rgba(255,215,0,0.16)" strokeWidth="9" strokeLinejoin="round" />
            <path d={INDIA_PATH} fill="url(#indiaLandGrad)" stroke="#ffd700" strokeWidth="2" strokeLinejoin="round" />

            {/* Island groups */}
            {ISLANDS.map(isl => {
              const [lx, ly] = proj(isl.label[0], isl.label[1]);
              return (
                <g key={isl.name}>
                  {isl.pts.map(([lo, la], i) => {
                    const [x, y] = proj(lo, la);
                    return <ellipse key={i} cx={x} cy={y} rx="2.6" ry="4.2" fill="#1e5c38" stroke="#ffd700" strokeWidth="1" />;
                  })}
                  <text x={lx} y={ly} fill="#8ea396" fontSize="7" fontWeight="bold" textAnchor="middle">{isl.name}</text>
                </g>
              );
            })}

            {/* State / region labels */}
            {REGIONS.map(r => {
              const [x, y] = proj(r.ll[0], r.ll[1]);
              return (
                <text key={r.name} x={x} y={y} fill="rgba(255,255,255,0.28)" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  {r.name}
                </text>
              );
            })}

            {/* Major cities */}
            {CITIES.map(c => {
              const [x, y] = proj(c.ll[0], c.ll[1]);
              return (
                <g key={c.name}>
                  <circle cx={x} cy={y} r="2" fill="#f5eedb" opacity="0.8" />
                  <text x={x + 4} y={y + 3} fill="#cfe3d4" fontSize="7" opacity="0.8">{c.name}</text>
                </g>
              );
            })}
          </svg>

          {/* Leader pins at their real home cities */}
          {POLITICIANS.map(p => {
            const isSelected = p.id === selectedPolitician.id;
            const loc = LEADER_LOC[p.id];
            const [x, y] = proj(loc.ll[0], loc.ll[1]);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p)}
                style={{ left: `${(x / 500) * 100}%`, top: `${(y / 580) * 100}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? 'z-30' : 'z-10'}`}
                title={`${p.name} • ${loc.place}`}
                aria-label={`Select ${p.name}`}
              >
                <span
                  className={`block w-5 h-5 rounded-full border-2 transition-all ${
                    isSelected ? 'border-white scale-125 shadow-[0_0_16px_#ffd700] ring-2 ring-[#ffd700]' : 'border-[#ffd700] hover:scale-110'
                  }`}
                  style={{ backgroundColor: p.col }}
                />
                <span
                  className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1 py-px text-[9px] font-black leading-tight border ${
                    loc.side === 'r' ? 'left-full ml-1' : 'right-full mr-1'
                  } ${isSelected ? 'bg-[#ffd700] text-black border-white' : 'bg-[#0c1812]/95 text-[#f5eedb] border-[#ffd700]/50'}`}
                >
                  {p.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Leader Dossier Card with Real Voice Trigger */}
        <div className="w-full max-w-[370px] bg-[#0c1812] border-2 border-[#1e3327] rounded-2xl p-4 sm:p-5 text-left shadow-2xl relative">
          <canvas
            ref={previewCanvasRef}
            width={80}
            height={110}
            className="float-right ml-3 mb-2 rounded-xl border-2 border-[#ffd700] bg-[#14231a] shadow-md"
          />

          <div className="text-[10px] font-bold text-[#ffd700] tracking-wider uppercase">
            {selectedPolitician.state} • {LEADER_LOC[selectedPolitician.id].place}
          </div>
          <h2 className="text-xl font-bold text-white font-serif leading-tight">
            {selectedPolitician.name}
          </h2>
          <div className="text-xs text-[#56d364] font-semibold mb-2">
            {selectedPolitician.nameHi} • {selectedPolitician.title}
          </div>

          <div className="space-y-1.5 text-xs text-[#8ea396] clear-both pt-2 border-t border-[#1e3327]">
            <p>
              <strong className="text-white">Archetype:</strong> {selectedPolitician.role}
            </p>
            <p className="line-clamp-2">
              <strong className="text-white">Profile:</strong> {selectedPolitician.description}
            </p>

            <div className="p-2 bg-[#122218] rounded-lg border border-[#1e3327] mt-1.5">
              <div className="text-[#ffd700] font-bold text-[11px]">
                ⚡ Special [K]: <span className="text-white font-normal">{selectedPolitician.specialName}</span>
              </div>
              <div className="text-[#ff9933] font-bold text-[11px] mt-0.5">
                🔥 Meme Super [Q]: <span className="text-white font-normal">{selectedPolitician.superName}</span>
              </div>
            </div>

            {/* Authentic Meme Voice Player Card */}
            <div className="p-2.5 bg-[#08120d] rounded-xl border border-[#ffd700]/40 mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-[#ffd700] uppercase tracking-wider flex items-center gap-1">
                  <span>🎙️</span> REAL-LIFE MEME VOICE
                </span>
                <button
                  type="button"
                  onClick={handlePlayVoiceOnly}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition shadow flex items-center gap-1"
                >
                  <span>🔊</span> Play Voice
                </button>
              </div>
              <p className="text-[11px] text-[#f5eedb] italic font-serif leading-snug">
                "{selectedPolitician.memeDialogue}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button CTA */}
      <div className="w-full max-w-md my-1 text-center shrink-0">
        <button
          type="button"
          data-start="true"
          onClick={onStartGame}
          className="w-full py-3 px-6 rounded-xl text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-[#ff9933] via-[#e65100] to-[#b71c1c] border-2 border-[#ffd700] shadow-[0_4px_24px_rgba(255,153,51,0.4)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>ENTER THE LOK SABHA CHAMBER</span>
          <span className="text-xl">⚔️</span>
        </button>
        <div className="text-[10.5px] text-[#8ea396] mt-1">
          Press <kbd className="px-1.5 py-0.5 bg-[#15221b] border border-[#2d4737] rounded text-white font-mono">Enter</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 bg-[#15221b] border border-[#2d4737] rounded text-white font-mono">Space</kbd> to Launch Session
        </div>
      </div>
    </div>
  );
};
