"""run_anim_4_4.py -- Part 4-4: block, light hit, heavy hit, stun, confused in the 4-1 format + checks.
Run: python3 tools/run_anim_4_4.py > previews4_4/part4_4_checks.txt     (about 2 minutes; writes anim/reactions_4_4.json)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data only from rigged_models/<name>.glb via animrig.Rig. Stance = the 3-1 GUARD table (narrow variant for the wide four, as in 4-2 and 4-3).
   Angles are my own choice, not measured, not mocap. Every pose = stance + deltas (same axis, summed). Root is 0 (the game owns knockback).
   Sign convention used so far: Head x NEGATIVE = head back / look up; Spine x NEGATIVE = lean back; arm/forearm x NEGATIVE = raise forward;
   foot delta = -(thigh delta + knee delta) keeps the foot flat; LeftArm z + / RightArm z - = swing out. Shoulder bones are NOT driven (two are empty).
 * Clips (degrees):
   block_in 0.08 s  stance -> B (ease out);   block_hold 0.6 s LOOP  B -> Bb -> B;   block_out 0.10 s  B -> stance.
     B: Arms x -20, ForeArms x -10, Spine x +4, Head x +6 (chin tucked), UpLegs -4, Legs +6, Feet -2.   Bb: B plus Spine +1, ForeArms -2.
   hit_light 0.22 s  stance -> H1 (t 0.06, ease out) -> stance.   H1: Spine -5, Spine1 -4, Spine2 -3, Head -10, Arms +8, ForeArms +10, UpLegs +3, Feet -3.
   hit_heavy 0.40 s  stance -> H2 (t 0.08, ease out) -> H2b (t 0.20) -> stance.   H2: Spine -9, Spine1 -7, Spine2 -6, Head -18, Arms +25 (+ z 15 out),
     ForeArms +20, L UpLeg +6 / Leg +8 / Foot -14, R UpLeg +4 / Leg +8 / Foot -12.   H2b = 0.6 x H2.
   stun 0.9 s LOOP  base Sd (Arms +15, ForeArms +30, Head +10, Spine +3, Legs +8 with UpLegs -4 and Feet -4) -> Sd + sway a (Spine z +5, Spine2 z +3, Head z +10,
     Head x -5) -> Sd -> Sd + sway b (mirrored z) -> Sd.
   confused 1.4 s LOOP  base Fd (ForeArms +15, Head x +4, Spine x +1) -> Fd + look a (Head y +16, Head z +6, Spine2 y +4) -> Fd -> Fd + look b (mirrored) -> Fd.
 * Format checks: loops close (max bone angle 0 and root 0); chain: block_in end = block_hold start, block_hold end = block_out start, block_out end = stance;
   hit clips start and end in the stance; per-frame step at 60 and 120 Hz <= max over EVERY segment the step spans of EASE_PEAK_SPEED(ease) * segment angle /
   segment time * dt + 1e-3 (the corrected bound from 4-3); sample() is a pure function of t.
 * Per-character limits anim/limits_4_1.json applied to every pose (leg scale -> thigh, knee, foot; arm scale -> arm_raise, elbow, wrist).
 * Stretch: 13 samples per clip (ends included), limits applied, GLB skinning; max over frames of edges >3x, >6x, >10x and the worst edge.
   Checks per model and clip (all fixed now, including the two that are new in 4-4):
     S1 budget: edges >10x <= 20 and edges >6x <= 120 in every frame (the 4-2/4-3 budget). A model whose limited stance already breaks it = INHERITED.
     S2 worst-edge cap (NEW): worst edge <= max(2 x the stance worst edge, 25x).
     S3 between-frames (NEW): clip max edges >6x <= the max over the clip's own key poses + 10 (catches blends worse than their ends, as seen on Yogi in 4-3).
 * Crossfades (0.12 s, 6 steps): stance -> Sd and H2 -> Sd (a heavy hit sliding into a stun). Worst step edges >6x must be <= max(endpoint counts) + 5,
   with endpoints = the actual start pose and END pose of the crossfade.
 * Ground contact: GROUND_LOCK need = rest foot-min minus current foot-min (cm; + raise root, - lower it) for B, H2, Sd and Fd; flagged if |need| > 12.
 * Sensitivity (reported only): hit_heavy amplitude x0.7 / 1.0 / 1.3 -> max edges >6x over the clip.
"""
import os, sys, json, types
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import numpy as np
import animlib as A
from animrig import Rig

_r = types.ModuleType('rigspec_2g2b2'); _r.BONES = A.BONES; _r.JOINTS = {}; _r.PARENT = {}; sys.modules['rigspec_2g2b2'] = _r
_g = types.ModuleType('glbio'); _g.load_mesh = None; sys.modules['glbio'] = _g
import bendtest_3_1 as B

