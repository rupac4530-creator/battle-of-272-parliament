/**
 * TelemetrySidebar.tsx — Extracted from App.tsx lines ~2026-2282
 *
 * The right-hand "Speaker AI Telemetry" panel: live decision tree, action
 * controls, music volume, gamepad toggle, log stream, speaker mascot, legend
 * and key bindings. Rendered as a slide-in drawer on phones, a sidebar on
 * desktop ≥ lg.
 */

import React, { useRef, useEffect } from 'react';
import { AIDecision } from '../game/types';
import { controlsSummary } from '../game/controls';
import { PARODY_NOTICE } from '../game/notice';
import { AUDIO_UI } from '../game/balance';
import { actionLabel, formatEv, inspectDisabledReason } from '../game/logic';
import { useModalA11y } from '../hooks/useModalA11y';
import {
  Landmark, Brain, Mic, GraduationCap, BookOpen, Gamepad2,
  Swords, Shield, Zap, Flame, ArrowLeftRight, Undo2, Coffee,
  Briefcase, Scroll, Github, X,
  PanelRightClose, Volume2, VolumeX
} from 'lucide-react';

const TAU = Math.PI * 2;

export interface TelemetrySidebarProps {
  gameState: 'menu' | 'play' | 'over';
  is2PlayerMode: boolean;
  isDesktopSidebarOpen: boolean;
  isMobileTelemetryOpen: boolean;
  viewportWidth: number;

  // Decision tree
  activeDecisionTreeAction: string;
  treeUtilityScores: Record<string, number>;
  activeDecision: AIDecision | null;

  // Controls
  isVoiceOn: boolean;
  isCoachOn: boolean;
  isGamepadVisible: boolean;
  musicVolume: number;
  isMusicMuted: boolean;

  // Callbacks
  onSetVoiceOn: (v: boolean) => void;
  onSetCoachOn: (v: boolean) => void;
  onSetGamepadVisible: (v: boolean) => void;
  onSetMusicVolume: (v: number) => void;
  onSetMusicMuted: (v: boolean | ((prev: boolean) => boolean)) => void;
  onOpenInspector: () => void;
  onOpenRulebook: () => void;
  onCloseMobileDrawer: () => void;
  onCloseDesktopSidebar: () => void;

