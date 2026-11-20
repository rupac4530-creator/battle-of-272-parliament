/**
 * combat.ts — Extracted from App.tsx
 *
 * Pure combat functions that operate on Combatant objects through a World context.
 * No React imports, no hooks, no JSX. Every function receives the world bag so it
 * can read refs, play sounds, spawn particles and log — without closing over
 * React component scope.
 */

import {
  Combatant, PowerUp, Projectile, Particle, FloatingText
} from './types';
import {
  VETO, PARRY, KADI_NINDA, DHARNA_INVINCIBLE_SECONDS,
  MAMATA_COMBO_COOLDOWN, MODI_WAVE, STRIKE_DAMAGE, PICKUP_LINE,
  SUPER_TICK, MUFFLER_HOOK, RAHUL_HEAL, RAFALE, CUTSCENE_END,
  HIT_FEEL, VOICE, SHAH_CHAIN_DMG, SHAH_FREEZE_SECONDS
} from './balance';
import {
  calculateHitDamage, pickStrikeType, superInRange, hitFeel,
  isDuplicateFloat, floatingTextLife, SHOUTS,
  type LogType
} from './logic';
import { STAGE_WIDTH, FLOOR_Y } from './renderer';
import {
  playSound, playSuperSound, speakPoliticianVoice, stopVoice
} from './audio';

// ---------------------------------------------------------------------------
// World context — the bag of mutable state the combat functions need
// ---------------------------------------------------------------------------

export interface World {
  combatants: () => { p1: Combatant; p2: Combatant } | null;
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  cameraShake: number;
  setCameraShake: (v: number) => void;
  hitStop: number;
  setHitStop: (v: number) => void;
  hitStopCd: number;
  setHitStopCd: (v: number) => void;
  schedule: (delaySec: number, run: () => void) => void;
  addLog: (type: LogType, msg: string) => void;
  updateCoach: (text: string, step: number) => void;
  setIsCutscene: (v: boolean) => void;
  setCinematic: (v: { actor: Combatant; target: Combatant; elapsed: number } | null) => void;
  padReset: () => void;
  coachStep: () => number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function spawnParticles(w: World, x: number, y: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    w.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 440,
      vy: (Math.random() - 0.7) * 380,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      color,
      size: 3 + Math.random() * 3
    });
  }
}

export function addFloatingText(w: World, text: string, x: number, y: number, color: string): void {
  w.floatingTexts.push({
    id: Math.random(),
    text, x, y,
    life: floatingTextLife(text.length),
    color
  });
}

function addRefusalText(w: World, text: string, x: number, y: number, color: string): void {
  if (isDuplicateFloat(w.floatingTexts, text, x, 60)) return;
  addFloatingText(w, text, x, y, color);
}

// ---------------------------------------------------------------------------
// Hit Resolution
// ---------------------------------------------------------------------------

