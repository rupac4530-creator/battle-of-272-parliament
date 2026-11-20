// Part 6-1: plays the standard-rig clips (idle, walk, later attacks) on Modi's 87-bone FBX skeleton. Pure maths, no three.js.
// Method (same as Part 5-2): world(b) = DW(standard ancestor a) * K_b, local(b) = inverse(world(parent)) * world(b).
// Legs differ: Modi's fixed stance (MODI_STANCE, leg IK from the leg fix) is kept as the base, and only the CHANGE of the clip
// relative to the standard idle is added on top, so the flat feet and knee bend stay and the legs swing around them.
import type { Pose, Q } from './animLib';
import { IDENT } from './animLib';
import { MODI_RETARGET, STD_PARENT, STD_ORDER } from './modiRetargetData';
import { MODI_STANCE } from './modiStance';

const mul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const inv = (a: Q): Q => [-a[0], -a[1], -a[2], a[3]];
const nrm = (a: Q): Q => { const n = Math.hypot(a[0], a[1], a[2], a[3]) || 1; return [a[0] / n, a[1] / n, a[2] / n, a[3] / n]; };

const LEG_STD = new Set(['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']);
export const MODI_BONE_NAMES: string[] = MODI_RETARGET.map(r => r[0]);

/** World rotation of each standard bone for a pose (parents come first in STD_ORDER). */
function stdWorld(p: Pose): Record<string, Q> {
  const w: Record<string, Q> = {};
  for (const n of STD_ORDER) { const r = p.q[n] ?? IDENT; const par = STD_PARENT[n]; w[n] = par ? mul(w[par], r) : r; }
  return w;
}

let stanceWorld: Q[] | null = null;
/** World rotation of every Modi bone in his fixed stance (computed once from MODI_STANCE local rotations). */
function getStanceWorld(): Q[] {
  if (stanceWorld) return stanceWorld;
  const w: Q[] = [];
  MODI_RETARGET.forEach((row, i) => {
    const l = (MODI_STANCE[row[0]] ?? IDENT) as Q;
    w[i] = row[1] >= 0 ? mul(w[row[1]], l) : l;
  });
  return (stanceWorld = w);
}

/**
 * Local rotations (x,y,z,w) for all 87 Modi bones for a standard-rig pose.
 * `idle` must be the standard idle first key (the pose Modi's stance was made from). At that pose the result equals MODI_STANCE.
 */
export function retargetModi(clip: Pose, idle: Pose): Record<string, Q> {
  const dc = stdWorld(clip), di = stdWorld(idle), sw = getStanceWorld();
  const W: Q[] = [];
  const out: Record<string, Q> = {};
  MODI_RETARGET.forEach((row, i) => {
    const [name, par, a, K] = row;
    let w: Q;
    if (!a) w = K as Q;
    else if (LEG_STD.has(a)) w = mul(mul(dc[a], inv(di[a])), sw[i]);   // leg: stance + clip change
    else w = mul(dc[a], K as Q);
    w = nrm(w); W[i] = w;
    out[name] = nrm(par >= 0 ? mul(inv(W[par]), w) : w);
  });
  return out;
}

/** Walk stride for Modi. The shared 4-2 walk clip is only an 8 deg guard-keeping shuffle (same for all 9 fighters), so Modi gets
 *  alternating steps added on top: thigh swing about the sideways axis, knee bend on the swinging leg, foot kept level.
 *  Works on a standard-rig pose (identity rest rotations, model faces +z, so swing is about local X; negative = forward). */
export const STRIDE = { hip: 0.24, knee: 0.55, period: 0.9 };
/** Part 6-4: size multipliers for quick tuning in the browser (fighter3d.ts sets them from ?modiStride= ?modiKick= ?modiDrop=). 1 = as designed. */
export const TUNE = { stride: 1, kick: 1, drop: 1 };
const rotX = (a: number): Q => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
export function withStride(p: Pose, t: number, amount = 1): Pose {
  const ph = (t / STRIDE.period) * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
  const q: Record<string, Q> = { ...p.q };
  const leg = (side: 'Left' | 'Right', dir: number) => {
    const th = -dir * STRIDE.hip * TUNE.stride * s * amount;                       // thigh swing, negative = forward
    const kn = STRIDE.knee * TUNE.stride * Math.max(0, dir * c) * amount;          // knee bends while the leg swings forward
    const up = side + 'UpLeg', lg = side + 'Leg', ft = side + 'Foot';
    q[up] = mul(rotX(th), (q[up] ?? IDENT) as Q);
    q[lg] = mul((q[lg] ?? IDENT) as Q, rotX(kn));
    q[ft] = mul((q[ft] ?? IDENT) as Q, rotX(-(th + kn) * 0.8));    // keep the sole mostly level
  };
  leg('Left', 1); leg('Right', -1);
  return { q, root: [p.root[0], p.root[1], p.root[2]] };
}

