import React, { useEffect, useRef } from 'react';
import { Politician } from '../game/types';
import { POLITICIANS } from '../game/logic';
import { drawPolitician } from '../game/renderer';
import { speakPoliticianVoice } from '../game/audio';

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

  // Render preview portrait whenever selectedPolitician changes
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPolitician(ctx, selectedPolitician, canvas.width / 2, canvas.height - 4, 1, { scale: 0.95 });
  }, [selectedPolitician]);

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
          FULL CARTOGRAPHIC MAP OF INDIA
        </h1>
        <p className="text-[#8ea396] text-[11px] sm:text-xs">
          Select any of the 9 National Leaders across India's Federal States & Ministries!
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

            {/* COMPLETE MAINLAND INDIA PATH (including J&K, Ladakh, full Northeast Seven Sisters, Gujarat Gulfs, South Peninsula) */}
            <path
              d="
                M 195,15
                C 210,18 228,26 238,42
                C 246,55 258,68 266,80
                C 272,92 265,108 256,120
                C 248,130 240,140 244,152
                C 248,162 260,170 274,178
                C 288,185 304,192 312,192
                C 316,182 318,170 324,166
                C 328,166 330,176 332,186
                C 338,188 350,188 360,188
                C 368,182 376,170 390,158
                C 410,142 438,138 456,150
                C 472,160 482,178 476,196
                C 470,214 458,230 452,246
                C 446,262 440,278 434,292
                C 426,306 414,316 404,306
                C 396,298 392,284 388,272
                C 382,256 370,250 354,250
                C 344,250 334,242 332,230
                C 330,220 324,208 316,212
                C 310,218 310,234 316,248
                C 322,262 330,278 332,294
                C 334,310 326,326 316,338
                C 304,352 292,368 284,386
                C 276,404 268,424 256,442
                C 244,460 234,480 228,502
                C 222,524 214,546 204,568
                C 198,580 192,588 186,584
                C 180,576 176,558 172,542
                C 168,524 162,504 158,484
                C 152,462 144,440 140,418
                C 136,396 132,374 130,352
                C 128,336 126,324 132,312
                C 134,308 126,306 118,308
                C 106,312 94,324 82,326
                C 68,328 54,318 52,302
                C 50,286 64,272 78,266
                C 88,262 92,254 84,250
                C 72,246 58,240 56,226
                C 54,212 68,206 82,204
                C 98,202 110,200 114,188
                C 120,174 126,156 132,140
                C 138,124 148,110 154,94
                C 160,78 162,60 168,44
                C 174,28 184,14 195,15
                Z
              "
              fill="url(#indiaLandGrad)"
              stroke="#ffd700"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* ANDAMAN & NICOBAR ISLANDS (Bay of Bengal) */}
            <g fill="#ffd700" stroke="#040906" strokeWidth="0.8">
              <ellipse cx="440" cy="450" rx="3" ry="8" />
              <ellipse cx="443" cy="470" rx="3.5" ry="9" />
              <ellipse cx="445" cy="492" rx="3" ry="7" />
              <ellipse cx="448" cy="514" rx="2.5" ry="6" />
              <ellipse cx="452" cy="535" rx="3.5" ry="8" />
              <text x="444" y="555" fill="#8ea396" fontSize="7" fontWeight="bold" textAnchor="middle">
                ANDAMAN &amp; NICOBAR
              </text>
            </g>

            {/* LAKSHADWEEP ISLANDS (Arabian Sea) */}
            <g fill="#ffd700" stroke="#040906" strokeWidth="0.8">
              <circle cx="120" cy="475" r="2.5" />
              <circle cx="118" cy="490" r="3" />
              <circle cx="122" cy="505" r="2.5" />
              <circle cx="125" cy="520" r="3" />
              <text x="122" y="535" fill="#8ea396" fontSize="7" fontWeight="bold" textAnchor="middle">
                LAKSHADWEEP
              </text>
            </g>

            {/* FEDERAL STATE BOUNDARY PATHS (Dashed Gold / Muted Green) */}
            <g fill="none" stroke="rgba(255, 215, 0, 0.35)" strokeWidth="1" strokeDasharray="3,3">
              {/* Kashmir / Ladakh south border */}
              <path d="M 160,88 Q 200,95 250,90" />
              {/* Punjab & Himachal */}
              <path d="M 148,118 Q 190,125 240,138" />
              {/* Rajasthan & Gujarat border */}
              <path d="M 112,190 Q 150,195 190,195" />
              {/* UP / MP border line */}
              <path d="M 190,195 Q 240,210 290,215" />
              {/* Maharashtra / Gujarat */}
              <path d="M 118,308 Q 160,290 200,285" />
              {/* Maharashtra / Karnataka / Telangana */}
              <path d="M 132,352 Q 180,340 240,335" />
              {/* Karnataka / Kerala / Tamil Nadu */}
              <path d="M 158,484 Q 190,490 228,502" />
              {/* West Bengal / Bihar / Jharkhand */}
              <path d="M 280,210 Q 300,230 315,260" />
              {/* Northeast Corridor / Assam / Arunachal */}
              <path d="M 332,186 Q 370,210 420,200" />
              <path d="M 360,188 Q 380,240 430,240" />
            </g>

            {/* Geopolitical Region Watermarks */}
            <text x="210" y="55" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">LADAKH</text>
            <text x="175" y="75" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">J&amp;K</text>
            <text x="135" y="165" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">RAJASTHAN</text>
            <text x="225" y="200" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="bold">UTTAR PRADESH</text>
            <text x="75" y="290" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">GUJARAT</text>
            <text x="150" y="325" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">MAHARASHTRA</text>
            <text x="160" y="440" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">KARNATAKA</text>
            <text x="185" y="530" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">TAMIL NADU</text>
            <text x="315" y="275" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">BENGAL</text>
            <text x="390" y="210" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">ASSAM</text>
          </svg>

          {/* Accurate Leader Pins Positioned on the Full Map */}
          {POLITICIANS.map(p => {
            const isSelected = p.id === selectedPolitician.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p)}
                style={{ left: `${p.pos[0]}%`, top: `${p.pos[1]}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-1.5 py-0.5 text-[9.5px] font-black transition-all flex flex-col items-center gap-0.5 border ${
                  isSelected
                    ? 'bg-[#ffd700] text-black border-white shadow-[0_0_18px_#ffd700] scale-110 z-20 ring-2 ring-[#ff9933]'
                    : 'bg-[#0c1812] text-[#f5eedb] border-[#ffd700]/50 hover:border-[#ffd700] hover:scale-105 z-10'
                }`}
                title={`${p.name} • ${p.state}`}
                aria-label={`Select ${p.name}`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-black/50 flex items-center justify-center text-[7.5px]"
                  style={{ backgroundColor: p.col }}
                >
                  ●
                </div>
                <span className="leading-tight">{p.name.split(' ')[0]}</span>
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
            {selectedPolitician.state}
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