export function handleHit(
  w: World,
  attacker: Combatant,
  defender: Combatant,
  baseDamage: number,
  baseKnockback: number,
  unblockable = false
): void {
  if (defender.invincible > 0 || defender.hp <= 0) return;

  // Point of Order Parry Counter check
  if (defender.counter > 0 && !unblockable) {
    defender.counter = 0;
    playSound(900, 0.2, 'triangle');
    addFloatingText(w, 'PARRIED!', defender.x, defender.y - 120, '#58a6ff');
    w.addLog('me', `${defender.c.name}: Point of Order! Parried ${attacker.c.name}.`);
    defender.meter = Math.min(100, defender.meter + PARRY.meterGain);
    handleHit(w, defender, attacker, PARRY.reflectDmg, 280, true);
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
  if (!(defender.blocking && !unblockable)) {
    defender.vy = Math.min(defender.vy, -130);
  }

  attacker.comboCount = attacker.comboTimer > 0 ? attacker.comboCount + 1 : 1;
  attacker.comboTimer = 1.2;

  const blockedHit = defender.blocking && !unblockable;
  const feel = hitFeel(finalDamage, blockedHit);
  spawnParticles(w, defender.x, defender.y - 60, feel.sparkCount, feel.sparkColor);
  w.setCameraShake(Math.max(w.cameraShake, feel.shake));
  addFloatingText(w, feel.label, defender.x + (Math.random() - 0.5) * 28, defender.y - 105, feel.numberColor);
  if (feel.hitStop > 0 && w.hitStopCd <= 0) {
    w.setHitStop(Math.max(w.hitStop, feel.hitStop));
    w.setHitStopCd(HIT_FEEL.stopCooldown);
  }

  const c = w.combatants();
  if (c && attacker === c.p1) {
    w.updateCoach('Great strike! Keep attacking to charge your Super Meter to 100%!', 2);
  }
}

// ---------------------------------------------------------------------------
// Strike (punch → cross → kick chain, or airborne dropkick)
// ---------------------------------------------------------------------------

export function performStrike(w: World, a: Combatant, b: Combatant): void {
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
    addFloatingText(w, 'KICK!', a.x + a.facing * 44, a.y - 70, '#ff9933');
  } else {
    playSound(320, 0.07, 'square', 0.05, -100);
  }

  const range = (attackType === 'kick' || attackType === 'dropkick' ? 84 : 66) + (a.blast > 0 ? 32 : 0);
  const dmg = attackType === 'kick' ? STRIKE_DAMAGE.kick : (attackType === 'dropkick' ? STRIKE_DAMAGE.dropkick : STRIKE_DAMAGE.punch);
  const knockback = attackType === 'kick' ? 270 : (attackType === 'dropkick' ? 320 : 210);

  if (Math.abs(a.x - b.x) < range && Math.abs(a.y - b.y) < 75) {
    handleHit(w, a, b, dmg, knockback);
  }
}

// ---------------------------------------------------------------------------
// Special Ability
// ---------------------------------------------------------------------------

export function performSpecial(w: World, a: Combatant, b: Combatant): void {
  const c = a.c;
  a.cdSpecial = 2.6;
  a.attackType = 'special';
  a.atk = 0.34;
  const dist = Math.abs(a.x - b.x);
  playSound(520, 0.16, 'sawtooth', 0.07, -200);
  addFloatingText(w, SHOUTS[c.id] ?? '', a.x, a.y - 134, '#ffb347');

  if (c.specialType === 'proj') {
    w.projectiles.push({
      id: Math.random(), kind: 'wave',
      x: a.x + a.facing * 36, y: a.y - 62,
      vx: a.facing * 460, dmg: MODI_WAVE.dmg,
      owner: a, lifetime: 2
    });
  } else if (c.specialType === 'grab') {
    if (dist < 88) {
      handleHit(w, a, b, 10, 130);
      const stolen = Math.min(25, b.meter);
      b.meter -= stolen;
      a.meter = Math.min(100, a.meter + stolen);
      addFloatingText(w, 'METER SIPHONED', b.x, b.y - 120, '#ffd700');
      w.addLog(a.isAI ? 'cpu' : 'me', `${c.name} executed Operation Lotus, stealing ${Math.round(stolen)}% meter!`);
    } else {
      addFloatingText(w, 'MISS', a.x, a.y - 120, '#888888');
    }
  } else if (c.specialType === 'drain') {
    if (dist < 96) {
      handleHit(w, a, b, 8, 110);
      b.meter = Math.max(0, b.meter - 20);
      a.hp = Math.min(100, a.hp + 8);
      addFloatingText(w, '28% GST DRAIN', b.x, b.y - 120, '#56d364');
    } else {
      addFloatingText(w, 'MISS', a.x, a.y - 120, '#888888');
    }
  } else if (c.specialType === 'pull') {
    if (dist < MUFFLER_HOOK.range) {
      a.whip = MUFFLER_HOOK.duration;
      a.hookPending = true;
    } else {
      addFloatingText(w, 'MISS', a.x, a.y - 120, '#888888');
    }
  } else if (c.specialType === 'combo') {
    a.burstCount = 3;
    a.burstTimer = 0;
    a.cdSpecial = MAMATA_COMBO_COOLDOWN;
  } else if (c.specialType === 'counter') {
    a.counter = PARRY.window;
    a.cdSpecial = PARRY.cooldown;
  } else if (c.specialType === 'burn') {
    w.projectiles.push({
      id: Math.random(), kind: 'flame',
      x: a.x + a.facing * 40, y: a.y - 58,
      vx: a.facing * 380, dmg: 12,
      owner: a, lifetime: 1.5
    });
  } else if (c.specialType === 'confuse') {
    b.confused = KADI_NINDA.confuseSeconds;
    if (dist < KADI_NINDA.stunRange && !b.blocking) b.stun = Math.max(b.stun, KADI_NINDA.stunSeconds);
    addFloatingText(w, 'MOYE MOYE CONFUSION', b.x, b.y - 120, '#ff9933');
  } else if (c.specialType === 'heal_aura') {
    a.hp = Math.min(100, a.hp + RAHUL_HEAL.heal);
    a.invincible = RAHUL_HEAL.invincible;
    a.cdSpecial = RAHUL_HEAL.cooldown;
    addFloatingText(w, `MOHABBAT KI DUKAAN +${RAHUL_HEAL.heal} HP`, a.x, a.y - 120, '#58a6ff');
  }
}