MODELS = B.ALL8; WIDE = ['kejriwal', 'mamata', 'sitharaman', 'kharge']
LIM = json.load(open(f'{ROOT}/anim/limits_4_1.json'))['models']
npass = nfail = 0
def chk(name, ok):
    global npass, nfail
    npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)

def stance_spec(narrow):
    s = {b: [tuple(i) for i in it] for b, it in B.POSES['GUARD'].items()}
    if narrow: s['LeftArm'] = [('z', 0), ('x', -35)]; s['RightArm'] = [('z', 0), ('x', -35)]
    return s
def add(spec, extra):
    out = {b: list(it) for b, it in spec.items()}
    for b, it in extra.items(): out[b] = out.get(b, []) + list(it)
    return out
def P(spec): return A.pose_from_items(spec)
def X(d): return [('x', d)]
def Z(d): return [('z', d)]
def Y(d): return [('y', d)]
def both(bone, d): return {'Left' + bone: X(d), 'Right' + bone: X(d)}
def merge(*ds):
    o = {}
    for d in ds:
        for b, it in d.items(): o[b] = o.get(b, []) + list(it)
    return o

def poses(narrow, k=1.0):
    S = stance_spec(narrow); st = P(S)
    Bd = merge(both('Arm', -20), both('ForeArm', -10), both('UpLeg', -4), both('Leg', 6), both('Foot', -2), {'Spine': X(4), 'Head': X(6)})
    Bp = P(add(S, Bd)); Bb = P(add(S, merge(Bd, {'Spine': X(1)}, both('ForeArm', -2))))
    H1 = P(add(S, merge({'Spine': X(-5), 'Spine1': X(-4), 'Spine2': X(-3), 'Head': X(-10)}, both('Arm', 8), both('ForeArm', 10), both('UpLeg', 3), both('Foot', -3))))
    def H(s): return merge({'Spine': X(-9*s*k), 'Spine1': X(-7*s*k), 'Spine2': X(-6*s*k), 'Head': X(-18*s*k), 'LeftArm': X(25*s*k) + Z(15*s*k), 'RightArm': X(25*s*k) + Z(-15*s*k),
                            'LeftUpLeg': X(6*s*k), 'LeftLeg': X(8*s*k), 'LeftFoot': X(-14*s*k), 'RightUpLeg': X(4*s*k), 'RightLeg': X(8*s*k), 'RightFoot': X(-12*s*k)}, both('ForeArm', 20*s*k))
    H2 = P(add(S, H(1.0))); H2b = P(add(S, H(0.6)))
    Sdd = merge(both('Arm', 15), both('ForeArm', 30), both('UpLeg', -4), both('Leg', 8), both('Foot', -4), {'Head': X(10), 'Spine': X(3)})
    Sd = P(add(S, Sdd))
    sw = lambda s: P(add(S, merge(Sdd, {'Spine': Z(5*s), 'Spine2': Z(3*s), 'Head': Z(10*s) + X(-5)})))
    Fdd = merge(both('ForeArm', 15), {'Head': X(4), 'Spine': X(1)}); Fd = P(add(S, Fdd))
    lk = lambda s: P(add(S, merge(Fdd, {'Head': Y(16*s) + Z(6*s), 'Spine2': Y(4*s)})))
    return dict(st=st, B=Bp, Bb=Bb, H1=H1, H2=H2, H2b=H2b, Sd=Sd, Sa=sw(1), Sb=sw(-1), Fd=Fd, Fa=lk(1), Fb=lk(-1))

def clips(pp):
    k = lambda t, e, p: {'t': t, 'ease': e, 'pose': p}
    return {'block_in': A.clip('block_in', 0.08, [k(0, 'smooth', pp['st']), k(0.08, 'out', pp['B'])]),
            'block_hold': A.clip('block_hold', 0.6, [k(0, 'smooth', pp['B']), k(0.3, 'smooth', pp['Bb']), k(0.6, 'smooth', pp['B'])]),
            'block_out': A.clip('block_out', 0.10, [k(0, 'smooth', pp['B']), k(0.10, 'smooth', pp['st'])]),
            'hit_light': A.clip('hit_light', 0.22, [k(0, 'smooth', pp['st']), k(0.06, 'out', pp['H1']), k(0.22, 'smooth', pp['st'])]),
            'hit_heavy': A.clip('hit_heavy', 0.40, [k(0, 'smooth', pp['st']), k(0.08, 'out', pp['H2']), k(0.20, 'smooth', pp['H2b']), k(0.40, 'smooth', pp['st'])]),
            'stun': A.clip('stun', 0.9, [k(0, 'smooth', pp['Sd']), k(0.225, 'smooth', pp['Sa']), k(0.45, 'smooth', pp['Sd']), k(0.675, 'smooth', pp['Sb']), k(0.9, 'smooth', pp['Sd'])]),
            'confused': A.clip('confused', 1.4, [k(0, 'smooth', pp['Fd']), k(0.35, 'smooth', pp['Fa']), k(0.7, 'smooth', pp['Fd']), k(1.05, 'smooth', pp['Fb']), k(1.4, 'smooth', pp['Fd'])])}
