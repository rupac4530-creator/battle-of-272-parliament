import React, { useEffect, useRef, useState } from 'react';
import { Politician } from '../game/types';
import { POLITICIANS } from '../game/logic';
import { drawPolitician } from '../game/renderer';
import { speakPoliticianVoice } from '../game/audio';
import { INDIA_PATH, ISLANDS, CITIES, REGIONS, LEADER_LOC, proj } from '../game/indiaGeo';
import {
  Landmark, Gamepad2, Users, BookOpen, Zap, Flame,
  Mic, Volume2, Swords, Github, MapPin, Play
} from 'lucide-react';

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
    <div className="fixed inset-0 lg:absolute lg:inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto relative">
      {/* Parliament House Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 parliament-bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040906]/70 via-[#040906]/90 to-[#040906]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full">
        {/* Title Header */}
        <div className="text-center max-w-2xl my-1 shrink-0">
          <div className="inline-flex items-center gap-2 px-4 py-1 glass border border-[#138808]/60 text-[#56d364] text-[11px] font-black uppercase tracking-wider rounded-full mb-2">
            <Landmark size={13} className="text-[#ffd700]" />
            संसद्-भवनम् • THE PARLIAMENT HOUSE
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gradient-gold tracking-tight font-serif">
            CHOOSE YOUR NETA — MAP OF INDIA
          </h1>
          <p className="text-[#8ea396] text-[11px] sm:text-xs mt-1">
            Tap a leader on their home turf. Pins sit at their real cities.
          </p>

          {/* Mode Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => onToggle2Player(false)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 ${
                !is2PlayerMode
                  ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                  : 'glass text-[#f5eedb] border-[#1e3327] hover:border-[#58a6ff]/50'
              }`}
            >
              <Gamepad2 size={14} /> 1P vs Explainable AI
            </button>
            <button
              type="button"
              onClick={() => onToggle2Player(true)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 ${
                is2PlayerMode
                  ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                  : 'glass text-[#f5eedb] border-[#1e3327] hover:border-[#58a6ff]/50'
              }`}
            >
              <Users size={14} /> 2-Player Local PvP
            </button>
            <button
              type="button"
              onClick={onOpenRulebook}
              className="px-3 py-1.5 rounded-full text-xs font-bold glass text-[#ffd700] border border-[#ffd700]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
            >
              <BookOpen size={13} /> Rule 267
            </button>
            <a
              href="https://github.com/rupac4530-creator/battle-of-272-parliament"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full text-xs font-bold glass text-white border border-[#56d364]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
              title="GitHub Repository"
            >
              <Github size={13} /> GitHub
            </a>
          </div>
        </div>

        {/* Main Map & Dossier Workspace */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-6 w-full max-w-5xl my-auto py-2">
          {/* Full Cartographic Map of India */}
          <div className="relative w-[340px] sm:w-[410px] aspect-[500/580] glass-dark border-2 border-[#1e3327] rounded-2xl overflow-hidden shadow-2xl shrink-0">
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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group ${isSelected ? 'z-30' : 'z-10'}`}
                  title={`${p.name} • ${loc.place}`}
                  aria-label={`Select ${p.name}`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                      isSelected ? 'border-white scale-150 ring-2 ring-[#ffd700] pulse-gold' : 'border-[#ffd700] hover:scale-125 group-hover:border-white'
                    }`}
                    style={{ backgroundColor: p.col }}
                  />
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-black leading-tight border transition-all duration-200 ${
                      loc.side === 'r' ? 'left-full ml-1.5' : 'right-full mr-1.5'
                    } ${isSelected ? 'bg-[#ffd700] text-black border-white shadow-lg' : 'glass text-[#f5eedb] border-[#ffd700]/50 group-hover:border-[#ffd700]'}`}
                  >
                    {p.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Leader Dossier Card with Real Voice Trigger */}
          <div className="w-full max-w-[370px] glass border-2 border-[#1e3327] rounded-2xl p-4 sm:p-5 text-left shadow-2xl relative hover:border-[#ffd700]/30 transition-colors duration-500">
            <canvas
              ref={previewCanvasRef}
              width={80}
              height={110}
              className="float-right ml-3 mb-2 rounded-xl border-2 border-[#ffd700] bg-[#14231a] shadow-md"
            />

            <div className="text-[10px] font-bold text-[#ffd700] tracking-wider uppercase flex items-center gap-1">
              <MapPin size={10} />
              {selectedPolitician.state} • {LEADER_LOC[selectedPolitician.id].place}
            </div>
            <h2 className="text-xl font-bold text-white font-serif leading-tight tracking-tight">
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

              <div className="p-2.5 bg-[#122218]/80 rounded-lg border border-[#1e3327] mt-1.5 space-y-1">
                <div className="text-[#ffd700] font-bold text-[11px] flex items-center gap-1.5">
                  <Zap size={12} className="text-[#ffd700]" /> Special [K]: <span className="text-white font-normal">{selectedPolitician.specialName}</span>
                </div>
                <div className="text-[#ff9933] font-bold text-[11px] flex items-center gap-1.5">
                  <Flame size={12} className="text-[#ff9933]" /> Meme Super [Q]: <span className="text-white font-normal">{selectedPolitician.superName}</span>
                </div>
              </div>

              {/* Authentic Meme Voice Player Card */}
              <div className="p-2.5 glass-dark rounded-xl border border-[#ffd700]/40 mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-[#ffd700] uppercase tracking-wider flex items-center gap-1.5">
                    <Mic size={11} className="text-[#ffd700]" /> REAL-LIFE MEME VOICE
                  </span>
                  <button
                    type="button"
                    onClick={handlePlayVoiceOnly}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition-all shadow flex items-center gap-1"
                  >
                    <Volume2 size={11} /> Play Voice
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
            className="w-full py-3.5 px-6 rounded-xl text-sm sm:text-base font-extrabold text-white bg-gradient-to-r from-[#ff9933] via-[#e65100] to-[#b71c1c] border-2 border-[#ffd700] shadow-[0_4px_30px_rgba(255,153,51,0.4)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 btn-shimmer"
          >
            <span className="tracking-wide">ENTER THE LOK SABHA CHAMBER</span>
            <Swords size={20} />
          </button>
          <div className="text-[10.5px] text-[#8ea396] mt-1.5">
            Press <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">Enter</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">Space</kbd> to Launch Session
          </div>
        </div>
      </div>
    </div>
  );
};
