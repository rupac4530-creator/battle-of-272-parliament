import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POLITICIANS,
  spreadPins,
  nearestPin,
  labelReach,
  pickLabelSide,
  pinLabelVisible,
  mapTextVisible,
  stepRoster, pickOpponent, rerollOpponent, vsMaySkip, voiceFadeVolume, useFallbackHook, voiceGainFor, duckedMusicVolume, effectiveMusicVolume, lowNoteCopy,
  rosterScrollLeft,
  invincibleAlpha, appliedShake, portraitSlideOffset,
  detectTouchPrimary,
  TOUCH_PRIMARY_QUERY,
  calculateHitDamage,
  checkVictoryCondition,
  calculateAIUtilities,
  getCounterfactualExplanation,
  evWord,
  formatEv,
  inspectDisabledReason,
  createCombatant,
  pickStrikeType,
  decayPerFrame,
  integrate,
  stepHorizontal,
  bufferStep,
  separateFighters,
  hitFeel,
  cutsceneSkipTo,
  pickRenderScale,
  containRect,
  phoneHudLayout,
  coachMayReplace,
  superReadyLabel,
  thoughtBubbleBox,
  newGhostBar,
  stepGhostBar,
  clockLook,
  clockTickFreq,
  floatingTextLife,
  layoutFloatingText,
  logPrefix,
  padLayout,
  isDuplicateFloat,
  chamberLayout,
  winnerPortraitLayout,
  makeConfetti,
  preloadFraction,
  introSeats,
  introReady,
  introKeyAction,
  easeSeatsStep, skipHintText, introStepLabel,
  ACTION_LABEL, actionLabel, scoreBar,
  updateOrder,
} from './logic';
import { drawProjectile } from './renderer';
import { readFileSync, existsSync } from 'node:fs';
import { parseStoredSettings, mergeStoredSettings, loadSettings, saveSettings, getDefaultStorage, type StorageLike } from './settings';
import { SETTINGS, INTRO_COUNTER } from './balance';
import { shouldPublishDecision } from './logic';
import { roundRectPath, installRoundRectFallback, normalizeRadii } from './canvasCompat';
import { DECISION_UI, INVINCIBLE_LOOK, MIN_TEXT_PX } from './balance';
import { fileURLToPath } from 'node:url';
import { CONTROLS, codesFor, isActive, labelsFor, primaryLabel, bracketLabels, allCodes, swallowedInMatch, controlsSummary, PAUSE_CODES } from './controls';
import { enterPromptText, rulebookRoster, rulebookFacts, focusTrapTarget } from './logic';
import { STRIKE_DAMAGE, PICKUP_LINE as PL_F41, BLOCK_DAMAGE_MULT as BDM_F41 } from './balance';
import { fitFontSize, ellipsize, wrapText, revealLines, totalChars, splitGraphemes } from './textFit';
import { PAD, MOVE, INPUT_BUFFER_SECONDS, BODY, HIT_FEEL, BLOCK_DAMAGE_MULT, CUTSCENE_FADE_AT, CUTSCENE_END, QUOTE_CHARS_PER_SECOND, CUTSCENE_SKIP_AFTER, CUTSCENE_HUD_STRIP, RENDER, HUD_TEXT, GHOST_BAR, CLOCK, FLOAT_TEXT, REFUSAL_TEXT, ARENA_ART, GAME_OVER, PHONE_HUD, MAP_PINS, MAP_TEXT, MAP_COMPACT, ROSTER, VS, VOICE, VOICE_LUFS, AUDIO_UI } from './balance';
import { LEADER_LOC, proj } from './indiaGeo';

test('Politicians roster contains all 9 authentic politicians', () => {
  assert.equal(POLITICIANS.length, 9);
  const ids = POLITICIANS.map(p => p.id);
  assert.ok(ids.includes('modi'), 'Missing Modi');
  assert.ok(ids.includes('shah'), 'Missing Shah');
  assert.ok(ids.includes('rahul'), 'Missing Rahul');
  assert.ok(ids.includes('yogi'), 'Missing Yogi');
  assert.ok(ids.includes('rajnath'), 'Missing Rajnath');
  assert.ok(ids.includes('sitharaman'), 'Missing Sitharaman');
  assert.ok(ids.includes('kharge'), 'Missing Kharge');
  assert.ok(ids.includes('kejriwal'), 'Missing Kejriwal');
  assert.ok(ids.includes('mamata'), 'Missing Mamata');
});

test('Politician speech and meme dialogues are accurate', () => {
  const modi = POLITICIANS.find(p => p.id === 'modi');
  assert.ok(modi?.speechText.includes('अङ्गेन गात्रं'), 'Modi shloka missing');

  const shah = POLITICIANS.find(p => p.id === 'shah');
  assert.ok(shah?.speechText.includes('अरे भाई बैठो ना'), 'Shah meme missing');

  const rahul = POLITICIANS.find(p => p.id === 'rahul');
  assert.ok(rahul?.memeDialogue.includes('आलू'), 'Rahul meme missing');

  const yogi = POLITICIANS.find(p => p.id === 'yogi');
  assert.ok(yogi?.speechText.includes('टोंटीचोर'), 'Yogi meme missing');

  const rajnath = POLITICIANS.find(p => p.id === 'rajnath');
  assert.ok(rajnath?.speechText.includes('मोये-मोये'), 'Rajnath meme missing');

  const sitharaman = POLITICIANS.find(p => p.id === 'sitharaman');
  assert.ok(sitharaman?.speechText.includes('middle class'), 'Sitharaman meme missing');

  const kharge = POLITICIANS.find(p => p.id === 'kharge');
  assert.ok(kharge?.speechText.includes('बाप'), 'Kharge meme missing');

  const kejriwal = POLITICIANS.find(p => p.id === 'kejriwal');
  assert.ok(kejriwal?.speechText.includes('परेशान'), 'Kejriwal meme missing');

  const mamata = POLITICIANS.find(p => p.id === 'mamata');
  assert.ok(mamata?.speechText.includes('हुम्बा'), 'Mamata meme missing');
});

test('calculateHitDamage applies blocking defense correctly', () => {
  const normalHit = calculateHitDamage(0, false, 20);
  assert.equal(normalHit.finalDamage, 20);
  assert.equal(normalHit.knockbackMultiplier, 1.0);

  const blockedHit = calculateHitDamage(0, true, 20);
  assert.equal(blockedHit.finalDamage, 7); // 65% reduction (BLOCK_DAMAGE_MULT = 0.35)
  assert.equal(blockedHit.knockbackMultiplier, 0.3);

  const boostedHit = calculateHitDamage(5, false, 20);
  assert.equal(boostedHit.finalDamage, 30); // 1.5x boost
});

test('checkVictoryCondition detects HP knockout and 272 seats victory', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);

  // Active match
  assert.equal(checkVictoryCondition(p1, p2, 50), null);

  // Knockout
  p2.hp = 0;
  const koResult = checkVictoryCondition(p1, p2, 50);
  assert.ok(koResult != null);
  assert.equal(koResult?.winner.c.id, 'modi');
  assert.ok(koResult?.reason.includes('Knockout'));

  // 272 Seats Majority
  p2.hp = 100;
  p1.seats = 272;
  const seatsResult = checkVictoryCondition(p1, p2, 50);
  assert.ok(seatsResult != null);
  assert.equal(seatsResult?.winner.c.id, 'modi');
  assert.ok(seatsResult?.title.includes('272 MAJORITY'));
});

test('calculateAIUtilities chooses Super when 100% full', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const ai = createCombatant(POLITICIANS[1], 300, true);
  ai.meter = 100;

  const decision = calculateAIUtilities(ai, p1, []);
  assert.equal(decision.best, 'Super');
  assert.ok(decision.why.includes('100% primed'));

  const cf = getCounterfactualExplanation('Strike', 10, decision);
  assert.ok(cf.includes('Strike lost out'));
});

test('pickStrikeType: airborne strike is a dropkick', () => {
  assert.equal(pickStrikeType({ airborne: true, forward: false, wantKick: false, comboCount: 0 }), 'dropkick');
});

test('pickStrikeType: without a kick flag the chain is punch, cross, kick', () => {
  const pick = (comboCount: number) =>
    pickStrikeType({ airborne: false, forward: false, wantKick: false, comboCount });
  assert.equal(pick(0), 'punch');
  assert.equal(pick(1), 'cross');
  assert.equal(pick(2), 'kick');
  assert.equal(pick(3), 'cross');
  assert.equal(pick(4), 'punch');
});

test('pickStrikeType: the kick flag gives one kick and does not stick', () => {
  assert.equal(pickStrikeType({ airborne: false, forward: false, wantKick: true, comboCount: 0 }), 'kick');
  // Next strike has no flag, so the punch comes back
  assert.equal(pickStrikeType({ airborne: false, forward: false, wantKick: false, comboCount: 0 }), 'punch');
  // Fresh fighters have no kick queued
  assert.equal(createCombatant(POLITICIANS[0], 200, false).input.kick, 0);
});

test('double KO goes to the higher seat count, then the fighter nearer the podium', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);
  p1.hp = 0;
  p2.hp = 0;
  p1.seats = 150;
  p2.seats = 100;
  assert.equal(checkVictoryCondition(p1, p2, 30)?.winner.c.id, p1.c.id);

  p1.seats = 100;
  p2.seats = 100;
  p1.x = 300; // 100 from the podium
  p2.x = 380; // 20 from the podium
  assert.equal(checkVictoryCondition(p1, p2, 30)?.winner.c.id, p2.c.id);
});

test('a P1 knockout does not claim a 272-seat mandate', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);
  p2.hp = 0;
  const result = checkVictoryCondition(p1, p2, 30);
  assert.equal(result?.winner.c.id, p1.c.id);
  assert.ok(result?.title.includes('KNOCKOUT'));
  assert.ok(!result?.title.includes('272'));
});

test('timeout compares health first, then seats', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);
  p1.hp = 40;
  p1.seats = 250;
  p2.hp = 60;
  p2.seats = 0;
  assert.equal(checkVictoryCondition(p1, p2, 0)?.winner.c.id, p2.c.id);

  p2.hp = 40; // equal health: seats decide
  p2.seats = 260;
  assert.equal(checkVictoryCondition(p1, p2, 0)?.winner.c.id, p2.c.id);
});

test('an exact timeout tie goes to the fighter nearer the podium', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);
  p1.x = 100;
  p2.x = 390;
  assert.equal(checkVictoryCondition(p1, p2, 0)?.winner.c.id, p2.c.id);
});

test('CPU never picks Super when the target is out of range (Shah)', () => {
  const shah = POLITICIANS.find(p => p.id === 'shah')!;
  const target = POLITICIANS.find(p => p.id === 'modi')!;
  const ai = createCombatant(shah, 700, true);
  const foe = createCombatant(target, 100, false); // 600 px away
  ai.meter = 100;
  const decision = calculateAIUtilities(ai, foe, []);
  assert.notEqual(decision.best, 'Super');
  assert.equal(decision.utilityMap.Super, -99);
});

test('CPU Rahul does not waste his heal at high health', () => {
  const rahul = POLITICIANS.find(p => p.id === 'rahul')!;
  const ai = createCombatant(rahul, 300, true);
  const foe = createCombatant(POLITICIANS[0], 400, false);
  ai.hp = 90;
  assert.equal(calculateAIUtilities(ai, foe, []).utilityMap.Special, -99);
  ai.hp = 50;
  assert.ok(calculateAIUtilities(ai, foe, []).utilityMap.Special > 0);
});

test('CPU prefers Strike over a nearby Pickup when the opponent is in melee range', () => {
  const ai = createCombatant(POLITICIANS[1], 300, true);
  const foe = createCombatant(POLITICIANS[0], 350, false); // 50 px
  const item = { id: 1, type: 'cup' as const, x: 320, y: 372, vy: 0, lifetime: 10 };
  const decision = calculateAIUtilities(ai, foe, [item]);
  assert.equal(decision.best, 'Strike');
});

test('AI hysteresis keeps the previous action unless another is clearly better', () => {
  const ai = createCombatant(POLITICIANS[1], 300, true);
  const foe = createCombatant(POLITICIANS[0], 500, false); // 200 px, no items
  const fresh = calculateAIUtilities(ai, foe, []);
  const sticky = calculateAIUtilities(ai, foe, [], 'Approach');
  // Approach scores far below the fresh best here, so it must not be kept
  assert.equal(sticky.best, fresh.best);
});

test('AI considers a pickup line when far from the opponent and has uses left', () => {
  const ai = createCombatant(POLITICIANS[1], 100, true);
  const foe = createCombatant(POLITICIANS[0], 700, false); // 600 px away
  const decision = calculateAIUtilities(ai, foe, []);
  assert.ok(decision.utilityMap.PickupLine > -99, 'PickupLine should be viable when far away');
});

test('AI does not use a pickup line when in melee range or out of uses', () => {
  const ai = createCombatant(POLITICIANS[1], 300, true);
  const foe = createCombatant(POLITICIANS[0], 350, false); // 50 px — melee
  assert.equal(calculateAIUtilities(ai, foe, []).utilityMap.PickupLine, -99);
  // Out of uses
  const ai2 = createCombatant(POLITICIANS[1], 100, true);
  ai2.lineUses = 5;
  const foe2 = createCombatant(POLITICIANS[0], 700, false);
  assert.equal(calculateAIUtilities(ai2, foe2, []).utilityMap.PickupLine, -99);
  // Cooldown active
  const ai3 = createCombatant(POLITICIANS[1], 100, true);
  ai3.lineCd = 2;
  const foe3 = createCombatant(POLITICIANS[0], 700, false);
  assert.equal(calculateAIUtilities(ai3, foe3, []).utilityMap.PickupLine, -99);
});

// ── F16: frame-rate independent movement ────────────────────────────────────
const FPS_LIST = [30, 60, 144, 240];

function slideDistance(v0: number, fps: number): number {
  const dt = 1 / fps;
  let x = 0, vx = v0;
  for (let i = 0; i < fps * 4; i++) {
    const hz = stepHorizontal(vx, { onGround: true, dir: 0, walkSpeed: 230, blocking: false, locked: false }, dt);
    x += hz.avg * dt;
    vx = hz.vx;
  }
  return x;
}

function jumpPeak(fps: number): { peak: number; airtime: number } {
  const dt = 1 / fps;
  let y = 0, vy = -MOVE.jumpSpeed, peak = 0, t = 0;
  do {
    const before = vy;
    vy += MOVE.gravity * dt;
    y = integrate(y, before, vy, dt);
    peak = Math.min(peak, y);
    t += dt;
  } while (y < 0 && t < 5);
  return { peak: -peak, airtime: t };
}

test('decayPerFrame is the identity multiplier at 60 fps and compounds correctly', () => {
  assert.ok(Math.abs(decayPerFrame(0.8, 1 / 60) - 0.8) < 1e-12);
  assert.ok(Math.abs(Math.pow(decayPerFrame(0.8, 1 / 30), 2) - 0.8 * 0.8 * 0.8 * 0.8) < 1e-12);
});

test('a knockback slides the same distance at 30, 60, 144 and 240 fps (within 3%)', () => {
  const d = FPS_LIST.map(f => slideDistance(600, f));
  const ref = d[1];
  for (const x of d) assert.ok(Math.abs(x - ref) / ref < 0.03, `distances ${d.map(n => n.toFixed(1)).join(', ')}`);
  // continuous answer is v0 / (-60 ln k)
  const exact = 600 / (-60 * Math.log(MOVE.groundFriction));
  assert.ok(Math.abs(ref - exact) / exact < 0.03);
});

test('jump height and airtime do not depend on fps', () => {
  const exact = (MOVE.jumpSpeed * MOVE.jumpSpeed) / (2 * MOVE.gravity);
  for (const f of FPS_LIST) {
    const r = jumpPeak(f);
    assert.ok(Math.abs(r.peak - exact) < 1.5, `${f} fps peak ${r.peak.toFixed(2)} vs ${exact.toFixed(2)}`);
    assert.ok(Math.abs(r.airtime - (2 * MOVE.jumpSpeed) / MOVE.gravity) < 2 / f + 0.01, `${f} fps airtime ${r.airtime.toFixed(3)}`);
  }
});

test('walking on the ground is instant; no input and blocking slide to a stop', () => {
  const walk = stepHorizontal(0, { onGround: true, dir: 1, walkSpeed: 230, blocking: false, locked: false }, 1 / 60);
  assert.equal(walk.vx, 230);
  const stop = stepHorizontal(230, { onGround: true, dir: 0, walkSpeed: 230, blocking: false, locked: false }, 1 / 60);
  assert.ok(stop.vx < 230 && stop.vx > 0);
  const blocked = stepHorizontal(230, { onGround: true, dir: 1, walkSpeed: 230, blocking: true, locked: false }, 1 / 60);
  assert.ok(blocked.vx < 230);
});

test('air: momentum is kept without input, steering is capped at walk speed, knockback is not boosted', () => {
  const dt = 1 / 60;
  let vx = 230;
  for (let i = 0; i < 42; i++) vx = stepHorizontal(vx, { onGround: false, dir: 0, walkSpeed: 230, blocking: false, locked: false }, dt).vx; // ~0.7 s airtime
  assert.ok(vx > 230 * 0.35 && vx < 230 * 0.6, `kept ${vx.toFixed(0)}`);
  let v = 0;
  for (let i = 0; i < 60; i++) v = stepHorizontal(v, { onGround: false, dir: 1, walkSpeed: 230, blocking: false, locked: false }, dt).vx;
  assert.equal(v, 230);
  const kb = stepHorizontal(500, { onGround: false, dir: 1, walkSpeed: 230, blocking: false, locked: false }, dt).vx;
  assert.equal(kb, 500); // steering never adds speed on top of a knockback
  const rev = stepHorizontal(230, { onGround: false, dir: -1, walkSpeed: 230, blocking: false, locked: false }, dt).vx;
  assert.ok(rev < 230);
});

test('locked (stunned/frozen) fighters cannot steer', () => {
  const v = stepHorizontal(100, { onGround: false, dir: 1, walkSpeed: 230, blocking: false, locked: true }, 1 / 60).vx;
  assert.ok(Math.abs(v - 90) < 1e-9);
});

// ── F17: input buffer and body collision ────────────────────────────────────
const NONE = { strike: 0, special: 0, pickupLine: 0, superMove: 0, kick: 0 };

test('buffer: a free fighter fires a fresh press immediately and keeps nothing', () => {
  const r = bufferStep({ ...NONE, strike: 1 }, null, false, 1 / 60);
  assert.equal(r.fire, 'strike');
  assert.equal(r.buffer, null);
});

test('buffer: a press while busy is remembered and fires when free, with its kick flag', () => {
  const dt = 1 / 60;
  let r = bufferStep({ ...NONE, strike: 1, kick: 1 }, null, true, dt);
  assert.equal(r.fire, null);
  assert.ok(r.buffer && r.buffer.action === 'strike');
  r = bufferStep(NONE, r.buffer, true, dt); // still busy next frame
  assert.ok(r.buffer);
  r = bufferStep(NONE, r.buffer, false, dt); // free now
  assert.equal(r.fire, 'strike');
  assert.equal(r.kick, 1);
  assert.equal(r.buffer, null);
});

