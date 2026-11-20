import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Politician } from '../game/types';
import { POLITICIANS, spreadPins, nearestPin, labelReach, pickLabelSide, pinLabelVisible, mapTextVisible, rosterScrollLeft, PinPoint } from '../game/logic';
import { MAP_TEXT, MAP_COMPACT, ROSTER } from '../game/balance';
import { MAP_PINS } from '../game/balance';
import { drawPolitician } from '../game/renderer';
import { speakPoliticianVoice } from '../game/audio';
import { INDIA_PATH, ISLANDS, CITIES, REGIONS, LEADER_LOC, proj } from '../game/indiaGeo';
import {
  Landmark, Gamepad2, Users, BookOpen, Zap, Flame,
  Mic, Volume2, Swords, Github, MapPin, Play, Sparkles, RotateCw, Maximize2, Wifi
} from 'lucide-react';

interface IndiaMapSelectProps {
  selectedPolitician: Politician;
  onSelect: (p: Politician) => void;
  onStartGame: () => void;
  is2PlayerMode: boolean;
  onToggle2Player: (is2P: boolean) => void;
  onOpenRulebook: () => void;
  onOpenOnline?: () => void;
  onReplayIntro?: () => void;
  isForceRotated?: boolean;
  onToggleRotate?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const IndiaMapSelect: React.FC<IndiaMapSelectProps> = ({
  selectedPolitician,
  onSelect,
  onStartGame,
  is2PlayerMode,
  onToggle2Player,
  onOpenRulebook,
  onOpenOnline,
  onReplayIntro,
  isForceRotated = false,
  onToggleRotate,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  // Height of the game area as the player sees it (swapped when the UI is rotated)
  const areaH = typeof window !== 'undefined' ? (isForceRotated ? window.innerWidth : window.innerHeight) : 768;
  const compact = areaH <= 480;
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick(n => n + 1);
    window.addEventListener('fighter3d-ready', f);
    return () => window.removeEventListener('fighter3d-ready', f);
  }, []);