// ---------------------------------------------------------------------------
// Pickup Line (+8 Seats)
// ---------------------------------------------------------------------------

export function performPickupLine(w: World, a: Combatant): void {
  if (a.lineUses >= PICKUP_LINE.maxUses) {
    addRefusalText(w, 'NO LINES LEFT', a.x, a.y - 120, '#9aa5b1');
    return;
  }
  if (a.lineCd > 0) {
    addRefusalText(w, 'LINE COOLING DOWN', a.x, a.y - 120, '#9aa5b1');
    return;
  }
  a.lineCd = PICKUP_LINE.cooldown;
  a.lineUses += 1;
  playSound(600, 0.15, 'sine', 0.08, 200);
  addFloatingText(w, `"${a.c.pickupLine}"`, a.x, a.y - 50, '#ffd700');
  a.seats = Math.min(272, a.seats + PICKUP_LINE.seats);
  w.addLog(a.isAI ? 'cpu' : 'me', `${a.c.name} recited a witty pickup line (+${PICKUP_LINE.seats} Seats, ${PICKUP_LINE.maxUses - a.lineUses} left)!`);
}

// ---------------------------------------------------------------------------
// Super Move (cinematic trigger + release)
// ---------------------------------------------------------------------------

export function triggerSuperMove(w: World, a: Combatant, b: Combatant): void {
  a.meter = 0;
  a.attackType = 'super';
  w.setCinematic({ actor: a, target: b, elapsed: 0 });
  w.setIsCutscene(true);
  w.padReset();
  speakPoliticianVoice(a.c.id);
  playSound(90, 0.6, 'sawtooth', 0.12, -30);
}

