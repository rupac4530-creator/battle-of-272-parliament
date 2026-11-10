"""run_anim_4_3.py -- Part 4-3: jump (crouch, rise, fall, land) in the 4-1 format + checks.
Run: python3 tools/run_anim_4_3.py > previews4_3/part4_3_checks.txt     (about 1-2 minutes; writes anim/jump_4_3.json)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data only from rigged_models/<name>.glb via animrig.Rig. Stance = the 3-1 GUARD table (narrow variant for the wide four,
   exactly as 4-2). Angles are my own choice, not measured, not mocap. Poses are the stance plus deltas (same axis, summed).
 * Four NON-loop clips, chained: jump_crouch (0.12 s) stance -> C; jump_rise (0.30 s) C -> E (takeoff stretch, t 0.08, ease out) -> T (tuck, top);
   jump_fall (0.30 s) T -> R (reach for the floor); jump_land (0.18 s) R -> A (absorb, t 0.07, ease out) -> stance.
   Deltas (degrees, x axis): C: thighs -17, knees +35, feet -18 (foot = -(thigh+knee), flat foot), Spine +5, Spine1 +4, ForeArms -5, Head -4.
   E: thighs +8, knees -12, feet +4, Spine -4, Arms -15. T: L thigh -22, knee +40, foot -18; R thigh -26, knee +45, foot -19; Spine +3, Arms -10.
   R: L thigh -8, knee +12, foot -4; R thigh -4, knee +10, foot -6; Spine +2. A: L thigh -24, knee +45, foot -21; R thigh -22, knee +42, foot -20;
   Spine +7, Spine1 +5, Head -3, ForeArms -4. Root is 0 in every pose: the game owns the jump height; the clip is only the pose.
 * Chain checks: end pose of each clip equals the start pose of the next (max bone angle 0), land ends in the stance, per-frame angular
   step at 60 and 120 Hz <= EASE_PEAK_SPEED * segment angle / segment time * dt + 1e-3, sample() pure function of t.
 * Per-character limits (anim/limits_4_1.json, as 4-2) applied to every pose with limit_pose.
 * Stretch: 13 samples per clip (both ends included), limits applied, GLB skinning. Per clip max over frames of edges >3x, >6x, >10x and worst edge.
   Budget per frame (the 4-1/4-2 budget, my choice): edges >10x <= 20 AND edges >6x <= 120. A clip PASSES if every frame is in budget; a model whose
   limited stance already fails the budget is reported INHERITED instead of FAIL. Models with stance in budget but a clip over it = FAIL (a finding).
 * Crossfade idle(t=0.3)->jump_crouch(t=0) over 0.08 s, 5 steps: no step may exceed the larger endpoint edges>6x count by more than 5.
 * Ground contact: GROUND_LOCK need = rest foot-min height minus current foot-min height of the four foot joints (cm; positive = raise the
   root, negative = lower it) for stance, C and A (the grounded poses). Proposed rule: grounded phases (crouch, land) use GROUND_LOCK clamped to
   +-12 cm; airborne phases (rise, fall) use no lock. Reported: need per model, and whether any need exceeds 12 cm. In the tuck T, how far the
   lowest foot joint is above the rest line (cm), with root 0.
 * Sensitivity (reported only): crouch and absorb depth x0.7 and x1.3 -> max edges >6x over the four clips per model.
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

def poses(narrow, k=1.0):
    S = stance_spec(narrow); st = P(S)
    both = lambda th, kn, ft, ft2=None: {'LeftUpLeg': X(th), 'LeftLeg': X(kn), 'LeftFoot': X(ft), 'RightUpLeg': X(th), 'RightLeg': X(kn), 'RightFoot': X(ft if ft2 is None else ft2)}
    C = P(add(S, {**both(-17*k, 35*k, -18*k), 'Spine': X(5*k), 'Spine1': X(4*k), 'LeftForeArm': X(-5), 'RightForeArm': X(-5), 'Head': X(-4)}))
    E = P(add(S, {**both(8, -12, 4), 'Spine': X(-4), 'LeftArm': X(-15), 'RightArm': X(-15)}))
    T = P(add(S, {'LeftUpLeg': X(-22), 'LeftLeg': X(40), 'LeftFoot': X(-18), 'RightUpLeg': X(-26), 'RightLeg': X(45), 'RightFoot': X(-19),
                  'Spine': X(3), 'LeftArm': X(-10), 'RightArm': X(-10)}))
    R = P(add(S, {'LeftUpLeg': X(-8), 'LeftLeg': X(12), 'LeftFoot': X(-4), 'RightUpLeg': X(-4), 'RightLeg': X(10), 'RightFoot': X(-6), 'Spine': X(2)}))
    Ab = P(add(S, {'LeftUpLeg': X(-24*k), 'LeftLeg': X(45*k), 'LeftFoot': X(-21*k), 'RightUpLeg': X(-22*k), 'RightLeg': X(42*k), 'RightFoot': X(-20*k),
                   'Spine': X(7*k), 'Spine1': X(5*k), 'Head': X(-3), 'LeftForeArm': X(-4), 'RightForeArm': X(-4)}))
    return dict(st=st, C=C, E=E, T=T, R=R, A=Ab)

def clips(pp):
    k = lambda t, e, p: {'t': t, 'ease': e, 'pose': p}
    return {'jump_crouch': A.clip('jump_crouch', 0.12, [k(0, 'smooth', pp['st']), k(0.12, 'smooth', pp['C'])]),
            'jump_rise': A.clip('jump_rise', 0.30, [k(0, 'smooth', pp['C']), k(0.08, 'out', pp['E']), k(0.30, 'smooth', pp['T'])]),
            'jump_fall': A.clip('jump_fall', 0.30, [k(0, 'smooth', pp['T']), k(0.30, 'smooth', pp['R'])]),
            'jump_land': A.clip('jump_land', 0.18, [k(0, 'smooth', pp['R']), k(0.07, 'out', pp['A']), k(0.18, 'smooth', pp['st'])])}
CHAIN = ['jump_crouch', 'jump_rise', 'jump_fall', 'jump_land']

def scales_for(m):
    l, a = LIM[m]['leg'], LIM[m]['arm']
    return {'thigh': l, 'knee': l, 'foot': l, 'arm_raise': a, 'elbow': a, 'wrist': a}
def lim(p, m): return A.limit_pose(p, scales_for(m))
def ang(pa, pb): return max([A.q_angle_deg(A.qmul(np.r_[-A.q_of(pa, b)[:3], A.q_of(pa, b)[3]], A.q_of(pb, b))) for b in A.BONES])

print('Part 4-3 checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
PP = {False: poses(False), True: poses(True)}; CL = {v: clips(PP[v]) for v in PP}

print('== 1. format and chain')
for var, nm in ((False, 'normal'), (True, 'narrow')):
    c = CL[var]
    for a, b in zip(CHAIN[:-1], CHAIN[1:]):
        chk(f'{nm}: end of {a} = start of {b}', ang(c[a]['keys'][-1]['pose'], c[b]['keys'][0]['pose']) < 1e-9)
    chk(f'{nm}: jump_crouch starts and jump_land ends in the stance', ang(c['jump_crouch']['keys'][0]['pose'], PP[var]['st']) < 1e-9 and ang(c['jump_land']['keys'][-1]['pose'], PP[var]['st']) < 1e-9)
for cn in CHAIN:
    c = CL[False][cn]; ks = c['keys']
    for hz in (60, 120):
        dt = 1.0 / hz; n = int(np.ceil(c['duration'] * hz - 1e-9)); prev = A.sample(c, 0.0); ok = True
        for i in range(1, n + 1):
            t = min(i * dt, c['duration']); cur = A.sample(c, t); seg = next(j for j in range(1, len(ks)) if t - 1e-9 <= ks[j]['t']); span = ks[seg]['t'] - ks[seg-1]['t']
            for b in A.BONES:
                step = ang({'q': {b: A.q_of(prev, b)}}, {'q': {b: A.q_of(cur, b)}})
                tot = ang({'q': {b: A.q_of(ks[seg-1]['pose'], b)}}, {'q': {b: A.q_of(ks[seg]['pose'], b)}})
                if step > A.EASE_PEAK_SPEED[ks[seg].get('ease', 'smooth')] * tot / span * dt + 1e-3 + 1e-6: ok = False
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
print(f"{'model':11s} {'var':6s} {'stance':>20s} {'crouch':>20s} {'rise':>20s} {'fall':>20s} {'land':>20s}  verdict")
f = lambda x: f'{x[0]}/{x[1]}/{x[2]}/{x[3]:.1f}x'
for m in MODELS:
    var = m in WIDE; r = rigs[m]; g = r.counts(lim(PP[var]['st'], m)); g = [g[0], g[1], g[2], g[3]]
    row = {n: run_clip(m, CL[var][n]) for n in CHAIN}
    inb = lambda v: v[2] <= 20 and v[1] <= 120
    ok = all(inb(v) for v in row.values())
    verdict = 'PASS' if ok else ('INHERITED (stance itself over budget)' if not inb(g) else 'FAIL')
    print(f"{m:11s} {'narrow' if var else 'normal':6s} {f(g):>20s} " + ' '.join(f'{f(row[n]):>20s}' for n in CHAIN) + f'  {verdict}')
    chk(f'{m}: jump clips within budget or inherited from an over-budget stance', ok or not inb(g))
    chk(f'{m}: no clip adds more than 20 edges >6x over the stance', all(v[1] <= g[1] + 20 for v in row.values()))

print('\n== 3. crossfade idle (t=0.3) -> jump_crouch (t=0), 0.08 s, 5 steps')
for m in MODELS:
    var = m in WIDE; r = rigs[m]
    import importlib
    pa = lim(PP[var]['st'], m); pb = lim(A.sample(CL[var]['jump_crouch'], 0.0), m)
    ends = max(r.counts(pa)[1], r.counts(pb)[1]); mxx = max(r.counts(lim(A.crossfade(PP[var]['st'], A.sample(CL[var]['jump_crouch'], 0.12), s * 0.02, 0.08), m))[1] for s in range(5))
    chk(f'{m}: stance -> crouch crossfade max >6x ({mxx}) <= endpoint max ({ends}) + 5', mxx <= ends + 5)

print('\n== 4. ground contact (cm). GROUND_LOCK need = rest foot-min minus current foot-min (+ raise root, - lower root)')
FOOT = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def foot_min(r, p): return min(r.joint_pos(p, b)[1] for b in FOOT)
for m in MODELS:
    var = m in WIDE; r = rigs[m]; rest = foot_min(r, A.pose()); o = {}
    for n in ('st', 'C', 'A', 'T'): o[n] = (rest - foot_min(r, lim(PP[var][n], m))) * 100
    print(f"  {m:11s} stance {o['st']:+5.1f}   crouch C {o['C']:+5.1f}   absorb A {o['A']:+5.1f}   | tuck T: lowest foot {-o['T']:+5.1f} cm vs rest line (root 0)")
    chk(f'{m}: crouch and absorb lock need within +-12 cm', abs(o['C']) <= 12 and abs(o['A']) <= 12)

print('\n== 5. sensitivity of crouch/absorb depth (max edges >6x over the four clips, depth x0.7 / 1.0 / 1.3)')
for m in MODELS:
    o = []
    for k in (0.7, 1.0, 1.3):
        cc = clips(poses(m in WIDE, k)); o.append(max(run_clip(m, cc[n])[1] for n in CHAIN))
    print(f'  {m:11s} {o}')

os.makedirs(f'{ROOT}/anim', exist_ok=True)
out = {}
for var, nm in ((False, ''), (True, '_narrow')):
    for cn in CHAIN: out[cn + nm] = A.clip_to_json({**CL[var][cn], 'name': cn + nm})
json.dump({'_note': 'Part 4-3. Non-loop jump phases, chained crouch->rise->fall->land. Root is 0: the game owns the jump height. Apply limits_4_1.json at play time. '
           'Grounded phases (crouch, land) use GROUND_LOCK clamped to +-12 cm; airborne phases use none. narrow variants are for kejriwal, mamata, sitharaman, kharge.',
           'clips': out}, open(f'{ROOT}/anim/jump_4_3.json', 'w'), indent=1, sort_keys=True)
print(f'\n{npass} checks passed, {nfail} failed')
