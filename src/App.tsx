import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import {
  VETO,
  PARRY,
  KADI_NINDA,
  DHARNA_INVINCIBLE_SECONDS,
  MAMATA_COMBO_COOLDOWN,
  AI_DODGE_CHANCE, CAMERA, MODI_WAVE, STRIKE_DAMAGE, PICKUP_LINE, SUPER_TICK, MUFFLER_HOOK, RAHUL_HEAL, SHAH_CHAIN_DMG, SHAH_FREEZE_SECONDS, RAFALE, MOVE, HIT_FEEL, CUTSCENE_END, HUD_TEXT, GHOST_BAR, FLOAT_TEXT, CLOCK, REFUSAL_TEXT, PHONE_HUD, VS, VOICE, AUDIO_UI, DECISION_UI } from './game/balance';
import { prefersReducedMotion } from './game/motion';
import {
  Politician,
  Combatant,
  PowerUp,
  Projectile,
  Particle,
  FloatingText,
  AIDecision,
  GameEnding
} from './game/types';
import {
  updateOrder,
  POLITICIANS,
  SPEED_FACTORS,
  createCombatant,
  calculateHitDamage,
  pickStrikeType,
  superInRange,
  decayPerFrame,
  cameraTargetZoom,
  cameraEase,
  cameraTransform,
  hitFeel,
  bufferStep,
  separateFighters,
  integrate,
  stepHorizontal,
  cutsceneSkipTo,
  pickRenderScale,
  superReadyLabel,
  thoughtBubbleBox,
  newGhostBar,
  stepGhostBar,
  clockLook,
  invincibleAlpha,
  appliedShake,
  clockTickFreq,
  floatingTextLife,
  layoutFloatingText,
  checkVictoryCondition,
  calculateAIUtilities,
  logPrefix,
  isDuplicateFloat,
  type LogType,
  SHOUTS,
  phoneHudLayout,
  coachMayReplace,
  stepRoster, inspectDisabledReason, pickOpponent, rerollOpponent, vsMaySkip,
  effectiveMusicVolume,
  shouldPublishDecision,
  actionLabel,
  formatEv,
} from './game/logic';
import { PARODY_NOTICE } from './game/notice';
import { isActive, primaryLabel, controlsSummary, swallowedInMatch, PAUSE_CODES } from './game/controls';
import { useModalA11y } from './hooks/useModalA11y';
import { usePersistedSetting } from './hooks/usePersistedSetting';
import { warmFighter } from './game/warm';
import { loadSettings } from './game/settings';
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  FLOOR_Y,
  getChamberBackground,
  prepareStageCanvas,
  drawPolitician,
  drawPowerUp,
  drawProjectile,
  drawSuperCinematic
} from './game/renderer';
import {
  playSound,
  playSuperSound,
  speakPoliticianVoice,
  setVoiceEnabled,
  getVoiceEnabled,
  startBattleMusic,
  stopBattleMusic,
  pauseAllAudio,
  resumeAllAudio,
  stopAllVoices,
  stopVoice,
  setBattleMusicVolume
} from './game/audio';
import { IndiaMapSelect } from './components/IndiaMapSelect';
import { VersusCard } from './components/VersusCard';
import { AIDecisionInspector } from './components/AIDecisionInspector';
import { RulebookModal } from './components/RulebookModal';
import { GameOverModal } from './components/GameOverModal';
import { VirtualGamepad, PadAction } from './components/VirtualGamepad';
import { IntroLoadingScreen } from './components/IntroLoadingScreen';
import { useDeviceLayout, readTouchPrimary } from './hooks/useDeviceLayout';
import { enterImmersive, exitImmersive, isFullscreen, canFullscreen } from './game/display';
import {
  Landmark, Brain, Mic, GraduationCap, BookOpen, Gamepad2,
  Swords, Shield, Zap, Flame, ArrowLeftRight, Undo2, Coffee,
  Briefcase, Scroll, Play, Pause, MapIcon, Github, X,
  RotateCw, Maximize2, PanelRightClose, PanelRightOpen,
  Volume2, VolumeX
} from 'lucide-react';

/** Versus card state (F34): 'pick' = Player 2 chooses a fighter, 'vs' = the matchup is shown before the bell. */
type VsState = { phase: 'pick' | 'vs'; p1: Politician; p2: Politician | null };