export function releaseSuperAbility(w: World, a: Combatant, b: Combatant): void {
  const k = a.c.superType;
  const f = a.facing;
  w.setIsCutscene(false);
  stopVoice(VOICE.cutsceneFadeSeconds);
  a.surge = 1.4;
  a.attackType = 'super';
  w.setCameraShake(16);
  playSuperSound(k);
  w.addLog(a.isAI ? 'cpu' : 'me', `SUPER: ${a.c.name} unleashes ${a.c.superName}!`);

  const c = w.combatants();
  if ((k === 'train' || k === 'bulldozer') && c && a !== c.p1) {
    w.updateCoach(`JUMP over the train or bulldozer to dodge it!`, w.coachStep());
  }

  if (k === 'train') {
    w.projectiles.push({
      id: Math.random(), kind: 'train',
      x: f > 0 ? -180 : STAGE_WIDTH + 180, y: FLOOR_Y - 8,
      vx: f * 920, dmg: 35,
      owner: a, lifetime: 2.2, width: 270, hitOnce: true
    });
  } else if (k === 'chain') {
    b.freeze = SHAH_FREEZE_SECONDS;
    handleHit(w, a, b, SHAH_CHAIN_DMG, 0, true);
    a.chain = 3;
  } else if (k === 'gst_blocks') {
    a.rain = SUPER_TICK.gst_blocks.duration;
    a.hp = Math.min(100, a.hp + 14);
    a.rainTimer = 0;
    addFloatingText(w, 'GST RAIN +14 HP', a.x, a.y - 130, '#56d364');
  } else if (k === 'dharna') {
    a.invincible = Math.min(SUPER_TICK.dharna.duration, DHARNA_INVINCIBLE_SECONDS);
    a.surge = 4;
    a.rain = SUPER_TICK.dharna.duration;
    a.rainTimer = 0;
  } else if (k === 'khela_volley') {
    for (let i = 0; i < 5; i++) {
      w.projectiles.push({
        id: Math.random(), kind: 'ball',
        x: a.x + f * 30, y: a.y - 70,
        vx: f * (220 + i * 75), vy: -200 - i * 65,
        dmg: 8, owner: a, lifetime: 5, bounceCount: 4
      });
    }
  } else if (k === 'veto') {
    handleHit(w, a, b, 16, 160, true);
    b.cdSpecial = VETO.silenceSeconds;
    b.meter = 0;
    b.stun = VETO.stun;
    addFloatingText(w, 'SILENCED & VETOED', b.x, b.y - 130, '#ffffff');
  } else if (k === 'bulldozer') {
    w.projectiles.push({
      id: Math.random(), kind: 'bulldozer',
      x: a.x, y: FLOOR_Y - 20,
      vx: f * 620, dmg: 38,
      owner: a, lifetime: 2.0, width: 170, hitOnce: true
    });
  } else if (k === 'aloo_gold') {
    for (let i = 0; i < 7; i++) {
      w.schedule(i * 0.14, () => {
        w.projectiles.push({
          id: Math.random(), kind: 'gold_coin',
          x: a.x + f * 35, y: a.y - 65,
          vx: f * (260 + i * 40), vy: (Math.random() - 0.5) * 80,
          dmg: 6, owner: a, lifetime: 3
        });
      });
    }
  } else if (k === 'rafale') {
    for (let i = 0; i < RAFALE.missiles; i++) {
      w.schedule((i * RAFALE.gapMs) / 1000, () => {
        w.projectiles.push({
          id: Math.random(), kind: 'missile',
          x: b.x + (Math.random() - 0.5) * 2 * RAFALE.spreadPx, y: -20,
          vx: 0, vy: 420,
          dmg: RAFALE.dmg, owner: a, lifetime: 2
        });
      });
    }
  }
}

// (SHAH_CHAIN_DMG and SHAH_FREEZE_SECONDS already imported at the top via balance)

// ---------------------------------------------------------------------------
// Power-up Collection
// ---------------------------------------------------------------------------

export function collectPowerUp(w: World, combatant: Combatant, pu: PowerUp): void {
  playSound(880, 0.15, 'triangle', 0.08, 300);
  const c = w.combatants();
  const opponent = c ? (combatant === c.p1 ? c.p2 : c.p1) : null;

  if (pu.type === 'case') {
    combatant.meter = Math.min(100, combatant.meter + 50);
    combatant.cdSpecial = 0;
    addFloatingText(w, '+50 SUPER METER', combatant.x, combatant.y - 120, '#ffd700');
  } else if (pu.type === 'cup') {
    combatant.hp = Math.min(100, combatant.hp + 30);
    addFloatingText(w, '+30 HP KULLAD CHAI', combatant.x, combatant.y - 120, '#56d364');
  } else if (pu.type === 'gavel') {
    combatant.damageBoost = 8;
    addFloatingText(w, '1.5x GAVEL POWER', combatant.x, combatant.y - 120, '#ff9933');
  } else if (pu.type === 'mic') {
    combatant.blast = 0.5;
    if (opponent && Math.abs(combatant.x - opponent.x) < 260) {
      opponent.vx = (opponent.x > combatant.x ? 1 : -1) * 540;
      opponent.vy = -200;
      opponent.hp = Math.max(0, opponent.hp - 8);
      opponent.stun = 0.35;
    }
    addFloatingText(w, 'RADIAL SPEAKER BLAST', combatant.x, combatant.y - 120, '#ffffff');
  }

  w.addLog(combatant.isAI ? 'cpu' : 'me', `${combatant.c.name} collected ${pu.type.toUpperCase()}`);
}
