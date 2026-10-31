import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  POLITICIANS,
  SPEED_FACTORS,
  createCombatant,
  calculateHitDamage,
  checkVictoryCondition,
  calculateAIUtilities,
  SHOUTS
} from './game/logic';
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  FLOOR_Y,
  getChamberBackground,
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
  getVoiceEnabled
} from './game/audio';
import { IndiaMapSelect } from './components/IndiaMapSelect';
import { AIDecisionInspector } from './components/AIDecisionInspector';
import { RulebookModal } from './components/RulebookModal';
import { GameOverModal } from './components/GameOverModal';
import { VirtualGamepad, PadAction } from './components/VirtualGamepad';

const TAU = Math.PI * 2;
const POWERUP_TYPES = ['case', 'cup', 'gavel', 'mic'] as const;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mascotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // High-level App State
  const [gameState, setGameState] = useState<'menu' | 'play' | 'over'>('menu');
  const [selectedPolitician, setSelectedPolitician] = useState<Politician>(POLITICIANS[0]);
  const [is2PlayerMode, setIs2PlayerMode] = useState(false);
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [isCoachOn, setIsCoachOn] = useState(true);
  const [isGamepadVisible, setIsGamepadVisible] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [activeDecision, setActiveDecision] = useState<AIDecision | null>(null);
  const [gameEnding, setGameEnding] = useState<GameEnding | null>(null);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isSuperReadyP1, setIsSuperReadyP1] = useState(false);
  const [activeDecisionTreeAction, setActiveDecisionTreeAction] = useState<string>('Strike');
  const [treeUtilityScores, setTreeUtilityScores] = useState<Record<string, number>>({});

  // Mutable Game Simulation Refs (outside React reconciliation)
  const combatantsRef = useRef<{ p1: Combatant; p2: Combatant } | null>(null);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cinematicRef = useRef<{ actor: Combatant; target: Combatant; elapsed: number } | null>(null);
  const matchTimeRef = useRef<number>(60);
  const cameraShakeRef = useRef<number>(0);
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
  const lastAITimeRef = useRef<number>(0);
  const lastAIActionRef = useRef<string>('');
  const coachStepRef = useRef<number>(0);

  // Sync state to body dataset for testing / automation
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Handle Autostart URL parameter if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startMatch(POLITICIANS[0], POLITICIANS[1]);
    }
  }, []);

  const addLog = useCallback((type: 'me' | 'cpu' | 'item' | 'super', msg: string) => {
    if (!logContainerRef.current) return;
    const entry = document.createElement('div');
    entry.className = `p-1 rounded text-[11px] leading-tight border-l-2 ${
      type === 'cpu'
        ? 'border-[#ff7b72] bg-[#ff7b72]/10 text-[#f5eedb]'
        : type === 'me'
        ? 'border-[#ffd700] bg-[#ffd700]/10 text-white'
        : type === 'super'
        ? 'border-[#ff9933] bg-[#ff9933]/15 text-[#ffd700] font-bold'
        : 'border-[#56d364] bg-[#56d364]/10 text-[#d8e5dc]'
    }`;
    entry.textContent = msg;
    const container = logContainerRef.current;
    container.appendChild(entry);
    while (container.children.length > 30) {
      container.firstChild?.remove();
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  const updateCoach = useCallback((text: string, step: number) => {
    if (!isCoachOn || step < coachStepRef.current) return;
    coachStepRef.current = step;
    setCoachTip(text);
  }, [isCoachOn]);

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
  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      life: 1.0,
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
      defender.meter = Math.min(100, defender.meter + 25);
      handleHit(defender, attacker, 14, 280, true);
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
    defender.vy = Math.min(defender.vy, -130);

    attacker.comboCount = attacker.comboTimer > 0 ? attacker.comboCount + 1 : 1;
    attacker.comboTimer = 1.2;

    spawnParticles(defender.x, defender.y - 60, 14, '#ffd700');
    cameraShakeRef.current = Math.max(cameraShakeRef.current, 6);

    if (attacker === combatantsRef.current?.p1) {
      updateCoach('Great strike! Keep attacking to charge your Super Meter to 100%!', 2);
    }
  };

  // Perform standard strike
  const performStrike = (a: Combatant, b: Combatant) => {
    a.atk = 0.28;
    playSound(320, 0.07, 'square', 0.05, -100);
    const range = 66 + (a.blast > 0 ? 32 : 0);
    if (Math.abs(a.x - b.x) < range && Math.abs(a.y - b.y) < 70) {
      handleHit(a, b, 7, 220);
    }
  };

  // Perform politician's signature special ability
  const performSpecial = (a: Combatant, b: Combatant) => {
    const c = a.c;
    a.cdSpecial = 2.6;
    a.atk = 0.3;
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
        dmg: 10,
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
      a.whip = 0.3;
      if (dist < 260) {
        b.x = a.x + a.facing * 52;
        handleHit(a, b, 9, 70);
      }
    } else if (c.specialType === 'combo') {
      a.burstCount = 3;
      a.burstTimer = 0;
      a.cdSpecial = 3;
    } else if (c.specialType === 'counter') {
      a.counter = 0.85;
      a.cdSpecial = 3.2;
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
      b.confused = 3.5;
      addFloatingText('MOYE MOYE CONFUSION', b.x, b.y - 120, '#ff9933');
    } else if (c.specialType === 'heal_aura') {
      a.hp = Math.min(100, a.hp + 12);
      a.invincible = 1.2;
      addFloatingText('MOHABBAT KI DUKAAN +12 HP', a.x, a.y - 120, '#58a6ff');
    }
  };

  // Political pickup line (+8 Seats)
  const performPickupLine = (a: Combatant) => {
    playSound(600, 0.15, 'sine', 0.08, 200);
    addFloatingText(`💬 "${a.c.pickupLine}"`, a.x, a.y - 50, '#ffd700');
    a.seats = Math.min(272, a.seats + 8);
    addLog(a.isAI ? 'cpu' : 'me', `${a.c.name} recited a witty pickup line (+8 Seats)!`);
  };

  // Launch Cinematic Super Move
  const triggerSuperMove = (a: Combatant, b: Combatant) => {
    a.meter = 0;
    cinematicRef.current = { actor: a, target: b, elapsed: 0 };
    // Deliver authentic politician voice with acoustic meme backing
    speakPoliticianVoice(a.c.speechText, a.c.voicePitch, a.c.voiceRate, true, a.c.id);
    playSound(90, 0.6, 'sawtooth', 0.12, -30);
  };

  // Release the actual superpower into the arena after cinematic
  const releaseSuperAbility = (a: Combatant, b: Combatant) => {
    const k = a.c.superType;
    const f = a.facing;
    cameraShakeRef.current = 16;
    playSuperSound(k);
    addLog(a.isAI ? 'cpu' : 'me', `SUPER: ${a.c.name} unleashes ${a.c.superName}!`);

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
      b.freeze = 3.5;
      handleHit(a, b, 14, 0, true);
      a.chain = 3;
    } else if (k === 'gst_blocks') {
      // Budget Deficit Stamp & GST Block Rain
      a.rain = 2.4;
      a.hp = Math.min(100, a.hp + 14);
      a.rainTimer = 0;
    } else if (k === 'dharna') {
      // Dharna Electric Vortex & Broom Whirlwind
      a.invincible = 4;
      a.surge = 4;
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
      b.cdSpecial = 6;
      b.meter = 0;
      b.stun = 1.4;
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
        setTimeout(() => {
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
        }, i * 140);
      }
    } else if (k === 'rafale') {
      // Rajnath's Moye-Moye Rafale Strike
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          projectilesRef.current.push({
            id: Math.random(),
            kind: 'missile',
            x: b.x + (Math.random() - 0.5) * 160,
            y: -20,
            vx: 0,
            vy: 420,
            dmg: 10,
            owner: a,
            lifetime: 2
          });
        }, i * 180);
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
    matchTimeRef.current = 60;
    cameraShakeRef.current = 0;
    nextPowerUpSpawnRef.current = 3;
    isPausedRef.current = false;
    setIsPaused(false);
    padRef.current = { p1: { dx: 0, dy: 0, block: false, jump: false }, p2: { dx: 0, dy: 0, block: false, jump: false } };
    lastAITimeRef.current = 0;
    coachStepRef.current = 0;

    // Blur any active element so keyboard events go to window
    (document.activeElement as HTMLElement)?.blur();

    setGameEnding(null);
    setGameState('play');
    updateCoach('Rule 1: Move left/right with [A]/[D] or Virtual Joystick into debate range.', 1);
    addLog('me', `Parliamentary Session Commenced: ${p1Politician.name} vs ${p2Politician.name}.`);
    playSound(260, 0.3, 'triangle', 0.07, 200);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keyboardStateRef.current[e.code] = true;
      justPressedRef.current[e.code] = true;

      if (/Space|Arrow/.test(e.code)) {
        e.preventDefault();
      }

      // Title screen quick-start
      if (gameState === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
        const p2 = POLITICIANS[(POLITICIANS.indexOf(selectedPolitician) + 3) % POLITICIANS.length];
        startMatch(selectedPolitician, p2);
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
  }, [gameState, selectedPolitician]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (currentTs: number) => {
      const rawDt = (currentTs - lastTs) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamped dt
      lastTs = currentTs;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas && !isPausedRef.current) {
        // Render Background
        ctx.save();
        if (cameraShakeRef.current > 0.3) {
          ctx.translate(
            (Math.random() - 0.5) * cameraShakeRef.current,
            (Math.random() - 0.5) * cameraShakeRef.current
          );
          cameraShakeRef.current *= 0.85;
        }
        ctx.drawImage(getChamberBackground(), 0, 0);

        if (gameState === 'play' && combatantsRef.current && !isPausedRef.current) {
          const { p1, p2 } = combatantsRef.current;

          // 1. Process Cinematic Cutscene if active
          if (cinematicRef.current) {
            cinematicRef.current.elapsed += dt;
            if (cinematicRef.current.elapsed > 2.3) {
              const act = cinematicRef.current.actor;
              const tgt = cinematicRef.current.target;
              cinematicRef.current = null;
              releaseSuperAbility(act, tgt);
            }
          } else {
            // Normal Simulation
            matchTimeRef.current -= dt;

            // Player 1 Input Dispatch
            const pd1 = padRef.current.p1;
            p1.input.left = keyboardStateRef.current.KeyA || pd1.dx < -0.25 ? 1 : 0;
            p1.input.right = keyboardStateRef.current.KeyD || pd1.dx > 0.25 ? 1 : 0;
            p1.input.block = keyboardStateRef.current.KeyS || pd1.block || pd1.dy > 0.65 ? 1 : 0;
            p1.input.jump = keyboardStateRef.current.KeyW || pd1.jump || pd1.dy < -0.55 ? 1 : 0;
            if (justPressedRef.current.KeyJ || justPressedRef.current.Space) p1.input.strike = 1;
            if (justPressedRef.current.KeyK) p1.input.special = 1;
            if (justPressedRef.current.KeyF) p1.input.pickupLine = 1;
            if (justPressedRef.current.KeyQ || justPressedRef.current.KeyL) p1.input.superMove = 1;

            // Player 2 / AI Input Dispatch
            if (is2PlayerMode) {
              const pd2 = padRef.current.p2;
              p2.input.left = keyboardStateRef.current.ArrowLeft || pd2.dx < -0.25 ? 1 : 0;
              p2.input.right = keyboardStateRef.current.ArrowRight || pd2.dx > 0.25 ? 1 : 0;
              p2.input.block = keyboardStateRef.current.ArrowDown || pd2.block || pd2.dy > 0.65 ? 1 : 0;
              p2.input.jump = keyboardStateRef.current.ArrowUp || pd2.jump || pd2.dy < -0.55 ? 1 : 0;
              if (justPressedRef.current.Enter) p2.input.strike = 1;
              if (justPressedRef.current.KeyP) p2.input.special = 1;
              if (justPressedRef.current.KeyO) p2.input.superMove = 1;
            } else {
              // AI Decision Loop every 0.22s
              if (currentTs - lastAITimeRef.current > 220) {
                lastAITimeRef.current = currentTs;
                const decision = calculateAIUtilities(p2, p1, powerUpsRef.current);
                setActiveDecision(decision);
                setActiveDecisionTreeAction(decision.best);
                setTreeUtilityScores(decision.utilityMap);
                p2.thought = `${decision.best} (+${Math.round(decision.utilityMap[decision.best] ?? 0)})`;

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

                if (decision.best !== lastAIActionRef.current) {
                  lastAIActionRef.current = decision.best;
                  addLog(
                    'cpu',
                    `[AI ${p2.c.name.split(' ')[0]}] ${decision.best.toUpperCase()}: ${decision.why}`
                  );
                }
              }
            }

            // Update Combatants Physics & Actions
            [
              { me: p1, opp: p2 },
              { me: p2, opp: p1 }
            ].forEach(({ me, opp }) => {
              me.facing = opp.x > me.x ? 1 : -1;
              me.cdSpecial = Math.max(0, me.cdSpecial - dt);

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

              const onGround = me.y >= FLOOR_Y;
              me.blocking = !!(me.input.block && onGround && !me.atk && me.stun <= 0 && me.freeze <= 0);

              if (me.stun <= 0 && me.freeze <= 0) {
                const dir = (me.input.right - me.input.left) * (me.confused > 0 ? -1 : 1);
                const speedMult = SPEED_FACTORS[me.c.specialType] || 1.0;
                const walkSpeed = speedMult * 230;

                if (me.blocking) me.vx *= 0.8;
                else if (dir !== 0) me.vx = dir * walkSpeed;
                else me.vx *= 0.8;

                if (me.input.jump && onGround) {
                  me.vy = -650;
                  playSound(400, 0.1, 'triangle', 0.04, 200);
                }

                if (!me.atk && me.burstCount <= 0) {
                  if (me.input.strike) performStrike(me, opp);
                  else if (me.input.special && me.cdSpecial <= 0) performSpecial(me, opp);
                  else if (me.input.pickupLine) performPickupLine(me);
                  else if (me.input.superMove && me.meter >= 100) triggerSuperMove(me, opp);
                }
              } else {
                me.vx *= 0.9;
              }

              // Apply Gravity & Floor Constraint
              me.vy += 1800 * dt;
              me.x += me.vx * dt;
              me.y += me.vy * dt;
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
              me.input.strike = me.input.special = me.input.superMove = me.input.pickupLine = 0;
            });

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
                  p.kind === 'train' || p.kind === 'ball' || p.kind === 'gold_coin'
                );
                if (p.hitOnce) p.hasHit = true;
                else p.lifetime = 0;
              }
            });
            projectilesRef.current = projectilesRef.current.filter(p => p.lifetime > 0);

            // Update Particles
            particlesRef.current.forEach(pt => {
              pt.x += pt.vx * dt;
              pt.y += pt.vy * dt;
              pt.vy += 700 * dt;
              pt.life -= dt;
            });
            particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

            // Update Floating Combat Texts
            floatingTextsRef.current.forEach(ft => {
              ft.y -= 40 * dt;
              ft.life -= dt;
            });
            floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

            // Check Super Meter for P1
            setIsSuperReadyP1(p1.meter >= 100);
            setIsSuperReadyP2(p2.meter >= 100);

            // Check Match Victory Conditions
            const ending = checkVictoryCondition(p1, p2, matchTimeRef.current);
            if (ending) {
              setGameEnding(ending);
              setGameState('over');
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

            if (combatant.invincible > 0 && Math.floor(currentTs * 0.02) % 2) {
              ctx.globalAlpha = 0.6;
            }

            drawPolitician(ctx, combatant.c, combatant.x, combatant.y, combatant.facing, {
              time: currentTs * 0.001,
              isWalking: Math.abs(combatant.vx) > 30 && combatant.y >= FLOOR_Y - 1,
              attackProg: combatant.atk > 0 ? Math.min(1, combatant.atk * 5) : 0,
              attackPhase: combatant.atk > 0 ? 1 - combatant.atk / 0.3 : 0,
              airborne: combatant.y < FLOOR_Y - 2,
              blocking: combatant.blocking,
              stunned: combatant.stun > 0
            });
            ctx.globalAlpha = 1.0;

            // AI Thought Bubble
            if (combatant.isAI && combatant.thought) {
              ctx.save();
              ctx.translate(combatant.x, combatant.y - 110);
              ctx.fillStyle = 'rgba(13, 24, 18, 0.9)';
              ctx.strokeStyle = '#ffd700';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(-42, -18, 84, 18, 6);
              ctx.fill();
              ctx.stroke();
              // Pointer
              ctx.beginPath();
              ctx.moveTo(-4, 0);
              ctx.lineTo(0, 4);
              ctx.lineTo(4, 0);
              ctx.fillStyle = '#ffd700';
              ctx.fill();
              // Text
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`💡 ${combatant.thought}`, 0, -6);
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

          // Render Floating Combat Texts
          floatingTextsRef.current.forEach(ft => {
            ctx.globalAlpha = Math.min(1, ft.life * 2);
            ctx.fillStyle = ft.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.font = '700 14px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
          });
          ctx.globalAlpha = 1.0;

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
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(
              `Seats: ${Math.round(p.seats)}/272 ${p.meter >= 100 ? ' ★ SUPER READY [Q]' : ''}`,
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

          // Central Zero-Hour Clock
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.arc(STAGE_WIDTH / 2, 30, 22, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#f5eedb';
          ctx.font = '800 18px monospace';
          ctx.fillText(`${Math.max(0, Math.ceil(matchTimeRef.current))}`, STAGE_WIDTH / 2, 37);

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
  }, [gameState, is2PlayerMode, addLog, updateCoach]);

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
    else if (action === 'special') me.input.special = 1;
    else if (action === 'line') me.input.pickupLine = 1;
    else if (action === 'super') me.input.superMove = 1;
  };

  const togglePause = () => {
    const next = !isPausedRef.current;
    isPausedRef.current = next;
    setIsPaused(next);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#070d0a] text-[#f5eedb] select-none font-sans">
      {/* Left Stage Viewport (68%) */}
      <div className="relative flex-1 lg:flex-[68_1_0] flex items-center justify-center bg-[#030705] overflow-hidden min-w-0">
        <canvas
          ref={canvasRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="w-full h-full object-contain max-h-screen block"
        />

        {/* Contextual Rule Coach Banner */}
        {coachTip && isCoachOn && gameState === 'play' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0d1812]/95 border-2 border-[#ffd700] rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-2.5 z-30 max-w-[90%] animate-in fade-in slide-in-from-top duration-300">
            <span className="bg-[#ffd700] text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              RULE COACH
            </span>
            <span className="text-xs font-semibold text-white truncate">{coachTip}</span>
            <button
              type="button"
              onClick={() => setCoachTip(null)}
              className="text-[#8ea396] hover:text-white font-bold text-xs ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* On-screen controllers: full touch/mouse play, no keyboard needed */}
        {gameState === 'play' && (
          <>
            <VirtualGamepad
              player={1}
              variant={is2PlayerMode ? 'left' : 'split'}
              isVisible={isGamepadVisible}
              isSuperReady={isSuperReadyP1}
              onMove={(dx, dy) => { padRef.current.p1.dx = dx; padRef.current.p1.dy = dy; }}
              onHold={(k, on) => { padRef.current.p1[k] = on; }}
              onAction={a => handleVirtualAction(1, a)}
            />
            {is2PlayerMode && (
              <VirtualGamepad
                player={2}
                variant="right"
                isVisible={isGamepadVisible}
                isSuperReady={isSuperReadyP2}
                onMove={(dx, dy) => { padRef.current.p2.dx = dx; padRef.current.p2.dy = dy; }}
                onHold={(k, on) => { padRef.current.p2[k] = on; }}
                onAction={a => handleVirtualAction(2, a)}
              />
            )}
            <button
              type="button"
              onClick={togglePause}
              className="absolute top-2 right-2 z-40 w-10 h-10 rounded-full bg-[#0d1812]/90 border-2 border-[#ffd700] text-[#ffd700] font-black text-base shadow-xl active:scale-90"
              aria-label="Pause"
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            {isPaused && (
              <div className="absolute inset-0 z-30 bg-black/55 flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-extrabold text-[#ffd700] font-serif">HOUSE ADJOURNED</div>
                <button type="button" onClick={togglePause} className="px-8 py-2.5 rounded-xl bg-[#ff9933] border-2 border-[#ffd700] text-black font-black">▶ RESUME</button>
                <button type="button" onClick={() => { togglePause(); setGameState('menu'); }} className="px-8 py-2 rounded-xl bg-[#15221b] border border-[#1e3327] text-[#f5eedb] font-bold">🗺️ Back to Map</button>
              </div>
            )}
          </>
        )}

        {/* India Map Character Selection Overlay */}
        {gameState === 'menu' && (
          <IndiaMapSelect
            selectedPolitician={selectedPolitician}
            onSelect={setSelectedPolitician}
            onStartGame={() => {
              const p2 = POLITICIANS[(POLITICIANS.indexOf(selectedPolitician) + 3) % POLITICIANS.length];
              startMatch(selectedPolitician, p2);
            }}
            is2PlayerMode={is2PlayerMode}
            onToggle2Player={setIs2PlayerMode}
            onOpenRulebook={() => setIsRulebookOpen(true)}
          />
        )}

        {/* AI Inspector Modal */}
        <AIDecisionInspector
          decision={activeDecision}
          isOpen={isInspectorOpen}
          onClose={() => {
            setIsInspectorOpen(false);
            isPausedRef.current = false;
          }}
        />

        {/* Illustrated Rulebook Modal */}
        <RulebookModal isOpen={isRulebookOpen} onClose={() => setIsRulebookOpen(false)} />

        {/* Post-Match Game Over / Outcome Modal */}
        {gameState === 'over' && (
          <GameOverModal
            ending={gameEnding}
            onRematch={() => {
              if (combatantsRef.current) {
                startMatch(combatantsRef.current.p1.c, combatantsRef.current.p2.c);
              }
            }}
            onReturnToMap={() => setGameState('menu')}
          />
        )}
      </div>

      {/* Right Telemetry & Explainable AI Console (32%) */}
      <aside className="lg:flex-[32_1_0] w-full lg:max-w-[420px] bg-[#0f1a14] border-t-2 lg:border-t-0 lg:border-l-2 border-[#1e3327] flex flex-col p-3 gap-2 overflow-y-auto z-20 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1e3327]">
          <h1 className="text-sm font-extrabold text-[#ffd700] flex items-center gap-1.5 font-serif">
            <span>🏛️</span> Speaker AI Telemetry
          </h1>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/rupac4530-creator/battle-of-272-parliament"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8ea396] hover:text-[#56d364] transition flex items-center gap-1 text-[10px] font-mono"
              title="GitHub Repository"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#138808]/25 border border-[#138808] text-[#56d364] tracking-wider">
              {is2PlayerMode ? 'PVP REFEREE' : 'SELF-EXPLAINING CODE'}
            </span>
          </div>
        </div>

        {/* Real-Time Live Decision Tree Visualizer */}
        <div className="bg-[#08120d] border border-[#1e3327] rounded-xl p-2.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-[#ffd700] mb-1.5">
            <span>🧠 LIVE DECISION TREE</span>
            <span className="text-[#56d364] font-mono">
              {activeDecisionTreeAction.toUpperCase()} (
              {treeUtilityScores[activeDecisionTreeAction] >= 0 ? '+' : ''}
              {Math.round(treeUtilityScores[activeDecisionTreeAction] ?? 0)})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'Strike', label: '⚔️ Strike' },
              { id: 'Special', label: '⚡ Special' },
              { id: 'Super', label: '🔥 Super' },
              { id: 'Block', label: '🛡️ Block' },
              { id: 'Approach', label: '🏃 Approach' },
              { id: 'Retreat', label: '↩️ Retreat' },
              { id: 'Podium', label: '🏛️ 272 Seats' },
              { id: 'Pickup', label: '☕ Canteen' }
            ].map(node => {
              const isActive = activeDecisionTreeAction === node.id;
              const val = Math.round(treeUtilityScores[node.id] ?? 0);
              return (
                <div
                  key={node.id}
                  className={`px-2 py-1 rounded text-[10px] border flex justify-between items-center transition-all ${
                    isActive
                      ? 'bg-[#ffd700]/15 border-[#ffd700] text-white font-bold shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                      : 'bg-[#0d1a13] border-[#1a2e22] text-[#8ea396]'
                  }`}
                >
                  <span>{node.label}</span>
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
            onClick={() => {
              if (activeDecision) {
                isPausedRef.current = true;
                setIsInspectorOpen(true);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1c2e24] hover:bg-[#294234] border border-[#ffd700]/40 text-[#ffd700] transition flex items-center justify-center gap-1"
          >
            <span>🧠</span> Why Did You Do That?
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isVoiceOn;
              setIsVoiceOn(next);
              setVoiceEnabled(next);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              isVoiceOn
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'bg-[#1c2e24] border-[#1e3327] text-[#8ea396]'
            }`}
          >
            🎙️ AI Voice: {isVoiceOn ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setIsCoachOn(!isCoachOn)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              isCoachOn
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'bg-[#1c2e24] border-[#1e3327] text-[#8ea396]'
            }`}
          >
            🎓 Rule Coach: {isCoachOn ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setIsRulebookOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1c2e24] hover:bg-[#294234] border border-[#1e3327] text-[#f5eedb] transition"
          >
            📖 Rulebook
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsGamepadVisible(!isGamepadVisible)}
            className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
              isGamepadVisible
                ? 'bg-[#1f4e35] border-[#56d364] text-white'
                : 'bg-[#1c2e24] border-[#1e3327] text-[#8ea396]'
            }`}
          >
            🎮 On-Screen Gamepad: {isGamepadVisible ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Real-Time Telemetry Log Stream */}
        <div
          ref={logContainerRef}
          className="flex-1 min-h-[110px] max-h-[160px] overflow-y-auto bg-[#08100c] border border-[#1e3327] rounded-xl p-2 font-mono flex flex-col gap-1.5"
        />

        {/* Speaker Om Birla Referee Mascot */}
        <div className="bg-[#08100c] border border-[#1e3327] rounded-xl p-2.5 flex items-center gap-2.5 shrink-0">
          <canvas
            ref={mascotCanvasRef}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full border-2 border-[#ffd700] bg-[#15221b] shrink-0"
          />
          <div className="flex-1 text-[11px] leading-tight">
            <div className="font-extrabold text-[#ffd700]">Speaker Om Birla</div>
            <div className="text-[#d8e5dc] italic mt-0.5">
              "Order in the House! Members must strictly follow Rule 267 and debate with dignity!"
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[#8ea396] pt-1 border-t border-[#1e3327]">
          <span>💰 Briefcase: +50 Meter</span>
          <span>☕ Chai: +30 HP Heal</span>
          <span>📜 Gavel: 1.5x Dmg Boost</span>
          <span>🎙️ Mic: Radial Sound Blast</span>
        </div>

        {/* Key Bindings */}
        <div className="text-[10px] text-[#8ea396] pt-1 border-t border-[#1e3327] leading-tight">
          <b className="text-white">P1:</b> WASD Move/Jump/Block | Space/J Strike | K Special | Q/L Super | F Pickup Line.
          <br />
          <b className="text-[#ffd700]">Win:</b> 0 HP Knockout OR capture 272 Majority Seats on the podium!
        </div>
      </aside>
    </div>
  );
}