const TAU = Math.PI * 2;
const POWERUP_TYPES = ['case', 'cup', 'gavel', 'mic'] as const;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mascotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // F44: choices saved from the last visit (read once; every field is optional and falls back to the default).
  const [saved] = useState(() => loadSettings(POLITICIANS.map(p => p.id)));

  // High-level App State
  const [isLoadingIntro, setIsLoadingIntro] = useState(true);
  const [gameState, setGameState] = useState<'menu' | 'play' | 'over'>('menu');
  const [selectedPolitician, setSelectedPolitician] = useState<Politician>(
    () => POLITICIANS.find(p => p.id === saved.fighterId) ?? POLITICIANS[0]
  );
  const [is2PlayerMode, setIs2PlayerMode] = useState(saved.twoPlayer ?? false);
  // Versus card (F34): 'pick' = Player 2 chooses a fighter, 'vs' = the matchup is shown for a moment before the bell.
  const [vs, setVs] = useState<VsState | null>(null);
  // F55: while the VS card is up, start loading both fighters' 3D models so the match opens with the real bodies
  // instead of a plain body that swaps in a moment later.
  useEffect(() => {
    if (!vs || vs.phase !== 'vs' || !vs.p1 || !vs.p2) return;
    const a = vs.p1;
    const b = vs.p2;
    const warm = () => { warmFighter(a); warmFighter(b); };
    warm();
    const id = window.setInterval(warm, 150);
    return () => window.clearInterval(id);
  }, [vs]);
  const vsOpenedAtRef = useRef(0);
  const [isVoiceOn, setIsVoiceOn] = useState(saved.voiceOn ?? true);
  // Music volume (F37): the slider value and a mute switch. Mute keeps the slider value so unmuting restores it.
  const [musicVolume, setMusicVolume] = useState<number>(saved.musicVolume ?? AUDIO_UI.defaultMusicVolume);
  const [isMusicMuted, setIsMusicMuted] = useState(saved.musicMuted ?? false);
  const [isCoachOn, setIsCoachOn] = useState(saved.coachOn ?? true);
  const [isGamepadVisible, setIsGamepadVisible] = useState<boolean>(() => saved.gamepad ?? readTouchPrimary());
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  // The CPU fighter whose voice the inspector's Speak buttons play (set when the inspector opens).
  const [inspectorSpeakerId, setInspectorSpeakerId] = useState<string | undefined>(undefined);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [activeDecision, setActiveDecision] = useState<AIDecision | null>(null);
  const [gameEnding, setGameEnding] = useState<GameEnding | null>(null);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isSuperReadyP1, setIsSuperReadyP1] = useState(false);
  // True while a super cutscene plays: the on-screen pad and Rule Coach step out of the way.
  const [isCutscene, setIsCutscene] = useState(false);
  const [activeDecisionTreeAction, setActiveDecisionTreeAction] = useState<string>('Strike');
  const [treeUtilityScores, setTreeUtilityScores] = useState<Record<string, number>>({});

  // Send the music volume to the engine whenever the slider or the mute switch changes (also before the music starts).
  useEffect(() => {
    setBattleMusicVolume(effectiveMusicVolume(musicVolume, isMusicMuted));
  }, [musicVolume, isMusicMuted]);

  // Device / orientation layout (see hooks/useDeviceLayout.ts)
  const { viewportDims, isForceRotated, isTouchPrimary, toggleRotate } = useDeviceLayout();
  const [isFs, setIsFs] = useState<boolean>(() => typeof document !== 'undefined' && isFullscreen());
  const fsTriedRef = useRef(false);

  const [isMobileTelemetryOpen, setIsMobileTelemetryOpen] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(saved.sidebarOpen ?? true);

  // F44: store each choice when the player changes it. A value is written only once it differs from what was
  // loaded, so the pad default (which follows the device) is not frozen by saving some other setting.
  usePersistedSetting('voiceOn', isVoiceOn);
  usePersistedSetting('coachOn', isCoachOn);
  usePersistedSetting('gamepad', isGamepadVisible);
  usePersistedSetting('twoPlayer', is2PlayerMode);
  usePersistedSetting('fighterId', selectedPolitician.id);
  usePersistedSetting('sidebarOpen', isDesktopSidebarOpen);
  usePersistedSetting('musicVolume', musicVolume);
  usePersistedSetting('musicMuted', isMusicMuted);
  // A saved "voice clips off" has to reach the audio engine too, not just the button label.
  useEffect(() => {
    setVoiceEnabled(isVoiceOn);
  }, [isVoiceOn]);

  // F29: measure the stage box (layout px, unaffected by the forced-rotation transform) so the phone HUD can
  // keep its buttons below the canvas's top HUD strip and move the Rule Coach to the bottom.
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const shownTipsRef = useRef<Set<string>>(new Set());
  const isShortRef = useRef(false);
  const [stageBox, setStageBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = stageBoxRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      setStageBox((prev: { w: number; h: number }) => (prev.w === w && prev.h === h ? prev : { w, h }));
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
  const phoneHud = phoneHudLayout(stageBox.w, stageBox.h);
  isShortRef.current = phoneHud.isShort;
  // On short screens a tip shows for a few seconds and goes away by itself (a new tip restarts the timer).
  useEffect(() => {
    if (!coachTip || !phoneHud.isShort) return;
    const id = window.setTimeout(() => setCoachTip(null), PHONE_HUD.coachSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [coachTip, phoneHud.isShort]);

  // Keep the fullscreen flag in sync (Esc / system back / swipe can leave fullscreen)
  useEffect(() => {
    const sync = () => setIsFs(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // Phones: on the first tap, go fullscreen and lock landscape where the browser allows
  // it (Android Chrome). Where it does not (iPhone Safari) the CSS rotation is used.
  useEffect(() => {
    if (!isTouchPrimary || !canFullscreen()) return;
    const onFirstTap = () => {
      if (fsTriedRef.current) return;
      fsTriedRef.current = true;
      if (Math.min(window.innerWidth, window.innerHeight) <= 500 && !isFullscreen()) {
        void enterImmersive();
      }
    };
    window.addEventListener('pointerup', onFirstTap, { once: true });
    return () => window.removeEventListener('pointerup', onFirstTap);
  }, [isTouchPrimary]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen()) await exitImmersive();
    else await enterImmersive();
    setIsFs(isFullscreen());
  }, []);

  // Mutable Game Simulation Refs (outside React reconciliation)
  const combatantsRef = useRef<{ p1: Combatant; p2: Combatant } | null>(null);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cinematicRef = useRef<{ actor: Combatant; target: Combatant; elapsed: number } | null>(null);
  const matchTimeRef = useRef<number>(60);
  const ghostBarsRef = useRef({ p1: newGhostBar(100), p2: newGhostBar(100) });
  const cameraShakeRef = useRef<number>(0);
  const cameraRef = useRef<{ zoom: number; cx: number }>({ zoom: 1, cx: STAGE_WIDTH / 2 });
  const nextPowerUpSpawnRef = useRef<number>(3);
  const isPausedRef = useRef<boolean>(false);
  const padRef = useRef({
    p1: { dx: 0, dy: 0, block: false, jump: false },
    p2: { dx: 0, dy: 0, block: false, jump: false }
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isSuperReadyP2, setIsSuperReadyP2] = useState(false);
  const keyboardStateRef = useRef<Record<string, boolean>>({});
  const justPressedRef = useRef<Record<string, boolean>>({});
  const simTickRef = useRef<number>(0);
  const lastAITimeRef = useRef<number>(0);
  const lastAIActionRef = useRef<string>('');
  // F39: the CPU decides every 140 ms but React hears about it only while something on screen shows it.
  const latestDecisionRef = useRef<AIDecision | null>(null);
  const publishedBestRef = useRef<string | null>(null);
  const decisionPublishedAtRef = useRef(0);
  const decisionVisibleRef = useRef(false);
  const isCoachOnRef = useRef(true);
  const lastAIJumpRef = useRef<number>(-1e9);
  const coachStepRef = useRef<number>(0);

  // One pause system: the match is held while ANY reason is active, so closing the inspector
  // or rulebook can never undo a pause the player made themselves.
  type PauseReason = 'user' | 'inspector' | 'rules';
  const pauseReasonsRef = useRef<Set<PauseReason>>(new Set());

  // Game-time scheduler for multi-shot supers: advanced by the simulation step, so it freezes with
  // pause and cutscenes and is wiped on rematch / game over / back to map (setTimeout did none of that).
  // Hit-stop: seconds of simulation freeze left, and a cooldown so volleys do not freeze repeatedly.
  const hitStopRef = useRef(0);
  const hitStopCdRef = useRef(0);
  const scheduledRef = useRef<{ t: number; run: () => void }[]>([]);
  const schedule = (delaySec: number, run: () => void) => {
    scheduledRef.current.push({ t: delaySec, run });
  };
  const tickScheduled = (dt: number) => {
    if (scheduledRef.current.length === 0) return;
    const due: (() => void)[] = [];
    scheduledRef.current = scheduledRef.current.filter((item: { t: number; run: () => void }) => {
      item.t -= dt;
      if (item.t <= 0) { due.push(item.run); return false; }
      return true;
    });
    due.forEach(run => run());
  };
  const setPause = useCallback((reason: PauseReason, on: boolean) => {
    const set = pauseReasonsRef.current;
    if (on) set.add(reason); else set.delete(reason);
    const paused = set.size > 0;
    if (paused) {
      // Presses made while held must not fire on resume.
      justPressedRef.current = {};
    }
    isPausedRef.current = paused;
    if (paused) pauseAllAudio(); else resumeAllAudio();
    setIsPaused(set.has('user')); // the "HOUSE ADJOURNED" overlay is for the player's own pause only
  }, []);

  // Sync state to body dataset for testing / automation
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Handle Autostart URL parameter if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setIsLoadingIntro(false);
      const p1Id = params.get('p1');
      const p2Id = params.get('p2');
      const p1 = POLITICIANS.find(p => p.id === p1Id) || POLITICIANS[0];
      const p2 = POLITICIANS.find(p => p.id === p2Id) || POLITICIANS[1];
      startMatch(p1, p2);

      const forceSuper = params.get('super');
      const delay = parseFloat(params.get('superDelay') || '600');
      if (forceSuper) {
        const id = window.setTimeout(() => {
          if (combatantsRef.current) {
            const actor = forceSuper === 'p2' ? combatantsRef.current.p2 : combatantsRef.current.p1;
            const target = forceSuper === 'p2' ? combatantsRef.current.p1 : combatantsRef.current.p2;
            target.meter = 0;
            actor.meter = 100;
            triggerSuperMove(actor, target);
          }
        }, delay);
        return () => window.clearTimeout(id);
      }
    }
  }, []);

  const addLog = useCallback((type: LogType, msg: string) => {
    if (!logContainerRef.current) return;
    const entry = document.createElement('div');
    entry.className = `p-1 rounded text-[11px] leading-tight border-l-2 transition-all animate-in fade-in duration-200 ${
      type === 'cpu'
        ? 'border-[#ff7b72] bg-[#ff7b72]/15 text-[#f5eedb]'
        : type === 'me'
        ? 'border-[#ffd700] bg-[#ffd700]/15 text-white'
        : type === 'super'
        ? 'border-[#ff9933] bg-[#ff9933]/20 text-[#ffd700] font-bold shadow-sm'
        : 'border-[#56d364] bg-[#56d364]/15 text-[#d8e5dc]'
    }`;
    entry.textContent = `${logPrefix(type)}${msg}`;
    const container = logContainerRef.current;
    container.appendChild(entry);
    while (container.children.length > 30) {
      container.firstChild?.remove();
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    isCoachOnRef.current = isCoachOn;
  }, [isCoachOn]);

  const publishDecision = useCallback((d: AIDecision, nowMs: number) => {
    setActiveDecision(d);
    setActiveDecisionTreeAction(d.best);
    setTreeUtilityScores(d.utilityMap);
    publishedBestRef.current = d.best;
    decisionPublishedAtRef.current = nowMs;
  }, []);

  // Is the decision on screen (inspector, phone drawer, or the desktop sidebar at lg width)? When it becomes visible, show the newest one at once.
  useEffect(() => {
    const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const compute = () => {
      const wide = mq ? mq.matches : true;
      const visible = isInspectorOpen || isMobileTelemetryOpen || (isDesktopSidebarOpen && wide && gameState !== 'menu');
      const was = decisionVisibleRef.current;
      decisionVisibleRef.current = visible;
      if (visible && !was && latestDecisionRef.current) publishDecision(latestDecisionRef.current, performance.now());
    };
    compute();
    mq?.addEventListener?.('change', compute);
    return () => mq?.removeEventListener?.('change', compute);
  }, [isInspectorOpen, isMobileTelemetryOpen, isDesktopSidebarOpen, gameState, publishDecision]);

  const updateCoach = useCallback((text: string, step: number) => {
    if (!isCoachOnRef.current || !coachMayReplace(coachStepRef.current, step)) return;
    // Short screens: a tip that has already had its few seconds does not pop back (the item tip is re-sent every drop).
    if (isShortRef.current && shownTipsRef.current.has(text)) return;
    shownTipsRef.current.add(text);
    coachStepRef.current = step;
    setCoachTip(text);
  }, []);

  // Spawn visual particle burst
  const spawnParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 440,
        vy: (Math.random() - 0.7) * 380,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 3 + Math.random() * 3
      });
    }
  };

  // Add floating combat text
  /** Like addFloatingText, but skipped while the same message is still showing near x (refusals while a key is mashed). */
  const addRefusalText = (text: string, x: number, y: number, color: string) => {
    if (isDuplicateFloat(floatingTextsRef.current, text, x, REFUSAL_TEXT.duplicateRadius)) return;
    addFloatingText(text, x, y, color);
  };

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      life: floatingTextLife(text.length),
      color
    });
  };

  // Combat strike hit resolution
  const handleHit = (
    attacker: Combatant,
    defender: Combatant,
    baseDamage: number,
    baseKnockback: number,
    unblockable = false
  ) => {
    if (defender.invincible > 0 || defender.hp <= 0) return;

    // Point of Order Parry Counter check
    if (defender.counter > 0 && !unblockable) {
      defender.counter = 0;
      playSound(900, 0.2, 'triangle');
      addFloatingText('PARRIED!', defender.x, defender.y - 120, '#58a6ff');
      addLog('me', `${defender.c.name}: Point of Order! Parried ${attacker.c.name}.`);
      defender.meter = Math.min(100, defender.meter + PARRY.meterGain);
      handleHit(defender, attacker, PARRY.reflectDmg, 280, true);
      return;
    }

    const { finalDamage, knockbackMultiplier } = calculateHitDamage(
      attacker.damageBoost,
      defender.blocking && !unblockable,
      baseDamage
    );

    if (defender.blocking && !unblockable) {
      playSound(220, 0.08, 'sawtooth');
    } else {
      defender.stun = 0.25;
      playSound(160 + Math.random() * 60, 0.12, 'square', 0.1, -90);
    }

    defender.hp = Math.max(0, defender.hp - finalDamage);
    attacker.meter = Math.min(100, attacker.meter + finalDamage * 1.5);
    defender.meter = Math.min(100, defender.meter + finalDamage * 0.5);

    attacker.seats = Math.min(272, attacker.seats + finalDamage * 0.5);
    defender.seats = Math.max(0, defender.seats - finalDamage * 0.25);

    defender.vx = attacker.facing * baseKnockback * knockbackMultiplier;
    // Blocked hits slide the blocker back but must not launch them: the hop dropped the guard
    // for ~0.14 s and let follow-up hits land at full damage.
    if (!(defender.blocking && !unblockable)) {
      defender.vy = Math.min(defender.vy, -130);
    }

    attacker.comboCount = attacker.comboTimer > 0 ? attacker.comboCount + 1 : 1;
    attacker.comboTimer = 1.2;

    // Blocks look and feel different from clean hits: blue sparks, less shake, grey number.
    const blockedHit = defender.blocking && !unblockable;
    const feel = hitFeel(finalDamage, blockedHit);
    spawnParticles(defender.x, defender.y - 60, feel.sparkCount, feel.sparkColor);
    cameraShakeRef.current = Math.max(cameraShakeRef.current, feel.shake);
    addFloatingText(feel.label, defender.x + (Math.random() - 0.5) * 28, defender.y - 105, feel.numberColor);
    if (feel.hitStop > 0 && hitStopCdRef.current <= 0) {
      hitStopRef.current = Math.max(hitStopRef.current, feel.hitStop);
      hitStopCdRef.current = HIT_FEEL.stopCooldown;
    }

    if (attacker === combatantsRef.current?.p1) {
      updateCoach('Great strike! Keep attacking to charge your Super Meter to 100%!', 2);
    }
  };

  // Perform standard strike (chains punch -> cross -> high martial arts kick, or airborne dropkick)
  const performStrike = (a: Combatant, b: Combatant) => {
    const isAirborne = a.y < FLOOR_Y - 2;
    const isForward = (a.facing > 0 && a.input.right) || (a.facing < 0 && a.input.left);
    const attackType = pickStrikeType({
      airborne: isAirborne,
      forward: !!isForward,
      wantKick: !!a.input.kick,
      comboCount: a.comboCount
    });
    a.input.kick = 0;

    a.attackType = attackType;
    a.atk = attackType === 'kick' ? 0.35 : (attackType === 'dropkick' ? 0.38 : 0.26);

    if (attackType === 'kick' || attackType === 'dropkick') {
      playSound(380, 0.12, 'sawtooth', 0.08, -140);
      addFloatingText('KICK!', a.x + a.facing * 44, a.y - 70, '#ff9933');
    } else {
      playSound(320, 0.07, 'square', 0.05, -100);
    }

    const range = (attackType === 'kick' || attackType === 'dropkick' ? 84 : 66) + (a.blast > 0 ? 32 : 0);
    const dmg = attackType === 'kick' ? STRIKE_DAMAGE.kick : (attackType === 'dropkick' ? STRIKE_DAMAGE.dropkick : STRIKE_DAMAGE.punch);
    const knockback = attackType === 'kick' ? 270 : (attackType === 'dropkick' ? 320 : 210);

    if (Math.abs(a.x - b.x) < range && Math.abs(a.y - b.y) < 75) {
      handleHit(a, b, dmg, knockback);
    }
  };

  // Perform politician's signature special ability
  const performSpecial = (a: Combatant, b: Combatant) => {
    const c = a.c;
    a.cdSpecial = 2.6;
    a.attackType = 'special';
    a.atk = 0.34;
    const dist = Math.abs(a.x - b.x);
    playSound(520, 0.16, 'sawtooth', 0.07, -200);
    addFloatingText(SHOUTS[c.id] ?? '', a.x, a.y - 134, '#ffb347');

    if (c.specialType === 'proj') {
      projectilesRef.current.push({
        id: Math.random(),
        kind: 'wave',
        x: a.x + a.facing * 36,
        y: a.y - 62,
        vx: a.facing * 460,
        dmg: MODI_WAVE.dmg,
        owner: a,
        lifetime: 2
      });
    } else if (c.specialType === 'grab') {
      if (dist < 88) {
        handleHit(a, b, 10, 130);
        const stolen = Math.min(25, b.meter);
        b.meter -= stolen;
        a.meter = Math.min(100, a.meter + stolen);
        addFloatingText('METER SIPHONED', b.x, b.y - 120, '#ffd700');
        addLog(a.isAI ? 'cpu' : 'me', `${c.name} executed Operation Lotus, stealing ${Math.round(stolen)}% meter!`);
      } else {
        addFloatingText('MISS', a.x, a.y - 120, '#888888');
      }
    } else if (c.specialType === 'drain') {
      if (dist < 96) {
        handleHit(a, b, 8, 110);
        b.meter = Math.max(0, b.meter - 20);
        a.hp = Math.min(100, a.hp + 8);
        addFloatingText('28% GST DRAIN', b.x, b.y - 120, '#56d364');
      } else {
        addFloatingText('MISS', a.x, a.y - 120, '#888888');
      }
    } else if (c.specialType === 'pull') {
      // The hook now visibly pulls the opponent in (whip window), then lands its hit when it ends.
      if (dist < MUFFLER_HOOK.range) {
        a.whip = MUFFLER_HOOK.duration;
        a.hookPending = true;
      } else {
        addFloatingText('MISS', a.x, a.y - 120, '#888888');
      }
    } else if (c.specialType === 'combo') {
      a.burstCount = 3;
      a.burstTimer = 0;
      a.cdSpecial = MAMATA_COMBO_COOLDOWN;
    } else if (c.specialType === 'counter') {
      a.counter = PARRY.window;
      a.cdSpecial = PARRY.cooldown;
    } else if (c.specialType === 'burn') {
      projectilesRef.current.push({
        id: Math.random(),
        kind: 'flame',
        x: a.x + a.facing * 40,
        y: a.y - 58,
        vx: a.facing * 380,
        dmg: 12,
        owner: a,
        lifetime: 1.5
      });
    } else if (c.specialType === 'confuse') {
      b.confused = KADI_NINDA.confuseSeconds;
      if (dist < KADI_NINDA.stunRange && !b.blocking) b.stun = Math.max(b.stun, KADI_NINDA.stunSeconds);
      addFloatingText('MOYE MOYE CONFUSION', b.x, b.y - 120, '#ff9933');
    } else if (c.specialType === 'heal_aura') {
      a.hp = Math.min(100, a.hp + RAHUL_HEAL.heal);
      a.invincible = RAHUL_HEAL.invincible;
      a.cdSpecial = RAHUL_HEAL.cooldown;
      addFloatingText(`MOHABBAT KI DUKAAN +${RAHUL_HEAL.heal} HP`, a.x, a.y - 120, '#58a6ff');
    }
  };

  // Political pickup line (+8 Seats)
  const performPickupLine = (a: Combatant) => {
    // Capped so tapping the key can no longer win the match on its own.
    if (a.lineUses >= PICKUP_LINE.maxUses) {
      addRefusalText('NO LINES LEFT', a.x, a.y - 120, '#9aa5b1');
      return;
    }
    if (a.lineCd > 0) {
      addRefusalText('LINE COOLING DOWN', a.x, a.y - 120, '#9aa5b1');
      return;
    }
    a.lineCd = PICKUP_LINE.cooldown;
    a.lineUses += 1;
    playSound(600, 0.15, 'sine', 0.08, 200);
    addFloatingText(`"${a.c.pickupLine}"`, a.x, a.y - 50, '#ffd700');
    a.seats = Math.min(272, a.seats + PICKUP_LINE.seats);
    addLog(a.isAI ? 'cpu' : 'me', `${a.c.name} recited a witty pickup line (+${PICKUP_LINE.seats} Seats, ${PICKUP_LINE.maxUses - a.lineUses} left)!`);
  };

  // Launch Cinematic Super Move
  const triggerSuperMove = (a: Combatant, b: Combatant) => {
    a.meter = 0;
    a.attackType = 'super';
    cinematicRef.current = { actor: a, target: b, elapsed: 0 };
    setIsCutscene(true);
    // The pad unmounts for the cutscene, so a held stick would never send its release: zero it now.
    padRef.current = { p1: { dx: 0, dy: 0, block: false, jump: false }, p2: { dx: 0, dy: 0, block: false, jump: false } };
    // Deliver authentic politician voice with acoustic meme backing
    speakPoliticianVoice(a.c.id);
    playSound(90, 0.6, 'sawtooth', 0.12, -30);
  };

  // Release the actual superpower into the arena after cinematic
  const releaseSuperAbility = (a: Combatant, b: Combatant) => {
    const k = a.c.superType;
    const f = a.facing;
    setIsCutscene(false);
    stopVoice(VOICE.cutsceneFadeSeconds); // the clip is longer than the scene: fade it out instead of letting it run over the fight
    a.surge = 1.4;
    a.attackType = 'super';
    cameraShakeRef.current = 16;
    playSuperSound(k);
    addLog(a.isAI ? 'cpu' : 'me', `SUPER: ${a.c.name} unleashes ${a.c.superName}!`);
    if ((k === 'train' || k === 'bulldozer') && a !== combatantsRef.current?.p1) {
      updateCoach(`JUMP [${primaryLabel('p1', 'jump')}] over the train or bulldozer to dodge it!`, coachStepRef.current);
    }

    if (k === 'train') {
      // Vande Bharat Express Bullet Train
      projectilesRef.current.push({
        id: Math.random(),
        kind: 'train',
        x: f > 0 ? -180 : STAGE_WIDTH + 180,
        y: FLOOR_Y - 8,
        vx: f * 920,
        dmg: 35,
        owner: a,
        lifetime: 2.2,
        width: 270,
        hitOnce: true
      });
    } else if (k === 'chain') {
      // Chanakya Constitutional Lockdown
      b.freeze = SHAH_FREEZE_SECONDS;
      handleHit(a, b, SHAH_CHAIN_DMG, 0, true);
      a.chain = 3;
    } else if (k === 'gst_blocks') {
      // Budget Deficit Stamp & GST Block Rain
      a.rain = SUPER_TICK.gst_blocks.duration;
      a.hp = Math.min(100, a.hp + 14);
      a.rainTimer = 0;
      addFloatingText('GST RAIN +14 HP', a.x, a.y - 130, '#56d364');
    } else if (k === 'dharna') {
      // Dharna Electric Vortex & Broom Whirlwind
      a.invincible = Math.min(SUPER_TICK.dharna.duration, DHARNA_INVINCIBLE_SECONDS);
      a.surge = 4;
      a.rain = SUPER_TICK.dharna.duration;
      a.rainTimer = 0;
    } else if (k === 'khela_volley') {
      // Khela Hobe Football Volley
      for (let i = 0; i < 5; i++) {
        projectilesRef.current.push({
          id: Math.random(),
          kind: 'ball',
          x: a.x + f * 30,
          y: a.y - 70,
          vx: f * (220 + i * 75),
          vy: -200 - i * 65,
          dmg: 8,
          owner: a,
          lifetime: 5,
          bounceCount: 4
        });
      }
    } else if (k === 'veto') {
      // Veto of Elders
      handleHit(a, b, 16, 160, true);
      b.cdSpecial = VETO.silenceSeconds;
      b.meter = 0;
      b.stun = VETO.stun;
      addFloatingText('SILENCED & VETOED', b.x, b.y - 130, '#ffffff');
    } else if (k === 'bulldozer') {
      // Yogi's JCB Bulldozer
      projectilesRef.current.push({
        id: Math.random(),
        kind: 'bulldozer',
        x: a.x,
        y: FLOOR_Y - 20,
        vx: f * 620,
        dmg: 38,
        owner: a,
        lifetime: 2.0,
        width: 170,
        hitOnce: true
      });
    } else if (k === 'aloo_gold') {
      // Rahul's Aloo-Sona Machine: Explosive 24K Gold Coin Shower
      for (let i = 0; i < 7; i++) {
        schedule(i * 0.14, () => {
          projectilesRef.current.push({
            id: Math.random(),
            kind: 'gold_coin',
            x: a.x + f * 35,
            y: a.y - 65,
            vx: f * (260 + i * 40),
            vy: (Math.random() - 0.5) * 80,
            dmg: 6,
            owner: a,
            lifetime: 3
          });
        });
      }
    } else if (k === 'rafale') {
      // Rajnath's Moye-Moye Rafale Strike
      for (let i = 0; i < RAFALE.missiles; i++) {
        schedule((i * RAFALE.gapMs) / 1000, () => {
          projectilesRef.current.push({
            id: Math.random(),
            kind: 'missile',
            x: b.x + (Math.random() - 0.5) * 2 * RAFALE.spreadPx,
            y: -20,
            vx: 0,
            vy: 420,
            dmg: RAFALE.dmg,
            owner: a,
            lifetime: 2
          });
        });
      }
    }
  };

  // Collect canteen power-ups
  const collectPowerUp = (combatant: Combatant, pu: PowerUp) => {
    playSound(880, 0.15, 'triangle', 0.08, 300);
    const opponent = combatant === combatantsRef.current?.p1 ? combatantsRef.current?.p2 : combatantsRef.current?.p1;

    if (pu.type === 'case') {
      combatant.meter = Math.min(100, combatant.meter + 50);
      combatant.cdSpecial = 0;
      addFloatingText('+50 SUPER METER', combatant.x, combatant.y - 120, '#ffd700');
    } else if (pu.type === 'cup') {
      combatant.hp = Math.min(100, combatant.hp + 30);
      addFloatingText('+30 HP KULLAD CHAI', combatant.x, combatant.y - 120, '#56d364');
    } else if (pu.type === 'gavel') {
      combatant.damageBoost = 8;
      addFloatingText('1.5x GAVEL POWER', combatant.x, combatant.y - 120, '#ff9933');
    } else if (pu.type === 'mic') {
      combatant.blast = 0.5;
      if (opponent && Math.abs(combatant.x - opponent.x) < 260) {
        opponent.vx = (opponent.x > combatant.x ? 1 : -1) * 540;
        opponent.vy = -200;
        opponent.hp = Math.max(0, opponent.hp - 8);
        opponent.stun = 0.35;
      }
      addFloatingText('RADIAL SPEAKER BLAST', combatant.x, combatant.y - 120, '#ffffff');
    }

    addLog(combatant.isAI ? 'cpu' : 'me', `${combatant.c.name} collected ${pu.type.toUpperCase()}`);
  };

  // Start new match
  const startMatch = (p1Politician: Politician, p2Politician: Politician) => {
    combatantsRef.current = {
      p1: createCombatant(p1Politician, 180, false),
      p2: createCombatant(p2Politician, 620, !is2PlayerMode)
    };
    powerUpsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    cinematicRef.current = null;
    setIsCutscene(false);
    setVs(null);
    matchTimeRef.current = 60;
    ghostBarsRef.current = {
      p1: newGhostBar(combatantsRef.current.p1.hp),
      p2: newGhostBar(combatantsRef.current.p2.hp)
    };
    cameraShakeRef.current = 0;
    nextPowerUpSpawnRef.current = 3;
    pauseReasonsRef.current.clear();
    scheduledRef.current = [];
    hitStopRef.current = 0;
    hitStopCdRef.current = 0;
    isPausedRef.current = false;
    resumeAllAudio();
    stopAllVoices();
    setIsPaused(false);
    padRef.current = { p1: { dx: 0, dy: 0, block: false, jump: false }, p2: { dx: 0, dy: 0, block: false, jump: false } };
    lastAITimeRef.current = 0;
    publishedBestRef.current = null;
    decisionPublishedAtRef.current = 0;
    lastAIJumpRef.current = -1e9;
    coachStepRef.current = 0;
    shownTipsRef.current.clear();

    // Drop keys buffered before the match (the Space/Enter that started it must not punch on frame 1)
    justPressedRef.current = {};

    // Blur any active element so keyboard events go to window
    (document.activeElement as HTMLElement)?.blur();

    setGameEnding(null);
    setGameState('play');
    startBattleMusic();
    updateCoach(`Rule 1: Move left/right with [${primaryLabel('p1', 'left')}]/[${primaryLabel('p1', 'right')}] or Virtual Joystick into debate range.`, 1);
    addLog('me', `Parliamentary Session Commenced: ${p1Politician.name} vs ${p2Politician.name}.`);
    playSound(260, 0.3, 'triangle', 0.07, 200);
  };

  // Keyboard Event Listeners
  // Versus card: remember when it opened (so the press that opened it cannot also skip it), then start the match by itself.
  useEffect(() => {
    if (vs?.phase === 'vs') vsOpenedAtRef.current = performance.now();
  }, [vs?.phase]);
  useEffect(() => {
    if (!vs || vs.phase !== 'vs' || !vs.p2 || gameState !== 'menu') return;
    const p1 = vs.p1;
    const p2 = vs.p2;
    const id = window.setTimeout(() => startMatch(p1, p2), VS.autoStartSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [vs, gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Arrow keys on a focused slider (the music volume) adjust the slider, not the fighters. Other keys still reach the game,
      // so a slider left focused after a mouse drag does not break keyboard play.
      const focused = e.target as HTMLElement | null;
      if (focused && focused.tagName === 'INPUT' && (focused as HTMLInputElement).type === 'range' && e.code.startsWith('Arrow')) return;
      keyboardStateRef.current[e.code] = true;
      // Presses made while the match is held must not fire on resume.
      if (!isPausedRef.current) justPressedRef.current[e.code] = true;

      // Pause: Esc always; P too, but only when P is not Player 2's special (single-player).
      // Ignored while a modal (inspector / rulebook) is holding the match: those close themselves.
      if (
        gameState === 'play' &&
        (e.code === PAUSE_CODES.always || (e.code === PAUSE_CODES.singlePlayerOnly && !is2PlayerMode)) &&
        !pauseReasonsRef.current.has('inspector') &&
        !pauseReasonsRef.current.has('rules')
      ) {
        e.preventDefault();
        setPause('user', !pauseReasonsRef.current.has('user'));
        return;
      }

      // Any key skips a super cutscene once it has played for a moment (modifier keys excepted).
      if (gameState === 'play' && cinematicRef.current && !isPausedRef.current && !/^(Shift|Control|Alt|Meta)/.test(e.code)) {
        cinematicRef.current.elapsed = cutsceneSkipTo(cinematicRef.current.elapsed);
      }

      // Only swallow Space/arrows while fighting, so Tab/Enter/Space keep working on buttons and modals.
      if (gameState === 'play' && swallowedInMatch(e.code, is2PlayerMode)) {
        e.preventDefault();
      }

      // Title screen quick-start: never while the intro or rulebook is open, and never when a
      // button/link/input has focus (Enter on a map pin must not start a match with the old pick).
      const target = e.target as HTMLElement | null;
      const onControl = !!target && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(target.tagName);
      // While the versus card is up it owns the keyboard: Esc goes back, Enter/Space start now (not while a button has focus,
      // so Shuffle and Back keep working from the keyboard), everything else is ignored.
      if (gameState === 'menu' && vs) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setVs(null);
        } else if (vs.phase === 'vs' && vs.p2 && !onControl && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          if (vsMaySkip(performance.now() - vsOpenedAtRef.current, e.repeat, VS.inputGraceSeconds)) startMatch(vs.p1, vs.p2);
        }
        return;
      }
      // Left/Right on the map screen switch leader (silently: the voice only plays on a pin or chip tap, so holding an arrow can't stack clips).
      // Fine while a button has focus; not while typing in a field. Wraps around the roster.
      if (
        gameState === 'menu' &&
        !isLoadingIntro &&
        !isRulebookOpen &&
        (e.code === 'ArrowLeft' || e.code === 'ArrowRight') &&
        !e.altKey && !e.ctrlKey && !e.metaKey &&
        !(target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))
      ) {
        e.preventDefault();
        const nextId = stepRoster(POLITICIANS.map(q => q.id), selectedPolitician.id, e.code === 'ArrowRight' ? 1 : -1);
        const next = POLITICIANS.find(q => q.id === nextId);
        if (next) setSelectedPolitician(next);
        return;
      }
      if (
        gameState === 'menu' &&
        !isLoadingIntro &&
        !isRulebookOpen &&
        !onControl &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        beginVersus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyboardStateRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, selectedPolitician, isLoadingIntro, isRulebookOpen, is2PlayerMode, setPause, vs]);

  // A tap on the arena skips a super cutscene too (taps on buttons, such as Pause, do not).
  useEffect(() => {
    if (gameState !== 'play') return;
    const onTap = (e: PointerEvent) => {
      const cin = cinematicRef.current;
      if (!cin || isPausedRef.current) return;
      if ((e.target as HTMLElement | null)?.closest?.('button, a, input, [role="dialog"]')) return;
      cin.elapsed = cutsceneSkipTo(cin.elapsed);
    };
    window.addEventListener('pointerdown', onTap);
    return () => window.removeEventListener('pointerdown', onTap);
  }, [gameState]);

  // Leaving the tab/window: auto-pause the match and drop held keys (their keyup never arrives).
  useEffect(() => {
    const dropKeys = () => {
      keyboardStateRef.current = {};
      justPressedRef.current = {};
    };
    const autoPause = () => {
      dropKeys();
      if (gameState === 'play') setPause('user', true); // needs a deliberate Resume
    };
    const onVisibility = () => {
      if (document.hidden) autoPause();
    };
    window.addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', autoPause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [gameState, setPause]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    // Sparks and floating labels age the same way in a match and on the game-over screen.
    const stepEffects = (dt: number) => {
      particlesRef.current.forEach(pt => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 700 * dt;
        pt.life -= dt;
      });
      particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);
      floatingTextsRef.current.forEach(ft => {
        ft.y -= 40 * dt;
        ft.life -= dt;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);
    };

    const loop = (currentTs: number) => {
      const rawDt = (currentTs - lastTs) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamped dt
      lastTs = currentTs;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas && !isPausedRef.current) {
        // Backing store follows what is actually shown (letterboxed size x device pixel ratio), so the
        // stage stays sharp on retina phones and when the sidebar/window makes the canvas bigger than 800 px.
        const renderScale = pickRenderScale(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, STAGE_WIDTH, STAGE_HEIGHT);
        prepareStageCanvas(canvas, ctx, renderScale);

        // Render Background
        ctx.save();
        if (cameraShakeRef.current > 0.3) {
          const shakeNow = appliedShake(cameraShakeRef.current, prefersReducedMotion());
          ctx.translate(
            (Math.random() - 0.5) * shakeNow,
            (Math.random() - 0.5) * shakeNow
          );
          cameraShakeRef.current *= decayPerFrame(MOVE.shakeDecay, dt);
        }
        // F57: frame both fighters. Draw-only: hitboxes, input and rules stay in world coordinates, and the HUD
        // and cutscenes are drawn after the matching restore, so they never zoom. Reduced motion keeps 1x.
        {
          const cam = cameraRef.current;
          const live = (gameState === 'play' || gameState === 'over') && combatantsRef.current && !prefersReducedMotion();
          const tz = live ? cameraTargetZoom(combatantsRef.current!.p1.x, combatantsRef.current!.p2.x, STAGE_WIDTH, CAMERA.fitMarginPx, CAMERA.maxZoom) : 1;
          const tcx = live ? (combatantsRef.current!.p1.x + combatantsRef.current!.p2.x) / 2 : STAGE_WIDTH / 2;
          cam.zoom = cameraEase(cam.zoom, tz, CAMERA.zoomRate, dt);
          cam.cx = cameraEase(cam.cx, tcx, CAMERA.panRate, dt);
          if (cam.zoom > 1.002) {
            const t = cameraTransform(cam.zoom, cam.cx, STAGE_WIDTH, STAGE_HEIGHT);
            ctx.translate(t.tx, t.ty);
            ctx.scale(t.s, t.s);
          }
        }
        ctx.drawImage(getChamberBackground(renderScale), 0, 0, STAGE_WIDTH, STAGE_HEIGHT);

        if ((gameState === 'play' || gameState === 'over') && combatantsRef.current && !isPausedRef.current) {
          const { p1, p2 } = combatantsRef.current;

          // 1. Process Cinematic Cutscene if active
          if (gameState === 'over') {
            // Decided: the fighters stay on stage behind the modal, but nothing simulates. Leftover sparks fade out
            // and the ghost bars finish draining, so a KO doesn't leave a full amber bar behind an empty one.
            stepEffects(dt);
            ghostBarsRef.current = {
              p1: stepGhostBar(ghostBarsRef.current.p1, p1.hp, dt, prefersReducedMotion()),
              p2: stepGhostBar(ghostBarsRef.current.p2, p2.hp, dt, prefersReducedMotion())
            };
          } else if (cinematicRef.current) {
            // Presses during a cutscene are for skipping it, never for fighting afterwards.
            justPressedRef.current = {};
            cinematicRef.current.elapsed += dt;
            if (cinematicRef.current.elapsed > CUTSCENE_END) {
              const act = cinematicRef.current.actor;
              const tgt = cinematicRef.current.target;
              cinematicRef.current = null;
              releaseSuperAbility(act, tgt);
            }
          } else if (hitStopRef.current > 0) {
            // Hit-stop: the world holds for a few frames on impact (the stage keeps drawing).
            hitStopRef.current -= dt;
            hitStopCdRef.current -= dt;
          } else {
            // Normal Simulation
            hitStopCdRef.current -= dt;
            const timeBefore = matchTimeRef.current;
            matchTimeRef.current -= dt;
            const tickFreq = clockTickFreq(timeBefore, matchTimeRef.current);
            if (tickFreq !== null) playSound(tickFreq, 0.06, 'sine', CLOCK.tickVolume, 0);
            tickScheduled(dt);

            // Player 1 Input Dispatch
            const pd1 = padRef.current.p1;
            const keysDown = keyboardStateRef.current;
            const keysTapped = justPressedRef.current;
            p1.input.left = isActive('p1', 'left', keysDown) || pd1.dx < -0.25 ? 1 : 0;
            p1.input.right = isActive('p1', 'right', keysDown) || pd1.dx > 0.25 ? 1 : 0;
            p1.input.block = isActive('p1', 'block', keysDown) || pd1.block || pd1.dy > 0.65 ? 1 : 0;
            p1.input.jump = isActive('p1', 'jump', keysDown) || pd1.jump || pd1.dy < -0.55 ? 1 : 0;
            if (isActive('p1', 'kick', keysTapped)) {
              p1.input.kick = 1;
              p1.input.strike = 1;
            } else if (isActive('p1', 'strike', keysTapped)) {
              p1.input.strike = 1;
            }
            if (isActive('p1', 'special', keysTapped)) p1.input.special = 1;
            if (isActive('p1', 'line', keysTapped)) p1.input.pickupLine = 1;
            if (isActive('p1', 'super', keysTapped)) p1.input.superMove = 1;

            // Player 2 / AI Input Dispatch
            if (is2PlayerMode) {
              const pd2 = padRef.current.p2;
              p2.input.left = isActive('p2', 'left', keysDown) || pd2.dx < -0.25 ? 1 : 0;
              p2.input.right = isActive('p2', 'right', keysDown) || pd2.dx > 0.25 ? 1 : 0;
              p2.input.block = isActive('p2', 'block', keysDown) || pd2.block || pd2.dy > 0.65 ? 1 : 0;
              p2.input.jump = isActive('p2', 'jump', keysDown) || pd2.jump || pd2.dy < -0.55 ? 1 : 0;
              if (isActive('p2', 'kick', keysTapped)) {
                p2.input.kick = 1;
                p2.input.strike = 1;
              } else if (isActive('p2', 'strike', keysTapped)) {
                p2.input.strike = 1;
              }
              if (isActive('p2', 'special', keysTapped)) p2.input.special = 1;
              if (isActive('p2', 'line', keysTapped)) p2.input.pickupLine = 1;
              if (isActive('p2', 'super', keysTapped)) p2.input.superMove = 1;
            } else {
              // AI Decision Loop every 0.22s
              if (currentTs - lastAITimeRef.current > 140) {
                lastAITimeRef.current = currentTs;
                const decision = calculateAIUtilities(p2, p1, powerUpsRef.current, lastAIActionRef.current || undefined);
                latestDecisionRef.current = decision;
                if (shouldPublishDecision({
                  visible: decisionVisibleRef.current,
                  best: decision.best,
                  prevBest: publishedBestRef.current,
                  nowMs: currentTs,
                  lastPublishMs: decisionPublishedAtRef.current,
                  refreshMs: DECISION_UI.refreshMs
                })) {
                  publishDecision(decision, currentTs);
                }
                p2.thought = `${actionLabel(decision.best)} (${formatEv(decision.utilityMap[decision.best] ?? 0)})`;

                // Map chosen action to AI physical inputs
                p2.input.left = p2.input.right = p2.input.jump = p2.input.block = 0;
                const navigateTo = (targetX: number) => {
                  if (targetX > p2.x + 8) p2.input.right = 1;
                  else if (targetX < p2.x - 8) p2.input.left = 1;
                };

                if (decision.best === 'Strike') p2.input.strike = 1;
                else if (decision.best === 'Special') p2.input.special = 1;
                else if (decision.best === 'Super') p2.input.superMove = 1;
                else if (decision.best === 'Approach') navigateTo(p1.x);
                else if (decision.best === 'Retreat') navigateTo(p2.x * 2 - p1.x);
                else if (decision.best === 'Block') p2.input.block = 1;
                else if (decision.best === 'Podium') navigateTo(400);
                else if (decision.best === 'Pickup') {
                  // Walk to the nearest uncollected item (this branch was missing: the CPU used to stand still)
                  let nearest: { x: number } | null = null;
                  let nearestDist = Infinity;
                  for (const pu of powerUpsRef.current) {
                    if (pu.collected) continue;
                    const dd = Math.abs(pu.x - p2.x);
                    if (dd < nearestDist) {
                      nearestDist = dd;
                      nearest = pu;
                    }
                  }
                  if (nearest) navigateTo(nearest.x);
                }
                else if (decision.best === 'PickupLine') p2.input.pickupLine = 1;

                // Jump over an incoming train or bulldozer. Floor-level supers are dodged by being
                // airborne, and each has a window that keeps the jump timed to the projectile:
                // train 200-440 px away, bulldozer 150-300 px away. At most one jump per 0.8 s.
                if (currentTs - lastAIJumpRef.current > 800) {
                  const incoming = projectilesRef.current.some(pr => {
                    if (pr.owner !== p1 || (pr.kind !== 'train' && pr.kind !== 'bulldozer')) return false;
                    const approaching = (pr.x < p2.x && pr.vx > 0) || (pr.x > p2.x && pr.vx < 0);
                    const gap = Math.abs(pr.x - p2.x);
                    return approaching && (pr.kind === 'train' ? gap > 200 && gap < 440 : gap > 150 && gap < 300);
                  });
                  if (incoming && Math.random() < AI_DODGE_CHANCE) {
                    p2.input.jump = 1;
                    lastAIJumpRef.current = currentTs;
                  }
                }

                if (decision.best !== lastAIActionRef.current) {
                  lastAIActionRef.current = decision.best;
                  addLog(
                    'cpu',
                    `[AI ${p2.c.name.split(' ')[0]}] ${actionLabel(decision.best).toUpperCase()}: ${decision.why}`
                  );
                }
              }
            }

            // Update Combatants Physics & Actions
            updateOrder({ me: p1, opp: p2 }, { me: p2, opp: p1 }, simTickRef.current++).forEach(({ me, opp }) => {
              me.facing = opp.x > me.x ? 1 : -1;
              me.cdSpecial = Math.max(0, me.cdSpecial - dt);
              me.lineCd = Math.max(0, me.lineCd - dt);

              // Cooldown timer decays
              const decayProps = [
                'stun',
                'atk',
                'freeze',
                'invincible',
                'damageBoost',
                'confused',
                'counter',
                'comboTimer',
                'whip',
                'surge',
                'blast',
                'chain',
                'rain'
              ] as const;
              decayProps.forEach(k => {
                if (me[k] > 0) me[k] = Math.max(0, me[k] - dt);
              });

              // Burst combo tick (Mamata's special): 3 quick hits, then actions unlock again.
              // Without this tick burstCount never reached 0 and locked her out for the match.
              if (me.burstCount > 0) {
                if (me.stun > 0 || me.freeze > 0 || me.hp <= 0) {
                  me.burstCount = 0;
                  me.burstTimer = 0;
                } else {
                  me.burstTimer -= dt;
                  if (me.burstTimer <= 0) {
                    me.burstTimer = 0.18;
                    me.burstCount -= 1;
                    me.attackType = 'punch';
                    me.atk = 0.16;
                    if (Math.abs(opp.x - me.x) < 90) {
                      handleHit(me, opp, 6, 40);
                    } else {
                      addFloatingText('MISS', me.x, me.y - 120, '#888888');
                    }
                  }
                }
              }

              // Muffler Hook: ease the opponent toward Kejriwal, then land the hit when the whip window ends.
              if (me.hookPending) {
                const hookX = Math.max(30, Math.min(STAGE_WIDTH - 30, me.x + me.facing * 52));
                if (me.whip > 0) {
                  opp.x += (hookX - opp.x) * Math.min(1, dt * 18);
                  opp.vx = 0;
                } else {
                  me.hookPending = false;
                  opp.x = hookX;
                  handleHit(me, opp, MUFFLER_HOOK.dmg, MUFFLER_HOOK.knockback);
                }
              }

              // Damage-over-time supers (Sitharaman's GST rain, Kejriwal's Dharna vortex)
              if (me.rain > 0 && opp.hp > 0) {
                me.rainTimer -= dt;
                if (me.rainTimer <= 0) {
                  if (me.c.superType === 'gst_blocks') {
                    me.rainTimer = SUPER_TICK.gst_blocks.interval;
                    handleHit(me, opp, SUPER_TICK.gst_blocks.dmg, SUPER_TICK.gst_blocks.knockback);
                  } else if (me.c.superType === 'dharna') {
                    me.rainTimer = SUPER_TICK.dharna.interval;
                    const gap = Math.abs(opp.x - me.x);
                    if (gap < SUPER_TICK.dharna.range) {
                      const step = Math.min(SUPER_TICK.dharna.pull, Math.max(0, gap - 44));
                      opp.x += (me.x > opp.x ? 1 : -1) * step;
                      handleHit(me, opp, SUPER_TICK.dharna.dmg, 0);
                    }
                  } else {
                    me.rainTimer = 0.5;
                  }
                }
              }

              const onGround = me.y >= FLOOR_Y;
              me.blocking = !!(me.input.block && onGround && !me.atk && me.stun <= 0 && me.freeze <= 0);

              if (me.stun <= 0 && me.freeze <= 0) {
                if (me.input.jump && onGround) {
                  me.vy = -MOVE.jumpSpeed;
                  playSound(400, 0.1, 'triangle', 0.04, 200);
                }

                // A press made during an attack is kept for a moment and fires when the fighter is free.
                // Humans only: the CPU's timing was tuned without a buffer.
                const act = bufferStep(me.input, me.buffer, !!me.atk || me.burstCount > 0, dt);
                me.buffer = me.isAI ? null : act.buffer;
                if (act.fire === 'strike') {
                  me.input.kick = act.kick;
                  performStrike(me, opp);
                } else if (act.fire === 'special') {
                  if (me.cdSpecial <= 0) performSpecial(me, opp);
                } else if (act.fire === 'pickupLine') {
                  performPickupLine(me);
                } else if (act.fire === 'superMove' && me.meter >= 100) {
                  if (superInRange(me, opp)) triggerSuperMove(me, opp);
                  else addFloatingText('TOO FAR', me.x, me.y - 120, '#9aa5b1');
                }
              } else {
                me.buffer = null; // stunned or frozen: a queued press does not survive the hit
              }

              // Physics phase (after walk/jump impulses): friction, air steering, gravity, then trapezoid
              // integration, so the same kick slides the same distance and a jump is the same height at any fps.
              {
                const locked = me.stun > 0 || me.freeze > 0;
                const dirSigned = (me.input.right - me.input.left) * (me.confused > 0 ? -1 : 1);
                const hz = stepHorizontal(me.vx, {
                  onGround,
                  dir: locked ? 0 : dirSigned,
                  walkSpeed: (SPEED_FACTORS[me.c.specialType] || 1.0) * 230,
                  blocking: me.blocking,
                  locked
                }, dt);
                const vyBefore = me.vy;
                me.vy += MOVE.gravity * dt;
                me.x += hz.avg * dt;
                me.vx = hz.vx;
                me.y = integrate(me.y, vyBefore, me.vy, dt);
              }
              if (me.y > FLOOR_Y) {
                me.y = FLOOR_Y;
                me.vy = 0;
              }
              me.x = Math.max(30, Math.min(STAGE_WIDTH - 30, me.x));

              // Speaker's Podium Seat Accumulation
              if (Math.abs(me.x - 400) < 46 && me.y >= FLOOR_Y - 4) {
                me.seats = Math.min(272, me.seats + 8 * dt);
                if (me === p1) {
                  updateCoach('Controlling Podium! Gaining seats towards 272 Majority victory!', 4);
                }
              }

              // Clear one-shot action inputs
              me.input.strike = me.input.special = me.input.superMove = me.input.pickupLine = me.input.kick = 0;
            });

            // Grounded fighters are solid: they can no longer walk through each other (airborne ones pass over).
            {
              const bothGrounded = p1.y >= FLOOR_Y - 0.5 && p2.y >= FLOOR_Y - 0.5;
              [p1.x, p2.x] = separateFighters(p1.x, p2.x, bothGrounded, dt);
            }

            // Clear justPressed buffer
            justPressedRef.current = {};

            // Spawn Canteen Drops
            nextPowerUpSpawnRef.current -= dt;
            if (nextPowerUpSpawnRef.current <= 0) {
              nextPowerUpSpawnRef.current = 5;
              powerUpsRef.current.push({
                id: Math.random(),
                type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
                x: 120 + Math.random() * 560,
                y: -20,
                vy: 0,
                lifetime: 14
              });
              updateCoach('Canteen item dropped! Collect Chai for health or Briefcase for meter!', 3);
            }

            // Update Powerups Physics & Collection
            powerUpsRef.current.forEach(pu => {
              pu.vy += 900 * dt;
              pu.y = Math.min(FLOOR_Y - 22, pu.y + pu.vy * dt);
              pu.lifetime -= dt;

              [p1, p2].forEach(combatant => {
                if (!pu.collected && Math.abs(combatant.x - pu.x) < 34 && Math.abs(combatant.y - pu.y) < 90) {
                  pu.collected = true;
                  collectPowerUp(combatant, pu);
                }
              });
            });
            powerUpsRef.current = powerUpsRef.current.filter(pu => !pu.collected && pu.lifetime > 0);

            // Update Projectiles
            projectilesRef.current.forEach(p => {
              p.x += p.vx * dt;
              if (p.vy != null) {
                p.vy += (p.kind === 'ball' ? 900 : 0) * dt;
                p.y += p.vy * dt;
              }
              p.lifetime -= dt;

              if (p.kind === 'ball') {
                if (p.y > FLOOR_Y - 12) {
                  p.y = FLOOR_Y - 12;
                  p.vy = (p.vy || 0) * -0.8;
                  p.bounceCount = (p.bounceCount || 0) - 1;
                  if (p.bounceCount < 0) p.lifetime = 0;
                }
                if (p.x < 10 || p.x > STAGE_WIDTH - 10) p.vx *= -1;
              }

              const target = p.owner === p1 ? p2 : p1;
              const hitRadius = (p.width || 0) / 2 + 16;
              if (!p.hasHit && Math.abs(p.x - target.x) < hitRadius && p.y > target.y - 110 && p.y < target.y + 20) {
                handleHit(
                  p.owner,
                  target,
                  p.dmg,
                  p.kind === 'train' || p.kind === 'bulldozer' ? 700 : 260,
                  p.kind === 'train' || p.kind === 'ball'
                );
                if (p.hitOnce) p.hasHit = true;
                else p.lifetime = 0;
              }
            });
            projectilesRef.current = projectilesRef.current.filter(p => p.lifetime > 0);

            // Update Particles
            stepEffects(dt);

            // Ghost health bars trail the real HP (F24)
            ghostBarsRef.current = {
              p1: stepGhostBar(ghostBarsRef.current.p1, p1.hp, dt, prefersReducedMotion()),
              p2: stepGhostBar(ghostBarsRef.current.p2, p2.hp, dt, prefersReducedMotion())
            };

            // Check Super Meter for P1
            setIsSuperReadyP1(p1.meter >= 100);
            setIsSuperReadyP2(p2.meter >= 100);

            // Check Match Victory Conditions
            const ending = checkVictoryCondition(p1, p2, matchTimeRef.current);
            if (ending) {
              setGameEnding(ending);
              setGameState('over');
              scheduledRef.current = [];
              projectilesRef.current = []; // no frozen train or bulldozer hanging in the air behind the modal
              stopBattleMusic();
              stopAllVoices();
            }
          }

          // 2. Render Stage Elements
          // Speaker Podium Glow Marker
          const podGlow = 0.4 + Math.sin(currentTs * 0.005) * 0.2;
          ctx.strokeStyle = `rgba(255, 215, 0, ${podGlow})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(400, FLOOR_Y + 6, 56, 8, 0, 0, TAU);
          ctx.stroke();

          // Render Power-Ups
          powerUpsRef.current.forEach(pu => {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, 22 + Math.sin(currentTs * 0.008) * 3, 0, TAU);
            ctx.fill();
            drawPowerUp(ctx, pu.type, pu.x, pu.y, 1.4);
          });

          // Render Combatants
          [p1, p2].forEach(combatant => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(combatant.x, FLOOR_Y + 4, 26, 6, 0, 0, TAU);
            ctx.fill();

            if (combatant.invincible > 0) {
              // Smooth fade (not a 10 Hz hard flip); one steady dim look under reduced motion.
              ctx.globalAlpha = invincibleAlpha(currentTs * 0.001, prefersReducedMotion());
            }

            const isSuperActive = (cinematicRef.current?.actor === combatant) || combatant.surge > 0;
            const superProg = cinematicRef.current?.actor === combatant
              ? Math.min(1, cinematicRef.current.elapsed / CUTSCENE_END)
              : (combatant.surge > 0 ? 1 - combatant.surge / 1.4 : 0);
            const atkDur = combatant.attackType === 'kick' ? 0.35 : (combatant.attackType === 'dropkick' ? 0.38 : 0.26);

            drawPolitician(ctx, combatant.c, combatant.x, combatant.y, combatant.facing, {
              scale: 1.0,
              time: currentTs * 0.001,
              isWalking: Math.abs(combatant.vx) > 30 && combatant.y >= FLOOR_Y - 1,
              walkSpeed: Math.abs(combatant.vx),
              attackProg: combatant.atk > 0 ? Math.min(1, combatant.atk * 5) : (isSuperActive ? 1.0 : 0),
              attackPhase: combatant.atk > 0 ? 1 - combatant.atk / atkDur : (isSuperActive ? superProg : 0),
              attackType: combatant.attackType || (combatant.y < FLOOR_Y - 2 ? 'dropkick' : 'punch'),
              airborne: combatant.y < FLOOR_Y - 2,
              blocking: combatant.blocking,
              stunned: combatant.stun > 0,
              isSuper: isSuperActive,
              superPhase: superProg,
              superType: combatant.c.superType,
              facing: combatant.facing,
              vx: combatant.vx,
              vy: combatant.vy
            });
            ctx.globalAlpha = 1.0;

            // AI Thought Bubble
            if (gameState === 'play' && combatant.isAI && combatant.thought) {
              ctx.save();
              ctx.font = `bold ${HUD_TEXT.thoughtFont}px sans-serif`;
              const label = `AI: ${combatant.thought}`;
              const box = thoughtBubbleBox(ctx.measureText(label).width, combatant.x, STAGE_WIDTH);
              const top = combatant.y - 110 - box.height;
              ctx.fillStyle = 'rgba(13, 24, 18, 0.9)';
              ctx.strokeStyle = '#ffd700';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(box.left, top, box.width, box.height, 6);
              ctx.fill();
              ctx.stroke();
              // Pointer
              ctx.beginPath();
              ctx.moveTo(box.pointerX - 4, top + box.height);
              ctx.lineTo(box.pointerX, top + box.height + 4);
              ctx.lineTo(box.pointerX + 4, top + box.height);
              ctx.fillStyle = '#ffd700';
              ctx.fill();
              // Text
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText(label, box.left + box.width / 2, top + box.height - 6.5);
              ctx.restore();
            }

            // Visual Status Effects
            if (combatant.freeze > 0) {
              ctx.fillStyle = 'rgba(140, 200, 255, 0.45)';
              ctx.fillRect(combatant.x - 24, combatant.y - 112, 48, 112);
              ctx.strokeStyle = '#99aadd';
              ctx.lineWidth = 3;
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(combatant.x - 30, combatant.y - 100 + i * 26);
                ctx.lineTo(combatant.x + 30, combatant.y - 84 + i * 26);
                ctx.stroke();
              }
            }

            if (combatant.blocking) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(combatant.x + combatant.facing * 18, combatant.y - 55, 40, 0, TAU);
              ctx.stroke();
            }
          });

          // Render Projectiles
          projectilesRef.current.forEach(p => drawProjectile(ctx, p));

          // Render Particles
          particlesRef.current.forEach(pt => {
            ctx.globalAlpha = Math.min(1, pt.life * 2);
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
          });
          ctx.globalAlpha = 1.0;

          // Render Floating Combat Texts: wrapped, kept on-stage, outlined
          ctx.font = '700 14px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';
          floatingTextsRef.current.forEach(ft => {
            const { lines, x } = layoutFloatingText(l => ctx.measureText(l).width, ft.text, ft.x, STAGE_WIDTH);
            ctx.globalAlpha = Math.min(1, ft.life * 2);
            ctx.fillStyle = ft.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = FLOAT_TEXT.outline;
            lines.forEach((line, i) => {
              const ly = ft.y + i * FLOAT_TEXT.lineHeight;
              ctx.strokeText(line, x, ly);
              ctx.fillText(line, x, ly);
            });
          });
          ctx.globalAlpha = 1.0;
          ctx.lineJoin = 'miter';

          // The camera shake belongs to the arena, not to the HUD: drop it here (restore), then open a
          // fresh save so the frame's closing restore below still balances.
          ctx.restore();
          ctx.save();

          // In-Game Live HUD
          [
            { p: p1, isRight: false },
            { p: p2, isRight: true }
          ].forEach(({ p, isRight }) => {
            const barX = isRight ? STAGE_WIDTH - 312 : 12;
            ctx.fillStyle = '#f5eedb';
            ctx.font = '700 13px Georgia, serif';
            ctx.textAlign = isRight ? 'right' : 'left';
            ctx.fillText(
              `${p.c.name} ${isRight ? (is2PlayerMode ? '(P2)' : '(CPU)') : '(P1)'}`,
              isRight ? STAGE_WIDTH - 12 : 12,
              18
            );

            // Health Bar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(barX - 2, 24, 304, 17);
            const ghost = ghostBarsRef.current[isRight ? 'p2' : 'p1'];
            if (ghost.value > p.hp) {
              const ghostWidth = 300 * Math.min(1, ghost.value / 100);
              ctx.fillStyle = GHOST_BAR.color;
              ctx.fillRect(isRight ? barX + 300 - ghostWidth : barX, 26, ghostWidth, 13);
            }
            ctx.fillStyle = p.hp < 30 ? '#e63946' : '#2ea043';
            const healthWidth = 300 * Math.max(0, p.hp / 100);
            ctx.fillRect(isRight ? barX + 300 - healthWidth : barX, 26, healthWidth, 13);

            // Super Meter Bar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(barX - 2, 43, 304, 9);
            ctx.fillStyle = p.meter >= 100 && Math.floor(currentTs * 0.006) % 2 ? '#ffffff' : '#ffd700';
            const meterWidth = 300 * Math.max(0, p.meter / 100);
            ctx.fillRect(isRight ? barX + 300 - meterWidth : barX, 45, meterWidth, 5);

            // Seats Readout
            ctx.font = `bold ${HUD_TEXT.seatsFont}px sans-serif`;
            ctx.fillStyle = '#ffd700';
            ctx.fillText(
              `Seats: ${Math.round(p.seats)}/272${p.meter >= 100 ? `  ${superReadyLabel(isRight, is2PlayerMode)}` : ''}`,
              isRight ? STAGE_WIDTH - 12 : 12,
              66
            );

            // Combo Count
            if (p.comboTimer > 0 && p.comboCount > 1) {
              ctx.font = '800 16px Georgia, serif';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(`${p.comboCount} Hit Combo!`, isRight ? STAGE_WIDTH - 12 : 12, 86);
            }
          });

          // Central Zero-Hour Clock: red and pulsing in the last seconds (F24)
          const clock = clockLook(matchTimeRef.current, prefersReducedMotion());
          ctx.save();
          ctx.translate(STAGE_WIDTH / 2, 30);
          ctx.scale(clock.scale, clock.scale);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, TAU);
          ctx.fill();
          if (clock.urgent) {
            ctx.strokeStyle = clock.color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
          ctx.fillStyle = clock.color;
          ctx.font = '800 18px monospace';
          ctx.fillText(`${Math.max(0, Math.ceil(matchTimeRef.current))}`, 0, 7);
          ctx.restore();

          // Fullscreen Dramatic Super Cutscene Overlay
          if (cinematicRef.current) {
            drawSuperCinematic(ctx, cinematicRef.current.actor, cinematicRef.current.elapsed);
          }
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, is2PlayerMode, addLog, updateCoach, publishDecision]);

  // Render Speaker Mascot in Sidebar
  useEffect(() => {
    if (!mascotCanvasRef.current) return;
    const canvas = mascotCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw Om Birla Speaker Bust
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    // Dark bandhgala / khadi vest
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-14, -8, 28, 20);
    ctx.fillStyle = '#1b3b22';
    ctx.fillRect(-12, -7, 24, 18);
    // Head & face
    ctx.fillStyle = '#dfa672';
    ctx.beginPath();
    ctx.arc(0, -18, 12, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Salt and pepper hair
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(0, -20, 13, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // Eyeglasses
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-7, -20, 6, 4.5);
    ctx.strokeRect(1, -20, 6, 4.5);
    // Mustache
    ctx.fillStyle = '#333';
    ctx.fillRect(-5, -14, 10, 2);
    ctx.restore();
  }, []);

  const handleVirtualAction = (player: 1 | 2, action: PadAction) => {
    if (!combatantsRef.current || isPausedRef.current || cinematicRef.current) return;
    const me = player === 1 ? combatantsRef.current.p1 : combatantsRef.current.p2;
    if (action === 'strike') me.input.strike = 1;
    else if (action === 'kick') { me.input.kick = 1; me.input.strike = 1; }
    else if (action === 'special') me.input.special = 1;
    else if (action === 'line') me.input.pickupLine = 1;
    else if (action === 'super') me.input.superMove = 1;
  };

  // Start pressed on the map: single-player shows a random opponent for a moment; 2-Player lets Player 2 pick first.
  const beginVersus = () => {
    if (vs) return;
    if (is2PlayerMode) {
      setVs({ phase: 'pick', p1: selectedPolitician, p2: null });
      return;
    }
    const id = pickOpponent(POLITICIANS.map((q: Politician) => q.id), selectedPolitician.id, Math.random);
    setVs({ phase: 'vs', p1: selectedPolitician, p2: POLITICIANS.find((q: Politician) => q.id === id) || POLITICIANS[0] });
  };
  const skipVersus = () => {
    if (!vs || vs.phase !== 'vs' || !vs.p2) return;
    if (vsMaySkip(performance.now() - vsOpenedAtRef.current, false, VS.inputGraceSeconds)) startMatch(vs.p1, vs.p2);
  };

  const leaveToMap = () => {
    pauseReasonsRef.current.clear();
    scheduledRef.current = [];
    cinematicRef.current = null;
    setIsCutscene(false);
    isPausedRef.current = false;
    setIsPaused(false);
    resumeAllAudio(); // lift the global audio hold, then cut everything
    stopBattleMusic();
    stopAllVoices();
    // Null out stale simulation refs so nothing from the old match leaks into the next one.
    combatantsRef.current = null;
    projectilesRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    hitStopRef.current = 0;
    hitStopCdRef.current = 0;
    setIsMobileTelemetryOpen(false); // a drawer left open must not reappear on the next match
    setVs(null);
    setGameState('menu');
  };

  const togglePause = () => setPause('user', !pauseReasonsRef.current.has('user'));

  const openRulebook = () => {
    if (gameState === 'play') setPause('rules', true);
    setIsRulebookOpen(true);
  };
  const drawerRef = useRef<HTMLElement | null>(null);
  // The telemetry panel is a dialog only in its phone form (a slide-in drawer over the arena); on desktop it is a plain sidebar.
  const drawerIsDialog = isMobileTelemetryOpen && gameState !== 'menu' && viewportDims.w < 1024;
  useModalA11y(drawerRef, { active: drawerIsDialog, onClose: () => setIsMobileTelemetryOpen(false) });

  const closeRulebook = () => {
    setPause('rules', false);
    setIsRulebookOpen(false);
  };

  const containerStyle: React.CSSProperties = isForceRotated
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: `${viewportDims.h}px`,
        height: `${viewportDims.w}px`,
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
        overflow: 'hidden',
        zIndex: 50
      }
    : {
        width: '100vw',
        height: '100dvh'
      };

  return (
    <div
      style={containerStyle}
      className={`flex flex-col lg:flex-row overflow-hidden bg-[#070d0a] text-[#f5eedb] select-none font-sans relative ${
        isForceRotated ? 'force-landscape-container' : 'h-[100dvh] w-screen'
      }`}
    >
      <h1 className="sr-only">Battle of 272 Parliament</h1>
      {/* Humorous Parliamentary Boot / Loading Intro Screen */}
      {isLoadingIntro && (
        <IntroLoadingScreen onFinish={() => setIsLoadingIntro(false)} touchFirst={isTouchPrimary} />
      )}
      {/* Left Stage Viewport */}
      <div ref={stageBoxRef} className="relative flex-1 flex items-center justify-center bg-[#030705] overflow-hidden min-w-0 h-full w-full">
        <canvas
          ref={canvasRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="w-full h-full object-contain max-h-full block"
        />

        {/* Mobile & Tablet Telemetry Drawer Toggle Button */}
        {gameState === 'play' && (
          <button
            type="button"
            onClick={() => setIsMobileTelemetryOpen(true)}
            className={`absolute hud-tl z-40 rounded-full glass border border-[#ffd700] text-[#ffd700] text-xs font-bold shadow-xl flex items-center gap-1.5 active:scale-95 hover:scale-105 transition-all lg:hidden ${
              phoneHud.isShort ? 'justify-center' : 'px-3 py-1.5'
            }`}
            style={phoneHud.isShort ? { top: `max(${phoneHud.leftTop}px, var(--sa-top))`, width: PHONE_HUD.button, height: PHONE_HUD.button } : undefined}
            aria-label="Open AI Telemetry Console"
          >
            <Brain size={phoneHud.isShort ? 18 : 14} className="text-[#56d364]" />
            {!phoneHud.isShort && <span>AI Telemetry</span>}
            {!phoneHud.isShort && <span className="w-2 h-2 rounded-full bg-[#56d364] animate-pulse" />}
          </button>
        )}

        {/* Desktop Theater View Toggle Button */}
        {gameState === 'play' && (
          <button
            type="button"
            onClick={() => setIsDesktopSidebarOpen(prev => !prev)}
            title={isDesktopSidebarOpen ? 'Enter Theater Mode (Hide Sidebar)' : 'Show Speaker AI Sidebar'}
            className="absolute hud-tl z-40 px-3 py-1.5 rounded-full glass border border-[#1e3327] hover:border-[#ffd700]/70 text-[#8ea396] hover:text-white text-xs font-bold shadow-xl hidden lg:flex items-center gap-1.5 active:scale-95 hover:scale-105 transition-all"
            style={phoneHud.isShort ? { top: `max(${phoneHud.leftTop}px, var(--sa-top))` } : undefined}
          >
            {isDesktopSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span>{isDesktopSidebarOpen ? 'Theater View' : 'Speaker AI'}</span>
          </button>
        )}

        {/* Quick Orientation / Landscape Rotation + Fullscreen buttons */}
        {gameState === 'play' && (
          <>
            {isTouchPrimary && (
              <button
                type="button"
                onClick={toggleRotate}
                title="Toggle 90° Landscape Rotation"
                className="absolute hud-tr-2 z-40 w-10 h-10 rounded-full glass border border-[#ffd700]/50 text-[#ff9933] flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl"
                style={phoneHud.isShort ? { top: `max(${phoneHud.stackTops[1]}px, var(--sa-top))`, right: 'max(0.5rem, var(--sa-right))' } : undefined}
                aria-label="Rotate View"
              >
                <RotateCw size={17} />
              </button>
            )}
            {canFullscreen() && (
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFs ? 'Exit Fullscreen' : 'Fullscreen'}
                className="absolute z-40 w-10 h-10 rounded-full glass border border-[#ffd700]/50 text-[#ffd700] flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl"
                style={phoneHud.isShort
                  ? { top: `max(${phoneHud.stackTops[isTouchPrimary ? 2 : 1]}px, var(--sa-top))`, right: 'max(0.5rem, var(--sa-right))' }
                  : { top: 'max(0.5rem, var(--sa-top))', right: `calc(max(0.5rem, var(--sa-right)) + ${isTouchPrimary ? 6 : 3}rem)` }}
                aria-label={isFs ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <Maximize2 size={16} />
              </button>
            )}
          </>
        )}

        {/* Contextual Rule Coach Banner (short screens: one line just below the HUD strip, gone after a few seconds) */}
        {coachTip && isCoachOn && gameState === 'play' && !isCutscene && (
          <div
            data-testid="rule-coach"
            className={`absolute left-1/2 -translate-x-1/2 glass border-2 border-[#ffd700] rounded-full shadow-2xl flex items-center z-30 animate-in fade-in duration-300 ${
              phoneHud.isShort ? 'gap-1.5 pl-3 pr-1 py-0.5' : 'top-3 gap-2.5 px-4 py-1.5 max-w-[90%] slide-in-from-top'
            }`}
            style={phoneHud.isShort
              ? { top: `max(${phoneHud.coachTop}px, var(--sa-top))`, maxWidth: phoneHud.coachMaxWidth }
              : undefined}
          >
            {phoneHud.isShort
              ? <GraduationCap size={14} className="text-[#ffd700] shrink-0" aria-label="Rule Coach" />
              : (
                <span className="bg-[#ffd700] text-black text-[11px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <GraduationCap size={11} /> RULE COACH
                </span>
              )}
            <span className={`font-semibold text-white truncate ${phoneHud.isShort ? 'text-[11px] whitespace-nowrap' : 'text-xs'}`}>{coachTip}</span>
            <button
              type="button"
              onClick={() => setCoachTip(null)}
              className="text-[#8ea396] hover:text-white font-bold hover:bg-white/10 rounded-full transition flex items-center justify-center shrink-0"
              style={{ width: PHONE_HUD.coachDismissSize, height: PHONE_HUD.coachDismissSize }}
              aria-label="Dismiss tip"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* On-screen controllers: full touch/mouse play, no keyboard needed */}
        {gameState === 'play' && (
          <>
            <VirtualGamepad
              player={1}
              variant={is2PlayerMode ? 'left' : 'split'}
              isVisible={isGamepadVisible && !isCutscene}
              isSuperReady={isSuperReadyP1}
              isForceRotated={isForceRotated}
              onMove={(dx, dy) => { padRef.current.p1.dx = dx; padRef.current.p1.dy = dy; }}
              onHold={(k, on) => { padRef.current.p1[k] = on; }}
              onAction={a => handleVirtualAction(1, a)}
            />
            {is2PlayerMode && (
              <VirtualGamepad
                player={2}
                variant="right"
                isVisible={isGamepadVisible && !isCutscene}
                isSuperReady={isSuperReadyP2}
                isForceRotated={isForceRotated}
                onMove={(dx, dy) => { padRef.current.p2.dx = dx; padRef.current.p2.dy = dy; }}
                onHold={(k, on) => { padRef.current.p2[k] = on; }}
                onAction={a => handleVirtualAction(2, a)}
              />
            )}
            <button
              type="button"
              onClick={togglePause}
              className="absolute hud-tr z-40 w-10 h-10 rounded-full glass border-2 border-[#ffd700] text-[#ffd700] font-black text-base shadow-xl active:scale-90 flex items-center justify-center transition-all hover:scale-110"
              style={phoneHud.isShort ? { top: `max(${phoneHud.stackTops[0]}px, var(--sa-top))` } : undefined}
              aria-label="Pause"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            {isPaused && (
              <div className="absolute inset-0 z-30 bg-black/55 flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-extrabold text-gradient-gold font-serif">HOUSE ADJOURNED</div>
                <button type="button" onClick={togglePause} className="px-8 py-2.5 rounded-xl bg-[#ff9933] border-2 border-[#ffd700] text-black font-black flex items-center gap-2 hover:scale-105 transition-all btn-shimmer">
                  <Play size={18} /> RESUME
                </button>
                <button type="button" onClick={leaveToMap} className="px-8 py-2 rounded-xl glass border border-[#1e3327] text-[#f5eedb] font-bold flex items-center gap-2 hover:scale-105 transition-all">
                  <MapIcon size={16} /> Back to Map
                </button>
              </div>
            )}
          </>
        )}

        {/* India Map Character Selection Overlay */}
        {gameState === 'menu' && (
          <IndiaMapSelect
            selectedPolitician={selectedPolitician}
            onSelect={setSelectedPolitician}
            onStartGame={beginVersus}
            is2PlayerMode={is2PlayerMode}
            onToggle2Player={setIs2PlayerMode}
            onOpenRulebook={openRulebook}
            onReplayIntro={() => setIsLoadingIntro(true)}
            isForceRotated={isForceRotated}
            onToggleRotate={isTouchPrimary ? toggleRotate : undefined}
            isFullscreen={isFs}
            onToggleFullscreen={canFullscreen() ? toggleFullscreen : undefined}
          />
        )}

        {/* Versus card: shows who you fight before the bell (F34) */}
        {gameState === 'menu' && vs && (
          <VersusCard
            phase={vs.phase}
            p1={vs.p1}
            p2={vs.p2}
            is2Player={is2PlayerMode}
            onPick={(q: Politician) => setVs({ phase: 'vs', p1: vs.p1, p2: q })}
            onShuffle={() => setVs((v: VsState | null) => {
              if (!v || !v.p2) return v;
              const id = rerollOpponent(POLITICIANS.map((q: Politician) => q.id), v.p1.id, v.p2.id, Math.random);
              return { ...v, p2: POLITICIANS.find((q: Politician) => q.id === id) || v.p2 };
            })}
            onTapCard={skipVersus}
            onBack={() => setVs(null)}
          />
        )}

        {/* AI Inspector Modal */}
        <AIDecisionInspector
          decision={activeDecision}
          isOpen={isInspectorOpen}
          stillPaused={isPaused}
          speakerId={inspectorSpeakerId}
          onClose={() => {
            setIsInspectorOpen(false);
            setPause('inspector', false);
          }}
        />

        {/* Illustrated Rulebook Modal */}
        <RulebookModal isOpen={isRulebookOpen} onClose={closeRulebook} />

        {/* Post-Match Game Over / Outcome Modal */}
        {gameState === 'over' && (
          <GameOverModal
            ending={gameEnding}
            onRematch={() => {
              if (combatantsRef.current) {
                startMatch(combatantsRef.current.p1.c, combatantsRef.current.p2.c);
              }
            }}
            onReturnToMap={leaveToMap}
          />
        )}
      </div>

      {/* Mobile Telemetry Drawer Backdrop */}
      {isMobileTelemetryOpen && gameState !== 'menu' && (
        <div
          onClick={() => setIsMobileTelemetryOpen(false)}
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
            ? 'hidden' // the map screen has no match to report; stays mounted so the log is ready when a match starts
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
            {/* Close Button on Mobile Drawer */}
            <button
              type="button"
              onClick={() => setIsMobileTelemetryOpen(false)}
              className="p-1 rounded-lg glass hover:bg-white/10 text-[#8ea396] hover:text-white lg:hidden ml-1"
              aria-label="Close Telemetry Drawer"
            >
              <X size={16} />
            </button>
            {/* Collapse Button on Desktop */}
            <button
              type="button"
              onClick={() => setIsDesktopSidebarOpen(false)}
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
            onClick={() => {
              if (is2PlayerMode) return;
              const latest = latestDecisionRef.current ?? activeDecision;
              if (latest) {
                publishDecision(latest, performance.now());
                setInspectorSpeakerId(combatantsRef.current?.p2.c.id);
                setPause('inspector', true);
                setIsInspectorOpen(true);
              }
            }}
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
            onClick={() => {
              const next = !isVoiceOn;
              setIsVoiceOn(next);
              setVoiceEnabled(next);
            }}
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
            onClick={() => setIsCoachOn(!isCoachOn)}
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
            onClick={openRulebook}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold glass hover:bg-[#294234] border border-[#1e3327] text-[#f5eedb] transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5"
          >
            <BookOpen size={14} /> Rulebook
          </button>
        </div>

        {/* Music: mute + volume */}
        <div className="flex items-center gap-2 glass-dark border border-[#1e3327] rounded-lg px-2 py-1">
          <button
            type="button"
            onClick={() => setIsMusicMuted(m => !m)}
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
              setMusicVolume(v);
              if (v > 0) setIsMusicMuted(false); // moving the slider up un-mutes
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
            onClick={() => setIsGamepadVisible(!isGamepadVisible)}
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
    </div>
  );
}