  // Refs (forwarded)
  logContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function TelemetrySidebar(props: TelemetrySidebarProps) {
  const {
    gameState, is2PlayerMode, isDesktopSidebarOpen, isMobileTelemetryOpen,
    viewportWidth, activeDecisionTreeAction, treeUtilityScores, activeDecision,
    isVoiceOn, isCoachOn, isGamepadVisible, musicVolume, isMusicMuted,
    onSetVoiceOn, onSetCoachOn, onSetGamepadVisible, onSetMusicVolume,
    onSetMusicMuted, onOpenInspector, onOpenRulebook,
    onCloseMobileDrawer, onCloseDesktopSidebar, logContainerRef
  } = props;

  const drawerRef = useRef<HTMLElement | null>(null);
  const mascotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawerIsDialog = isMobileTelemetryOpen && gameState !== 'menu' && viewportWidth < 1024;
  useModalA11y(drawerRef, { active: drawerIsDialog, onClose: onCloseMobileDrawer });

  // Render Speaker Mascot
  useEffect(() => {
    if (!mascotCanvasRef.current) return;
    const canvas = mascotCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-14, -8, 28, 20);
    ctx.fillStyle = '#1b3b22';
    ctx.fillRect(-12, -7, 24, 18);
    ctx.fillStyle = '#dfa672';
    ctx.beginPath();
    ctx.arc(0, -18, 12, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(0, -20, 13, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-7, -20, 6, 4.5);
    ctx.strokeRect(1, -20, 6, 4.5);
    ctx.fillStyle = '#333';
    ctx.fillRect(-5, -14, 10, 2);
    ctx.restore();
  }, []);

  return (
    <>
      {/* Mobile Telemetry Drawer Backdrop */}
      {isMobileTelemetryOpen && gameState !== 'menu' && (
        <div
          onClick={onCloseMobileDrawer}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Right Telemetry & Explainable AI Console */}
      <aside
        ref={drawerRef}
        role={drawerIsDialog ? 'dialog' : undefined}
        aria-modal={drawerIsDialog ? true : undefined}
        aria-label={drawerIsDialog ? 'AI telemetry' : undefined}
        className={`${
          gameState === 'menu'
            ? 'hidden'
            : `${isDesktopSidebarOpen ? 'lg:flex' : 'lg:hidden'} ${
                isMobileTelemetryOpen
                  ? 'fixed inset-y-0 right-0 z-50 w-full max-w-sm flex shadow-2xl animate-in slide-in-from-right duration-200'
                  : 'hidden'
              }`
        } lg:relative lg:flex-[32_1_0] lg:max-w-[420px] bg-[#0f1a14] border-t-2 lg:border-t-0 lg:border-l-2 border-[#1e3327] flex-col p-3 [@media(max-height:740px)]:p-2 gap-2 [@media(max-height:740px)]:gap-1 overflow-y-auto shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1e3327]">
          <h2 className="text-sm font-extrabold text-[#ffd700] flex items-center gap-1.5 font-serif tracking-tight">
            <Landmark size={16} className="text-[#ffd700]" /> Speaker AI Telemetry
          </h2>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/rupac4530-creator/battle-of-272-parliament"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8ea396] hover:text-[#56d364] transition-all flex items-center gap-1 text-[11px] font-mono hover:scale-105"
              title="GitHub Repository"
            >
              <Github size={13} /> GitHub
            </a>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-[#138808]/25 border border-[#138808] text-[#56d364] tracking-wider">
              {is2PlayerMode ? 'PVP REFEREE' : 'SELF-EXPLAINING CODE'}
            </span>
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="p-1 rounded-lg glass hover:bg-white/10 text-[#8ea396] hover:text-white lg:hidden ml-1"
              aria-label="Close Telemetry Drawer"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={onCloseDesktopSidebar}
              className="p-1 rounded-lg glass hover:bg-white/10 text-[#8ea396] hover:text-white hidden lg:flex ml-1"
              title="Minimize Sidebar (Theater View)"
              aria-label="Minimize sidebar (Theater View)"
            >
              <PanelRightClose size={16} />
            </button>
          </div>
        </div>

        {/* Real-Time Live Decision Tree Visualizer */}
        <div className="glass-dark border border-[#1e3327] rounded-xl p-2.5">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#ffd700] mb-1.5">
            <span className="flex items-center gap-1.5"><Brain size={13} /> LIVE DECISION TREE</span>
            <span className="text-[#56d364] font-mono">
              {actionLabel(activeDecisionTreeAction).toUpperCase()} (
              {treeUtilityScores[activeDecisionTreeAction] >= 0 ? '+' : ''}
              {Math.round(treeUtilityScores[activeDecisionTreeAction] ?? 0)})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'Strike', label: 'Strike', icon: <Swords size={11} /> },
              { id: 'Special', label: 'Special', icon: <Zap size={11} /> },
              { id: 'Super', label: 'Super', icon: <Flame size={11} /> },
              { id: 'Block', label: 'Block', icon: <Shield size={11} /> },
              { id: 'Approach', label: 'Approach', icon: <ArrowLeftRight size={11} /> },
              { id: 'Retreat', label: 'Retreat', icon: <Undo2 size={11} /> },
              { id: 'Podium', label: actionLabel('Podium'), icon: <Landmark size={11} /> },
              { id: 'Pickup', label: actionLabel('Pickup'), icon: <Coffee size={11} /> },
              { id: 'PickupLine', label: actionLabel('PickupLine'), icon: <Mic size={11} /> }
            ].map(node => {
              const isActive = activeDecisionTreeAction === node.id;
              const val = Math.round(treeUtilityScores[node.id] ?? 0);
              return (
                <div
                  key={node.id}
                  className={`px-2 py-1.5 rounded-lg text-[11px] border flex justify-between items-center transition-all duration-200 ${
                    isActive
                      ? 'glass border-[#ffd700] text-white font-bold shadow-[0_0_12px_rgba(255,215,0,0.25)]'
                      : 'bg-[#0d1a13] border-[#1a2e22] text-[#8ea396] hover:border-[#2a4e3a]'
                  }`}
                >
                  <span className="flex items-center gap-1">{node.icon} {node.label}</span>
                  <span className={`font-mono font-bold ${isActive ? 'text-[#56d364]' : 'text-[#8ea396]'}`}>
                    {val >= 0 ? `+${val}` : val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls & Toggles */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-disabled={inspectDisabledReason(is2PlayerMode, !!activeDecision) !== null}
            title={inspectDisabledReason(is2PlayerMode, !!activeDecision) ?? 'See why the CPU chose its last move'}
            onClick={onOpenInspector}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold glass border border-[#ffd700]/40 text-[#ffd700] transition-all flex items-center justify-center gap-1.5 ${
              inspectDisabledReason(is2PlayerMode, !!activeDecision) !== null
                ? 'opacity-45 cursor-not-allowed'
                : 'hover:bg-[#294234] hover:scale-[1.03]'
            }`}
          >
            <Brain size={14} /> Why Did You Do That?
          </button>

          <button
            type="button"
            onClick={() => onSetVoiceOn(!isVoiceOn)}
            title="Plays the recorded voice clip of each leader (on the map and during supers)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5 ${
              isVoiceOn
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'glass border-[#1e3327] text-[#8ea396]'
            }`}
          >
            <Mic size={14} /> Voice clips: {isVoiceOn ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => onSetCoachOn(!isCoachOn)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5 ${
              isCoachOn
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'glass border-[#1e3327] text-[#8ea396]'
            }`}
          >
            <GraduationCap size={14} /> Rule Coach: {isCoachOn ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={onOpenRulebook}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold glass hover:bg-[#294234] border border-[#1e3327] text-[#f5eedb] transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5"
          >
            <BookOpen size={14} /> Rulebook
          </button>
        </div>

        {/* Music: mute + volume */}
        <div className="flex items-center gap-2 glass-dark border border-[#1e3327] rounded-lg px-2 py-1">
          <button
            type="button"
            onClick={() => onSetMusicMuted((m: boolean) => !m)}
            aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
            aria-pressed={isMusicMuted}
            title={isMusicMuted ? 'Unmute music' : 'Mute music'}
            className={`shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center transition-all hover:scale-[1.05] ${
              isMusicMuted
                ? 'glass border-[#1e3327] text-[#8ea396]'
                : 'bg-[#1f4e35] border-[#56d364] text-white'
            }`}
          >
            {isMusicMuted || musicVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={AUDIO_UI.musicSliderStep}
            value={musicVolume}
            onChange={e => {
              const v = Number(e.target.value);
              onSetMusicVolume(v);
              if (v > 0) onSetMusicMuted(false);
            }}
            aria-label="Music volume"
            className="flex-1 min-w-0 h-11 accent-[#56d364] cursor-pointer"
          />
          <span className="shrink-0 w-10 text-right text-xs font-mono text-[#8ea396]">
            {isMusicMuted ? 'MUTE' : `${Math.round(musicVolume * 100)}%`}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetGamepadVisible(!isGamepadVisible)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5 ${
              isGamepadVisible
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'glass border-[#1e3327] text-[#8ea396]'
            }`}
          >
            <Gamepad2 size={14} /> On-Screen Gamepad: {isGamepadVisible ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Real-Time Telemetry Log Stream */}
        <div
          ref={logContainerRef}
          className="flex-1 min-h-[110px] [@media(max-height:800px)]:min-h-[64px] max-h-[160px] overflow-y-auto glass-dark border border-[#1e3327] rounded-xl p-2 font-mono flex flex-col gap-1.5"
        />

        {/* Speaker Om Birla Referee Mascot */}
        <div className="glass-dark border border-[#1e3327] rounded-xl p-2.5 flex items-center gap-2.5 shrink-0">
          <canvas
            ref={mascotCanvasRef}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full border-2 border-[#ffd700] bg-[#15221b] shrink-0"
          />
          <div className="flex-1 text-[11px] leading-tight">
            <div className="font-extrabold text-[#ffd700] flex items-center gap-1">
              <Landmark size={11} /> Speaker Om Birla
            </div>
            <div className="text-[#d8e5dc] italic mt-0.5">
              "Order in the House! Members must strictly follow Rule 267 and debate with dignity!"
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#8ea396] pt-1 border-t border-[#1e3327]">
          <span className="flex items-center gap-1"><Briefcase size={10} className="text-[#ffd700]" /> Briefcase: +50 Meter</span>
          <span className="flex items-center gap-1"><Coffee size={10} className="text-[#56d364]" /> Chai: +30 HP Heal</span>
          <span className="flex items-center gap-1"><Scroll size={10} className="text-[#ff9933]" /> Gavel: 1.5x Dmg Boost</span>
          <span className="flex items-center gap-1"><Mic size={10} className="text-[#58a6ff]" /> Mic: Radial Sound Blast</span>
        </div>

        {/* Key Bindings */}
        <div className="text-[11px] text-[#8ea396] pt-1 border-t border-[#1e3327] leading-tight">
          <b className="text-white">P1:</b> {controlsSummary('p1')}.
          <br />
          <b className="text-white">P2:</b> {controlsSummary('p2')}.
          <br />
          <b className="text-[#ffd700]">Win:</b> 0 HP Knockout OR capture 272 Majority Seats on the podium!
        </div>

        {/* Parody notice */}
        <p className="text-[11px] text-[#8ea396] pt-1 border-t border-[#1e3327] leading-tight">
          {PARODY_NOTICE}
        </p>
      </aside>
    </>
  );
}