test('buffer: an old press expires after INPUT_BUFFER_SECONDS', () => {
  const dt = 1 / 60;
  let r = bufferStep({ ...NONE, special: 1 }, null, true, dt);
  const frames = Math.ceil(INPUT_BUFFER_SECONDS / dt) + 2;
  for (let i = 0; i < frames; i++) r = bufferStep(NONE, r.buffer, true, dt);
  assert.equal(r.buffer, null);
  r = bufferStep(NONE, r.buffer, false, dt);
  assert.equal(r.fire, null);
});

test('buffer: the newest press wins, and priority matches strike > special > line > super', () => {
  let r = bufferStep({ ...NONE, strike: 1 }, null, true, 1 / 60);
  r = bufferStep({ ...NONE, superMove: 1 }, r.buffer, true, 1 / 60);
  assert.equal(r.buffer?.action, 'superMove');
  const both = bufferStep({ ...NONE, special: 1, pickupLine: 1 }, null, false, 1 / 60);
  assert.equal(both.fire, 'special');
});

test('collision: grounded fighters are pushed to the minimum gap and not past it', () => {
  let a = 400, b = 410;
  for (let i = 0; i < 120; i++) [a, b] = separateFighters(a, b, true, 1 / 60);
  assert.ok(Math.abs(b - a) >= BODY.minGap - 1e-6 && Math.abs(b - a) < BODY.minGap + 0.5, `gap ${b - a}`);
  assert.ok(a < b, 'order is preserved');
});

test('collision: airborne fighters pass through, and touching exactly at the gap does nothing', () => {
  assert.deepEqual(separateFighters(400, 410, false, 1 / 60), [400, 410]);
  assert.deepEqual(separateFighters(400, 400 + BODY.minGap, true, 1 / 60), [400, 400 + BODY.minGap]);
});

test('collision: a fighter pinned to the wall never leaves the stage; the other takes the push', () => {
  let a: number = BODY.wallMin, b: number = BODY.wallMin + 5;
  for (let i = 0; i < 120; i++) [a, b] = separateFighters(a, b, true, 1 / 60);
  assert.equal(a, BODY.wallMin);
  assert.ok(b - a >= BODY.minGap - 1e-6, `gap ${b - a}`);
  let c: number = BODY.wallMax - 5, d: number = BODY.wallMax;
  for (let i = 0; i < 120; i++) [c, d] = separateFighters(c, d, true, 1 / 60);
  assert.equal(d, BODY.wallMax);
  assert.ok(d - c >= BODY.minGap - 1e-6);
});

test('collision: resolution speed does not depend on fps (same distance after 0.2 s)', () => {
  const run = (fps: number) => {
    let a = 400, b = 410;
    for (let i = 0; i < fps * 0.1; i++) [a, b] = separateFighters(a, b, true, 1 / fps);
    return b - a;
  };
  assert.ok(Math.abs(run(30) - run(144)) < 2);
});

test('collision: perfectly stacked fighters split to opposite sides', () => {
  const [a, b] = separateFighters(400, 400, true, 1 / 60);
  assert.ok(a < b);
});

// ── F18: hit feedback ───────────────────────────────────────────────────────
test('hitFeel: a normal hit freezes briefly, a heavy hit longer, with gold sparks and a white number', () => {
  const n = hitFeel(8, false);
  assert.equal(n.hitStop, HIT_FEEL.hitStop);
  assert.equal(n.sparkColor, HIT_FEEL.spark.hit);
  assert.equal(n.numberColor, HIT_FEEL.numberColor.hit);
  assert.equal(n.label, '8');
  const h = hitFeel(38, false);
  assert.equal(h.hitStop, HIT_FEEL.heavyStop);
  assert.ok(h.shake > n.shake);
});

test('hitFeel: a blocked hit freezes less, with blue sparks, less shake and a grey number', () => {
  const dmg = Math.round(10 * BLOCK_DAMAGE_MULT * 10) / 10; // a 10-damage punch blocked
  const b = hitFeel(dmg, true);
  const n = hitFeel(10, false);
  assert.equal(b.hitStop, HIT_FEEL.blockStop);
  assert.ok(b.hitStop < n.hitStop);
  assert.ok(b.shake < n.shake);
  assert.ok(b.sparkCount < n.sparkCount);
  assert.equal(b.sparkColor, HIT_FEEL.spark.block);
  assert.equal(b.numberColor, HIT_FEEL.numberColor.block);
});

test('hitFeel: chip damage and damage-over-time ticks never freeze the game', () => {
  assert.equal(hitFeel(3, false).hitStop, 0);
  assert.equal(hitFeel(4, false).hitStop, 0);
  assert.equal(hitFeel(0.6, true).hitStop, 0); // a blocked tick
});

test('hitFeel: tiny numbers keep a decimal instead of rounding to zero', () => {
  assert.equal(hitFeel(0.7, true).label, '0.7');
  assert.equal(hitFeel(2.8, true).label, '3');
});

// ── F19: text fitting ───────────────────────────────────────────────────────
// A fake font whose width is `charWidth * px * length`: lets us simulate narrow and very wide fonts.
const fake = (text: string, charWidth: number) => (px: number) => text.length * px * charWidth;

test('fitFontSize: text that already fits keeps its starting size', () => {
  assert.equal(fitFontSize(fake('VETO OF ELDERS', 0.5), 424, 38, 24), 38);
});

test('fitFontSize: shrinks long titles until they fit, never below the minimum', () => {
  const text = 'MOYE-MOYE RAFALE STRIKE';
  for (const charWidth of [0.5, 0.6, 0.7]) {
    const px = fitFontSize(fake(text, charWidth), 424, 38, 24);
    assert.ok(px >= 24 && px <= 38);
    if (px > 24) assert.ok(fake(text, charWidth)(px) <= 424, `cw ${charWidth}: ${px}px is ${fake(text, charWidth)(px)} wide`);
  }
  // wide font: needs real shrinking but still fits above the minimum
  assert.ok(fitFontSize(fake(text, 0.7), 424, 38, 24) < 38);
});

test('fitFontSize: returns the minimum when even that is too wide (caller ellipsizes)', () => {
  assert.equal(fitFontSize(fake('X'.repeat(80), 0.6), 424, 38, 24), 24);
});

test('fitFontSize: picks the LARGEST size that fits (within one 0.5 px step)', () => {
  const m = fake('ALOO-SONA GOLD CANNON', 0.6);
  const px = fitFontSize(m, 424, 38, 24);
  assert.ok(m(px) <= 424);
  assert.ok(m(px + 0.5) > 424 || px === 38);
});

test('ellipsize: leaves fitting text alone and shortens the rest to fit with …', () => {
  const m = (t: string) => t.length * 10;
  assert.equal(ellipsize(m, 'SHORT', 100), 'SHORT');
  const out = ellipsize(m, 'A VERY LONG SUPER MOVE NAME', 100);
  assert.ok(out.endsWith('…'));
  assert.ok(m(out) <= 100, `${out} is ${m(out)} wide`);
  assert.ok(out.length > 3);
});

// ── F20: quote wrapping and typing ──────────────────────────────────────────
const m10 = (t: string) => t.length * 10; // every character 10 px wide

test('wrapText: wraps by measured width, keeps all words in order, no line too wide', () => {
  const text = 'I too belong to the middle class so I can understand the pressures of the middle class!';
  const lines = wrapText(m10, text, 200);
  assert.equal(lines.join(' '), text);
  for (const l of lines) assert.ok(m10(l) <= 200, `"${l}" is ${m10(l)} wide`);
  assert.ok(lines.length > 1);
});

test('wrapText: a word wider than the box is broken instead of overflowing', () => {
  const lines = wrapText(m10, 'short ' + 'x'.repeat(45) + ' end', 100);
  for (const l of lines) assert.ok(m10(l) <= 100, `"${l}" is ${m10(l)} wide`);
  assert.equal(lines.join('').replace(/ /g, ''), 'short' + 'x'.repeat(45) + 'end');
});

test('wrapText: empty and whitespace-only text give no lines', () => {
  assert.deepEqual(wrapText(m10, '   ', 100), []);
});

test('revealLines: earlier lines are final while typing, and only the last line is partial', () => {
  const lines = ['aaa bbb', 'ccc ddd', 'eee'];
  let prev: string[] = [];
  for (let n = 0; n <= totalChars(lines) + 2; n++) {
    const now = revealLines(lines, n);
    for (let i = 0; i < prev.length - 1; i++) assert.equal(now[i], prev[i], `line ${i} changed at ${n}`);
    for (let i = 0; i < now.length - 1; i++) assert.equal(now[i], lines[i]);
    prev = now;
  }
  assert.deepEqual(revealLines(lines, 0), []);
  assert.deepEqual(revealLines(lines, totalChars(lines)), lines);
});

test('revealLines: Devanagari conjuncts are never cut in half', () => {
  const word = 'क्षति'; // क + ् + ष + ति
  const g = splitGraphemes(word);
  assert.ok(g.length < Array.from(word).length, 'graphemes are fewer than code points');
  for (let n = 0; n <= g.length; n++) {
    const shown = revealLines([word], n).join('');
    assert.ok(shown === '' || shown === g.slice(0, n).join(''));
    assert.ok(!shown.endsWith('\u094D'), 'never ends on a bare virama');
  }
});

test('the longest quote is fully typed and readable for about a second before the fade', () => {
  const longest = 96; // Rahul's quote, in characters (an upper bound for its grapheme count)
  const typedBy = longest / QUOTE_CHARS_PER_SECOND;
  assert.ok(typedBy < 1.6, `typed by ${typedBy}`);
  assert.ok(CUTSCENE_FADE_AT - typedBy >= 0.9, 'at least ~0.9 s to read it');
  assert.ok(CUTSCENE_END > CUTSCENE_FADE_AT);
});

test('cutsceneSkipTo: a press before the skip window does nothing', () => {
  assert.equal(cutsceneSkipTo(0), 0);
  assert.equal(cutsceneSkipTo(CUTSCENE_SKIP_AFTER - 0.01), CUTSCENE_SKIP_AFTER - 0.01);
});

test('cutsceneSkipTo: after the window it jumps to the start of the fade, never past it', () => {
  assert.equal(cutsceneSkipTo(CUTSCENE_SKIP_AFTER), CUTSCENE_FADE_AT);
  assert.equal(cutsceneSkipTo(1.5), CUTSCENE_FADE_AT);
  assert.ok(cutsceneSkipTo(1.5) < CUTSCENE_END, 'it still fades out instead of cutting');
});

test('cutsceneSkipTo: a scene that is already fading is left alone (no restart of the fade)', () => {
  assert.equal(cutsceneSkipTo(CUTSCENE_FADE_AT + 0.1), CUTSCENE_FADE_AT + 0.1);
  assert.equal(cutsceneSkipTo(CUTSCENE_END), CUTSCENE_END);
});

test('the cutscene HUD strip covers the bars, seats line and clock (all end by y=70)', () => {
  assert.equal(CUTSCENE_HUD_STRIP, 70);
  assert.ok(CUTSCENE_SKIP_AFTER < CUTSCENE_FADE_AT, 'skip window opens before the fade');
});

test('pickRenderScale: an 800 px canvas on a normal screen stays at 1x, and a 2x phone/retina screen gets 2x', () => {
  assert.equal(pickRenderScale(800, 450, 1, 800, 450), 1);
  assert.equal(pickRenderScale(800, 450, 2, 800, 450), 2);
  assert.equal(pickRenderScale(400, 225, 2, 800, 450), 1, 'a small canvas at 2x needs only 1x');
});

test('pickRenderScale: uses the letterboxed picture size, not the element size', () => {
  // 1200 wide but only 300 tall: the picture is 300*16/9 = 533 px wide, so 1x is plenty.
  assert.equal(pickRenderScale(1200, 300, 1, 800, 450), 1);
  // Same element at 2x dpr: 533*2/800 = 1.33 -> rounds up to 1.5.
  assert.equal(pickRenderScale(1200, 300, 2, 800, 450), 1.5);
});

test('pickRenderScale: a desktop canvas shown larger than 800 px is rendered larger (this is the blur fix)', () => {
  assert.equal(pickRenderScale(1280, 720, 1, 800, 450), 2); // 1.6 needed -> 2
  assert.equal(pickRenderScale(960, 540, 1, 800, 450), 1.5); // 1.2 needed -> 1.5
});

test('pickRenderScale: capped, floored and safe on bad input', () => {
  assert.equal(pickRenderScale(2560, 1440, 3, 800, 450), RENDER.maxScale);
  assert.equal(pickRenderScale(100, 56, 1, 800, 450), RENDER.minScale);
  assert.equal(pickRenderScale(0, 0, 2, 800, 450), RENDER.minScale);
  assert.equal(pickRenderScale(NaN, 400, 2, 800, 450), RENDER.minScale);
  assert.equal(pickRenderScale(800, 450, NaN, 800, 450), 1);
  assert.equal(pickRenderScale(800, 450, 0, 800, 450), 1);
});

test('pickRenderScale: tiny rounding noise does not bump the scale (801 px is still 1x), and results are whole backing sizes', () => {
  assert.equal(pickRenderScale(801, 451, 1, 800, 450), 1);
  assert.equal(pickRenderScale(820, 461, 1, 800, 450), 1, '2.5% over is inside the slack');
  assert.equal(pickRenderScale(860, 484, 1, 800, 450), 1.5, '7.5% over is not');
  for (let w = 300; w <= 2600; w += 37) {
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      const s = pickRenderScale(w, w * 0.5625, dpr, 800, 450);
      assert.ok(s >= RENDER.minScale && s <= RENDER.maxScale);
      assert.equal(800 * s, Math.round(800 * s), `800*${s}`);
      assert.equal(450 * s, Math.round(450 * s), `450*${s}`);
    }
  }
});

test('superReadyLabel: P1 shows Q, P2 shows O only in 2-Player, the CPU shows no key', () => {
  assert.equal(superReadyLabel(false, false), '\u2605 SUPER READY [Q]');
  assert.equal(superReadyLabel(false, true), '\u2605 SUPER READY [Q]');
  assert.equal(superReadyLabel(true, true), '\u2605 SUPER READY [O]');
  assert.equal(superReadyLabel(true, false), '\u2605 SUPER READY');
  assert.ok(!superReadyLabel(true, false).includes('['), 'a CPU cannot press anything');
});

test('thoughtBubbleBox: wide enough for the text, never narrower than the minimum', () => {
  const small = thoughtBubbleBox(20, 400, 800);
  assert.equal(small.width, HUD_TEXT.thoughtMinWidth);
  const big = thoughtBubbleBox(120, 400, 800);
  assert.equal(big.width, 120 + HUD_TEXT.thoughtPadX * 2);
  assert.equal(big.left + big.width / 2, 400, 'centred on the fighter when there is room');
});

test('thoughtBubbleBox: stays inside the stage at both walls and the pointer still aims at the fighter', () => {
  const l = thoughtBubbleBox(100, 30, 800);
  assert.equal(l.left, HUD_TEXT.edgeMargin);
  assert.ok(l.pointerX >= l.left + 8 && l.pointerX <= l.left + l.width - 8);
  assert.equal(l.pointerX, 30);
  const r = thoughtBubbleBox(100, 775, 800);
  assert.equal(r.left + r.width, 800 - HUD_TEXT.edgeMargin);
  assert.equal(r.pointerX, 775);
  for (let x = 0; x <= 800; x += 25) {
    const b = thoughtBubbleBox(140, x, 800);
    assert.ok(b.left >= 0 && b.left + b.width <= 800, `x=${x}`);
    assert.ok(b.pointerX >= b.left && b.pointerX <= b.left + b.width, `pointer x=${x}`);
  }
});

test('HUD text sizes are readable (12 px thought bubble, 13 px seats line)', () => {
  assert.ok(HUD_TEXT.thoughtFont >= 12 && HUD_TEXT.seatsFont >= 13);
});


// ---- F24: ghost bar, clock, floating text ----

test('ghost bar: holds after a hit, then drains at 40 HP per second down to the real HP', () => {
  let g = newGhostBar(100);
  g = stepGhostBar(g, 100, 0.016);
  assert.equal(g.value, 100);
  g = stepGhostBar(g, 80, 0.016); // hit for 20: ghost stays at 100 and holds
  assert.equal(g.value, 100);
  assert.ok(g.hold > 0);
  // run out the hold
  let t = 0;
  while (g.hold > 0 && t < 2) { g = stepGhostBar(g, 80, 0.016); t += 0.016; }
  assert.equal(g.value, 100, 'no drain while holding');
  // drain for 0.25 s -> 10 HP
  for (let i = 0; i < 25; i++) g = stepGhostBar(g, 80, 0.01);
  assert.ok(Math.abs(g.value - 90) < 0.5, `drained ~10 HP in 0.25 s, got ${g.value}`);
  for (let i = 0; i < 100; i++) g = stepGhostBar(g, 80, 0.01);
  assert.equal(g.value, 80, 'never drains below the real HP');
});

test('ghost bar: a second hit restarts the hold, and healing snaps the ghost up with the real bar', () => {
  let g = newGhostBar(100);
  g = stepGhostBar(g, 90, 0.016);
  for (let i = 0; i < 40; i++) g = stepGhostBar(g, 90, 0.016); // hold over, draining
  assert.equal(g.hold, 0);
  const mid = g.value;
  g = stepGhostBar(g, 80, 0.016); // another hit
  assert.ok(g.hold > 0, 'hold restarts on a new hit');
  assert.ok(g.value >= mid - 0.001, 'no drain on the hit frame');
  g = stepGhostBar(g, 95, 0.016); // chai: heals above the ghost
  assert.equal(g.value, 95);
  assert.equal(g.hold, 0);
});

test('ghost bar drain is frame-rate independent', () => {
  const run = (dt: number) => {
    let g = stepGhostBar(newGhostBar(100), 60, dt);
    let elapsed = dt;
    while (elapsed < GHOST_BAR.holdSeconds + 0.5 - 1e-9) { g = stepGhostBar(g, 60, dt); elapsed += dt; }
    return g.value;
  };
  const a = run(1 / 30), b = run(1 / 144);
  assert.ok(Math.abs(a - b) < 2, `30 fps ${a} vs 144 fps ${b}`);
});

test('clock: normal above 10 s, red and pulsing in the last 10 s, never urgent at 0', () => {
  assert.equal(clockLook(30).urgent, false);
  assert.equal(clockLook(10.5).urgent, false, 'shows 11');
  assert.equal(clockLook(10).urgent, true, 'shows 10');
  assert.equal(clockLook(10).color, CLOCK.urgentColor);
  assert.equal(clockLook(0).urgent, false);
  assert.equal(clockLook(30).color, CLOCK.normalColor);
  const justTicked = clockLook(4.98); // digit 5 just started
  const later = clockLook(4.3);
  assert.ok(justTicked.scale > later.scale);
  assert.equal(later.scale, 1);
  assert.ok(justTicked.scale <= 1 + CLOCK.pulseScale + 1e-9);
});