  // Size of the map box in layout pixels (offsetWidth ignores the 90-degree UI rotation, so this is right when rotated too).
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState<{ w: number; h: number } | null>(null);
  const showMapText = mapTextVisible(mapSize ? mapSize.w : null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  useLayoutEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setMapSize((prev: { w: number; h: number } | null) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Real city positions, and the same pins pushed apart so none are closer than MAP_PINS.minGap (px).
  const { realPins, shownPins, hitPins, sides } = useMemo<{ realPins: PinPoint[]; shownPins: PinPoint[]; hitPins: PinPoint[]; sides: Record<string, 'l' | 'r'> }>(() => {
    const w = mapSize?.w ?? 500;
    const h = mapSize?.h ?? 580;
    const real = POLITICIANS.map(p => {
      const [x, y] = proj(LEADER_LOC[p.id].ll[0], LEADER_LOC[p.id].ll[1]);
      return { id: p.id, x: (x / 500) * w, y: (y / 580) * h };
    });
    const shown = mapSize ? spreadPins(real, w, h) : real;
    // Name labels stay inside the map: keep the preferred side when it fits, otherwise flip it.
    const sideOf: Record<string, 'l' | 'r'> = {};
    shown.forEach((sp, i) => {
      const first = POLITICIANS[i].name.split(' ')[0];
      sideOf[sp.id] = pickLabelSide(LEADER_LOC[sp.id].side, sp.x, Math.abs(labelReach(first, 'r')), w, 2, sp.y, shown.filter(o => o.id !== sp.id));
    });
    // each pin's tap shape runs from its dot to the end of its name label
    const hit = shown.map((sp, i) => pinLabelVisible(sp.id === selectedPolitician.id, w)
      ? { ...sp, ex: sp.x + labelReach(POLITICIANS[i].name.split(' ')[0], sideOf[sp.id]), ey: sp.y }
      : { ...sp });
    return { realPins: real, shownPins: shown, hitPins: hit, sides: sideOf };
  }, [mapSize, selectedPolitician.id]);

  // One tap handler for the whole map: the nearest pin within MAP_PINS.hitRadius wins.
  // offsetX/offsetY are local to the overlay, so this stays right when the UI is rotated.
  const pinAt = (e: { offsetX: number; offsetY: number }) => nearestPin(hitPins, e.offsetX, e.offsetY);
  const handleMapTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapSize) return;
    const id = pinAt(e.nativeEvent);
    const p = id ? POLITICIANS.find(q => q.id === id) : undefined;
    if (p) handlePick(p);
  };
  const handleMapMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !mapSize) return;
    const id = pinAt(e.nativeEvent);
    setHoverId((prev: string | null) => (prev === id ? prev : id));
  };

  // Render animated preview portrait whenever selectedPolitician changes
  useEffect(() => {
    let animId: number;
    const render = () => {
      if (previewCanvasRef.current) {
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawPolitician(ctx, selectedPolitician, canvas.width / 2, canvas.height - 4, 1, {
            scale: 0.95,
            time: performance.now() * 0.001
          });
        }
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedPolitician, tick]);

  // Keep the selected chip visible in the roster strip (pin taps and arrow keys can select one that is scrolled out of view).
  const rosterRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const strip = rosterRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-roster="${selectedPolitician.id}"]`);
    if (!strip || !chip) return;
    const next = rosterScrollLeft(strip.clientWidth, strip.scrollLeft, chip.offsetLeft, chip.offsetWidth, ROSTER.scrollPad);
    if (next !== strip.scrollLeft) strip.scrollTo({ left: next, behavior: 'smooth' });
  }, [selectedPolitician.id]);

  const handlePick = (p: Politician) => {
    onSelect(p);
    speakPoliticianVoice(p.id);
  };

  const handlePlayVoiceOnly = () => {
    speakPoliticianVoice(selectedPolitician.id);
  };

  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
  const menuBg = `${base}/menu-bg.jpg`;

  const rosterStrip = (
    <div
      ref={rosterRef}
      role="radiogroup"
      aria-label="Choose your leader"
      className={`flex items-center overflow-x-auto no-scrollbar min-w-0 ${compact ? 'flex-1' : 'w-fit max-w-full'}`}
      style={{ gap: ROSTER.gap, scrollbarWidth: 'none' }}
    >
      {POLITICIANS.map(p => {
        const on = p.id === selectedPolitician.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-roster={p.id}
            onClick={() => handlePick(p)}
            style={{ height: ROSTER.chipHeight }}
            className={`shrink-0 px-3 rounded-full border-2 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
              on ? 'bg-[#ffd700] text-black border-white shadow-lg' : 'glass text-[#f5eedb] border-[#1e3327] hover:border-[#ffd700]/60'
            }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/70" style={{ backgroundColor: p.col }} />
            {p.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-2 sm:p-4 lg:p-5 overflow-y-auto bg-[#040906] safe-p-all">
      {/* Astronaut Modi Cinematic Background (First Page Only) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={menuBg}
          alt="Parliament Arena Background"
          className="w-full h-full object-cover object-center scale-105 filter brightness-85 contrast-105"
        />
        {/* Cinematic dark gradients & atmospheric lighting to keep UI & map sharp */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040906] via-[#040906]/55 to-[#040906]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(4,9,6,0.85)_95%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full min-h-0">
        {/* Title Header */}
        <div className={`text-center my-0.5 sm:my-1 shrink-0 ${compact ? 'w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1' : 'max-w-2xl'}`}>
          {!compact && (
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 glass border border-[#138808]/60 text-[#56d364] text-[11px] sm:text-[11px] font-black uppercase tracking-wider rounded-full mb-1">
              <Landmark size={12} className="text-[#ffd700]" />
              संसद्-भवनम् • THE PARLIAMENT HOUSE
            </div>
          )}
          <h2 className={`${compact ? 'text-sm' : 'text-lg sm:text-2xl lg:text-3xl'} font-extrabold text-gradient-gold tracking-tight font-serif`}>
            CHOOSE YOUR NETA — MAP OF INDIA
          </h2>
          {!compact && (
            <p className="text-[#8ea396] text-[11px] sm:text-xs mt-0.5 hidden xs:block">
              Tap a leader on their home turf. Pins sit at their real cities.
            </p>
          )}

          {/* Mode Selector */}
          <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${compact ? 'mt-0 map-compact-row' : 'mt-1.5 sm:mt-2.5'}`}>
            <button
              type="button"
              onClick={() => onToggle2Player(false)}
              title="1 player vs the Explainable AI"
              className={`tap-44 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 ${
                !is2PlayerMode
                  ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                  : 'glass text-[#f5eedb] border-[#1e3327] hover:border-[#58a6ff]/50'
              }`}
            >
              <Gamepad2 size={13} /> {compact ? MAP_COMPACT.buttonLabels.single : '1P vs Explainable AI'}
            </button>
            <button
              type="button"
              onClick={() => onToggle2Player(true)}
              title="2-Player local PvP"
              className={`tap-44 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 ${
                is2PlayerMode
                  ? 'bg-[#58a6ff] text-black border-white shadow-lg shadow-[#58a6ff]/30'
                  : 'glass text-[#f5eedb] border-[#1e3327] hover:border-[#58a6ff]/50'
              }`}
            >
              <Users size={13} /> {compact ? MAP_COMPACT.buttonLabels.twoPlayer : '2-Player Local PvP'}
            </button>
            {onOpenOnline && (
              <button
                type="button"
                onClick={onOpenOnline}
                title="Play online with a friend using a room code"
                className="tap-44 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 glass text-[#ff9933] border-[#ff9933]/40 hover:bg-[#ff9933]/10"
              >
                <Wifi size={13} /> {compact ? 'Online' : 'Online PvP'}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenRulebook}
              title="Open the rulebook (Rule 267)"
              className="tap-44 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold glass text-[#ffd700] border border-[#ffd700]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
            >
              <BookOpen size={12} /> {compact ? MAP_COMPACT.buttonLabels.rules : 'Rule 267'}
            </button>
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="tap-44 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold glass text-[#ff9933] border border-[#ff9933]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                title="Replay Loading Sequence"
              >
                <Sparkles size={12} /> {compact ? MAP_COMPACT.buttonLabels.intro : 'Boot Sequence'}
              </button>
            )}
            <a
              href="https://github.com/rupac4530-creator/battle-of-272-parliament"
              target="_blank"
              rel="noopener noreferrer"
              className="tap-44 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold glass text-white border border-[#56d364]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
              title="GitHub Repository"
            >
              <Github size={12} /> GitHub
            </a>
            {onToggleRotate && (
              <button
                type="button"
                onClick={onToggleRotate}
                className="tap-44 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold glass text-[#ff9933] border border-[#ff9933]/50 hover:bg-[#ff9933]/20 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                title="Toggle 90° Landscape View"
              >
                <RotateCw size={12} /> {isForceRotated ? (compact ? MAP_COMPACT.buttonLabels.rotated : 'Landscape 90°') : (compact ? MAP_COMPACT.buttonLabels.rotate : 'Rotate 90°')}
              </button>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="tap-44 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold glass text-[#ffd700] border border-[#ffd700]/40 hover:bg-[#284434] hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                title="Toggle fullscreen (locks landscape on supported phones)"
              >
                <Maximize2 size={12} /> {isFullscreen ? (compact ? MAP_COMPACT.buttonLabels.exitFullscreen : 'Exit Fullscreen') : (compact ? MAP_COMPACT.buttonLabels.fullscreen : 'Fullscreen')}
              </button>
            )}
          </div>
        </div>

        {/* Main Map & Dossier Workspace: Responsive Side-by-Side in Landscape & Large Screens */}
        <div className={`flex ${isForceRotated ? 'flex-row' : 'flex-col sm:flex-row landscape:flex-row'} items-center justify-center gap-3 sm:gap-4 lg:gap-6 w-full max-w-5xl ${compact ? 'flex-1 py-1' : 'my-auto py-1 sm:py-2'} min-h-0`}>
          {/* Full Cartographic Map of India (Strict Proportional 500:580 Aspect Ratio) */}
          <div
            ref={mapRef}
            style={compact
              ? { height: '100%', maxHeight: 'calc(var(--app-h) * 0.7)', minHeight: 170 } // fills the space the one-row header freed; width follows from the aspect ratio
              : {
                  height: 'clamp(170px, calc(var(--app-h) * 0.48), 460px)',
                  width: 'calc(clamp(170px, calc(var(--app-h) * 0.48), 460px) * (500 / 580))'
                }}
            className="relative aspect-[500/580] glass-dark border-2 border-[#1e3327] rounded-2xl overflow-hidden shadow-2xl shrink-0"
          >
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
                    {showMapText && <text x={lx} y={ly} fill="#8ea396" fontSize="7" fontWeight="bold" textAnchor="middle">{isl.name}</text>}
                  </g>
                );
              })}

              {/* State / region labels */}
              {showMapText && REGIONS.map(r => {
                const [x, y] = proj(r.ll[0], r.ll[1]);
                return (
                  <text key={r.name} x={x} y={y} fill={`rgba(255,255,255,${MAP_TEXT.regionAlpha})`} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                    {r.name}
                  </text>
                );
              })}

              {/* Major cities */}
              {showMapText && CITIES.map(c => {
                const [x, y] = proj(c.ll[0], c.ll[1]);
                return (
                  <g key={c.name}>
                    <circle cx={x} cy={y} r="2" fill="#f5eedb" opacity="0.8" />
                    <text x={x + 4} y={y + 3} fill="#cfe3d4" fontSize="7" opacity="0.8">{c.name}</text>
                  </g>
                );
              })}
            </svg>

            {/* Leader lines: where a pin was pushed aside, a thin line still points at the real city */}
            {mapSize && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
                viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
                aria-hidden="true"
              >
                {shownPins.map((sp: PinPoint, i: number) => {
                  const rp = realPins[i];
                  if (Math.hypot(sp.x - rp.x, sp.y - rp.y) < MAP_PINS.leaderMinDisplace) return null;
                  return (
                    <g key={sp.id}>
                      <line x1={rp.x} y1={rp.y} x2={sp.x} y2={sp.y} stroke="#ffd700" strokeOpacity="0.7" strokeWidth="1" />
                      <circle cx={rp.x} cy={rp.y} r="2.5" fill="#ffd700" />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Tap target for the whole map: picks the nearest pin, so a finger never has to hit a 16 px dot exactly */}
            <div
              className={`absolute inset-0 z-[5] ${hoverId ? 'cursor-pointer' : ''}`}
              onClick={handleMapTap}
              onPointerMove={handleMapMove}
              onPointerLeave={() => setHoverId(null)}
              data-map-tap="true"
            />

            {/* Leader pins (pushed apart so none overlap). Buttons stay keyboard-focusable; taps go through the overlay above. */}
            {POLITICIANS.map((p, i) => {
              const isSelected = p.id === selectedPolitician.id;
              const isHover = p.id === hoverId;
              const loc = LEADER_LOC[p.id];
              const sp = shownPins[i];
              const w = mapSize?.w ?? 500;
              const h = mapSize?.h ?? 580;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  style={{ left: `${(sp.x / w) * 100}%`, top: `${(sp.y / h) * 100}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group pointer-events-none ${isSelected ? 'z-30' : 'z-10'}`}
                  title={`${p.name} \u2022 ${loc.place}`}
                  aria-label={`Select ${p.name}`}
                  data-pin={p.id}
                >
                  <span
                    className={`block rounded-full border-2 transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-white ${
                      isSelected ? 'border-white scale-150 ring-2 ring-[#ffd700] pulse-gold' : isHover ? 'border-white scale-125' : 'border-[#ffd700]'
                    }`}
                    style={{ backgroundColor: p.col, width: MAP_PINS.dot, height: MAP_PINS.dot }}
                  />
                  {pinLabelVisible(isSelected, w) && (
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-black leading-tight border transition-all duration-200 ${
                        (sides[p.id] ?? loc.side) === 'r' ? 'left-full ml-1.5' : 'right-full mr-1.5'
                      } ${isSelected ? 'bg-[#ffd700] text-black border-white shadow-lg' : 'glass text-[#f5eedb] border-[#ffd700]/50'} ${isHover && !isSelected ? 'border-[#ffd700]' : ''}`}
                    >
                      {p.name.split(' ')[0]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Leader Dossier Card with Real Voice Trigger */}
          <div
            style={compact
              ? { height: '100%', maxHeight: 'calc(var(--app-h) * 0.7)', minHeight: 170 }
              : { height: 'clamp(170px, calc(var(--app-h) * 0.48), 460px)' }}
            className={`w-full max-w-[340px] sm:max-w-[370px] overflow-y-auto glass border-2 border-[#1e3327] rounded-2xl text-left shadow-2xl relative hover:border-[#ffd700]/30 transition-colors duration-500 ${compact ? 'p-1.5 max-h-full' : 'p-2.5 sm:p-4'}`}
          >
            <canvas
              ref={previewCanvasRef}
              width={80}
              height={110}
              className={`float-right ml-2 sm:ml-3 rounded-xl border-2 border-[#ffd700] bg-[#14231a] shadow-md ${compact ? 'w-12 h-16 mb-0' : 'mb-1 sm:mb-2 w-16 h-22 sm:w-20 sm:h-28'}`}
            />

            <div className="text-[11px] sm:text-[11px] font-bold text-[#ffd700] tracking-wider uppercase flex items-center gap-1">
              <MapPin size={10} />
              {selectedPolitician.state} • {LEADER_LOC[selectedPolitician.id].place}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-serif leading-tight tracking-tight">
              {selectedPolitician.name}
            </h2>
            <div className="text-[11px] sm:text-xs text-[#56d364] font-semibold mb-1.5 sm:mb-2">
              {selectedPolitician.nameHi} • {selectedPolitician.title}
            </div>

            <div className={`text-[11px] sm:text-xs text-[#8ea396] clear-both border-t border-[#1e3327] ${compact ? 'space-y-0.5 pt-1' : 'space-y-1 sm:space-y-1.5 pt-1.5 sm:pt-2'}`}>
              <p>
                <strong className="text-white">Archetype:</strong> {selectedPolitician.role}
              </p>
              {!compact && (
                <p className="line-clamp-2">
                  <strong className="text-white">Profile:</strong> {selectedPolitician.description}
                </p>
              )}

              <div className={`bg-[#122218]/80 rounded-lg border border-[#1e3327] mt-1 space-y-0.5 sm:space-y-1 ${compact ? 'p-1.5' : 'p-2 sm:p-2.5'}`}>
                <div className="text-[#ffd700] font-bold text-[11px] sm:text-[11px] flex items-center gap-1.5">
                  <Zap size={11} className="text-[#ffd700]" /> Special [K]: <span className="text-white font-normal">{selectedPolitician.specialName}</span>
                </div>
                <div className="text-[#ff9933] font-bold text-[11px] sm:text-[11px] flex items-center gap-1.5">
                  <Flame size={11} className="text-[#ff9933]" /> Meme Super [Q]: <span className="text-white font-normal">{selectedPolitician.superName}</span>
                </div>
              </div>

              {/* Authentic Meme Voice Player Card */}
              {compact ? (
                // phone landscape: one line (quote + play button) so the card fits without scrolling
                <div className="py-0.5 pl-2 pr-1 glass-dark rounded-xl border border-[#ffd700]/40 mt-1 flex items-center gap-2">
                  <Mic size={12} className="text-[#ffd700] shrink-0" />
                  <p className="flex-1 min-w-0 text-[11px] text-[#f5eedb] italic font-serif leading-snug line-clamp-1">
                    "{selectedPolitician.memeDialogue}"
                  </p>
                  <button
                    type="button"
                    onClick={handlePlayVoiceOnly}
                    className="tap-44 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition-all shadow flex items-center gap-1"
                  >
                    <Volume2 size={11} /> Play Voice
                  </button>
                </div>
              ) : (
                <div className="p-2 sm:p-2.5 glass-dark rounded-xl border border-[#ffd700]/40 mt-1.5 sm:mt-2">
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <span className="text-[11px] sm:text-[11px] font-black text-[#ffd700] uppercase tracking-wider flex items-center gap-1">
                      <Mic size={10} className="text-[#ffd700]" /> REAL-LIFE MEME VOICE
                    </span>
                    <button
                      type="button"
                      onClick={handlePlayVoiceOnly}
                      className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-[11px] font-bold bg-[#ffd700] text-black hover:bg-[#ffe24a] active:scale-95 transition-all shadow flex items-center gap-1"
                    >
                      <Volume2 size={10} /> Play Voice
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-[11px] text-[#f5eedb] italic font-serif leading-snug">
                    "{selectedPolitician.memeDialogue}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roster strip: pick any of the 9 without hitting a pin (normal screens: its own row; phone landscape: beside the start button) */}
        {!compact && <div className="w-full flex justify-center my-1 shrink-0">{rosterStrip}</div>}

        {/* Start Button CTA */}
        <div className={`${compact ? 'w-full max-w-2xl flex items-center gap-2' : 'w-full max-w-md'} my-0.5 sm:my-1 text-center shrink-0`}>
          {compact && rosterStrip}
          <button
            type="button"
            data-start="true"
            onClick={onStartGame}
            title="Enter the Lok Sabha chamber"
            className={`${compact ? 'shrink-0 w-auto py-1.5 h-11' : 'w-full py-2.5 sm:py-3.5'} px-4 sm:px-6 rounded-xl text-xs sm:text-base font-extrabold text-white bg-gradient-to-r from-[#ff9933] via-[#e65100] to-[#b71c1c] border-2 border-[#ffd700] shadow-[0_4px_30px_rgba(255,153,51,0.4)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 btn-shimmer`}
          >
            <span className="tracking-wide">{compact ? ROSTER.startLabel : 'ENTER THE LOK SABHA CHAMBER'}</span>
            <Swords size={18} />
          </button>
          <div className={`text-[11px] sm:text-[11px] text-[#8ea396] mt-1 ${compact ? 'hidden' : ''}`}>
            Press <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">Enter</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">Space</kbd> to Launch Session
            {' · '}
            <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">←</kbd>{' '}
            <kbd className="px-1.5 py-0.5 glass border border-[#2d4737] rounded text-white font-mono">→</kbd> to switch leader
          </div>
        </div>
      </div>
    </div>
  );
};