KEYS = {'block_in': ['st', 'B'], 'block_hold': ['B', 'Bb'], 'block_out': ['B', 'st'], 'hit_light': ['st', 'H1'], 'hit_heavy': ['st', 'H2', 'H2b'],
        'stun': ['Sd', 'Sa', 'Sb'], 'confused': ['Fd', 'Fa', 'Fb']}
CN = list(KEYS)

def scales_for(m):
    l, a = LIM[m]['leg'], LIM[m]['arm']
    return {'thigh': l, 'knee': l, 'foot': l, 'arm_raise': a, 'elbow': a, 'wrist': a}
def lim(p, m): return A.limit_pose(p, scales_for(m))
def ang(pa, pb): return max([A.q_angle_deg(A.qmul(np.r_[-A.q_of(pa, b)[:3], A.q_of(pa, b)[3]], A.q_of(pb, b))) for b in A.BONES])
def bang(pa, pb, b): return A.q_angle_deg(A.qmul(np.r_[-A.q_of(pa, b)[:3], A.q_of(pa, b)[3]], A.q_of(pb, b)))

print('Part 4-4 checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
PP = {False: poses(False), True: poses(True)}; CL = {v: clips(PP[v]) for v in PP}

print('== 1. format and chain')
for var, nm in ((False, 'normal'), (True, 'narrow')):
    c = CL[var]
    for cn in ('block_hold', 'stun', 'confused'):
        k0, k1 = c[cn]['keys'][0]['pose'], c[cn]['keys'][-1]['pose']
        chk(f'{nm} {cn}: loop closes (bone angle {ang(k0, k1):.6f}, root diff {np.abs(k0["root"] - k1["root"]).max():.1e})', ang(k0, k1) < 1e-6 and np.abs(k0['root'] - k1['root']).max() < 1e-12)
    chk(f'{nm}: block_in end = block_hold start; block_hold end = block_out start', ang(c['block_in']['keys'][-1]['pose'], c['block_hold']['keys'][0]['pose']) < 1e-9 and ang(c['block_hold']['keys'][-1]['pose'], c['block_out']['keys'][0]['pose']) < 1e-9)
    chk(f'{nm}: block_out, hit_light, hit_heavy end in the stance and hits start in it', all(ang(c[n]['keys'][-1]['pose'], PP[var]['st']) < 1e-9 for n in ('block_out', 'hit_light', 'hit_heavy')) and all(ang(c[n]['keys'][0]['pose'], PP[var]['st']) < 1e-9 for n in ('hit_light', 'hit_heavy')))
for cn in CN:
    c = CL[False][cn]; ks = c['keys']
    for hz in (60, 120):
        dt = 1.0 / hz; n = int(np.ceil(c['duration'] * hz - 1e-9)); prev = A.sample(c, 0.0); ok = True
        for i in range(1, n + 1):
            t0 = (i - 1) * dt; t1 = min(i * dt, c['duration']); cur = A.sample(c, t1)
            segs = [j for j in range(1, len(ks)) if ks[j]['t'] > t0 + 1e-12 and ks[j-1]['t'] < t1 - 1e-12]
            for b in A.BONES:
                step = bang({'q': {b: A.q_of(prev, b)}}, {'q': {b: A.q_of(cur, b)}}, b) if False else A.q_angle_deg(A.qmul(np.r_[-A.q_of(prev, b)[:3], A.q_of(prev, b)[3]], A.q_of(cur, b)))
                bound = max(A.EASE_PEAK_SPEED[ks[j].get('ease', 'smooth')] * A.q_angle_deg(A.qmul(np.r_[-A.q_of(ks[j-1]['pose'], b)[:3], A.q_of(ks[j-1]['pose'], b)[3]], A.q_of(ks[j]['pose'], b))) / (ks[j]['t'] - ks[j-1]['t']) * dt for j in segs) + 1e-3 + 1e-6
                if step > bound: ok = False
            prev = cur
        chk(f'{cn}: per-frame step within bound at {hz} Hz', ok)
    a1 = A.sample(c, 0.05); a2 = A.sample(c, 0.05)
    chk(f'{cn}: sample() is a pure function of t', all(np.array_equal(a1['q'][b], a2['q'][b]) for b in a1['q']))

print('\n== 2. stretch per clip (13 frames, limits applied). max over frames: >3x / >6x / >10x / worst edge')
NF = 12
def run_clip(m, c):
    r = rigs[m]; mx = [0, 0, 0, 0.0]
    for i in range(NF + 1):
        n3, n6, n10, w = r.counts(lim(A.sample(c, i * c['duration'] / NF), m)); mx = [max(mx[0], n3), max(mx[1], n6), max(mx[2], n10), max(mx[3], w)]
    return mx
f = lambda x: f'{x[0]}/{x[1]}/{x[2]}/{x[3]:.1f}'
print(f"{'model':11s} {'var':6s} {'stance':>16s} " + ' '.join(f'{n:>17s}' for n in CN) + '  verdict')
KEYN = {}
for m in MODELS:
    var = m in WIDE; r = rigs[m]; g = r.counts(lim(PP[var]['st'], m)); g = [g[0], g[1], g[2], g[3]]
    row = {n: run_clip(m, CL[var][n]) for n in CN}
    kc = {p: r.counts(lim(PP[var][p], m)) for p in set(sum(KEYS.values(), []))}
    inb = lambda v: v[2] <= 20 and v[1] <= 120
    s1 = all(inb(row[n]) for n in CN); s2 = all(row[n][3] <= max(2 * g[3], 25) for n in CN)
    s3 = all(row[n][1] <= max(kc[p][1] for p in KEYS[n]) + 10 for n in CN)
    verdict = ('PASS' if s1 else ('INHERITED' if not inb(g) else 'FAIL')) + ('' if s2 else ' +CAP') + ('' if s3 else ' +BETWEEN')
    print(f"{m:11s} {'narrow' if var else 'normal':6s} {f(g):>16s} " + ' '.join(f'{f(row[n]):>17s}' for n in CN) + f'  {verdict}')
    chk(f'{m}: S1 budget in every clip (or inherited from an over-budget stance)', s1 or not inb(g))
    chk(f'{m}: S2 worst edge <= max(2 x stance worst, 25x) in every clip', s2)
    chk(f'{m}: S3 no clip peaks above its own key poses + 10 edges >6x', s3)

print('\n== 3. crossfades (0.12 s, 6 steps), endpoints = actual start and end pose')
for m in MODELS:
    var = m in WIDE; r = rigs[m]; out = []
    for nm, pa, pb in (('stance->stun', PP[var]['st'], PP[var]['Sd']), ('heavy hit->stun', PP[var]['H2'], PP[var]['Sd'])):
        ends = max(r.counts(lim(pa, m))[1], r.counts(lim(pb, m))[1]); mx = max(r.counts(lim(A.crossfade(pa, pb, s * 0.02, 0.12), m))[1] for s in range(7))
        out.append(f'{nm}: ends {ends}, worst {mx}'); chk(f'{m}: {nm} crossfade worst ({mx}) <= endpoints ({ends}) + 5', mx <= ends + 5)
    print(f'  {m:11s} ' + '; '.join(out))

print('\n== 4. ground contact (cm). GROUND_LOCK need = rest foot-min minus current foot-min (+ raise root, - lower root)')
FOOT = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def foot_min(r, p): return min(r.joint_pos(p, b)[1] for b in FOOT)
for m in MODELS:
    var = m in WIDE; r = rigs[m]; rest = foot_min(r, A.pose()); o = {n: (rest - foot_min(r, lim(PP[var][n], m))) * 100 for n in ('st', 'B', 'H2', 'Sd', 'Fd')}
    print(f"  {m:11s} " + '   '.join(f'{n} {v:+5.1f}' for n, v in o.items()))
    chk(f'{m}: ground-lock need within +-12 cm for B, H2, Sd, Fd', all(abs(o[n]) <= 12 for n in ('B', 'H2', 'Sd', 'Fd')))

print('\n== 5. sensitivity of hit_heavy amplitude (max edges >6x over the clip, x0.7 / 1.0 / 1.3)')
for m in MODELS:
    print(f'  {m:11s} {[run_clip(m, clips(poses(m in WIDE, k))["hit_heavy"])[1] for k in (0.7, 1.0, 1.3)]}')

os.makedirs(f'{ROOT}/anim', exist_ok=True)
out = {}
for var, nm in ((False, ''), (True, '_narrow')):
    for cn in CN: out[cn + nm] = A.clip_to_json({**CL[var][cn], 'name': cn + nm})
json.dump({'_note': 'Part 4-4. block_hold, stun and confused are loops; the rest are one-shots. Root is 0 (the game owns knockback). Apply limits_4_1.json at play time. narrow variants are for kejriwal, mamata, sitharaman, kharge.',
           'clips': out}, open(f'{ROOT}/anim/reactions_4_4.json', 'w'), indent=1, sort_keys=True)
print(f'\n{npass} checks passed, {nfail} failed')