test('clock tick: once per second for 10..1 only, higher in the last 3', () => {
  assert.equal(clockTickFreq(12.0, 11.9), null);
  assert.equal(clockTickFreq(10.02, 9.99), CLOCK.tickFreq, 'entering 10 ticks');
  assert.equal(clockTickFreq(10.5, 10.4), null, 'still showing 11');
  assert.equal(clockTickFreq(5.01, 4.99), CLOCK.tickFreq);
  assert.equal(clockTickFreq(3.01, 2.99), CLOCK.finalTickFreq);
  assert.equal(clockTickFreq(1.01, 0.99), CLOCK.finalTickFreq);
  assert.equal(clockTickFreq(0.02, 0), null, 'no tick when the clock hits 0');
  assert.equal(clockTickFreq(5.5, 5.4), null, 'same second');
  // counting a whole countdown gives exactly 10 ticks
  let ticks = 0;
  for (let t = 15; t > 0; t -= 0.016) if (clockTickFreq(t, t - 0.016) !== null) ticks++;
  assert.equal(ticks, 10);
});

test('floating text life grows with length and is capped', () => {
  assert.ok(Math.abs(floatingTextLife(1) - 0.93) < 1e-9);
  assert.ok(floatingTextLife(70) > floatingTextLife(10));
  assert.equal(floatingTextLife(70), FLOAT_TEXT.maxLife);
  assert.equal(floatingTextLife(500), FLOAT_TEXT.maxLife);
  assert.ok(floatingTextLife(70) >= 2, 'a 70-character pickup line stays up about 2 s or more');
});

test('floating text layout: short text stays on one line, long text wraps at 26 characters', () => {
  const m = (l: string) => l.length * 7;
  const short = layoutFloatingText(m, 'MISS', 400, 800);
  assert.deepEqual(short.lines, ['MISS']);
  const text = '\u{1F4AC} "Are you a bill? Because I pass you unanimously!"';
  const long = layoutFloatingText(m, text, 400, 800);
  assert.ok(long.lines.length >= 2);
  for (const l of long.lines) assert.ok(l.length <= FLOAT_TEXT.wrapChars, `"${l}"`);
  assert.equal(long.lines.join(' '), text, 'no words lost');
});

test('floating text layout: the widest line never leaves the stage, at any anchor', () => {
  const m = (l: string) => l.length * 8;
  const text = 'Are you a bill? Because I pass you unanimously, every single time!';
  for (let x = -50; x <= 850; x += 10) {
    const r = layoutFloatingText(m, text, x, 800);
    const widest = Math.max(...r.lines.map(m));
    assert.ok(r.x - widest / 2 >= FLOAT_TEXT.margin - 1e-9, `left edge at anchor ${x}`);
    assert.ok(r.x + widest / 2 <= 800 - FLOAT_TEXT.margin + 1e-9, `right edge at anchor ${x}`);
  }
  // an anchor already in the clear is left alone
  assert.equal(layoutFloatingText(m, 'MISS', 400, 800).x, 400);
  // a line wider than the stage is centred rather than throwing
  assert.equal(layoutFloatingText(() => 5000, 'x', 100, 800).x, 400);
});

// ---------- F25: no emoji in canvas / log strings, projectile text never mirrored ----------

test('logPrefix is plain text and only tags item and super lines', () => {
  assert.equal(logPrefix('me'), '');
  assert.equal(logPrefix('cpu'), '');
  assert.equal(logPrefix('item'), 'ITEM \u00b7 ');
  assert.equal(logPrefix('super'), 'SUPER \u00b7 ');
});

test('no emoji in the strings the canvas, battle log and intro draw', () => {
  const files = ['../App.tsx', './logic.ts', './renderer.ts', './balance.ts', './audio.ts', '../components/IntroLoadingScreen.tsx'];
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\uFE0F]/u;
  const allowed = new Set(['\u2605']); // the star glyph in "SUPER READY" is plain text in every font
  const hits: string[] = [];
  for (const f of files) {
    const text = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    text.split('\n').forEach((line, i) => {
      for (const ch of line) if (emoji.test(ch) && !allowed.has(ch)) hits.push(`${f}:${i + 1} ${ch}`);
    });
  }
  assert.deepEqual(hits, []);
});

type Call = { text: string; sx: number };
/** Minimal 2D context that records the horizontal scale sign in force when text is drawn and when the body is drawn. */
function recordingCtx() {
  const texts: Call[] = [];
  const bodies: number[] = [];
  let sx = 1;
  const stack: number[] = [];
  const target: Record<string, unknown> = {
    save: () => stack.push(sx),
    restore: () => { sx = stack.pop() ?? 1; },
    translate: () => {},
    scale: (x: number) => { sx *= Math.sign(x); },
    fillText: (text: string) => texts.push({ text, sx }),
    fillRect: () => bodies.push(sx),
    measureText: (t: string) => ({ width: t.length * 7 })
  };
  const ctx = new Proxy(target, {
    get: (t, k) => (k in t ? t[k as string] : () => {}),
    set: (t, k, v) => { t[k as string] = v; return true; }
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, bodies };
}

test('projectile labels read left to right whichever way the projectile flies', () => {
  for (const kind of ['train', 'bulldozer', 'gold_coin'] as const) {
    for (const vx of [300, -300]) {
      const { ctx, texts, bodies } = recordingCtx();
      drawProjectile(ctx, { id: 1, kind, x: 400, y: 300, vx, dmg: 1, owner: {} as never, lifetime: 1 });
      assert.equal(texts.length, 1, `${kind} draws exactly one label`);
      assert.equal(texts[0].sx, 1, `${kind} label is mirrored when vx=${vx}`);
      assert.match(texts[0].text, /^[\x20-\x7e]+$/, `${kind} label is plain ASCII`);
      // the body itself still flips with the direction of travel (the coin is round, so it has no rect to check)
      if (kind !== 'gold_coin') assert.equal(bodies[0], vx >= 0 ? 1 : -1, `${kind} body direction for vx=${vx}`);
    }
  }
});

test('a refusal message is skipped while the same one is showing nearby, but not elsewhere or when different', () => {
  const r = REFUSAL_TEXT.duplicateRadius;
  const live = [{ text: 'LINE COOLING DOWN', x: 300 }];
  assert.equal(isDuplicateFloat(live, 'LINE COOLING DOWN', 300, r), true);
  assert.equal(isDuplicateFloat(live, 'LINE COOLING DOWN', 300 + r, r), true); // on the edge still counts
  assert.equal(isDuplicateFloat(live, 'LINE COOLING DOWN', 300 + r + 1, r), false); // the other fighter, far away
  assert.equal(isDuplicateFloat(live, 'NO LINES LEFT', 300, r), false); // different wording
  assert.equal(isDuplicateFloat([], 'LINE COOLING DOWN', 300, r), false);
});

// ---------- F26: arena art layout ----------

test('chamber pillars are symmetric around the stage centre and fully inside the stage', () => {
  const { pillars } = chamberLayout(800);
  assert.equal(pillars.length, ARENA_ART.pillarCount);
  pillars.forEach((c, i) => assert.ok(Math.abs(c + pillars[pillars.length - 1 - i] - 800) < 1e-9, `pillar ${i} mirrors`));
  const reach = ARENA_ART.pillarWidth / 2 + ARENA_ART.capitalOverhang;
  for (const c of pillars) {
    assert.ok(c - reach >= 12, `left edge of pillar at ${c}`);
    assert.ok(c + reach <= 788, `right edge of pillar at ${c}`);
  }
});

test('no pillar sits behind the Chakra mural', () => {
  const { pillars } = chamberLayout(800);
  const reach = ARENA_ART.pillarWidth / 2 + ARENA_ART.capitalOverhang;
  for (const c of pillars) {
    const gap = Math.abs(c - ARENA_ART.chakraX) - reach;
    assert.ok(gap >= ARENA_ART.chakraHalo, `pillar at ${c} is only ${gap}px from the Chakra centre line`);
  }
});

test('every arch meets the pillar shafts on both sides and stays inside the stage', () => {
  const { pillars, arches } = chamberLayout(800);
  assert.equal(arches.length, pillars.length - 1);
  arches.forEach((a, i) => {
    assert.ok(Math.abs(a.cx - a.r - (pillars[i] + ARENA_ART.pillarWidth / 2)) < 1e-9, `arch ${i} left foot`);
    assert.ok(Math.abs(a.cx + a.r - (pillars[i + 1] - ARENA_ART.pillarWidth / 2)) < 1e-9, `arch ${i} right foot`);
    // top of the stroke must not poke above the canvas
    assert.ok(a.springY - a.r - ARENA_ART.archLine / 2 >= 0, `arch ${i} crown at y=${a.springY - a.r}`);
    // and the feet must land on the shaft, below the capital
    assert.ok(a.springY >= ARENA_ART.pillarTop + 8, `arch ${i} springs below the capital`);
  });
});

// ---- F27: game-over screen ----

test('winner portrait: the whole fighter fits with the head margin kept, at the real modal canvas size', () => {
  const l = winnerPortraitLayout(GAME_OVER.portraitW, GAME_OVER.portraitH);
  assert.ok(l.headY >= GAME_OVER.headMargin - 1e-9, `head at y=${l.headY}`);
  assert.ok(l.baselineY <= GAME_OVER.portraitH - GAME_OVER.footMargin + 1e-9);
  assert.equal(l.x, GAME_OVER.portraitW / 2);
  assert.ok(l.scale > 0.5 && l.scale <= GAME_OVER.maxScale);
});

test('winner portrait: the old 1.4 scale put the head above the canvas (the bug), the new layout never does', () => {
  const oldHeadY = (GAME_OVER.portraitH - 6) - GAME_OVER.figureHeight * 1.4;
  assert.ok(oldHeadY < 0, `old head y=${oldHeadY}`);
  for (const [w, h] of [[100, 125], [80, 100], [120, 200], [60, 70]] as const) {
    const l = winnerPortraitLayout(w, h);
    assert.ok(l.headY >= GAME_OVER.headMargin - 1e-9, `${w}x${h} head y=${l.headY}`);
  }
});

test('winner portrait: a roomy canvas is capped at maxScale', () => {
  assert.equal(winnerPortraitLayout(400, 800).scale, GAME_OVER.maxScale);
});

test('confetti: right count, ranges and colour cycling; the same call with the same random source is repeatable', () => {
  const colors = ['#a', '#b', '#c'];
  let n = 0;
  const seq = () => ((n++ * 0.137) % 1);
  const a = makeConfetti(colors, 30, seq);
  assert.equal(a.length, 30);
  a.forEach((p, i) => {
    assert.equal(p.color, colors[i % 3]);
    assert.ok(p.size >= 4 && p.size <= 9);
    assert.ok(p.rotation >= 0 && p.rotation < 360);
    assert.ok(parseFloat(p.left) >= 0 && parseFloat(p.left) <= 100);
  });
  n = 0;
  assert.deepEqual(makeConfetti(colors, 30, seq), a);
});

// ---------- F28: on-screen gamepad ----------
const PAD_AREAS: Array<[number, number]> = [[568, 320], [667, 375], [844, 390], [932, 430], [1024, 768], [1280, 720], [1920, 1080], [390, 844]];
const PAD_VARIANTS = ['split', 'left', 'right'] as const;

test('padLayout: every button meets the 44 px touch minimum on every screen and variant', () => {
  for (const [w, h] of PAD_AREAS) {
    for (const v of PAD_VARIANTS) {
      const l = padLayout(w, h, v);
      assert.ok(l.small >= PAD.minTarget, `small ${l.small} on ${w}x${h} ${v}`);
      assert.ok(l.big >= l.small, `strike never smaller than the others on ${w}x${h} ${v}`);
      assert.ok(l.label >= PAD.minLabel && l.bigLabel >= PAD.minLabel, `label font on ${w}x${h} ${v}`);
    }
  }
});

test('padLayout: phone landscape meets the plan (buttons >= 48, STRIKE >= 56)', () => {
  const l = padLayout(844, 390, 'split');
  assert.ok(l.isPhone);
  assert.ok(l.small >= 48, `small ${l.small}`);
  assert.ok(l.big >= 56, `big ${l.big}`);
});

test('padLayout: only a big single-player screen gets the largest pad', () => {
  assert.equal(padLayout(1280, 720, 'split').isPhone, false);
  assert.equal(padLayout(1280, 720, 'split').stick, PAD.full.stick);
  assert.equal(padLayout(1280, 720, 'left').stick, PAD.compact.stick);
  assert.equal(padLayout(844, 390, 'split').stick, PAD.phone.stick);
});

test('padLayout: a pad that is too small in the constants is still lifted to the minimum', () => {
  // the clamp is what protects the guideline if someone retunes PAD later
  assert.equal(Math.max(PAD.minTarget, 30), PAD.minTarget);
  assert.ok(padLayout(10, 10, 'split').small >= PAD.minTarget);
});

test('VirtualGamepad: has a KICK button, no per-tap beep, and vibrates inside try/catch', () => {
  const src = readFileSync(fileURLToPath(new URL('../components/VirtualGamepad.tsx', import.meta.url)), 'utf8');
  assert.ok(/'kick'/.test(src) && /label="KICK"/.test(src), 'kick action and button exist');
  assert.ok(!/playSound\(/.test(src), 'the extra 380 Hz beep is gone');
  assert.ok(/navigator\.vibrate/.test(src) && /try\s*\{/.test(src), 'haptics are guarded');
  assert.ok(/touchAction:\s*'none'/.test(src), 'touch-action none stays on the controls');
});

test('padLayout: only a narrow 2-Player pad drops its icons and shrinks to 48 px, and it still meets the touch minimum', () => {
  const n = padLayout(667, 375, 'left');
  assert.equal(n.showIcons, false);
  assert.equal(n.small, PAD.narrow.small);
  assert.ok(n.small >= PAD.minTarget);
  assert.equal(padLayout(667, 375, 'split').showIcons, true, 'a single-player pad is one pad, so it keeps its icons');
  assert.equal(padLayout(844, 390, 'left').showIcons, true);
});

test('padLayout: two 4-wide 2-Player pads fit side by side at the narrow threshold and just below it', () => {
  for (const w of [PAD.narrowBelowWidth - 1, PAD.narrowBelowWidth]) {
    const l = padLayout(w, 390, 'left');
    const fourWide = l.small * 3 + l.big + 3 * 6;
    const onePad = 8 + l.stick + 8 + fourWide + 8; // left offset + stick + gap + buttons + right padding
    assert.ok(2 * onePad <= w, `two pads (${2 * onePad}) fit in ${w}`);
  }
});

test('containRect: 16:9 stage in a wide phone box leaves side bars; in a tall box leaves top and bottom bars', () => {
  const wide = containRect(844, 390, 800, 450);
  assert.ok(Math.abs(wide.height - 390) < 1e-9 && wide.top === 0);
  assert.ok(Math.abs(wide.left - (844 - wide.width) / 2) < 1e-9 && wide.left > 70);
  const tall = containRect(400, 600, 800, 450);
  assert.ok(Math.abs(tall.width - 400) < 1e-9 && tall.left === 0 && tall.top > 100);
  assert.deepEqual(containRect(0, 300, 800, 450), { left: 0, top: 0, width: 0, height: 0, scale: 0 });
});

test('phoneHudLayout: short screens put the corner column below the 70-unit HUD strip, evenly spaced', () => {
  for (const [w, h] of [[844, 390], [667, 375], [932, 430], [740, 360]] as const) {
    const l = phoneHudLayout(w, h);
    assert.equal(l.isShort, true);
    const c = containRect(w, h, 800, 450);
    const stripBottom = c.top + (PHONE_HUD.stripStagePx / 450) * c.height;
    assert.ok(l.stackTops[0] >= stripBottom + PHONE_HUD.gap - 1, `${w}x${h}: first button clears the strip`);
    assert.equal(l.stackTops[1] - l.stackTops[0], PHONE_HUD.button + PHONE_HUD.gap);
    assert.equal(l.stackTops[2] - l.stackTops[1], PHONE_HUD.button + PHONE_HUD.gap);
    assert.equal(l.leftTop, l.stackTops[0]);
    assert.equal(l.coachTop, l.stackTops[0]);
    const side = PHONE_HUD.sideMargin + PHONE_HUD.button + PHONE_HUD.gap; // left pill / right column reach
    assert.ok(l.coachMaxWidth <= w - 2 * side + 1e-9, `${w}x${h}: banner stays between the pill and the column`);
    assert.ok(l.coachMaxWidth <= PHONE_HUD.coachMaxWidthFrac * w + 1e-9);
    assert.ok(l.coachMaxWidth >= 430, `${w}x${h}: still wide enough for the longest tip on one line (${l.coachMaxWidth})`);
  }
});

test('phoneHudLayout: tall or large boxes are not "short"; the column never runs off a 360 px screen', () => {
  assert.equal(phoneHudLayout(1280, 720).isShort, false);
  assert.equal(phoneHudLayout(390, 700).isShort, false);
  assert.equal(phoneHudLayout(0, 0).isShort, false);
  const l = phoneHudLayout(740, 360);
  assert.ok(l.stackTops[2] + PHONE_HUD.button <= 360 * 0.7, 'column stays in the upper part of the screen, away from the pads');
});

test('coachMayReplace: a lower-priority tip never replaces a higher one; equal or higher does', () => {
  assert.equal(coachMayReplace(3, 1), false);
  assert.equal(coachMayReplace(3, 3), true);
  assert.equal(coachMayReplace(1, 4), true);
});

// ---------- F30: touch detection ----------

test('touch-primary follows the media query, so a touch laptop is not a phone', () => {
  const ask: string[] = [];
  const mm = (matches: boolean) => (q: string) => { ask.push(q); return { matches }; };
  const laptopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130';
  const phoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
  // a touch-screen laptop: fine pointer, can hover -> query says no
  assert.equal(detectTouchPrimary(mm(false), laptopUA), false);
  // a phone: coarse pointer, no hover -> query says yes, even with a desktop-looking UA
  assert.equal(detectTouchPrimary(mm(true), laptopUA), true);
  assert.deepEqual([...new Set(ask)], [TOUCH_PRIMARY_QUERY]);
  // the query must demand BOTH a coarse pointer and no hover
  assert.match(TOUCH_PRIMARY_QUERY, /pointer: coarse/);
  assert.match(TOUCH_PRIMARY_QUERY, /hover: none/);
  // a phone that says no (e.g. a tablet with a mouse attached) is trusted over its UA
  assert.equal(detectTouchPrimary(mm(false), phoneUA), false);
});

test('touch-primary falls back to the user agent only when matchMedia is missing or throws', () => {
  assert.equal(detectTouchPrimary(undefined, 'Mozilla/5.0 (Linux; Android 14; Pixel 8)'), true);
  assert.equal(detectTouchPrimary(undefined, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
  const boom = () => { throw new Error('nope'); };
  assert.equal(detectTouchPrimary(boom as never, 'Mozilla/5.0 (iPad; CPU OS 17_0)'), true);
  assert.equal(detectTouchPrimary(boom as never, 'Mozilla/5.0 (X11; Linux x86_64)'), false);
});

test('OrientationLockPrompt is gone and nothing imports it', () => {
  const dir = fileURLToPath(new URL('../components/', import.meta.url));
  assert.equal(existsSync(dir + 'OrientationLockPrompt.tsx'), false);
  for (const f of ['../App.tsx', '../components/IndiaMapSelect.tsx', '../hooks/useDeviceLayout.ts']) {
    const text = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    assert.ok(!text.includes('OrientationLockPrompt'), f);
  }
});

// ---------- F31: map pins ----------

const mapPins = (h: number) => {
  const w = (h * 500) / 580;
  const raw = Object.entries(LEADER_LOC).map(([id, l]) => {
    const [x, y] = proj(l.ll[0], l.ll[1]);
    return { id, x: (x / 500) * w, y: (y / 580) * h };
  });
  return { w, h, raw };
};
const minPair = (a: { x: number; y: number }[]) => {
  let m = Infinity;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) m = Math.min(m, Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y));
  return m;
};

test('real pins overlap on a small map, and spreading separates them at every map size', () => {
  const small = mapPins(170);
  assert.ok(minPair(small.raw) < 12, 'the north cluster really is that tight');
  for (const h of [170, 187, 230, 330, 460]) {
    const { w, raw } = mapPins(h);
    const out = spreadPins(raw, w, h);
    assert.ok(minPair(out) >= MAP_PINS.minGap - 0.5, `h=${h} pins at least ${MAP_PINS.minGap}px apart`);
    out.forEach((p, i) => {
      assert.ok(Math.hypot(p.x - raw[i].x, p.y - raw[i].y) <= 20, `h=${h} ${p.id} stays within 20px of its real city`);
      assert.ok(p.x >= MAP_PINS.margin - 0.01 && p.x <= w - MAP_PINS.margin + 0.01 && p.y >= MAP_PINS.margin - 0.01 && p.y <= h - MAP_PINS.margin + 0.01, `h=${h} ${p.id} inside the map`);
    });
  }
});

test('spreadPins is deterministic, keeps ids and order, leaves far-apart pins alone, and splits identical pins', () => {
  const far = [{ id: 'a', x: 20, y: 20 }, { id: 'b', x: 120, y: 90 }];
  assert.deepEqual(spreadPins(far, 200, 150), far);
  const same = [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 100, y: 100 }, { id: 'c', x: 100, y: 100 }];
  const one = spreadPins(same, 300, 300);
  const two = spreadPins(same, 300, 300);
  assert.deepEqual(one, two);
  assert.deepEqual(one.map(p => p.id), ['a', 'b', 'c']);
  assert.ok(minPair(one) >= MAP_PINS.minGap - 0.5);
  // the input is not modified
  assert.equal(same[0].x, 100);
});

test('after spreading, tapping a pin\'s own dot picks that pin at every map size (before: it did not)', () => {
  for (const h of [170, 230, 460]) {
    const { w, raw } = mapPins(h);
    const out = spreadPins(raw, w, h);
    for (const p of out) assert.equal(nearestPin(out, p.x, p.y), p.id, `h=${h} ${p.id}`);
    // a finger 9px off the dot still lands on the right pin once pins are 26px apart
    for (const p of out) assert.equal(nearestPin(out, p.x + 9, p.y), p.id, `h=${h} ${p.id} +9px`);
  }
  // the old layout: tapping Modi's exact dot on the smallest map is fine, but 8px of finger error picks Yogi
  const { raw } = mapPins(170);
  const modi = raw.find(p => p.id === 'modi')!;
  const yogi = raw.find(p => p.id === 'yogi')!;
  const towardYogi = { x: modi.x + (yogi.x - modi.x) * 0.9, y: modi.y + (yogi.y - modi.y) * 0.9 };
  assert.equal(nearestPin(raw, towardYogi.x, towardYogi.y), 'yogi');
});

test('nearestPin: nothing within range gives null, closest wins, ties go to the earlier pin', () => {
  const pins = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 40, y: 0 }];
  assert.equal(nearestPin(pins, 200, 200), null);
  assert.equal(nearestPin(pins, 12, 0), 'a');
  assert.equal(nearestPin(pins, 29, 0), 'b');
  assert.equal(nearestPin(pins, 20, 0), 'a'); // exact tie
  assert.equal(nearestPin(pins, 0, 28), 'a'); // on the edge counts
  assert.equal(nearestPin(pins, 0, 28.5), null);
  assert.equal(nearestPin([], 0, 0), null);
});