// ---- Part 6-2: attack legs --------------------------------------------------------------------------------------------
// Same idea as withStride: these work on a standard-rig pose (identity rest rotations, model faces +z, left side = +x).
// Modi's stance has the LEFT foot in front and the RIGHT foot behind, and the jab uses the left arm.
const rotY = (a: number): Q => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const sm = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

/** Kick shape for progress u in 0..1 (0 = guard, about 0.5 = foot fully out, 1 = back in guard).
 *  th = thigh swing (negative = forward), kn = knee bend. Chamber, snap out, short hold, pull back through the chamber. */
export function kickProfile(u0: number): { th: number; kn: number } {
  const u = clamp01(u0);
  // Part 6-4: the game applies the hit when the kick starts, so the foot now arrives at about u = 0.34 (0.12 s) instead of 0.58 (0.2 s)
  if (u < 0.18) { const s = sm(u / 0.18); return { th: -1.0 * s, kn: 1.45 * s }; }
  if (u < 0.34) { const s = sm((u - 0.18) / 0.16); return { th: -1.0 - 0.35 * s, kn: 1.45 - 1.3 * s }; }
  if (u < 0.55) { const s = (u - 0.34) / 0.21; return { th: -1.35 + 0.05 * s, kn: 0.15 + 0.1 * s }; }
  const s = sm((u - 0.55) / 0.45);
  return { th: -1.3 * (1 - s), kn: 0.25 * (1 - s) + 0.9 * Math.sin(Math.PI * s) };
}

/** Rear-leg (right) front kick on top of a base pose (use the idle key so the guard arms stay up). */
export function withKick(p: Pose, u: number): Pose {
  const raw = kickProfile(u), k = Math.abs(raw.th) / 1.35, th = raw.th * TUNE.kick, kn = raw.kn * TUNE.kick;
  const q: Record<string, Q> = { ...p.q };
  q['RightUpLeg'] = mul(rotX(th), (q['RightUpLeg'] ?? IDENT) as Q);
  q['RightLeg'] = mul((q['RightLeg'] ?? IDENT) as Q, rotX(kn));
  q['RightFoot'] = mul((q['RightFoot'] ?? IDENT) as Q, rotX(-(th + kn) * 0.4));
  q['LeftLeg'] = mul((q['LeftLeg'] ?? IDENT) as Q, rotX(0.15 * k));                 // standing leg sinks a little
  q['Spine'] = mul(rotX(0.07 * th), (q['Spine'] ?? IDENT) as Q);                      // lean back to balance
  q['Spine1'] = mul(rotX(0.07 * th), (q['Spine1'] ?? IDENT) as Q);
  return { q, root: [p.root[0], p.root[1] - 0.03 * k, p.root[2]] };
}

/** Leg drive for the jab / cross (the shared jab clip only moves the left arm and spine). u = clip progress 0..1.
 *  Front foot stays planted and the knee bends, rear leg pushes and the heel lifts, pelvis and spine turn into the punch. */
export function withPunchLegs(p: Pose, u: number): Pose {
  const w = Math.sin(Math.PI * clamp01(u));
  const q: Record<string, Q> = { ...p.q };
  q['Hips'] = mul(rotY(-0.08 * w), (q['Hips'] ?? IDENT) as Q);
  q['LeftUpLeg'] = mul(rotX(-0.12 * w), mul(rotY(0.08 * w), (q['LeftUpLeg'] ?? IDENT) as Q));
  q['RightUpLeg'] = mul(rotX(0.1 * w), mul(rotY(0.08 * w), (q['RightUpLeg'] ?? IDENT) as Q));
  q['LeftLeg'] = mul((q['LeftLeg'] ?? IDENT) as Q, rotX(0.2 * w));
  q['RightLeg'] = mul((q['RightLeg'] ?? IDENT) as Q, rotX(-0.08 * w));
  q['RightFoot'] = mul((q['RightFoot'] ?? IDENT) as Q, rotX(0.2 * w));               // heel lifts, ball of the foot drives
  q['Spine'] = mul(rotY(-0.12 * w), (q['Spine'] ?? IDENT) as Q);
  return { q, root: [p.root[0], p.root[1] - 0.015 * w, p.root[2] + 0.03 * w] };
}

