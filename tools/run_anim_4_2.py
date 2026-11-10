"""run_anim_4_2.py -- Part 4-2: fighting-stance idle, walk forward, walk back (clips in the 4-1 format) + checks.
Run: python3 tools/run_anim_4_2.py > previews4_2/part4_2_checks.txt     (writes anim/*_4_2.json; 1-3 minutes)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data comes ONLY from rigged_models/<name>.glb via animrig.Rig (the 4-1 reader). Stance angles = the 3-1 GUARD table
   (imported with stub rig modules, only the table is used).
 * Clips (all LOOPS: first key pose == last key pose; angles are my own choice, not measured, not mocap):
     idle      1.2 s  stance = GUARD; Spine2 x +-1.5, Head x -+1, ForeArms +-4, hips root y -0.008 / +0.004 m (breathing).
     walk_fwd  0.9 s  4 keys: A (lead leg reaching) / passing = stance / B (back leg brought up) / passing. Root y dips at A and B.
     walk_back 1.0 s  same idea, smaller amplitude, moving away: back leg steps back, then lead leg is drawn back.
   Narrow variant (the wide four: kejriwal, mamata, sitharaman, kharge): the guard arm swing out (LeftArm z +12) is set to 0 and mirrored.
   Everything else is identical. The narrow variant is used only for the wide four; the others use the normal variant.
 * Per-character limits = anim/limits_4_1.json applied with animlib.limit_pose to EVERY sampled pose (leg scale -> thigh, knee, foot;
   arm scale -> arm_raise, elbow, wrist). Torso and head stay 1.0 (NOT_CALIBRATED in 4-1).
 * Format checks: loops close (angle between first and last pose = 0), per-frame angular step at 60 and 120 Hz <= EASE_PEAK_SPEED *
   segment angle / segment time * dt + 1e-6, sample() is a pure function of t, crossfade idle->walk is continuous, mirror_clip twice = identity.
 * Stretch (edge length / rest length, max(L/rest, rest/L)): 24 evenly spaced samples per clip per model, limits applied, skinned with
   the GLB reader. Reported: max over frames of edges >3x, >6x, >10x, and the worst edge. Budget per frame (the 4-1 budget, my choice):
   edges >10x <= 20 AND edges >6x <= 120. Baseline for comparison: the limited GUARD pose itself. A clip PASSES if every frame is in
   budget. A model whose stance already fails (Mamata, from 4-1) is reported as INHERITED, not as a clip fault.
 * Crossfade check: idle->walk_fwd and walk_fwd->walk_back crossfade (0.12 s), 6 steps; no step may exceed the larger endpoint
   edges>6x count by more than 5 edges.
 * Ground contact (report, changes nothing in the clips): min over the 4 foot joints (LeftFoot, RightFoot, LeftToeBase, RightToeBase) of
   joint height per frame vs the same at rest. SINK = rest - min (cm, positive = below the floor line), per frame. The proposed runtime
   rule for 5-3 is GROUND_LOCK: add root y = rest_min - cur_min, clamped to +-5 cm. Reported with and without the lock: worst sink, worst hover
   (lowest foot above rest line), and how many frames hit the clamp. Hand-to-head sideways distance of the guard hands in the stance, normal vs narrow variant.
 * Sensitivity (reported, changes nothing): leg amplitude of the walk x0.7 and x1.3 -> max >6x count per model.
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

# ---------------------------------------------------------------- clip construction
def stance_spec(narrow):
    s = {b: [tuple(i) for i in it] for b, it in B.POSES['GUARD'].items()}
    if narrow:
        s['LeftArm'] = [('z', 0), ('x', -35)]; s['RightArm'] = [('z', 0), ('x', -35)]
    return s

def add(spec, extra):
    """Add extra (axis,deg) items after the stance items of the same bone (angles about the same bone, applied later)."""
    out = {b: list(it) for b, it in spec.items()}
    for b, it in extra.items(): out[b] = out.get(b, []) + list(it)
    return out

def P(spec, root=(0, 0, 0)): return A.pose_from_items(spec, root)

def build(narrow, k=1.0):
    S = stance_spec(narrow); st = P(S)
    # idle
    ia = P(add(S, {'Spine2': [('x', 1.5)], 'Head': [('x', -1.0)], 'LeftForeArm': [('x', -4)], 'RightForeArm': [('x', -4)]}), (0, -0.008, 0))
    ib = P(add(S, {'Spine2': [('x', -1.5)], 'Head': [('x', 1.0)], 'LeftForeArm': [('x', 4)], 'RightForeArm': [('x', 4)]}), (0, 0.004, 0))
    idle = A.clip('idle', 1.2, [{'t': 0.0, 'ease': 'smooth', 'pose': st}, {'t': 0.3, 'ease': 'smooth', 'pose': ia},
                                {'t': 0.6, 'ease': 'smooth', 'pose': st}, {'t': 0.9, 'ease': 'smooth', 'pose': ib},
                                {'t': 1.2, 'ease': 'smooth', 'pose': st}])
    # walk forward: A = lead leg reaching, B = back leg brought up
    wa = P(add(S, {'LeftUpLeg': [('x', -8 * k)], 'LeftLeg': [('x', -7 * k)], 'RightUpLeg': [('x', 6 * k)], 'RightLeg': [('x', 7 * k)],
                   'Spine': [('x', 1.5)]}), (0, -0.012, 0.0))
    wb = P(add(S, {'LeftUpLeg': [('x', 6 * k)], 'LeftLeg': [('x', 5 * k)], 'RightUpLeg': [('x', -8 * k)], 'RightLeg': [('x', -6 * k)],
                   'Spine': [('x', -1.5)]}), (0, -0.012, 0.0))
    wf = A.clip('walk_fwd', 0.9, [{'t': 0.0, 'ease': 'smooth', 'pose': wa}, {'t': 0.225, 'ease': 'smooth', 'pose': st},
                                  {'t': 0.45, 'ease': 'smooth', 'pose': wb}, {'t': 0.675, 'ease': 'smooth', 'pose': st},
                                  {'t': 0.9, 'ease': 'smooth', 'pose': wa}])
    # walk back: C = back leg steps back, D = lead leg drawn back
    wc = P(add(S, {'RightUpLeg': [('x', 7 * k)], 'RightLeg': [('x', -4 * k)], 'LeftUpLeg': [('x', 4 * k)], 'LeftLeg': [('x', 3 * k)],
                   'Spine': [('x', -1.0)]}), (0, -0.010, 0.0))
    wd = P(add(S, {'LeftUpLeg': [('x', 7 * k)], 'LeftLeg': [('x', -4 * k)], 'RightUpLeg': [('x', 4 * k)], 'RightLeg': [('x', 3 * k)],
                   'Spine': [('x', -1.0)]}), (0, -0.010, 0.0))
    wbk = A.clip('walk_back', 1.0, [{'t': 0.0, 'ease': 'smooth', 'pose': wc}, {'t': 0.25, 'ease': 'smooth', 'pose': st},
                                    {'t': 0.5, 'ease': 'smooth', 'pose': wd}, {'t': 0.75, 'ease': 'smooth', 'pose': st},
                                    {'t': 1.0, 'ease': 'smooth', 'pose': wc}])
    return {'idle': idle, 'walk_fwd': wf, 'walk_back': wbk, 'stance': st}

def scales_for(m):
    l, a = LIM[m]['leg'], LIM[m]['arm']
    return {'thigh': l, 'knee': l, 'foot': l, 'arm_raise': a, 'elbow': a, 'wrist': a}
def lim(p, m): return A.limit_pose(p, scales_for(m))

print('Part 4-2 checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
C = {False: build(False), True: build(True)}

# ---------------------------------------------------------------- 1. format checks
print('== 1. format')
for var, nm in ((False, 'normal'), (True, 'narrow')):
    for cn in ('idle', 'walk_fwd', 'walk_back'):
        c = C[var][cn]; k0, k1 = c['keys'][0]['pose'], c['keys'][-1]['pose']
        d = max([A.q_angle_deg(A.qmul(np.r_[-A.q_of(k0, b)[:3], A.q_of(k0, b)[3]], A.q_of(k1, b))) for b in A.BONES] + [0])
        chk(f'{nm} {cn}: loop closes (max bone angle first vs last key = {d:.6f} deg, root diff {np.abs(k0["root"]-k1["root"]).max():.6f})',
            d < 1e-6 and np.abs(k0['root'] - k1['root']).max() < 1e-12)
worst = 0
for cn in ('idle', 'walk_fwd', 'walk_back'):
    c = C[False][cn]; ks = c['keys']
    for hz in (60, 120):
        dt = 1.0 / hz; n = int(round(c['duration'] * hz)); prev = A.sample(c, 0.0); ok = True
        for i in range(1, n + 1):
            cur = A.sample(c, i * dt); t = i * dt
            seg = next(j for j in range(1, len(ks)) if t - 1e-9 <= ks[j]['t'])
            span = ks[seg]['t'] - ks[seg-1]['t']
            for b in A.BONES:
                step = A.q_angle_deg(A.qmul(np.r_[-A.q_of(prev, b)[:3], A.q_of(prev, b)[3]], A.q_of(cur, b)))
                tot = A.q_angle_deg(A.qmul(np.r_[-A.q_of(ks[seg-1]['pose'], b)[:3], A.q_of(ks[seg-1]['pose'], b)[3]], A.q_of(ks[seg]['pose'], b)))
                if step > 1.5 * tot / span * dt + 1e-6 + 1e-3: ok = False
            prev = cur
        chk(f'{cn}: per-frame step within bound at {hz} Hz', ok)
    a1 = A.sample(c, 0.37); a2 = A.sample(c, 0.37)
    chk(f'{cn}: sample() is a pure function of t', all(np.array_equal(a1['q'][b], a2['q'][b]) for b in a1['q']))
m2 = A.mirror_clip(A.mirror_clip(C[False]['walk_fwd']))
chk('mirror_clip twice = identity (walk_fwd)', all(np.allclose(A.sample(m2, t)['q'][b], A.sample(C[False]['walk_fwd'], t)['q'][b]) or
    np.allclose(A.sample(m2, t)['q'][b], -A.sample(C[False]['walk_fwd'], t)['q'][b]) for t in (0.1, 0.33, 0.7) for b in A.BONES if b in A.sample(m2, t)['q']))

# ---------------------------------------------------------------- 2. stretch over the loops
print('\n== 2. stretch per clip (24 frames, limits applied). max over frames: >3x / >6x / >10x / worst edge')
NF = 24
def frames(c): return [(i * c['duration'] / NF) for i in range(NF)]
RES = {}
def run_clip(m, c):
    r = rigs[m]; mx = [0, 0, 0, 0.0]
    for t in frames(c):
        n3, n6, n10, w = r.counts(lim(A.sample(c, t), m)); mx = [max(mx[0], n3), max(mx[1], n6), max(mx[2], n10), max(mx[3], w)]
    return mx
print(f"{'model':11s} {'var':6s} {'GUARD':>22s} {'idle':>22s} {'walk_fwd':>22s} {'walk_back':>22s}  verdict")
for m in MODELS:
    var = m in WIDE; cs = C[var]; r = rigs[m]
    g = r.counts(lim(cs['stance'], m)); gm = [g[0], g[1], g[2], g[3]]
    row = {'GUARD': gm}
    for cn in ('idle', 'walk_fwd', 'walk_back'): row[cn] = run_clip(m, cs[cn])
    RES[m] = row
    f = lambda x: f'{x[0]}/{x[1]}/{x[2]}/{x[3]:.1f}x'
    inb = {k: (v[2] <= 20 and v[1] <= 120) for k, v in row.items()}
    clip_ok = all(inb[k] for k in ('idle', 'walk_fwd', 'walk_back'))
    verdict = 'PASS' if clip_ok else ('INHERITED (stance itself over budget)' if not inb['GUARD'] else 'FAIL')
    print(f"{m:11s} {'narrow' if var else 'normal':6s} {f(row['GUARD']):>22s} {f(row['idle']):>22s} {f(row['walk_fwd']):>22s} {f(row['walk_back']):>22s}  {verdict}")
    chk(f'{m}: clips within budget or inherited from an over-budget stance', clip_ok or not inb['GUARD'])
    chk(f'{m}: idle adds at most 5 edges >6x over the stance', row['idle'][1] <= row['GUARD'][1] + 5)

# ---------------------------------------------------------------- 3. crossfades
print('\n== 3. crossfades (0.12 s, 6 steps): idle->walk_fwd, walk_fwd->walk_back')
for m in MODELS:
    cs = C[m in WIDE]; r = rigs[m]; out = []
    for a, b in (('idle', 'walk_fwd'), ('walk_fwd', 'walk_back')):
        pa = A.sample(cs[a], 0.3); pb = A.sample(cs[b], 0.0); ends = max(r.counts(lim(pa, m))[1], r.counts(lim(pb, m))[1]); mxx = 0
        for s in range(7):
            p = A.crossfade(pa, pb, s * 0.02, 0.12); mxx = max(mxx, r.counts(lim(p, m))[1])
        out.append((a + '->' + b, ends, mxx)); chk(f'{m}: {a}->{b} crossfade max >6x ({mxx}) <= endpoints ({ends}) + 5', mxx <= ends + 5)
    print(f'  {m:11s} ' + '; '.join(f'{n}: ends {e}, worst step {x}' for n, e, x in out))

# ---------------------------------------------------------------- 4. ground contact
print('\n== 4. ground contact (cm). SINK = lowest foot joint below its rest height; HOVER = lowest foot joint above it')
FOOT = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def foot_min(r, p): return min(r.joint_pos(p, b)[1] for b in FOOT)
GL = {}
for m in MODELS:
    r = rigs[m]; cs = C[m in WIDE]; rest = foot_min(r, A.pose()); GL[m] = {}
    for cn in ('stance', 'idle', 'walk_fwd', 'walk_back'):
        c = cs[cn]; ts = [0.0] if cn == 'stance' else frames(c)
        sinks = []; sinks_l = []; clamp = 0
        for t in ts:
            p = lim(A.sample(c, t) if cn != 'stance' else c, m); d = rest - foot_min(r, p); sinks.append(d)
            off = float(np.clip(d, -0.05, 0.05)); clamp += abs(d) > 0.05
            p2 = {'q': p['q'], 'root': p['root'] + np.array([0, off, 0])}; sinks_l.append(rest - foot_min(r, p2))
        GL[m][cn] = (max(sinks) * 100, min(sinks) * 100, max(sinks_l) * 100, min(sinks_l) * 100, clamp)
    print(f"  {m:11s} " + '  '.join(f"{cn}: sink {v[0]:+.1f} hover {-v[1]:+.1f} | locked sink {v[2]:+.1f} hover {-v[3]:+.1f} clamp {v[4]}" for cn, v in GL[m].items() if cn != 'stance'))
    print(f"  {'':11s} stance: sink {GL[m]['stance'][0]:+.1f} hover {-GL[m]['stance'][1]:+.1f}")

# ---------------------------------------------------------------- 5. stance hands, normal vs narrow
print('\n== 5. guard hands in the stance: sideways distance of each hand joint from the Head joint (cm), limits applied')
for m in MODELS:
    r = rigs[m]; o = []
    for var in (False, True):
        p = lim(C[var]['stance'], m); hx = r.joint_pos(p, 'Head')[0]
        o.append((abs(r.joint_pos(p, 'LeftHand')[0] - hx) * 100, abs(r.joint_pos(p, 'RightHand')[0] - hx) * 100))
    print(f"  {m:11s} normal L {o[0][0]:5.1f} R {o[0][1]:5.1f}   narrow L {o[1][0]:5.1f} R {o[1][1]:5.1f}   used: {'narrow' if m in WIDE else 'normal'}")

# ---------------------------------------------------------------- 6. sensitivity (reported only)
print('\n== 6. sensitivity of the walk amplitude: max edges >6x over the walk_fwd loop (k=0.7, 1.0, 1.3)')
for m in MODELS:
    o = []
    for k in (0.7, 1.0, 1.3):
        o.append(run_clip(m, build(m in WIDE, k)['walk_fwd'])[1])
    print(f'  {m:11s} {o}')

# ---------------------------------------------------------------- export JSON (normal and narrow)
os.makedirs(f'{ROOT}/anim', exist_ok=True)
out = {}
for var, nm in ((False, ''), (True, '_narrow')):
    for cn in ('idle', 'walk_fwd', 'walk_back'):
        out[cn + nm] = A.clip_to_json({**C[var][cn], 'name': cn + nm})
json.dump({'_note': 'Part 4-2. Loops. Unlimited poses; apply limits_4_1.json at play time. narrow variants are for kejriwal, mamata, sitharaman, kharge.',
           'clips': out}, open(f'{ROOT}/anim/stance_walk_4_2.json', 'w'), indent=1, sort_keys=True)
print(f'\n{npass} checks passed, {nfail} failed')