test('a name label drawn over another pin\'s dot never steals that dot\'s tap, but still selects its own pin', () => {
  // Modi-like pin with a long label to the right that runs across a second pin's dot
  const modi = { id: 'modi', x: 50, y: 50, ex: 50 + labelReach('Narendra', 'r'), ey: 50 };
  const mamata = { id: 'mamata', x: 50 + 40, y: 50 };
  const pins = [modi, mamata];
  assert.equal(nearestPin(pins, mamata.x, mamata.y), 'mamata', 'dot beats a label drawn over it');
  assert.equal(nearestPin(pins, mamata.x - 10, mamata.y), 'mamata', 'a tap beside the dot is still the dot');
  assert.equal(nearestPin(pins, 50 + 24, 50 + 6), 'modi', 'the label text itself selects Modi');
  assert.equal(nearestPin(pins, 50, 50), 'modi');
  // far end of a long label is still reachable, and a label on the left reaches left
  assert.equal(nearestPin([modi], modi.ex - 2, 50), 'modi');
  assert.ok(labelReach('Amit', 'l') < 0 && labelReach('Amit', 'r') > 0);
  assert.ok(labelReach('Narendra', 'r') > labelReach('Amit', 'r'));
});

test('name labels flip to the other side instead of running off the map', () => {
  const lw = Math.abs(labelReach('Narendra', 'r'));
  assert.equal(pickLabelSide('r', 20, lw, 400), 'r', 'fits: keep the preferred side');
  assert.equal(pickLabelSide('l', 380, lw, 400), 'l', 'fits: keep the preferred side');
  assert.equal(pickLabelSide('l', 30, lw, 400), 'r', 'no room on the left: flip');
  assert.equal(pickLabelSide('r', 390, lw, 400), 'l', 'no room on the right: flip');
  // fits neither side (tiny map): the side with more room wins
  assert.equal(pickLabelSide('r', 70, lw, 130), 'l');
  assert.equal(pickLabelSide('l', 60, lw, 130), 'r');
});

test('narrow maps label only the selected pin; wide maps label them all', () => {
  assert.equal(pinLabelVisible(true, 147), true);
  assert.equal(pinLabelVisible(false, 147), false);
  assert.equal(pinLabelVisible(false, MAP_PINS.labelsAllMinWidth - 1), false);
  assert.equal(pinLabelVisible(false, MAP_PINS.labelsAllMinWidth), true);
  assert.equal(pinLabelVisible(false, 397), true);
});

test('a label avoids sitting on top of another pin\'s dot when the other side is free', () => {
  const lw = Math.abs(labelReach('Narendra', 'r'));
  const x = 150;
  const dotRight = [{ x: x + 40, y: 50 }]; // a neighbour 40px to the right, on the label row
  assert.equal(pickLabelSide('r', x, lw, 400, 2, 50, dotRight), 'l', 'preferred side is blocked, the left is free');
  assert.equal(pickLabelSide('r', x, lw, 400, 2, 50, []), 'r', 'no neighbour: keep the preferred side');
  // a neighbour well below the label row does not block it
  assert.equal(pickLabelSide('r', x, lw, 400, 2, 50, [{ x: x + 40, y: 90 }]), 'r');
  // both sides blocked: keep a side that fits the map rather than flipping for nothing
  assert.equal(pickLabelSide('r', x, lw, 400, 2, 50, [{ x: x + 40, y: 50 }, { x: x - 40, y: 50 }]), 'r');
  // the blocked side is off the map too: the only side that fits wins
  assert.equal(pickLabelSide('l', 30, lw, 400, 2, 50, [{ x: 70, y: 50 }]), 'r');
});

test('map names are left out on a map narrower than MAP_TEXT.hideBelow', () => {
  assert.equal(mapTextVisible(null), true, 'before the first measure the map shows its names');
  assert.equal(mapTextVisible(500), true);
  assert.equal(mapTextVisible(MAP_TEXT.hideBelow), true, 'exactly the limit still shows them');
  assert.equal(mapTextVisible(MAP_TEXT.hideBelow - 1), false);
  assert.equal(mapTextVisible(161), false, 'phone-landscape map');
});

test('map text constants and compact labels stay readable', () => {
  assert.ok(MAP_TEXT.regionAlpha >= 0.5, 'state names were 28% white; they need to read on the green land');
  assert.ok(MAP_TEXT.regionAlpha <= 0.8, 'but stay behind the pins');
  const labels = Object.values(MAP_COMPACT.buttonLabels);
  assert.ok(labels.every(l => l.length <= 10), 'short enough that the buttons share one row');
  assert.equal(new Set(labels).size, labels.length, 'no two compact labels are identical');
});

test('index.css defines the xs breakpoint that the map subtitle and intro caption use', () => {
  const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
  assert.match(css, /@theme\s*\{[^}]*--breakpoint-xs:\s*30rem/);
});

test('stepRoster moves one leader at a time and wraps at both ends', () => {
  const ids = POLITICIANS.map(p => p.id);
  assert.equal(stepRoster(ids, ids[0], 1), ids[1]);
  assert.equal(stepRoster(ids, ids[1], -1), ids[0]);
  assert.equal(stepRoster(ids, ids[ids.length - 1], 1), ids[0], 'right from the last wraps to the first');
  assert.equal(stepRoster(ids, ids[0], -1), ids[ids.length - 1], 'left from the first wraps to the last');
  assert.equal(stepRoster(ids, 'nobody', 1), ids[0]);
  assert.equal(stepRoster(ids, 'nobody', -1), ids[ids.length - 1]);
  assert.equal(stepRoster([], 'x', 1), 'x');
  // nine presses right visit all nine leaders and come back
  let cur = ids[0]; const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) { seen.add(cur); cur = stepRoster(ids, cur, 1); }
  assert.equal(seen.size, ids.length);
  assert.equal(cur, ids[0]);
});

test('rosterScrollLeft only scrolls when the chip is not fully in view', () => {
  const pad = ROSTER.scrollPad;
  assert.equal(rosterScrollLeft(300, 0, 100, 60, pad), 0, 'already in view');
  assert.equal(rosterScrollLeft(300, 0, 400, 60, pad), 400 + 60 + pad - 300, 'off the right edge');
  assert.equal(rosterScrollLeft(300, 500, 200, 60, pad), 200 - pad, 'off the left edge');
  assert.equal(rosterScrollLeft(300, 50, 0, 60, pad), 0, 'never below 0');
  // after scrolling, the chip really is inside the view with the padding
  const sl = rosterScrollLeft(300, 0, 700, 80, pad);
  assert.ok(700 - pad >= sl && 700 + 80 + pad <= sl + 300, 'chip sits inside the view with the padding');
});

test('roster chips are 44 px touch targets and the strip and arrow keys are wired in', () => {
  assert.ok(ROSTER.chipHeight >= 44);
  assert.ok(ROSTER.startLabel.length <= 16, 'the short start label has to fit beside the strip');
  const map = readFileSync(fileURLToPath(new URL('../components/IndiaMapSelect.tsx', import.meta.url)), 'utf8');
  assert.match(map, /data-roster=/);
  assert.match(map, /role="radiogroup"/);
  assert.match(map, /ROSTER\.chipHeight/);
  const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
  assert.match(app, /stepRoster\(/);
  assert.match(app, /ArrowLeft/);
});


// ---- F34: versus card and opponent choice ----
const VS_IDS = ['modi', 'shah', 'yogi', 'rahul', 'kharge', 'mamata', 'kejriwal', 'sitharaman', 'rajnath'];

test('pickOpponent never returns the player\'s own fighter and can reach every other one', () => {
  for (const me of VS_IDS) {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const id = pickOpponent(VS_IDS, me, () => i / 400);
      assert.notEqual(id, me);
      seen.add(id);
    }
    assert.equal(seen.size, VS_IDS.length - 1);
  }
  // edge values of rand stay inside the pool
  assert.notEqual(pickOpponent(VS_IDS, 'modi', () => 0), 'modi');
  assert.notEqual(pickOpponent(VS_IDS, 'modi', () => 0.999999), 'modi');
});

test('rerollOpponent differs from both the player and the current opponent', () => {
  for (let i = 0; i < 200; i++) {
    const id = rerollOpponent(VS_IDS, 'modi', 'shah', () => i / 200);
    assert.notEqual(id, 'modi');
    assert.notEqual(id, 'shah');
  }
  // only two fighters: nothing else to show, falls back to the one other fighter
  assert.equal(rerollOpponent(['a', 'b'], 'a', 'b', () => 0.5), 'b');
});

test('vsMaySkip ignores the opening press, key repeat, and early taps', () => {
  assert.equal(vsMaySkip(0, false, VS.inputGraceSeconds), false);
  assert.equal(vsMaySkip(VS.inputGraceSeconds * 1000 - 1, false, VS.inputGraceSeconds), false);
  assert.equal(vsMaySkip(VS.inputGraceSeconds * 1000, false, VS.inputGraceSeconds), true);
  assert.equal(vsMaySkip(5000, true, VS.inputGraceSeconds), false);
});

test('the old "three places down the roster" opponent rule is gone from App', () => {
  const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
  assert.doesNotMatch(app, /indexOf\(selectedPolitician\) \+ 3\)/);
  assert.match(app, /pickOpponent\(/);
  assert.match(app, /rerollOpponent\(/);
  assert.ok(VS.autoStartSeconds > 0 && VS.chipHeight >= 44);
});


// ---- F35: one voice at a time ----
test('voiceFadeVolume fades linearly from 1 to 0 and never leaves that range', () => {
  assert.equal(voiceFadeVolume(0, 300), 1);
  assert.ok(Math.abs(voiceFadeVolume(150, 300) - 0.5) < 1e-9);
  assert.equal(voiceFadeVolume(300, 300), 0);
  assert.equal(voiceFadeVolume(900, 300), 0);
  assert.equal(voiceFadeVolume(-50, 300), 1);
  assert.equal(voiceFadeVolume(10, 0), 0);
});

test('useFallbackHook: only for the current clip, and never for an AbortError', () => {
  assert.equal(useFallbackHook('NotAllowedError', true), true);
  assert.equal(useFallbackHook('NotSupportedError', true), true);
  assert.equal(useFallbackHook('AbortError', true), false);
  assert.equal(useFallbackHook('NotAllowedError', false), false);
});

// Shared fakes for the audio behaviour tests (the audio module keeps one AudioContext for its whole life,
// so every test must use the same fake context class and read its state through FAKE).
const FAKE = {
  oscillators: 0,
  ctxState: 'running' as string,
  rejectWith: null as string | null,
  made: [] as FakeEl[],
  sources: [] as unknown[],
  gains: [] as { value: number }[],
  oscs: [] as { type: string; frequency: { sets: number[] }; gainNode?: { gain: { sets: number[] } } }[],
  limiters: [] as { threshold: { value: number }; ratio: { value: number } }[],
  resumes: 0,
  suspends: 0
};
class FakeEl {
  src: string; paused = true; ended = false; currentTime = 0; volume = 1; preload = ''; loop = false;
  readyState = 0; networkState = 1; loads = 0;
  handlers: Record<string, (() => void)[]> = {};
  constructor(src: string) { this.src = src; FAKE.made.push(this); }
  addEventListener(n: string, f: () => void) { (this.handlers[n] ||= []).push(f); }
  removeEventListener(n: string, f: () => void) { this.handlers[n] = (this.handlers[n] || []).filter(h => h !== f); }
  load() { this.loads++; }
  dispatch(n: string) { (this.handlers[n] || []).forEach(f => f()); }
  play() { this.paused = false; return FAKE.rejectWith ? Promise.reject(Object.assign(new Error('x'), { name: FAKE.rejectWith })) : Promise.resolve(); }
  pause() { this.paused = true; }
}
const param = () => {
  const p = { value: 0, sets: [] as number[], setValueAtTime(v: number) { p.sets.push(v); }, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
  return p;
};
class FakeCtx {
  currentTime = 0; destination = {};
  get state() { return FAKE.ctxState; }
  createOscillator() {
    FAKE.oscillators++;
    const o: { type: string; frequency: ReturnType<typeof param>; gainNode?: { gain: ReturnType<typeof param> }; connect(t: unknown): unknown; start(): void; stop(): void } = {
      type: '', frequency: param(),
      connect(t: unknown) { o.gainNode = t as { gain: ReturnType<typeof param> }; return t; },
      start() {}, stop() {}
    };
    FAKE.oscs.push(o);
    return o;
  }
  createGain() { const g = { gain: param(), connect(t: unknown) { return t; } }; FAKE.gains.push(g.gain); return g; }
  createDynamicsCompressor() { const c = { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {} }; FAKE.limiters.push(c); return c; }
  createMediaElementSource(el: unknown) {
    if (FAKE.sources.includes(el)) throw new Error('InvalidStateError: element already connected');
    FAKE.sources.push(el); return { connect() {} };
  }
  resume() { FAKE.resumes++; } suspend() { FAKE.suspends++; }
}
function installFakeAudio() {
  const g = globalThis as Record<string, unknown>;
  g.window = { AudioContext: FakeCtx };
  g.Audio = FakeEl;
  FAKE.rejectWith = null; FAKE.ctxState = 'running';
  return () => { delete g.window; delete g.Audio; };
}

test('voice playback: one clip at a time, hook only when the clip cannot start', async () => {
  const made = FAKE.made;
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    audio.setVoiceEnabled(true);
    const tick = () => new Promise(r => setTimeout(r, 5));
    const playing = () => made.filter(a => !a.paused).length;
    const start = made.length;

    // 1. a working clip plays alone, with no synth hook on top
    FAKE.oscillators = 0;
    audio.playRealPoliticianVoice('modi'); await tick();
    assert.equal(playing(), 1);
    assert.equal(FAKE.oscillators, 0, 'the synth hook must not play over a working clip');

    // 2. a second clip stops the first (four quick pin taps used to give four voices)
    audio.playRealPoliticianVoice('shah'); audio.playRealPoliticianVoice('yogi'); audio.playRealPoliticianVoice('rahul'); await tick();
    assert.equal(playing(), 1);
    assert.match(made.filter(a => !a.paused)[0].src, /rahul/);
    assert.equal(made.length - start, 4);

    // 3. a blocked clip falls back to the hook exactly once
    FAKE.rejectWith = 'NotAllowedError';
    FAKE.oscillators = 0;
    audio.playRealPoliticianVoice('modi'); await tick();
    const oneHook = FAKE.oscillators;
    assert.ok(oneHook > 0, 'blocked autoplay must fall back to the synth hook');

    // 4. stopping a clip whose play() is still pending (AbortError) stays silent
    FAKE.rejectWith = 'AbortError';
    FAKE.oscillators = 0;
    audio.playRealPoliticianVoice('shah'); await tick();
    assert.equal(FAKE.oscillators, 0);

    // 5. a rejection that arrives after a newer voice started does not fire an old hook
    FAKE.rejectWith = 'NotAllowedError';
    FAKE.oscillators = 0;
    audio.playRealPoliticianVoice('modi'); audio.playRealPoliticianVoice('modi'); await tick();
    assert.equal(FAKE.oscillators, oneHook, 'one hook for one voice, not one per tap');

    // 6. stop calls
    FAKE.rejectWith = null;
    audio.playRealPoliticianVoice('yogi'); await tick();
    audio.stopVoice(0);
    assert.equal(playing(), 0);
    audio.playRealPoliticianVoice('yogi'); await tick();
    audio.stopVoice(0.1); await new Promise(r => setTimeout(r, 40));
    const mid = made.find(a => !a.paused);
    assert.ok(!mid || mid.volume < 1, 'volume must be dropping during the fade');
    await new Promise(r => setTimeout(r, 160));
    assert.equal(playing(), 0, 'the fade ends in silence');
    assert.ok(made.every(a => a.volume === 1 && a.currentTime === 0), 'stopped clips are rewound and reset');
    audio.playRealPoliticianVoice('rajnath'); await tick();
    audio.stopAllVoices();
    assert.equal(playing(), 0);

    // 7. voice off means no clip at all
    audio.setVoiceEnabled(false);
    const before = made.length;
    assert.equal(audio.playRealPoliticianVoice('modi'), false);
    assert.equal(made.length, before);
    audio.setVoiceEnabled(true);
  } finally {
    uninstall();
  }
});

test('voice clean-up: dead pitch/rate data is gone and the cutscene end fades the voice', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  assert.doesNotMatch(read('./logic.ts'), /voicePitch|voiceRate/);
  assert.doesNotMatch(read('./types.ts'), /voicePitch|voiceRate/);
  assert.doesNotMatch(read('../components/IndiaMapSelect.tsx'), /voicePitch|voiceRate/);
  assert.match(read('../App.tsx'), /stopVoice\(VOICE\.cutsceneFadeSeconds\)/);
  assert.ok(VOICE.cutsceneFadeSeconds > 0);
});