// ---- Part 6-3: block, hit, stun, dropkick leg layers ------------------------------------------------------------------
/** Adds thigh swing / knee bend / level-foot to one leg of a standard-rig pose (negative th = forward, positive kn = knee bent). */
function legAdd(q: Record<string, Q>, side: 'Left' | 'Right', th: number, kn: number, foot = 0.8): void {
  const up = side + 'UpLeg', lg = side + 'Leg', ft = side + 'Foot';
  q[up] = mul(rotX(th), (q[up] ?? IDENT) as Q);
  q[lg] = mul((q[lg] ?? IDENT) as Q, rotX(kn));
  q[ft] = mul((q[ft] ?? IDENT) as Q, rotX(-(th + kn) * foot));
}
/** Block: a low guard crouch. Thighs forward, knees bent twice as much, so the feet stay put and the pelvis drops. */
export function withBlockLegs(p: Pose, amount = 1): Pose {
  const q: Record<string, Q> = { ...p.q };
  legAdd(q, 'Left', -0.1 * amount, 0.2 * amount); legAdd(q, 'Right', -0.1 * amount, 0.2 * amount);
  return { q, root: [p.root[0], p.root[1], p.root[2]] };
}
/** Light hit: both knees buckle and the pelvis is pushed down and slightly back for a moment. u = hit time / hit length, 0..1. */
export function withHitLegs(p: Pose, u: number): Pose {
  const w = Math.sin(Math.PI * clamp01(u));
  const q: Record<string, Q> = { ...p.q };
  legAdd(q, 'Left', -0.15 * w, 0.3 * w); legAdd(q, 'Right', -0.15 * w, 0.3 * w);   // thigh = half the knee bend keeps the feet planted
  return { q, root: [p.root[0], p.root[1] - 0.03 * w, p.root[2] - 0.03 * w] };
}
/** Stun loop: knees give way and wobble. t in seconds. */
export function withStunLegs(p: Pose, t: number): Pose {
  const q: Record<string, Q> = { ...p.q };
  const a = Math.sin((t / 0.9) * Math.PI * 2);
  const kl = 0.2 + 0.08 * a, kr = 0.2 - 0.08 * a;
  legAdd(q, 'Left', -kl / 2, kl); legAdd(q, 'Right', -kr / 2, kr);
  return { q, root: [p.root[0], p.root[1], p.root[2]] };
}
/** Airborne dropkick on top of the jump pose: both legs thrust forward, torso leans back. u = attack progress 0..1. */
export function withDropkick(p: Pose, u0: number): Pose {
  const u = clamp01(u0), w = sm(clamp01(u / 0.25)) * (1 - sm(clamp01((u - 0.8) / 0.2)));
  const q: Record<string, Q> = { ...p.q };
  // replace the jump tuck: legs go out straight instead of tucked
  for (const s of ['Left', 'Right'] as const) {
    q[s + 'UpLeg'] = mul(rotX(-1.15 * TUNE.drop * w), (q[s + 'UpLeg'] ?? IDENT) as Q);
    q[s + 'Leg'] = mul((q[s + 'Leg'] ?? IDENT) as Q, rotX(-0.5 * TUNE.drop * w));
    q[s + 'Foot'] = mul((q[s + 'Foot'] ?? IDENT) as Q, rotX(0.3 * w));
  }
  q['Spine'] = mul(rotX(-0.2 * w), (q['Spine'] ?? IDENT) as Q);
  q['Spine1'] = mul(rotX(-0.15 * w), (q['Spine1'] ?? IDENT) as Q);
  return { q, root: [p.root[0], p.root[1], p.root[2]] };
}