// ---- F36: voice loudness ----
test('every fighter has a measured loudness, and the gains bring all clips to the same level', () => {
  for (const p of POLITICIANS) assert.equal(typeof VOICE_LUFS[p.id], 'number', `no loudness measured for ${p.id}`);
  for (const p of POLITICIANS) {
    const after = VOICE_LUFS[p.id] + 20 * Math.log10(voiceGainFor(p.id));
    assert.ok(Math.abs(after - VOICE.targetLufs) < 1e-9, `${p.id} lands at ${after} LUFS`);
  }
  // the old spread was 19 dB; the loudest clip is turned down by more than 10 dB and the quietest up by a few
  assert.ok(voiceGainFor('yogi') < 0.25);
  assert.ok(voiceGainFor('mamata') > 1.5 && voiceGainFor('mamata') < 3);
  assert.equal(voiceGainFor('not-a-fighter'), 1);
});

test('duckedMusicVolume dips only while a voice plays', () => {
  assert.equal(duckedMusicVolume(0.55, false), 0.55);
  assert.ok(Math.abs(duckedMusicVolume(0.55, true) - 0.55 * VOICE.musicDuck) < 1e-9);
  assert.ok(VOICE.musicDuck > 0 && VOICE.musicDuck < 1);
});

test('voice graph: gain per clip, one limiter, each element wired once, native fallback, music ducking', async () => {
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    audio.setVoiceEnabled(true);
    audio.stopAllVoices();
    const tick = (ms = 5) => new Promise(r => setTimeout(r, ms));
    const el = (id: string) => FAKE.made.find(a => a.src.includes(`/${id}.mp3`))!;

    // routed through the graph: element volume stays 1, the gain node carries the correction
    const gainsBefore = FAKE.gains.length;
    audio.playRealPoliticianVoice('mamata'); await tick();
    assert.equal(el('mamata').volume, 1);
    assert.ok(FAKE.sources.includes(el('mamata')), 'the clip must go through the graph');
    assert.ok(FAKE.gains.some(g => Math.abs(g.value - voiceGainFor('mamata')) < 1e-9));
    assert.ok(FAKE.gains.length >= gainsBefore);

    // one shared limiter with the configured settings
    assert.equal(FAKE.limiters.length, 1);
    assert.equal(FAKE.limiters[0].threshold.value, VOICE.limiter.threshold);
    assert.equal(FAKE.limiters[0].ratio.value, VOICE.limiter.ratio);
    audio.playRealPoliticianVoice('yogi'); await tick();
    assert.equal(FAKE.limiters.length, 1, 'all clips share one limiter');
    assert.ok(FAKE.gains.some(g => Math.abs(g.value - voiceGainFor('yogi')) < 1e-9), 'yogi gain applied (its node may already exist from an earlier play)');

    // replaying a clip must not wire its element a second time (that throws in a real browser)
    const wired = FAKE.sources.length;
    for (let i = 0; i < 3; i++) { audio.playRealPoliticianVoice('mamata'); await tick(); }
    assert.equal(FAKE.sources.length, wired);
    assert.equal(playingCount(), 1);

    // context not running (browser has not allowed sound yet): a clip not yet in the graph plays natively, lowered but never boosted
    audio.stopAllVoices();
    FAKE.ctxState = 'suspended';
    audio.playRealPoliticianVoice('sitharaman'); await tick();
    assert.ok(!FAKE.sources.includes(el('sitharaman')), 'a suspended context must not swallow a clip that is not wired yet');
    assert.ok(Math.abs(el('sitharaman').volume - voiceGainFor('sitharaman')) < 1e-9);
    audio.stopAllVoices();
    audio.playRealPoliticianVoice('kejriwal'); await tick();
    assert.equal(el('kejriwal').volume, 1, 'native playback cannot boost, so a quiet clip stays at full element volume');
    // ...but a clip that is already in the graph stays in it, with its gain updated (no double attenuation)
    audio.stopAllVoices();
    audio.playRealPoliticianVoice('mamata'); await tick();
    assert.equal(el('mamata').volume, 1);
    // once sound is allowed, a clip that had played natively joins the graph
    FAKE.ctxState = 'running';
    audio.stopAllVoices();
    audio.playRealPoliticianVoice('kejriwal'); await tick();
    assert.ok(FAKE.sources.includes(el('kejriwal')));
    assert.equal(el('kejriwal').volume, 1);

    // music ducking
    audio.stopAllVoices();
    audio.startBattleMusic();
    const music = FAKE.made.find(a => a.src.includes('ram-hi'))!;
    const base = music.volume;
    assert.ok(base > 0.3);
    audio.playRealPoliticianVoice('rahul'); await tick(260);
    assert.ok(Math.abs(music.volume - base * VOICE.musicDuck) < 0.01, `music at ${music.volume}`);
    el('rahul').dispatch('ended'); await tick(260);
    assert.ok(Math.abs(music.volume - base) < 0.01, 'music returns when the clip ends on its own');
    audio.playRealPoliticianVoice('shah'); await tick(260);
    assert.ok(music.volume < base * 0.5);
    audio.stopAllVoices(); await tick(260);
    assert.ok(Math.abs(music.volume - base) < 0.01, 'music returns when voices are cut');
    audio.stopBattleMusic();

    // a clip that never starts must not leave the music dipped
    audio.startBattleMusic();
    FAKE.rejectWith = 'NotAllowedError';
    audio.playRealPoliticianVoice('kharge'); await tick(260);
    assert.ok(Math.abs(music.volume - base) < 0.01, 'blocked clip: music stays up');
    FAKE.rejectWith = null;
    audio.stopAllVoices();
  } finally {
    uninstall();
  }
  function playingCount() { return FAKE.made.filter(a => !a.paused && !a.src.includes('ram-hi')).length; }
});


// ---- F37: music volume control and low notes ----
test('effectiveMusicVolume: mute wins, the slider value is clamped, bad input is silent', () => {
  assert.equal(effectiveMusicVolume(0.55, false), 0.55);
  assert.equal(effectiveMusicVolume(0.55, true), 0);
  assert.equal(effectiveMusicVolume(2, false), 1);
  assert.equal(effectiveMusicVolume(-1, false), 0);
  assert.equal(effectiveMusicVolume(Number.NaN, false), 0);
  assert.equal(AUDIO_UI.defaultMusicVolume, 0.55, 'the default is the volume the game always used');
});

test('lowNoteCopy: a note with a low end gets a quieter octave-up copy, higher notes get none', () => {
  const { belowHz, gainMult, minFreq } = AUDIO_UI.lowNote;
  const c = lowNoteCopy(55, 25, belowHz, gainMult, minFreq)!;            // the bulldozer rumble (55 to 80 Hz)
  assert.deepEqual([c.freq, c.endFreq, c.gainMult], [110, 160, gainMult]);
  assert.ok(c.gainMult < 1, 'the copy is quieter than the note');
  assert.ok(lowNoteCopy(160, -60, belowHz, gainMult, minFreq), 'a note that sweeps down into the low range counts');
  assert.ok(lowNoteCopy(130, -20, belowHz, gainMult, minFreq));
  assert.equal(lowNoteCopy(120, 0, belowHz, gainMult, minFreq), null, 'exactly the threshold is not low');
  assert.equal(lowNoteCopy(440, -60, belowHz, gainMult, minFreq), null);
  assert.equal(lowNoteCopy(150, 30, belowHz, gainMult, minFreq), null);
  const floor = lowNoteCopy(30, -60, belowHz, gainMult, minFreq)!;       // the sweep end is clamped to minFreq
  assert.deepEqual([floor.freq, floor.endFreq], [60, minFreq * 2]);
});

test('low synth notes play a quiet octave-up copy; the music volume follows the slider and mute', async () => {
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    FAKE.oscs.length = 0;
    audio.playSound(55, 0.8, 'sawtooth', 0.16, 25);
    assert.equal(FAKE.oscs.length, 2, 'a low note plays two oscillators');
    assert.equal(FAKE.oscs[0].frequency.sets[0], 55);
    assert.equal(FAKE.oscs[1].frequency.sets[0], 110, 'the copy is one octave up');
    const g0 = FAKE.oscs[0].gainNode!.gain.sets[0];
    const g1 = FAKE.oscs[1].gainNode!.gain.sets[0];
    assert.ok(Math.abs(g1 - g0 * AUDIO_UI.lowNote.gainMult) < 1e-9, `copy gain ${g1} vs note gain ${g0}`);
    assert.equal(FAKE.oscs[0].type, FAKE.oscs[1].type);

    FAKE.oscs.length = 0;
    audio.playSound(440, 0.2, 'triangle', 0.1);
    assert.equal(FAKE.oscs.length, 1, 'a high note is unchanged');

    // music volume: set before the music exists, applied when it starts, and kept while a voice ducks it
    audio.stopAllVoices();
    audio.setBattleMusicVolume(0.3);
    audio.startBattleMusic();
    const music = FAKE.made.filter(a => a.src.includes('ram-hi')).pop()!;
    assert.ok(Math.abs(music.volume - 0.3) < 1e-9, `music at ${music.volume}`);
    audio.setBattleMusicVolume(effectiveMusicVolume(0.3, true));
    assert.equal(music.volume, 0, 'muted');
    audio.setBattleMusicVolume(effectiveMusicVolume(0.3, false));
    assert.ok(Math.abs(music.volume - 0.3) < 1e-9, 'unmuting restores the slider value');
    audio.stopBattleMusic();
    audio.setBattleMusicVolume(AUDIO_UI.defaultMusicVolume);
  } finally {
    uninstall();
  }
});

test('switching voice clips off cuts the clip that is playing', async () => {
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    audio.stopAllVoices();
    audio.setVoiceEnabled(true);
    audio.playRealPoliticianVoice('rahul');
    const el = FAKE.made.filter(a => a.src.includes('/rahul.mp3')).pop()!;
    await new Promise(r => setTimeout(r, 20));
    assert.equal(el.paused, false);
    audio.setVoiceEnabled(false);
    assert.equal(el.paused, true, 'turning the toggle off stops the voice at once');
    assert.equal(audio.playRealPoliticianVoice('shah'), false, 'and no new voice starts while it is off');
    audio.setVoiceEnabled(true);
  } finally {
    uninstall();
  }
});

test('App: music slider and mute exist, and the voice toggle is called "Voice clips"', () => {
  const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
  assert.match(app, /setBattleMusicVolume\(/);
  assert.match(app, /aria-label="Music volume"/);
  assert.match(app, /Mute music/);
  assert.match(app, /Voice clips:/);
  assert.doesNotMatch(app, /AI Voice/);
  // arrows on the focused slider must reach the slider, not the game
  assert.match(app, /type === 'range' && e\.code\.startsWith\('Arrow'\)\) return;/);
});


// ---- F38: the intro's real loader and tap-to-enter ----
test('preloadFraction is weighted by size, and an empty list is finished', () => {
  assert.equal(preloadFraction([]), 1);
  assert.equal(preloadFraction([{ weight: 100, done: false }, { weight: 300, done: false }]), 0);
  assert.equal(preloadFraction([{ weight: 100, done: true }, { weight: 300, done: false }]), 0.25);
  assert.equal(preloadFraction([{ weight: 100, done: false }, { weight: 300, done: true }]), 0.75);
  assert.equal(preloadFraction([{ weight: 100, done: true }, { weight: 300, done: true }]), 1);
  assert.equal(preloadFraction([{ weight: 0, done: false }]), 1, 'zero total weight counts as finished');
});

test('introSeats: the counter follows the story but never runs ahead of loading', () => {
  assert.equal(introSeats(15, 0), 0);
  assert.equal(introSeats(15, 1), 15, 'fully loaded: the story decides');
  assert.equal(introSeats(250, 0.5), 136, 'half loaded: capped at half of 272');
  assert.equal(introSeats(272, 1), 272);
  assert.equal(introSeats(272, 2), 272, 'a fraction above 1 is clamped');
  assert.equal(introSeats(100, -1), 0);
});

test('introReady needs the story, the loading and the minimum time', () => {
  assert.equal(introReady(true, true, true), true);
  assert.equal(introReady(false, true, true), false);
  assert.equal(introReady(true, false, true), false);
  assert.equal(introReady(true, true, false), false);
});

test('introKeyAction: skip keys always skip, others enter only when ready, modifiers and Tab never', () => {
  for (const k of ['Space', 'Enter', 'Escape']) {
    assert.equal(introKeyAction(k, false, false), 'skip');
    assert.equal(introKeyAction(k, false, true), 'skip');
    assert.equal(introKeyAction(k, true, true), 'ignore', 'a held key does not repeat the skip');
  }
  assert.equal(introKeyAction('KeyA', false, false), 'ignore', 'not ready yet');
  assert.equal(introKeyAction('KeyA', false, true), 'enter');
  assert.equal(introKeyAction('KeyA', true, true), 'ignore', 'auto-repeat never enters');
  for (const k of ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'AltRight', 'MetaLeft', 'Tab', 'CapsLock']) {
    assert.equal(introKeyAction(k, false, true), 'ignore', k);
  }
  assert.equal(introKeyAction('ArrowRight', false, true), 'enter');
});

class FakeImg {
  onload: (() => void) | null = null; onerror: (() => void) | null = null; complete = false; _src = '';
  set src(v: string) { this._src = v; FAKE_IMGS.push(this); }
  get src() { return this._src; }
}
const FAKE_IMGS: FakeImg[] = [];

test('startPreload: loads the real elements once, reports weighted progress, and finishes on load, error or timeout', async () => {
  const uninstall = installFakeAudio();
  const g = globalThis as Record<string, unknown>;
  const realTimeout = globalThis.setTimeout;
  const timers: { fn: () => void; ms: number; live: boolean }[] = [];
  g.Image = FakeImg;
  FAKE_IMGS.length = 0;
  (globalThis as { setTimeout: unknown }).setTimeout = (fn: () => void, ms?: number) => {
    // only the preload's long timeouts are captured; short ones (test ticks) run for real
    if ((ms ?? 0) >= 1000) { const t = { fn, ms: ms ?? 0, live: true }; timers.push(t); return t as unknown as ReturnType<typeof setTimeout>; }
    return realTimeout(fn, ms);
  };
  (globalThis as { clearTimeout: unknown }).clearTimeout = (t: { live?: boolean }) => { if (t && typeof t === 'object') t.live = false; };
  try {
    const audio = await import('./audio');
    const { startPreload } = await import('./preload');
    const { PRELOAD } = await import('./balance');
    const progress: number[] = [];
    let done = 0;
    const handle = startPreload(f => progress.push(f), () => done++);

    // both pictures are requested; the music and voices are the audio module's own elements
    const all = [...new Set(FAKE.made)]; // earlier tests' elements are reused by the audio module, so use every element
    assert.equal(FAKE_IMGS.length, 2, 'both background pictures are requested');
    assert.match(FAKE_IMGS.map(i => i.src).join(' '), /loading-bg\.jpg.*menu-bg\.jpg|menu-bg\.jpg.*loading-bg\.jpg/);
    assert.equal(done, 0);
    assert.equal(progress.length, 0, 'nothing is reported during the call itself');

    // the game later plays a voice through the SAME element, so nothing is downloaded twice
    const count = FAKE.made.length;
    audio.setVoiceEnabled(true);
    audio.playRealPoliticianVoice('modi');
    assert.equal(FAKE.made.length, count, 'playing a preloaded voice must not create a second element');
    audio.stopAllVoices();

    // finishing the music (the biggest file) moves the weighted progress by its share
    const totalBytes = PRELOAD.music.bytes + Object.values(PRELOAD.voices).reduce((a, b) => a + b, 0) + Object.values(PRELOAD.images).reduce((a, b) => a + b, 0);
    const music = FAKE.made.find(a => a.src.includes('ram-hi'))!;
    music.dispatch('canplaythrough');
    assert.ok(Math.abs(progress[progress.length - 1] - PRELOAD.music.bytes / totalBytes) < 1e-9);

    // an error counts as done; a voice finishing again is not counted twice
    const modi = FAKE.made.find(a => a.src.includes('/modi.mp3'))!;
    modi.dispatch('error'); modi.dispatch('canplaythrough');
    assert.ok(Math.abs(progress[progress.length - 1] - (PRELOAD.music.bytes + PRELOAD.voices.modi) / totalBytes) < 1e-9);

    // the other voices and both pictures
    for (const el of all) { el.dispatch('canplaythrough'); }
    assert.equal(done, 0, 'pictures are still loading');
    FAKE_IMGS[0].onload!();
    assert.equal(done, 0);
    // the last picture never loads: its timeout finishes it
    const imgTimer = timers.filter(t => t.live && t.ms === PRELOAD.imageTimeoutMs).pop()!; // the second picture's (the first already loaded)
    assert.ok(imgTimer, 'a picture has its own timeout');
    imgTimer.fn();
    assert.equal(done, 1, 'finished exactly once');
    assert.equal(progress[progress.length - 1], 1);
    FAKE_IMGS[1].onload!();
    assert.equal(done, 1, 'a late load changes nothing');
    handle.cancel();
  } finally {
    (globalThis as { setTimeout: unknown }).setTimeout = realTimeout;
    (globalThis as { clearTimeout: unknown }).clearTimeout = clearTimeout;
    delete g.Image;
    uninstall();
  }
});

test('startPreload: a clip that is already playable counts as done, and a hung clip times out', async () => {
  const uninstall = installFakeAudio();
  const g = globalThis as Record<string, unknown>;
  g.Image = class { onload: (() => void) | null = null; onerror: (() => void) | null = null; complete = true; set src(_v: string) {} };
  try {
    const { startPreload } = await import('./preload');
    const { PRELOAD } = await import('./balance');
    // The audio module keeps its elements for good, so earlier tests' elements are reused here; mark them all playable.
    for (const el of FAKE.made) el.readyState = 4;
    const progress: number[] = [];
    let done = 0;
    const h = startPreload(f => progress.push(f), () => done++);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(done, 1, 'everything already playable: done without waiting for any event');
    assert.equal(progress[progress.length - 1], 1);
    assert.ok(PRELOAD.audioTimeoutMs >= 1000 && PRELOAD.imageTimeoutMs >= PRELOAD.audioTimeoutMs);
    h.cancel();
  } finally {
    delete g.Image;
    uninstall();
  }
});

test('unlockAudio wakes a sleeping audio context; audioIsRunning never creates one', async () => {
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    FAKE.ctxState = 'suspended';
    const resumes = FAKE.resumes;
    assert.equal(audio.audioIsRunning(), false, 'suspended means not running');
    assert.equal(FAKE.resumes, resumes, 'asking whether audio runs must not try to wake it');
    audio.unlockAudio();
    assert.ok(FAKE.resumes > resumes, 'unlockAudio resumes the context');
    FAKE.ctxState = 'running';
    assert.equal(audio.audioIsRunning(), true);
  } finally {
    uninstall();
  }
});

test('Intro: real loader, tap-to-enter, no side effects in a state updater, compact phone layout', () => {
  const intro = readFileSync(fileURLToPath(new URL('../components/IntroLoadingScreen.tsx', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
  assert.match(intro, /startPreload\(/);
  assert.match(intro, /unlockAudio\(\)/);
  assert.match(intro, /enterPromptText\(/);
  assert.match(intro, /introKeyAction\(/);
  assert.doesNotMatch(intro, /setInterval\(/, 'the story timer must not be a fixed interval that ends the intro');
  assert.doesNotMatch(intro, /setSeats/, 'seats come from introSeats()');
  assert.match(intro, /audioIsRunning\(\)/, 'story beeps are skipped while the audio context sleeps');
  assert.match(css, /@media \(max-height: 640px\)[\s\S]*\.intro-emblem/);
  assert.doesNotMatch(intro, /setTimeout\(\(\) => \{\s*completeIntro\(\);/, 'the intro no longer enters by itself');
});


test('shouldPublishDecision: silent when nothing shows it, immediate on a new action, otherwise on a timer', () => {
  const base = { best: 'Strike', prevBest: 'Strike', nowMs: 1000, lastPublishMs: 900, refreshMs: DECISION_UI.refreshMs };
  assert.equal(shouldPublishDecision({ ...base, visible: false, best: 'Block' }), false, 'hidden: never');
  assert.equal(shouldPublishDecision({ ...base, visible: false, prevBest: null }), false, 'hidden even on the first decision');
  assert.equal(shouldPublishDecision({ ...base, visible: true, best: 'Block' }), true, 'visible and changed: at once');
  assert.equal(shouldPublishDecision({ ...base, visible: true, prevBest: null }), true, 'visible and nothing published yet');
  assert.equal(shouldPublishDecision({ ...base, visible: true }), false, 'same action, 100 ms since the last publish');
  assert.equal(shouldPublishDecision({ ...base, visible: true, nowMs: 900 + DECISION_UI.refreshMs }), true, 'same action, refresh time reached');
});

test('roundRect fallback: normalises radii, scales oversize radii, and installs only when missing', () => {
  assert.deepEqual(normalizeRadii(4), [4, 4, 4, 4]);
  assert.deepEqual(normalizeRadii([1, 2]), [1, 2, 1, 2]);
  assert.deepEqual(normalizeRadii([1, 2, 3]), [1, 2, 3, 2]);
  assert.deepEqual(normalizeRadii([1, 2, 3, 4]), [1, 2, 3, 4]);
  assert.deepEqual(normalizeRadii({ x: 5, y: 9 }), [5, 5, 5, 5]);
  assert.deepEqual(normalizeRadii(undefined), [0, 0, 0, 0]);
  const calls: Array<[string, ...number[]]> = [];
  const ctx = {
    moveTo: (...a: number[]) => calls.push(['moveTo', ...a]),
    lineTo: (...a: number[]) => calls.push(['lineTo', ...a]),
    arcTo: (...a: number[]) => calls.push(['arcTo', ...a]),
    closePath: () => calls.push(['closePath'])
  };
  roundRectPath(ctx, 10, 20, 100, 50, 8);
  assert.deepEqual(calls[0], ['moveTo', 18, 20]);
  assert.equal(calls.filter(c => c[0] === 'arcTo').length, 4);
  assert.equal(calls[calls.length - 1][0], 'closePath');
  // radius 100 on a 40x20 box is scaled so it still fits (no arc reaches past the middle of the short side)
  calls.length = 0;
  roundRectPath(ctx, 0, 0, 40, 20, 100);
  const arcs = calls.filter(c => c[0] === 'arcTo');
  assert.ok(arcs.every(a => a[5] <= 10 + 1e-9), 'radius scaled down to half the short side');
  // negative size draws the same rectangle from the other corner
  calls.length = 0;
  roundRectPath(ctx, 110, 70, -100, -50, 8);
  assert.deepEqual(calls[0], ['moveTo', 18, 20]);
  // install: only when the browser lacks it
  const bare: { roundRect?: unknown } = {};
  assert.equal(installRoundRectFallback(bare), true);
  assert.equal(typeof bare.roundRect, 'function');
  const native = () => 'native';
  const modern: { roundRect?: unknown } = { roundRect: native };
  assert.equal(installRoundRectFallback(modern), false);
  assert.equal(modern.roundRect, native, 'a native roundRect is never replaced');
});

test('F39 wiring: App publishes decisions through the throttle and reads Rule Coach through a ref', () => {
  const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
  const main = readFileSync(fileURLToPath(new URL('../main.tsx', import.meta.url)), 'utf8');
  assert.match(app, /shouldPublishDecision\(/);
  assert.match(app, /isCoachOnRef\.current/);
  assert.match(app, /const updateCoach = useCallback\([\s\S]*?\}, \[\]\);/, 'updateCoach has no dependencies, so toggling Rule Coach cannot rebuild the game loop');
  assert.match(main, /installRoundRectFallback\(\)/);
});

// ---- F40: one controls table ----

test('Controls: every action has a key for both players, and no key belongs to two actions', () => {
  const seen = new Map<string, string>();
  for (const slot of ['p1', 'p2'] as const) {
    for (const action of Object.keys(CONTROLS[slot]) as (keyof typeof CONTROLS.p1)[]) {
      assert.ok(CONTROLS[slot][action].length >= 1, `${slot}.${action} has a key`);
      for (const code of codesFor(slot, action)) {
        assert.equal(seen.get(code), undefined, `${code} is bound twice (${seen.get(code)} and ${slot}.${action})`);
        seen.set(code, `${slot}.${action}`);
      }
    }
  }
  // The plan's key set.
  assert.deepEqual(codesFor('p1', 'strike'), ['KeyJ', 'Space']);
  assert.deepEqual(codesFor('p1', 'kick'), ['KeyU', 'KeyI']);
  assert.deepEqual(codesFor('p1', 'super'), ['KeyQ', 'KeyL']);
  assert.deepEqual(codesFor('p2', 'kick'), ['Slash']);
  assert.deepEqual(codesFor('p2', 'line'), ['Period']);
  assert.deepEqual(codesFor('p2', 'super'), ['KeyO']);
  assert.equal(allCodes('p2').length, 9);
});

test('Controls: isActive reads the shared key state, per player', () => {
  assert.equal(isActive('p1', 'strike', { Space: true }), true);
  assert.equal(isActive('p1', 'strike', { KeyJ: true }), true);
  assert.equal(isActive('p1', 'strike', { Enter: true }), false, 'Enter is Player 2\'s strike');
  assert.equal(isActive('p2', 'kick', { Slash: true }), true);
  assert.equal(isActive('p2', 'line', { Period: true }), true);
  assert.equal(isActive('p2', 'line', { KeyF: true }), false);
  assert.equal(isActive('p1', 'left', { KeyA: false }), false);
});

test('Controls: labels match the real keys and the pause rule', () => {
  assert.deepEqual(labelsFor('p1', 'strike'), ['J', 'Space']);
  assert.equal(bracketLabels('p1', 'super'), '[Q] / [L]');
  assert.equal(bracketLabels('p2', 'block'), '[\u2193]');
  assert.equal(primaryLabel('p2', 'super'), 'O');
  assert.equal(superReadyLabel(false, false), '\u2605 SUPER READY [Q]');
  assert.equal(superReadyLabel(true, true), '\u2605 SUPER READY [O]');
  assert.equal(superReadyLabel(true, false), '\u2605 SUPER READY');
  assert.equal(PAUSE_CODES.always, 'Escape');
  assert.equal(PAUSE_CODES.singlePlayerOnly, 'KeyP');
  const p2 = controlsSummary('p2');
  for (const needle of ['Enter Strike', '/ Kick', 'P Special', 'O Super', '. Pickup Line']) assert.ok(p2.includes(needle), `${needle} in "${p2}"`);
  const p1 = controlsSummary('p1');
  for (const needle of ['J/Space Strike', 'U/I Kick', 'K Special', 'Q/L Super', 'F Pickup Line']) assert.ok(p1.includes(needle), `${needle} in "${p1}"`);
});

test('Controls: the browser keys the game swallows while fighting', () => {
  assert.equal(swallowedInMatch('Space', false), true);
  assert.equal(swallowedInMatch('ArrowUp', false), true);
  assert.equal(swallowedInMatch('Slash', false), false, '"/" is only taken in 2-Player');
  assert.equal(swallowedInMatch('Slash', true), true, '"/" opens quick find in Firefox otherwise');
  assert.equal(swallowedInMatch('KeyJ', true), false);
  assert.equal(swallowedInMatch('Tab', true), false);
});

test('Controls: touch phones are told to tap, desktops may press a key', () => {
  assert.equal(enterPromptText(true), 'Tap to enter');
  assert.doesNotMatch(enterPromptText(true), /key/i);
  assert.match(enterPromptText(false), /press any key/i);
});

test('Controls: App, rulebook and README read the table instead of printing their own keys', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const app = read('../App.tsx');
  const rules = read('../components/RulebookModal.tsx');
  const readme = read('../../README.md');
  assert.doesNotMatch(app, /(keyboardStateRef|justPressedRef)\.current\.(Key[A-Z]|Arrow|Enter|Space)/, 'no hard-coded key codes in the dispatch');
  assert.match(app, /isActive\('p2', 'kick'/);
  assert.match(app, /isActive\('p2', 'line'/);
  assert.match(app, /controlsSummary\('p2'\)/);
  assert.match(app, /swallowedInMatch\(/);
  assert.match(rules, /bracketLabels\(/);
  assert.doesNotMatch(rules, /\[J\]|\[Space\]|\[K\]|\[Q\]|\[L\]|\[F\]/, 'rulebook keys come from the table');
  assert.doesNotMatch(readme, /Numpad/i, 'the README no longer claims Numpad keys');
  assert.match(readme, /<kbd>\/<\/kbd>/);
  assert.match(readme, /<kbd>\.<\/kbd>/);
});

// ---- F41: rulebook generated from the data ----

test('Rulebook roster: one row per fighter with the real move names', () => {
  const rows = rulebookRoster(POLITICIANS);
  assert.equal(rows.length, POLITICIANS.length);
  assert.equal(rows.length, 9);
  for (const p of POLITICIANS) {
    const r = rows.find(x => x.id === p.id)!;
    assert.ok(r, `${p.id} listed`);
    assert.equal(r.special, p.specialName);
    assert.equal(r.superMove, p.superName);
    assert.equal(r.name, p.name);
  }
  // The three the old text forgot.
  for (const id of ['rahul', 'rajnath', 'sitharaman']) assert.ok(rows.some(r => r.id === id), `${id} present`);
  // A newly added fighter shows up without touching the rulebook.
  const extra = { ...POLITICIANS[0], id: 'newcomer', name: 'New Leader', specialName: 'S', superName: 'U' };
  assert.equal(rulebookRoster([...POLITICIANS, extra]).at(-1)!.name, 'New Leader');
});

test('Rulebook facts: numbers come from the game constants', () => {
  const f = rulebookFacts();
  assert.equal(f.punch, STRIKE_DAMAGE.punch);
  assert.equal(f.kick, STRIKE_DAMAGE.kick);
  assert.equal(f.dropkick, STRIKE_DAMAGE.dropkick);
  assert.equal(f.blockChipPercent, Math.round(BDM_F41 * 100));
  assert.equal(f.blockChipPercent, 35);
  assert.equal(f.lineSeats, PL_F41.seats);
  assert.equal(f.lineCooldown, PL_F41.cooldown);
  assert.equal(f.lineMax, PL_F41.maxUses);
});

test('Rulebook: no stale claims, new rules present, App uses the shared strike damage', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const rules = read('../components/RulebookModal.tsx');
  const app = read('../App.tsx');
  assert.doesNotMatch(rules, /cancel knockback/i, 'blocked hits do slide you back');
  assert.doesNotMatch(rules, /by 75%/, 'block no longer cuts 75%');
  assert.doesNotMatch(rules, /Modi's Mitron Shockwave, Amit Shah/, 'the hand-written 6-fighter list is gone');
  assert.match(rules, /rulebookRoster\(POLITICIANS\)/);
  assert.match(rules, /rulebookFacts\(\)/);
  assert.match(rules, /Rule 7: Controls & Pause/);
  assert.match(rules, /Leap over/, 'jump dodge rule');
  assert.match(rules, /dropkick/i);
  assert.match(rules, /controlsSummary\('p2'\)/);
  assert.match(app, /STRIKE_DAMAGE\.kick/);
  assert.doesNotMatch(app, /attackType === 'kick' \? 9 :/);
});

// ---- F42: modal accessibility ----

test('focusTrapTarget: Tab wraps inside a dialog and never leaves it', () => {
  assert.equal(focusTrapTarget(4, 3, false), 0, 'Tab on the last control wraps to the first');
  assert.equal(focusTrapTarget(4, 0, true), 3, 'Shift+Tab on the first control wraps to the last');
  assert.equal(focusTrapTarget(4, 1, false), null, 'in the middle the browser moves focus itself');
  assert.equal(focusTrapTarget(4, 2, true), null);
  assert.equal(focusTrapTarget(4, -1, false), 0, 'focus outside is pulled in at the start');
  assert.equal(focusTrapTarget(4, -1, true), 3, 'or at the end for Shift+Tab');
  assert.equal(focusTrapTarget(0, -1, false), 'container', 'nothing focusable: keep focus on the dialog');
  assert.equal(focusTrapTarget(1, 0, false), 0, 'a single control keeps focus on itself');
  assert.equal(focusTrapTarget(1, 0, true), 0);
});

test('Modal accessibility: every dialog is labelled and uses the shared hook, one h1 on the page', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const rules = read('../components/RulebookModal.tsx');
  const insp = read('../components/AIDecisionInspector.tsx');
  const over = read('../components/GameOverModal.tsx');
  const vs = read('../components/VersusCard.tsx');
  const map = read('../components/IndiaMapSelect.tsx');
  const app = read('../App.tsx');
  const hook = read('../hooks/useModalA11y.ts');
  for (const [name, src, id] of [['rulebook', rules, 'rulebook-title'], ['inspector', insp, 'inspector-title'], ['game over', over, 'gameover-title']] as const) {
    assert.match(src, /role="dialog"/, `${name} has role=dialog`);
    assert.match(src, /aria-modal="true"/, `${name} is modal`);
    assert.match(src, new RegExp(`aria-labelledby="${id}"`), `${name} is labelled`);
    assert.match(src, new RegExp(`id="${id}"`), `${name} title has its id`);
    assert.match(src, /useModalA11y\(/, `${name} uses the hook`);
  }
  assert.match(rules, /aria-label="Close rulebook"/);
  assert.match(rules, /onClose \}\)|onClose\b/);
  assert.match(vs, /aria-modal="true"/);
  assert.match(app, /useModalA11y\(drawerRef/);
  assert.match(app, /aria-label="Minimize sidebar/);
  // exactly one h1 in the whole UI: the visually hidden page title
  const all = [rules, insp, over, vs, map, app].join('\n');
  assert.equal((all.match(/<h1\b/g) || []).length, 1);
  assert.match(app, /<h1 className="sr-only">Battle of 272 Parliament<\/h1>/);
  // game over is not dismissible with Esc (both exits are real choices)
  assert.match(over, /useModalA11y\(dialogRef, \{ active: !!ending \}\)/);
  // the hook: trap, return focus, capture-phase Esc that stops the game's own pause, stable across re-renders
  assert.match(hook, /addEventListener\('keydown', onKey, true\)/);
  assert.match(hook, /stopPropagation\(\)/);
  assert.match(hook, /closeRef/);
  assert.match(hook, /previous\.focus/);
  assert.match(rules, /PAUSE_LABELS\./, 'Rule 7 reads the pause labels');
});

// ---- F43: reduced motion, softer flicker, zoom, text size ----

test('invincibleAlpha: smooth fade between min and max, never a hard 10 Hz flip; steady when reduced', () => {
  const samples: number[] = [];
  for (let t = 0; t < 1; t += 0.005) samples.push(invincibleAlpha(t, false));
  assert.ok(Math.min(...samples) >= INVINCIBLE_LOOK.minAlpha - 1e-9);
  assert.ok(Math.max(...samples) <= INVINCIBLE_LOOK.maxAlpha + 1e-9);
  assert.ok(Math.min(...samples) < 0.62 && Math.max(...samples) > 0.98, 'uses the full range');
  // smooth: neighbouring 5 ms samples never jump by more than the slope allows (the old flip jumped 0.4 at once)
  for (let i = 1; i < samples.length; i++) assert.ok(Math.abs(samples[i] - samples[i - 1]) < 0.1);
  for (let t = 0; t < 2; t += 0.07) assert.equal(invincibleAlpha(t, true), INVINCIBLE_LOOK.reducedAlpha);
  assert.ok(Number.isFinite(invincibleAlpha(-3.3, false)), 'negative time is safe');
});

test('appliedShake and portraitSlideOffset: reduced motion removes the movement, normal play is unchanged', () => {
  assert.equal(appliedShake(12, true), 0);
  assert.equal(appliedShake(12, false), 12);
  assert.equal(portraitSlideOffset(0, false), -420);
  assert.equal(portraitSlideOffset(0.35, false), 0);
  assert.equal(portraitSlideOffset(2, false), 0);
  assert.equal(portraitSlideOffset(0, true), 0);
  assert.equal(portraitSlideOffset(0.1, true), 0);
  assert.ok(Object.is(portraitSlideOffset(1, false), 0), 'no negative zero at the end of the slide');
});

test('ghost bar and clock under reduced motion: no sliding drain, no size pulse; normal behaviour unchanged', () => {
  let g = stepGhostBar(newGhostBar(100), 60, 0.01, true);
  assert.equal(g.value, 100, 'holds right after the hit');
  g = stepGhostBar(g, 60, 0.35, true); // the hold runs out on this step...
  g = stepGhostBar(g, 60, 0.016, true); // ...and on the next one the chunk is gone at once
  assert.equal(g.value, 60, 'disappears after the hold instead of draining');
  let n = stepGhostBar(newGhostBar(100), 60, 0.01);
  n = stepGhostBar(n, 60, 0.35);
  n = stepGhostBar(n, 60, 0.016);
  assert.ok(n.value > 60 && n.value < 100, 'normal play still drains gradually');
  const fresh = clockLook(9.95);
  assert.ok(fresh.scale > 1);
  const calm = clockLook(9.95, true);
  assert.equal(calm.scale, 1);
  assert.equal(calm.urgent, true);
  assert.equal(calm.color, fresh.color);
});

test('F43 source guards: zoom allowed, no UI text under the minimum, every CSS animation covered by reduced motion', () => {
  const root = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
  const html = root('../../index.html');
  assert.doesNotMatch(html, /user-scalable\s*=\s*no/);
  assert.doesNotMatch(html, /maximum-scale/);
  for (const f of ['../App.tsx', '../components/IndiaMapSelect.tsx', '../components/IntroLoadingScreen.tsx', '../components/VirtualGamepad.tsx',
    '../components/RulebookModal.tsx', '../components/AIDecisionInspector.tsx', '../components/GameOverModal.tsx', '../components/VersusCard.tsx']) {
    const text = root(f);
    for (const m of text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
      assert.ok(Number(m[1]) >= MIN_TEXT_PX, `${f}: ${m[0]} is under ${MIN_TEXT_PX}px`);
    }
  }
  const css = root('../index.css');
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(block.length > 40, 'reduced-motion block exists');
  // every class in index.css that starts an animation (apart from the versus timer bar) is switched off in the block
  const classes = [...css.matchAll(/(\.[a-z-]+)\s*\{[^}]*animation:/g)].map(m => m[1]).filter(c => c !== '.reduced');
  assert.ok(classes.length >= 10);
  for (const c of classes) assert.ok(block.includes(c), `${c} is covered by reduced motion`);
  for (const c of ['.animate-pulse', '.animate-ping', '.animate-bounce']) assert.ok(block.includes(c), `${c} (Tailwind) is covered`);
  assert.match(block, /confetti-particle/);
  // canvas side is wired
  const app = root('../App.tsx');
  assert.match(app, /prefersReducedMotion\(\)/);
  assert.match(root('../game/renderer.ts'), /portraitSlideOffset\(elapsed, prefersReducedMotion\(\)\)/);
});

// ---- F44: saved settings ----

const IDS = POLITICIANS.map(p => p.id);

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; }
  };
}

test('F44 parseStoredSettings keeps valid fields and drops invalid ones one by one', () => {
  const ok = parseStoredSettings(JSON.stringify({
    voiceOn: false, coachOn: true, gamepad: true, twoPlayer: true, sidebarOpen: false,
    musicVolume: 0.3, musicMuted: true, fighterId: IDS[4]
  }), IDS);
  assert.deepEqual(ok, {
    voiceOn: false, coachOn: true, gamepad: true, twoPlayer: true, sidebarOpen: false,
    musicVolume: 0.3, musicMuted: true, fighterId: IDS[4]
  });
  const bad = parseStoredSettings(JSON.stringify({
    voiceOn: 'yes', coachOn: 1, gamepad: null, twoPlayer: false,
    musicVolume: 7, musicMuted: 'no', fighterId: 'nobody', sidebarOpen: true, extra: 5
  }), IDS);
  assert.deepEqual(bad, { twoPlayer: false, sidebarOpen: true });
  for (const v of [-0.01, 1.01, NaN, Infinity, '0.5']) {
    assert.equal(parseStoredSettings(JSON.stringify({ musicVolume: v }), IDS).musicVolume, undefined, String(v));
  }
  assert.equal(parseStoredSettings(JSON.stringify({ musicVolume: 0 }), IDS).musicVolume, 0);
  assert.equal(parseStoredSettings(JSON.stringify({ musicVolume: 1 }), IDS).musicVolume, 1);
});

test('F44 parseStoredSettings never throws on corrupt or odd input', () => {
  for (const raw of [null, undefined, '', '{', 'not json', '[]', '5', 'null', '"x"', '{"voiceOn":']) {
    assert.deepEqual(parseStoredSettings(raw as string | null | undefined, IDS), {}, String(raw));
  }
});

test('F44 mergeStoredSettings keeps other fields, overwrites the changed one, and recovers from corrupt data', () => {
  const a = mergeStoredSettings(null, { voiceOn: false });
  assert.deepEqual(JSON.parse(a), { voiceOn: false });
  const b = mergeStoredSettings(a, { musicVolume: 0.2 });
  assert.deepEqual(JSON.parse(b), { voiceOn: false, musicVolume: 0.2 });
  const c = mergeStoredSettings(b, { voiceOn: true });
  assert.deepEqual(JSON.parse(c), { voiceOn: true, musicVolume: 0.2 });
  assert.deepEqual(JSON.parse(mergeStoredSettings('garbage', { coachOn: false })), { coachOn: false });
  assert.deepEqual(JSON.parse(mergeStoredSettings('[1,2]', { coachOn: false })), { coachOn: false });
});

test('F44 save then load round-trips through storage, and unrelated keys are left alone', () => {
  const st = fakeStorage({ somethingElse: 'keep' });
  assert.equal(saveSettings({ fighterId: IDS[2] }, st), true);
  assert.equal(saveSettings({ twoPlayer: true }, st), true);
  assert.deepEqual(loadSettings(IDS, st), { fighterId: IDS[2], twoPlayer: true });
  assert.equal(st.data.somethingElse, 'keep');
  assert.ok(SETTINGS.storageKey in st.data);
  // a fighter that no longer exists is ignored on load
  saveSettings({ fighterId: 'retired-fighter' }, st);
  assert.equal(loadSettings(IDS, st).fighterId, undefined);
});

test('F44 storage that is missing or throws never breaks load or save (private mode, quota, blocked access)', () => {
  const throwing: StorageLike = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); }
  };
  assert.deepEqual(loadSettings(IDS, throwing), {});
  assert.equal(saveSettings({ voiceOn: false }, throwing), false);
  assert.deepEqual(loadSettings(IDS, null), {});
  assert.equal(saveSettings({ voiceOn: false }, null), false);
  // setItem-only failure (quota) with a readable store
  const full: StorageLike = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(saveSettings({ voiceOn: false }, full), false);
  // no window in Node: the default storage is null rather than a crash
  assert.equal(getDefaultStorage(), null);
  // window.localStorage itself throwing (some browsers do this when storage is blocked)
  const g = globalThis as unknown as { window?: unknown };
  const had = 'window' in g;
  const prev = g.window;
  g.window = { get localStorage() { throw new Error('SecurityError'); } };
  try {
    assert.equal(getDefaultStorage(), null);
  } finally {
    if (had) g.window = prev; else delete g.window;
  }
});

test('F44 source guards: every setting is loaded into state and saved through the hook, and the voice flag reaches the engine', () => {
  const root = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
  const app = root('../App.tsx');
  for (const k of ['voiceOn', 'coachOn', 'gamepad', 'twoPlayer', 'fighterId', 'sidebarOpen', 'musicVolume', 'musicMuted']) {
    assert.match(app, new RegExp(`usePersistedSetting\\('${k}'`), `${k} is saved`);
    assert.match(app, new RegExp(`saved\\.${k}`), `${k} is loaded`);
  }
  // the pad keeps following the device until the player toggles it
  assert.match(app, /saved\.gamepad \?\? readTouchPrimary\(\)/);
  // a saved "voice off" must reach the audio engine, not only the label
  assert.match(app, /useEffect\(\(\) => \{\s*setVoiceEnabled\(isVoiceOn\);\s*\}, \[isVoiceOn\]\)/);
  // every saved value must be declared before the hook call that reads it (a later declaration crashes at runtime)
  const firstSave = app.indexOf("usePersistedSetting('voiceOn'");
  for (const decl of ['const [isVoiceOn,', 'const [isCoachOn,', 'const [isGamepadVisible,', 'const [is2PlayerMode,', 'const [selectedPolitician,',
    'const [isDesktopSidebarOpen,', 'const [musicVolume,', 'const [isMusicMuted,']) {
    const at = app.indexOf(decl);
    assert.ok(at > -1 && at < firstSave, `${decl} is declared before the save calls`);
  }
  const hook = root('../hooks/usePersistedSetting.ts');
  assert.match(hook, /Object\.is\(last\.current, value\)/);
});


// ---- F45: inspector ----
test('evWord and formatEv read the sign from the number, never assume it', () => {
  assert.equal(evWord(30), 'positive');
  assert.equal(evWord(-12), 'negative');
  assert.equal(evWord(0), 'neutral');
  assert.equal(evWord(0.4), 'neutral'); // rounds to 0
  assert.equal(evWord(-0.4), 'neutral');
  assert.equal(formatEv(7.6), '+8');
  assert.equal(formatEv(-5), '-5');
  assert.equal(formatEv(0), '0');
  assert.equal(formatEv(-0.2), '0'); // never "-0"
});

test('the counterfactual explanation states the real sign of the score', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const ai = createCombatant(POLITICIANS[1], 300, true);
  ai.meter = 100;
  const decision = calculateAIUtilities(ai, p1, []);
  const neg = getCounterfactualExplanation('Strike', -20, decision);
  assert.match(neg, /score was negative \(-20\)/);
  assert.doesNotMatch(neg, /\+-/);
  const pos = getCounterfactualExplanation('Approach', 15, decision);
  assert.match(pos, /score was positive \(\+15\)/);
  const unknown = getCounterfactualExplanation('Mystery', -3, decision);
  assert.doesNotMatch(unknown, /\+-/);
  assert.match(unknown, /negative/);
});

test('inspectDisabledReason: 2-Player and no decision give a reason, otherwise null', () => {
  assert.match(inspectDisabledReason(true, true) ?? '', /2-Player/);
  assert.match(inspectDisabledReason(true, false) ?? '', /2-Player/);
  assert.match(inspectDisabledReason(false, false) ?? '', /Waiting/);
  assert.equal(inspectDisabledReason(false, true), null);
});

test('inspector Speak: a held game still lets that one clip play, and the context sleeps again after it', async () => {
  const uninstall = installFakeAudio();
  try {
    const audio = await import('./audio');
    audio.setVoiceEnabled(true);
    const tick = () => new Promise(r => setTimeout(r, 5));
    audio.stopAllVoices();
    audio.resumeAllAudio();
    audio.playRealPoliticianVoice('modi'); await tick(); // make sure the context exists
    audio.stopAllVoices();

    audio.pauseAllAudio();
    // ordinary playback is still refused while held (F14) ...
    assert.equal(audio.playRealPoliticianVoice('yogi'), false);
    // ... but the inspector's preview plays
    const resumesBefore = FAKE.resumes;
    assert.equal(audio.playRealPoliticianVoice('yogi', { whilePaused: true }), true); await tick();
    const el = FAKE.made.filter(a => a.src.includes('yogi')).pop()!;
    assert.equal(el.paused, false);
    assert.ok(FAKE.resumes > resumesBefore, 'the synth context must wake for the clip');
    // when the clip ends the context goes back to sleep
    const suspendsBefore = FAKE.suspends;
    el.paused = true; el.ended = true; el.dispatch('ended');
    assert.ok(FAKE.suspends > suspendsBefore, 'the context must be held again after the preview');
    // an id-less Speak (the old bug) plays nothing
    const made = FAKE.made.length;
    audio.speakPoliticianVoice(undefined, { whilePaused: true });
    assert.equal(FAKE.made.length, made);
    audio.resumeAllAudio();
  } finally {
    uninstall();
  }
});

test('inspector wiring: speaker id, reset on open, derived answer, disabled look', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const insp = read('../components/AIDecisionInspector.tsx');
  assert.match(insp, /speakPoliticianVoice\(speakerId, \{ whilePaused: true \}\)/);
  assert.doesNotMatch(insp, /speakPoliticianVoice\(\)/);
  assert.match(insp, /counterfactual\.decision === decision/);
  assert.match(insp, /useEffect\(\(\) => \{\s*setCounterfactual\(null\);\s*\}, \[isOpen\]\)/);
  assert.doesNotMatch(insp, /expected value was positive/);
  const app = read('../App.tsx');
  assert.match(app, /speakerId=\{inspectorSpeakerId\}/);
  assert.match(app, /setInspectorSpeakerId\(combatantsRef\.current\?\.p2\.c\.id\)/);
  assert.match(app, /aria-disabled=\{inspectDisabledReason\(is2PlayerMode, !!activeDecision\) !== null\}/);
  assert.match(app, /if \(is2PlayerMode\) return;/);
});

test('F46: one action-label table names every action the CPU can take', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const ai = createCombatant(POLITICIANS[1], 300, true);
  const d = calculateAIUtilities(ai, p1, []);
  // every id the AI scores has a label, and the table has nothing else
  assert.deepEqual(Object.keys(d.utilityMap).sort(), Object.keys(ACTION_LABEL).sort());
  assert.equal(actionLabel('Podium'), '272 Seats');
  assert.equal(actionLabel('Pickup'), 'Canteen');
  assert.equal(actionLabel('Strike'), 'Strike');
  assert.equal(actionLabel('Mystery'), 'Mystery'); // unknown ids are shown as they are
});

test('F46: the counterfactual text uses player-facing names', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const ai = createCombatant(POLITICIANS[1], 300, true);
  ai.meter = 100;
  const d = calculateAIUtilities(ai, p1, []);
  const pod = getCounterfactualExplanation('Podium', -4, d);
  assert.match(pod, /^272 Seats lost out/);
  assert.doesNotMatch(pod, /Podium/);
  const pick = getCounterfactualExplanation('Pickup', 3, d);
  assert.match(pick, /^Canteen lost out/);
  assert.doesNotMatch(pick, /Pickup/);
  assert.match(getCounterfactualExplanation('Strike', 5, d), new RegExp(`against ${actionLabel(d.best)} \\(`));
});

test('F46: score bars are sized from zero, and negative scores are visible', () => {
  const neg = scoreBar(-20, 40);
  assert.equal(neg.negative, true);
  assert.equal(neg.widthPct, 50); // was a 3% sliver
  const pos = scoreBar(40, 40);
  assert.equal(pos.negative, false);
  assert.equal(pos.widthPct, 100);
  assert.equal(scoreBar(0, 40).widthPct, 3); // thin minimum
  assert.equal(scoreBar(-0.4, 40).negative, false); // rounds to 0, so not "negative"
  assert.equal(scoreBar(500, 40).widthPct, 100); // clamped
  assert.equal(scoreBar(10, 0).widthPct, 100); // zero max never divides by zero
});

test('F46: inspector wording, shared labels and the animation classes are all wired', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const insp = read('../components/AIDecisionInspector.tsx');
  for (const jargon of ['Mathematical Expected Value', 'Active Telemetry Inputs', 'Counterfactual Analysis', 'Ask Counterfactual']) {
    assert.ok(!insp.includes(jargon), `still says "${jargon}"`);
  }
  for (const plain of ['Score for each option', 'What the CPU sees', 'What if']) {
    assert.ok(insp.includes(plain), `missing "${plain}"`);
  }
  assert.match(insp, /actionLabel\(action\)/);
  assert.match(insp, /scoreBar\(ev, maxAbsEV\)/);
  assert.doesNotMatch(insp, /text-\[11px\]/); // 12 px (text-xs) in the inspector
  const app = read('../App.tsx');
  assert.match(app, /actionLabel\(activeDecisionTreeAction\)\.toUpperCase\(\)/);
  assert.match(app, /label: actionLabel\('Podium'\)/);
  assert.match(app, /label: actionLabel\('Pickup'\)/);
  assert.match(app, /actionLabel\(decision\.best\)\.toUpperCase\(\)/);
  assert.match(app, /p2\.thought = `\$\{actionLabel\(decision\.best\)\}/);
  assert.ok(!app.includes("label: '272 Seats'") && !app.includes("label: 'Canteen'"));

  // Every Tailwind-v4-missing animation class used anywhere in the UI is defined in index.css.
  const css = read('../index.css');
  const files = ['../App.tsx', '../components/GameOverModal.tsx', '../components/IntroLoadingScreen.tsx', '../components/IndiaMapSelect.tsx',
    '../components/RulebookModal.tsx', '../components/VersusCard.tsx', '../components/VirtualGamepad.tsx', '../components/AIDecisionInspector.tsx'];
  const used = new Set<string>();
  for (const f of files) {
    for (const m of read(f).matchAll(/\b(animate-in|fade-in|zoom-in-\d+|slide-in-from-(?:top|bottom|left|right)|text-shadow)\b(?!-)/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 4, 'expected the UI to use several of these classes');
  for (const cls of used) {
    assert.ok(css.includes(`.${cls}`), `index.css does not define .${cls}`);
  }
  // reduced motion switches the entrance animation off
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*\.animate-in/);
});


// ---------- F47: intro polish ----------
test('easeSeatsStep: approaches the target without overshooting, snaps, and never jumps on a long frame', () => {
  const { rate, snapBelowSeats } = INTRO_COUNTER;
  // from 0 toward 272 in 60 fps frames: strictly rising, never above the target, ends exactly on it
  let v = 0, prev = -1, frames = 0;
  while (v !== 272 && frames < 600) {
    v = easeSeatsStep(v, 272, 1 / 60, rate, snapBelowSeats);
    assert.ok(v > prev && v <= 272, `frame ${frames}: ${v}`);
    prev = v; frames++;
  }
  assert.equal(v, 272);
  assert.ok(frames > 20, 'it should take a visible time, not one frame');
  assert.ok(frames < 120, 'and it should not drag past 2 s');
  // same end time at 30 and 144 fps within about 0.1 s
  const timeTo = (fps: number) => { let x = 0, n = 0; while (x !== 272 && n < 5000) { x = easeSeatsStep(x, 272, 1 / fps, rate, snapBelowSeats); n++; } return n / fps; };
  assert.ok(Math.abs(timeTo(30) - timeTo(144)) < 0.1, `${timeTo(30)} vs ${timeTo(144)}`);
  // a zero or negative dt changes nothing; already there stays there; moving down works too
  assert.equal(easeSeatsStep(10, 272, 0, rate, snapBelowSeats), 10);
  assert.equal(easeSeatsStep(10, 272, -1, rate, snapBelowSeats), 10);
  assert.equal(easeSeatsStep(272, 272, 1, rate, snapBelowSeats), 272);
  assert.ok(easeSeatsStep(100, 40, 0.1, rate, snapBelowSeats) < 100);
  assert.ok(easeSeatsStep(100, 40, 0.1, rate, snapBelowSeats) >= 40);
  // within the snap distance it lands exactly
  assert.equal(easeSeatsStep(271.8, 272, 1 / 60, rate, snapBelowSeats), 272);
});

test('introReady also waits for the counter to arrive when asked, and defaults to not waiting', () => {
  assert.equal(introReady(true, true, true, false), false);
  assert.equal(introReady(true, true, true, true), true);
  assert.equal(introReady(true, true, true), true);
});

test('skipHintText: no Space hint on touch phones; introStepLabel never passes the last step', () => {
  assert.equal(skipHintText(true), null);
  assert.equal(skipHintText(false), 'Press [Space] to skip');
  assert.equal(introStepLabel(0, 7), 'STEP 1 OF 7');
  assert.equal(introStepLabel(6, 7), 'STEP 7 OF 7');
  assert.equal(introStepLabel(7, 7), 'STEP 7 OF 7'); // story over: was "STEP 8 OF 7"
  assert.equal(introStepLabel(-3, 7), 'STEP 1 OF 7');
});

test('IntroLoadingScreen source: progressbar, eased counter, badges outside the ring, face-friendly crop', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const intro = readFileSync(fileURLToPath(new URL('../components/IntroLoadingScreen.tsx', import.meta.url)), 'utf8');
  assert.match(intro, /role="progressbar"/);
  assert.match(intro, /aria-valuenow=\{targetPct\}/);
  assert.match(intro, /aria-valuemin=\{0\}/);
  assert.match(intro, /easeSeatsStep\(/);
  assert.match(intro, /prefersReducedMotion\(\)/);
  assert.match(intro, /skipHintText\(touchFirst\)/);
  assert.match(intro, /introStepLabel\(currentStepIndex, FUNNY_STEPS\.length\)/);
  assert.match(intro, /object-\[center_10%\]/);
  assert.ok(!intro.includes('object-center scale-105'), 'old centred crop is gone');
  // the badges are no longer absolutely positioned on the ring, and the words no longer carry the fading steam animation
  assert.ok(!/-top-1\.5 -right-1\.5|-bottom-1\.5 -left-1\.5/.test(intro));
  assert.ok(!intro.includes('animate-steam'));
  // no side effects inside the step updater (F38/F47)
  assert.doesNotMatch(intro, /setCurrentStepIndex\(\(?[a-z]*\)? ?=> ?\{[^}]*(playSound|setSeats|clearInterval)/);
});

test('intro CSS: the compact layout starts at 640 px tall and the badge row goes below 700 px (windows 501-639 px tall used to clip the prompt)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
  const intro = readFileSync(fileURLToPath(new URL('../components/IntroLoadingScreen.tsx', import.meta.url)), 'utf8');
  assert.match(css, /@media \(max-height: 700px\) \{\s*\.intro-badges \{ display: none; \}/);
  assert.match(css, /@media \(max-height: 640px\) \{\s*\.intro-root/);
  assert.ok(!/@media \(max-height: 500px\) \{\s*\.intro-root/.test(css), 'the old 500 px threshold is gone');
  assert.match(intro, /className="intro-badges /);
  assert.match(intro, /\[@media\(max-height:640px\)\]:hidden/);
});

// ---- F48: package.json, scripts, lockfile, env/metadata, README ----
async function f48Repo() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e: { isDirectory(): boolean; name: string }) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  return { fs, path, root, read, walk };
}

test('F48 package.json: renamed, unused packages gone, esbuild pin gone, scripts fixed', async () => {
  const { read } = await f48Repo();
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'battle-of-272-parliament');
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const gone of ['express', '@types/express', 'dotenv', '@google/genai', 'motion', 'three-stdlib', 'autoprefixer']) {
    assert.ok(!(gone in all), `${gone} must not be declared`);
  }
  // esbuild ^0.25 clashed with Vite 8's optional peer (^0.27 || ^0.28) and is why --legacy-peer-deps was needed.
  assert.ok(!('esbuild' in all), 'esbuild must not be pinned (tsx and vite bring what they need)');
  assert.equal(pkg.scripts.clean, 'rm -rf dist', 'clean no longer deletes a server.js that does not exist');
  assert.equal(pkg.scripts.deploy, 'npm run build && gh-pages -d dist');
  assert.ok('gh-pages' in pkg.devDependencies, 'deploy needs gh-pages');
  assert.equal(pkg.scripts.test, 'tsx --test src/game/logic.test.ts');
  assert.equal(pkg.scripts.lint, 'tsc --noEmit');
});

test('F48 imports and dependencies agree: every imported package is declared, every runtime dependency is used', async () => {
  const { read, walk, path, root } = await f48Repo();
  const pkg = JSON.parse(read('package.json'));
  const files = [...walk(path.join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f)), path.join(root, 'vite.config.ts')];
  const used = new Set<string>();
  for (const f of files) {
    const text = (await import('node:fs')).readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:') || spec === 'path') continue;
      used.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
    }
  }
  const css = read('src/index.css');
  if (/@import\s+["']tailwindcss["']/.test(css)) used.add('tailwindcss');
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const u of used) assert.ok(u in declared, `${u} is imported but not declared in package.json`);
  for (const d of Object.keys(pkg.dependencies)) assert.ok(used.has(d), `${d} is a runtime dependency that nothing imports`);
});

test('F48 lockfile: one lockfile (npm), root entry mirrors package.json, no entries for removed packages', async () => {
  const { read, fs, path, root } = await f48Repo();
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.ok(!fs.existsSync(path.join(root, 'bun.lock')), 'bun.lock is gone (one lockfile only)');
  assert.equal(lock.name, pkg.name);
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  for (const gone of ['express', 'dotenv', '@google/genai', 'motion', 'three-stdlib', 'autoprefixer', '@types/express', 'esbuild']) {
    assert.ok(!(`node_modules/${gone}` in lock.packages), `${gone} must not be at the lockfile root`);
  }
  // Every declared direct dependency has a lockfile entry.
  for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.ok(`node_modules/${d}` in lock.packages, `${d} is missing from package-lock.json`);
  }
});

test('F48 env and metadata: no Gemini key text; README install steps match reality', async () => {
  const { read } = await f48Repo();
  const env = read('.env.example');
  const meta = read('metadata.json');
  assert.ok(!/gemini/i.test(env) && !/GEMINI_API_KEY/.test(env), '.env.example no longer asks for a Gemini key');
  assert.ok(!/gemini/i.test(meta) && !/SERVER_SIDE/.test(meta), 'metadata.json no longer claims server-side Gemini');
  assert.doesNotThrow(() => JSON.parse(meta));
  assert.ok(!/real speech synthesis/i.test(meta), 'metadata describes recorded voice clips, not speech synthesis');
  const readme = read('README.md');
  assert.match(readme, /\nnpm install\n/, 'README installs with a plain npm install');
  assert.ok(!/cp \.env\.example \.env/.test(readme), 'README no longer asks to copy an env template the game does not need');
  assert.match(readme, /npm run deploy/);
});

// ---------------------------------------------------------------- F49 / F50 / F53

test('F49 index.html: no fake orientation meta, honest description, absolute og:image that exists in public/', async () => {
  const { read, fs, path, root } = await f48Repo();
  const html = read('index.html');
  assert.ok(!/name="screen-orientation"/.test(html), 'screen-orientation is not a real meta tag');
  assert.ok(!/real speech synthesis/i.test(html), 'description must not claim speech synthesis');
  assert.match(html, /recorded voice clips/);
  const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
  const tw = /name="twitter:image" content="([^"]+)"/.exec(html)?.[1];
  assert.ok(og && /^https:\/\//.test(og), 'og:image is an absolute https URL');
  assert.equal(tw, og, 'twitter:image matches og:image');
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const file = path.join(root, 'public', 'screenshots', og!.split('/screenshots/')[1]);
  assert.ok(fs.existsSync(file), 'the og:image file exists in public/screenshots');
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  assert.equal(Number(/og:image:width" content="(\d+)"/.exec(html)?.[1]), w);
  assert.equal(Number(/og:image:height" content="(\d+)"/.exec(html)?.[1]), h);
});

test('F49 manifest: maskable icon is its own 512 px file; every icon file exists at its declared size', async () => {
  const { read, fs, path, root } = await f48Repo();
  const m = JSON.parse(read('public/manifest.webmanifest'));
  const mask = m.icons.filter((i: { purpose: string }) => i.purpose === 'maskable');
  const any = m.icons.filter((i: { purpose: string }) => i.purpose === 'any');
  assert.equal(mask.length, 1);
  assert.ok(any.every((i: { src: string }) => i.src !== mask[0].src), 'maskable is not the plain icon reused');
  for (const i of m.icons as { src: string; sizes: string }[]) {
    const f = path.join(root, 'public', i.src);
    assert.ok(fs.existsSync(f), `${i.src} exists`);
    const b = fs.readFileSync(f);
    const [w, h] = i.sizes.split('x').map(Number);
    assert.equal(b.readUInt32BE(16), w);
    assert.equal(b.readUInt32BE(20), h);
  }
});

test('F49 error boundary: shows a message and a Reload button instead of a blank page, and wraps App', async () => {
  const { read } = await f48Repo();
  const main = read('src/main.tsx');
  assert.match(main, /<ErrorBoundary>\s*<App \/>\s*<\/ErrorBoundary>/);
  const { default: ErrorBoundary } = await import('../components/ErrorBoundary');
  const { renderToStaticMarkup } = await import('react-dom/server');
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(new Error('x')).error?.message, 'x');
  const ok = new ErrorBoundary({ children: 'fine' });
  assert.equal(ok.render(), 'fine');
  const bad = new ErrorBoundary({ children: 'fine' });
  bad.state = { error: new Error('boom') };
  const html = renderToStaticMarkup(bad.render() as never);
  assert.match(html, /Something broke\./);
  assert.match(html, /Reload/);
  assert.match(html, /boom/);
});

test('F50 dead data: no per-fighter stats in the roster, the type or any reader; AI Studio page is gone', async () => {
  const { read, fs, path, root } = await f48Repo();
  assert.ok(POLITICIANS.every((p) => !('stats' in (p as object))), 'no fighter carries stats');
  assert.ok(!/stats\s*:/.test(read('src/game/types.ts')), 'Politician type has no stats');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e: import('node:fs').Dirent) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(path.join(root, 'src')).filter((f: string) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(!/\.(power|speed|defense)\b/.test(src.replace(/\/\/.*$/gm, '')), `${path.basename(f)} reads a stat`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'public', 'assets', 'aistudio')), 'leftover AI Studio page removed');
  for (const f of ['index.html', 'vite.config.ts', 'README.md']) assert.ok(!/aistudio\/index_/.test(read(f)), `${f} does not reference it`);
});

test('F53 parody notice: one string, shown in the intro and sidebar, identical at the top of the README', async () => {
  const { read } = await f48Repo();
  const { PARODY_NOTICE } = await import('./notice');
  assert.match(PARODY_NOTICE, /Fan-made parody/);
  assert.match(PARODY_NOTICE, /Not affiliated with or endorsed by any person or party\./);
  assert.match(read('src/components/IntroLoadingScreen.tsx'), /\{PARODY_NOTICE\}/);
  assert.match(read('src/App.tsx'), /\{PARODY_NOTICE\}/);
  const readme = read('README.md').split('\n');
  assert.equal(readme[2], `> **Notice:** ${PARODY_NOTICE}`, 'README blockquote directly under the title');
});

test('F53 README and rights checklist: claims match the game; checklist has nine rows with a decision column', async () => {
  const { read } = await f48Repo();
  const readme = read('README.md');
  assert.ok(!/AI voice synthesis/i.test(readme));
  assert.match(readme, /Recorded voice clips/);
  const list = read('RIGHTS_CHECKLIST.md');
  assert.match(list, /not legal advice/i);
  assert.match(list, /Your decision/);
  const rows = list.split('\n').filter((l: string) => /^\| \d+ \|/.test(l));
  assert.equal(rows.length, 9);
  for (const needle of ['menu-bg.jpg', 'loading-bg.jpg', 'amit-shah-card.jpg', 'voices', 'ram-hi-janey-mahasangram', 'models', 'pickupLine', 'fair-use']) {
    assert.ok(list.includes(needle), `checklist mentions ${needle}`);
  }
});

test('F59 updateOrder: alternates who is updated first, so neither side owns simultaneous trades', () => {
  const a = { id: 'p1' };
  const b = { id: 'p2' };
  assert.deepEqual(updateOrder(a, b, 0), [a, b]);
  assert.deepEqual(updateOrder(a, b, 1), [b, a]);
  let firstIsA = 0;
  for (let t = 0; t < 1000; t++) if (updateOrder(a, b, t)[0] === a) firstIsA++;
  assert.equal(firstIsA, 500, 'each side goes first exactly half the time');
});

test('F59 wiring: the main loop uses updateOrder instead of a fixed P1-then-P2 array', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  assert.ok(/updateOrder\(\s*\{ me: p1, opp: p2 \}/.test(app), 'loop calls updateOrder');
  assert.ok(!/\[\s*\{ me: p1, opp: p2 \},\s*\{ me: p2, opp: p1 \}\s*\]\.forEach/.test(app), 'old fixed order is gone');
});

test('F59 balance pass: tuned values stay in sane ranges and the game reads them from balance.ts', async () => {
  const bal = await import('./balance');
  assert.ok(bal.PARRY.window < 0.85 && bal.PARRY.cooldown > 3.2, 'parry is shorter and rarer than the old 0.85 s / 3.2 s');
  assert.ok(bal.PARRY.reflectDmg > 0 && bal.PARRY.meterGain >= 0);
  assert.ok(bal.VETO.stun < 1.4 && bal.VETO.stun >= 0.5);
  assert.ok(bal.DHARNA_INVINCIBLE_SECONDS <= bal.SUPER_TICK.dharna.duration);
  assert.ok(bal.MAMATA_COMBO_COOLDOWN > 3);
  assert.ok(bal.AI_DODGE_CHANCE > 0 && bal.AI_DODGE_CHANCE < 1, 'the CPU does not dodge every projectile');
  assert.ok(bal.KADI_NINDA.stunSeconds > 0 && bal.KADI_NINDA.stunRange > 0);
  assert.ok(bal.RAFALE.spreadPx <= 100 && bal.RAFALE.dmg >= 10);
  assert.ok(bal.MODI_WAVE.dmg > 10 && bal.MODI_WAVE.dmg <= 15, 'Modi wave was a hard-coded 10; F59b raises it a little');
  assert.ok(bal.SHAH_CHAIN_DMG >= 14 && bal.PARRY.cooldown >= 5.5 && bal.VETO.silenceSeconds <= 6, 'F59c: Shah hits harder, Kharge parries less often and silences for less');
  assert.ok(bal.SHAH_FREEZE_SECONDS > 2.0 && bal.SHAH_FREEZE_SECONDS < 3.5, 'Shah freeze sits between the F59 2.0 s and the original 3.5 s');
  assert.ok(bal.SUPER_TICK.gst_blocks.dmg > 4 && bal.SUPER_TICK.gst_blocks.dmg <= 6, 'GST rain was 4 per tick; F59b raises it a little');
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  for (const needle of ['PARRY.window', 'PARRY.cooldown', 'PARRY.reflectDmg', 'VETO.stun', 'DHARNA_INVINCIBLE_SECONDS', 'MAMATA_COMBO_COOLDOWN', 'KADI_NINDA.confuseSeconds', 'AI_DODGE_CHANCE', 'RAFALE.spreadPx', 'RAFALE.dmg', 'SHAH_CHAIN_DMG', 'SHAH_FREEZE_SECONDS', 'VETO.silenceSeconds', 'MODI_WAVE.dmg', 'MUFFLER_HOOK.dmg']) {
    assert.ok(app.includes(needle), `App.tsx uses ${needle}`);
  }
  assert.ok(!/a\.counter = 0\.85/.test(app) && !/b\.stun = 1\.4/.test(app), 'old hard-coded numbers are gone');
});


import { cameraTargetZoom, cameraEase, cameraTransform } from './logic';
import { CAMERA as CAM } from './balance';

test('F57 camera: close fighters zoom in (capped), far fighters stay at 1x', () => {
  assert.equal(cameraTargetZoom(100, 700, 800, CAM.fitMarginPx, CAM.maxZoom), 1);
  assert.equal(cameraTargetZoom(0, 800, 800, CAM.fitMarginPx, CAM.maxZoom), 1);
  assert.equal(cameraTargetZoom(390, 410, 800, CAM.fitMarginPx, CAM.maxZoom), CAM.maxZoom, 'touching fighters hit the cap');
  const mid = cameraTargetZoom(300, 500, 800, CAM.fitMarginPx, CAM.maxZoom);
  assert.ok(mid > 1 && mid <= CAM.maxZoom);
  assert.ok(cameraTargetZoom(300, 450, 800, CAM.fitMarginPx, CAM.maxZoom) >= mid, 'closer is never less zoomed');
});

test('F57 camera: the view never leaves the stage, whatever the zoom and centre', () => {
  for (const zoom of [1, 1.1, 1.3, 1.5]) {
    for (const cx of [-200, 0, 30, 400, 770, 800, 1200]) {
      const { s, tx, ty } = cameraTransform(zoom, cx, 800, 450);
      assert.ok(tx <= 1e-9 && tx >= 800 - s * 800 - 1e-9, `tx ${tx} keeps the left and right edges inside at zoom ${zoom}`);
      assert.ok(Math.abs(ty - (450 - s * 450)) < 1e-9, 'bottom anchored: the floor line does not move');
      assert.ok(Math.abs(s * 450 + ty - 450) < 1e-9, 'the bottom edge of the stage stays at the bottom of the view');
    }
  }
  const mid = cameraTransform(1.3, 400, 800, 450);
  assert.ok(Math.abs(mid.s * 400 + mid.tx - 400) < 1e-9, 'a centred midpoint stays centred');
  assert.deepEqual(cameraTransform(1, 123, 800, 450), { s: 1, tx: 0, ty: 0 }, 'no zoom is the identity');
});

test('F57 camera: easing is frame-rate independent and never overshoots', () => {
  const run = (fps: number) => { let v = 1; for (let i = 0; i < fps; i++) v = cameraEase(v, 1.3, CAM.zoomRate, 1 / fps); return v; };
  assert.ok(Math.abs(run(30) - run(144)) < 1e-9, 'one second lands in the same place at any frame rate');
  assert.ok(run(60) <= 1.3 && run(60) > 1.29);
  assert.equal(cameraEase(1.2, 1.2, 5, 0.016), 1.2);
});

test('F57 camera is applied to the arena only: HUD and cutscene are drawn after the matching restore', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const cam = app.indexOf('cameraTransform(cam.zoom');
  const bg = app.indexOf('ctx.drawImage(getChamberBackground');
  const hudRestore = app.indexOf('The camera shake belongs to the arena, not to the HUD');
  assert.ok(cam > 0 && bg > cam && hudRestore > bg, 'zoom is set before the background and dropped before the HUD');
  assert.ok(/!prefersReducedMotion\(\)/.test(app.slice(cam - 900, cam)), 'reduced motion keeps 1x');
});


import { warmFighter } from './warm';
test('F55 warmFighter is harmless without a document and is wired to the VS card', () => {
  assert.doesNotThrow(() => warmFighter(POLITICIANS[0]));
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const i = app.indexOf('warmFighter(a); warmFighter(b)');
  assert.ok(i > 0, 'the VS card warms both fighters');
  assert.ok(/vs\.phase !== 'vs'/.test(app.slice(i - 400, i)), 'only while the VS card is shown');
  assert.ok(/clearInterval/.test(app.slice(i, i + 200)), 'and the timer is cleaned up');
  const fighter3d = readFileSync(new URL('./fighter3d.ts', import.meta.url), 'utf8');
  assert.ok(!/warmFighter/.test(fighter3d), 'no rig file was touched for this');
});
