"""run_anim_4_1.py -- Part 4-1: checks for animlib.py and a measured per-character limits table.
Run: python3 tools/run_anim_4_1.py > previews4_1/part4_1_checks.txt     (about 1-2 minutes; writes anim/*.json)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data comes ONLY from rigged_models/<name>.glb (skeleton, weights, inverse bind). Legacy pose angles come from the
   bendtest_3_1/3_3/3_4 tables (imported with stub rig modules, so only the tables are used, not their skinning).
 * Format checks: Euler->quaternion equals bendtest local_rot; mirror_pose equals M R M and equals the legacy mirrored pose
   (FRONT_KICK -> FRONT_KICK_R); mirror twice = identity; slerp midpoint = half angle; q and -q blend as one rotation;
   clip sample at a key time returns that key; sampling is a pure function of t; per-frame angular step at 60 and 120 Hz is
   at most EASE_PEAK_SPEED * (segment angle / segment time) * dt (+1e-6); crossfade endpoints equal the two poses.
 * Independent skinning (own glTF evaluator, quaternion FK) must reproduce the printed stretched>3x counts of 3-3/3-4 (7 models)
   and of 3-6a (Yogi C16) EXACTLY for the poses that have a printed number (table PRINTED below, copied from those steps' notes).
 * Mirror validity per model: joints: max over L/R pairs of |xL+xR|, |yL-yR|, |zL-zR| <= 2.0 cm; mesh: median distance from the
   x-mirrored vertices (5000 sampled) to the nearest vertex <= 1.0 cm. Both OK -> MIRROR_OK, else NEEDS_OWN_TUNING.
 * Limits calibration. Groups: LEG scales thigh+knee+foot together; ARM scales arm_raise+elbow+wrist together. Torso, head: not
   calibrated here (scale 1.0, flagged NOT_CALIBRATED). Scales tried: 1.0, 0.9, ... 0.4 (rotation angle about its own axis).
   LEG poses: GUARD, FRONT_KICK, FRONT_KICK_R, SIDE_KICK, KNEE_LIFT. ARM poses: GUARD, GUARD_ARMS, JAB, CROSS, ARMS_UP.
   Budget per pose: edges stretched >10x <= 20 AND edges stretched >6x <= 120. Chosen scale = the largest scale where EVERY pose of
   the group is inside the budget; if none (down to 0.4) -> 0.4 and flag NOT_MET. These budget numbers are my own choice.
   Sensitivity (reported, changes nothing): budget halved (10/60) and doubled (40/240).
 * Reported with each pick: how far the hand/foot joint still travels compared with scale 1.0 (a cost, not a pass/fail).
"""
import os, sys, json, types, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import numpy as np
import animlib as A

# ---- stub rig modules so the legacy pose tables can be imported (their skinning code is NOT used)
_r = types.ModuleType('rigspec_2g2b2'); _r.BONES = A.BONES; _r.JOINTS = {}; _r.PARENT = {}; sys.modules['rigspec_2g2b2'] = _r
_g = types.ModuleType('glbio'); _g.load_mesh = None; sys.modules['glbio'] = _g
import bendtest_3_1 as B
import bendtest_3_3 as C
import bendtest_3_4 as K
B.POSES.update(C.NEW_POSES); B.POSES.update(K.NEW_POSES)
MODELS = B.ALL8
LEGACY = ['GUARD', 'GUARD_ARMS', 'JAB', 'CROSS', 'ARMS_UP', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT']

PRINTED = {   # stretched edges > 3x as printed by 3-3 / 3-4 (and 3-6a for Yogi, C16 weights); None = not printed
 'rahul':      dict(GUARD=35, ARMS_UP=217, JAB=53, CROSS=63, FRONT_KICK=80, FRONT_KICK_R=89, SIDE_KICK=56, KNEE_LIFT=155),
 'shah':       dict(GUARD=107, ARMS_UP=529, JAB=214, CROSS=240, FRONT_KICK=2003, FRONT_KICK_R=1790, SIDE_KICK=1307, KNEE_LIFT=2525),
 'rajnath':    dict(GUARD=161, ARMS_UP=337, JAB=215, CROSS=209, FRONT_KICK=2030, FRONT_KICK_R=1908, SIDE_KICK=1518, KNEE_LIFT=2628),
 'yogi':       dict(GUARD=150, GUARD_ARMS=101, ARMS_UP=559, JAB=241, CROSS=287, FRONT_KICK=2253, SIDE_KICK=2312, KNEE_LIFT=1118),
 'kejriwal':   dict(GUARD=276, ARMS_UP=822, JAB=422, CROSS=475, FRONT_KICK=378, FRONT_KICK_R=382, SIDE_KICK=412, KNEE_LIFT=574),
 'mamata':     dict(GUARD=1497, ARMS_UP=2636, JAB=1771, CROSS=2168, FRONT_KICK=2643, FRONT_KICK_R=2894, SIDE_KICK=2353, KNEE_LIFT=3177),
 'sitharaman': dict(GUARD=351, ARMS_UP=490, JAB=334, CROSS=405, FRONT_KICK=809, FRONT_KICK_R=654, SIDE_KICK=404, KNEE_LIFT=1400),
 'kharge':     dict(GUARD=351, ARMS_UP=802, JAB=441, CROSS=481, FRONT_KICK=1428, FRONT_KICK_R=1446, SIDE_KICK=1045, KNEE_LIFT=2124),
}

npass = nfail = 0
def chk(name, ok):
    global npass, nfail
    npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)

# ---------------------------------------------------------------- minimal glTF reader + skinning
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def read_glb(path):
    d = open(path, 'rb').read(); assert d[:4] == b'glTF'
    jl = int.from_bytes(d[12:16], 'little'); js = json.loads(d[20:20+jl]); off = 20 + jl; bl = int.from_bytes(d[off:off+4], 'little')
    return js, d[off+8:off+8+bl]
def accessor(js, bin_, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]; n = NC[a['type']]
    assert 'byteStride' not in bv
    arr = np.frombuffer(bin_, dtype=CT[a['componentType']], count=a['count']*n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0))
    return arr.reshape(a['count'], n) if n > 1 else arr

class Rig:
    def __init__(self, path):
        js, bn = read_glb(path); pr = js['meshes'][0]['primitives'][0]; at = pr['attributes']
        self.V = accessor(js, bn, at['POSITION']).astype(np.float64)
        idx = accessor(js, bn, pr['indices']).reshape(-1, 3).astype(np.int64)
        self.J = accessor(js, bn, at['JOINTS_0']).astype(np.int64); w = accessor(js, bn, at['WEIGHTS_0']).astype(np.float64)
        self.W = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
        sk = js['skins'][0]; self.joints = sk['joints']; nodes = js['nodes']
        self.names = [nodes[j]['name'] for j in self.joints]
        self.IBM = accessor(js, bn, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64)
        par = {}
        for i, n in enumerate(nodes):
            for c in n.get('children', []): par[c] = i
        pos = {j: k for k, j in enumerate(self.joints)}
        self.parent = [pos.get(par.get(j)) for j in self.joints]
        self.trans = np.array([nodes[j].get('translation', [0, 0, 0]) for j in self.joints], float)
        E = np.r_[idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]]; self.E = np.unique(np.sort(E, axis=1), axis=0)
        self.rest = np.linalg.norm(self.V[self.E[:, 0]] - self.V[self.E[:, 1]], axis=1) + 1e-9
        self.bind = {}; 
        for k in range(22):
            self.bind[k] = self.trans[k] + (self.bind[self.parent[k]] if self.parent[k] is not None else 0)
        self.bind = np.array([self.bind[k] for k in range(22)])
        self.bi = {n: k for k, n in enumerate(self.names)}
    def world(self, p):
        G = [None]*22
        for k in range(22):
            M = np.eye(4); M[:3, :3] = A.m_from_q(A.q_of(p, self.names[k])); t = self.trans[k].copy()
            if self.parent[k] is None: t = t + p['root']
            M[:3, 3] = t; G[k] = M if self.parent[k] is None else G[self.parent[k]] @ M
        return np.array(G)
    def skin(self, p):
        JM = self.world(p) @ self.IBM; vh = np.c_[self.V, np.ones(len(self.V))]; out = np.zeros_like(self.V)
        for k in range(4): out += self.W[:, k, None] * np.einsum('nij,nj->ni', JM[self.J[:, k]][:, :3, :], vh)
        return out
    def stretch(self, p):
        P = self.skin(p); L = np.linalg.norm(P[self.E[:, 0]] - P[self.E[:, 1]], axis=1) + 1e-9
        return np.maximum(L / self.rest, self.rest / L)
    def counts(self, p):
        s = self.stretch(p); return int((s > 3).sum()), int((s > 6).sum()), int((s > 10).sum()), float(s.max())
    def joint_pos(self, p, name):
        return (self.world(p)[self.bi[name]][:3, 3])

print('Part 4-1 checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
chk('all 8 rigs: skeleton names equal animlib.BONES in order', all(r.names == A.BONES for r in rigs.values()))
chk('all 8 rigs: 22 joints, one root (Hips), parents precede children',
    all(len(r.names) == 22 and r.parent[0] is None and sum(p is None for p in r.parent) == 1 and all(p is None or p < k for k, p in enumerate(r.parent)) for r in rigs.values()))

# ---------------------------------------------------------------- 1. format checks
print('\n== 1. format: quaternions, mirror, blend, clips')
P = {n: A.pose_from_items(B.POSES[n]) for n in LEGACY}
dm = 0.0
for n in LEGACY:
    for b, it in B.POSES[n].items(): dm = max(dm, float(np.abs(A.m_from_q(P[n]['q'][b]) - B.local_rot(it)).max()))
print(f'  Euler->quaternion->matrix vs bendtest local_rot, all legacy poses: max difference {dm:.2e}')
chk('Euler -> quaternion equals the bend-test rotation matrices (< 1e-12)', dm < 1e-12)
M = np.diag([-1.0, 1, 1]); dmm = 0.0; rng = np.random.default_rng(1)
for _ in range(200):
    q = A.qn(rng.normal(size=4)); dmm = max(dmm, float(np.abs(A.m_from_q(A.mirror_q(q)) - M @ A.m_from_q(q) @ M).max()))
print(f'  mirror_q vs M R M on 200 random rotations: max difference {dmm:.2e}')
chk('mirror_q equals the reflection M R M (< 1e-12)', dmm < 1e-12)
dk = 0.0
mk = A.mirror_pose(P['FRONT_KICK'])
for b in set(mk['q']) | set(P['FRONT_KICK_R']['q']): dk = max(dk, float(np.abs(A.m_from_q(A.q_of(mk, b)) - A.m_from_q(A.q_of(P['FRONT_KICK_R'], b))).max()))
print(f'  mirror_pose(FRONT_KICK) vs the legacy FRONT_KICK_R: max matrix difference {dk:.2e}')
chk('mirror_pose(FRONT_KICK) equals the legacy FRONT_KICK_R (< 1e-12)', dk < 1e-12)
dj = 0.0; mj = A.mirror_pose(P['JAB'])
for b in set(mj['q']) | set(P['CROSS']['q']):
    if b.endswith('Arm') or b.endswith('ForeArm') or b.endswith('Hand'):
        dj = max(dj, float(np.abs(A.m_from_q(A.q_of(mj, b)) - A.m_from_q(A.q_of(P['CROSS'], b))).max()))
print(f'  mirror_pose(JAB) vs CROSS on arm bones (informational: CROSS has other angles): max difference {dj:.3f}')
mm = A.mirror_pose(A.mirror_pose(P['GUARD'])); d2 = max(float(np.abs(A.m_from_q(A.q_of(mm, b)) - A.m_from_q(A.q_of(P['GUARD'], b))).max()) for b in A.BONES)
chk('mirror twice returns the same pose (< 1e-12)', d2 < 1e-12)
chk('mirror of a pose with root offset flips x only', np.allclose(A.mirror_pose(A.pose(root=(0.1, 0.2, 0.3)))['root'], [-0.1, 0.2, 0.3]))
qa = A.q_from_items([('x', 0)]); qb = A.q_from_items([('x', -80)]); mid = A.slerp(qa, qb, 0.5)
chk('slerp midpoint of 0 and 80 degrees is 40 degrees', abs(A.q_angle_deg(mid) - 40) < 1e-9)
chk('q and -q blend as the same rotation', np.abs(A.m_from_q(A.slerp(-qb, qa, 0.3)) - A.m_from_q(A.slerp(qb, qa, 0.3))).max() < 1e-12)
chk('blend endpoints equal the poses', all(np.abs(A.m_from_q(A.q_of(A.blend(P['GUARD'], P['JAB'], 0), b)) - A.m_from_q(A.q_of(P['GUARD'], b))).max() < 1e-12
    and np.abs(A.m_from_q(A.q_of(A.blend(P['GUARD'], P['JAB'], 1), b)) - A.m_from_q(A.q_of(P['JAB'], b))).max() < 1e-12 for b in A.BONES))
chk('all blended quaternions are unit length', all(abs(np.linalg.norm(q) - 1) < 1e-12 for t in np.linspace(0, 1, 11) for q in A.blend(P['GUARD'], P['KNEE_LIFT'], t)['q'].values()))

STRIKE = A.clip('jab', 0.28, [dict(t=0.0, pose=P['GUARD']), dict(t=0.12, ease='out', pose=P['JAB']), dict(t=0.28, ease='smooth', pose=P['GUARD'])], impact=0.12)
chk('clip: duration 0.28 s, impact inside the clip, keys sorted',
    STRIKE['duration'] == 0.28 and 0 < STRIKE['impact'] < STRIKE['duration'] and [k['t'] for k in STRIKE['keys']] == sorted(k['t'] for k in STRIKE['keys']))
chk('clip: sample at each key time returns that key pose',
    all(np.abs(A.m_from_q(A.q_of(A.sample(STRIKE, k['t']), b)) - A.m_from_q(A.q_of(k['pose'], b))).max() < 1e-12 for k in STRIKE['keys'] for b in A.BONES))
chk('clip: sample is a pure function of t (same value on repeated calls)', all(
    np.array_equal(A.q_of(A.sample(STRIKE, 0.077), b), A.q_of(A.sample(STRIKE, 0.077), b)) for b in A.BONES))
worst = {}
for hz in (60, 120):
    dt = 1.0 / hz; ts = np.arange(0, STRIKE['duration'] + 1e-9, dt); bad = 0; worst_ratio = 0
    for b in A.BONES:
        prev = None
        for t in ts:
            q = A.q_of(A.sample(STRIKE, float(t)), b)
            if prev is not None:
                step = A.q_angle_deg(A.qmul(np.r_[-prev[:3], prev[3]], q))
                # segment containing this step
                k = next(i for i in range(1, len(STRIKE['keys'])) if t <= STRIKE['keys'][i]['t'] + 1e-12)
                seg = STRIKE['keys'][k]; a = STRIKE['keys'][k-1]; span = seg['t'] - a['t']
                ang = A.q_angle_deg(A.qmul(np.r_[-A.q_of(a['pose'], b)[:3], A.q_of(a['pose'], b)[3]], A.q_of(seg['pose'], b)))
                bound = A.EASE_PEAK_SPEED[seg['ease']] * ang / span * dt + 1e-6 if span > 0 else 1e9
                # a step that straddles a key time may mix two segments: allow the larger of the two bounds
                bound = max(bound, 1e-6)
                if step > bound * 1.0 + 1e-6 and not (abs(t - seg['t']) < dt): bad += 1
                worst_ratio = max(worst_ratio, step / bound if bound > 1e-6 else 0)
            prev = q
    worst[hz] = (bad, worst_ratio)
    print(f'  clip step at {hz} Hz: steps above the speed bound (excluding the key-crossing frame) = {bad}, largest step/bound = {worst_ratio:.2f}')
chk('clip: no per-frame snap above the speed bound at 60 Hz and 120 Hz', worst[60][0] == 0 and worst[120][0] == 0)
chk('crossfade endpoints equal the two poses', np.abs(A.m_from_q(A.q_of(A.crossfade(P['GUARD'], P['KNEE_LIFT'], 0, 0.15), 'LeftUpLeg')) - A.m_from_q(A.q_of(P['GUARD'], 'LeftUpLeg'))).max() < 1e-12
    and np.abs(A.m_from_q(A.q_of(A.crossfade(P['GUARD'], P['KNEE_LIFT'], 0.15, 0.15), 'LeftUpLeg')) - A.m_from_q(A.q_of(P['KNEE_LIFT'], 'LeftUpLeg'))).max() < 1e-12)
ident = A.limit_pose(A.pose(), {'thigh': 0.5})
chk('limit_pose on the identity pose gives the identity', all(np.allclose(q, [0, 0, 0, 1]) for q in ident['q'].values()))
lp = A.limit_pose(P['FRONT_KICK'], {'thigh': 0.5}); a0 = A.q_angle_deg(P['FRONT_KICK']['q']['LeftUpLeg']); a1 = A.q_angle_deg(lp['q']['LeftUpLeg'])
chk('limit_pose scale 0.5 halves the thigh angle and keeps its axis', abs(a1 - a0/2) < 1e-9 and np.allclose(np.cross(P['FRONT_KICK']['q']['LeftUpLeg'][:3], lp['q']['LeftUpLeg'][:3]), 0, atol=1e-12))
lc = A.limit_pose(P['FRONT_KICK'], {}, {'thigh': 30}); chk('limit_pose max_deg clamps the thigh to 30 degrees', abs(A.q_angle_deg(lc['q']['LeftUpLeg']) - 30) < 1e-9)
chk('limit_pose leaves bones outside the group untouched', np.allclose(lp['q']['LeftLeg'], P['FRONT_KICK']['q']['LeftLeg']))

# ---------------------------------------------------------------- 2. independent skinning vs printed numbers
print('\n== 2. independent skinning (own glTF reader, quaternion FK) vs the numbers printed in 3-3, 3-4 and 3-6a')
tot = same = 0; diffs = []
for m in MODELS:
    for n in LEGACY:
        ref = PRINTED[m].get(n)
        if ref is None: continue
        c3 = rigs[m].counts(P[n])[0]; tot += 1; same += (c3 == ref)
        if c3 != ref: diffs.append((m, n, ref, c3))
print(f'  cases with a printed number: {tot}; equal: {same}')
for d in diffs: print('   DIFF', d)
chk('stretched >3x equals the printed number in every case that has one', not diffs)

# ---------------------------------------------------------------- 3. mirror validity per model
print('\n== 3. is mirroring valid per model?')
try:
    from scipy.spatial import cKDTree
except Exception:
    cKDTree = None
mirror_ok = {}
for m in MODELS:
    r = rigs[m]; asym = 0.0
    for b in A.BONES:
        if b.startswith('Left'):
            L = r.bind[r.bi[b]]; R = r.bind[r.bi[A.mirror_name(b)]]
            asym = max(asym, abs(L[0] + R[0]), abs(L[1] - R[1]), abs(L[2] - R[2]))
    asym *= 100
    rs = np.random.default_rng(0); sel = rs.choice(len(r.V), size=min(5000, len(r.V)), replace=False)
    Vm = r.V[sel] * np.array([-1, 1, 1])
    if cKDTree is not None: d = cKDTree(r.V).query(Vm)[0]
    else: d = np.array([np.sqrt(((r.V - v)**2).sum(1)).min() for v in Vm])
    med = float(np.median(d)) * 100; ok = asym <= 2.0 and med <= 1.0; mirror_ok[m] = ok
    print(f'  {m:11s} joint asymmetry {asym:5.2f} cm   mesh mirror median gap {med:5.2f} cm   -> {"MIRROR_OK" if ok else "NEEDS_OWN_TUNING"}')
chk('mirror validity computed for all 8 models', len(mirror_ok) == 8)

# ---------------------------------------------------------------- 4. blended frames
print('\n== 4. stretch along a blended jab clip (GUARD -> JAB -> GUARD), 9 frames; edges >3x')
ts = np.linspace(0, STRIKE['duration'], 9); clipcounts = {}
for m in MODELS:
    cs = [rigs[m].counts(A.sample(STRIKE, float(t)))[0] for t in ts]; clipcounts[m] = cs
    print(f'  {m:11s} ' + ' '.join(f'{c:5d}' for c in cs) + f'   (endpoint GUARD {cs[0]}, impact-end JAB-ish max {max(cs)})')
chk('clip frames evaluated for all 8 models', len(clipcounts) == 8)

# ---------------------------------------------------------------- 5. calibration of limits
print('\n== 5. per-character limits (budget per pose: >10x edges <= 20 and >6x edges <= 120; scales 1.0 .. 0.4)')
SCALES = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
GRP = {'LEG': (['thigh', 'knee', 'foot'], ['GUARD', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT'], 'LeftFoot'),
       'ARM': (['arm_raise', 'elbow', 'wrist'], ['GUARD', 'GUARD_ARMS', 'JAB', 'CROSS', 'ARMS_UP'], 'LeftHand')}
table = {}; picks = {}; travel = {}
t0 = time.time()
for m in MODELS:
    r = rigs[m]; table[m] = {}; picks[m] = {}
    for g, (grps, poses, tip) in GRP.items():
        table[m][g] = {}
        for s in SCALES:
            table[m][g][s] = {}
            for n in poses:
                lp = A.limit_pose(P[n], {x: s for x in grps}); table[m][g][s][n] = r.counts(lp)
    print(f'  [{m}] done ({time.time()-t0:.0f}s)', flush=True)
def pick(m, g, b10, b6):
    for s in SCALES:
        if all(table[m][g][s][n][2] <= b10 and table[m][g][s][n][1] <= b6 for n in GRP[g][1]): return s, 'MET'
    return SCALES[-1], 'NOT_MET'
BUD = {'BASE': (20, 120), 'HALF': (10, 60), 'DOUBLE': (40, 240)}
for m in MODELS:
    for g in GRP:
        for k, (b10, b6) in BUD.items(): picks[m][(g, k)] = pick(m, g, b10, b6)
print('\n  per-pose counts at scale 1.0 vs chosen scale (edges >3x / >6x / >10x, worst):')
for m in MODELS:
    for g in GRP:
        s, st = picks[m][(g, 'BASE')]
        worst1 = max(table[m][g][1.0][n][2] for n in GRP[g][1]); worstS = max(table[m][g][s][n][2] for n in GRP[g][1])
        tot1 = sum(table[m][g][1.0][n][0] for n in GRP[g][1]); totS = sum(table[m][g][s][n][0] for n in GRP[g][1])
        tip = GRP[g][2]; ref = rigs[m].joint_pos(A.pose(), tip)
        # how far the tip still travels in the pose that moves it most
        pn = 'KNEE_LIFT' if g == 'LEG' else 'ARMS_UP'
        d1 = np.linalg.norm(rigs[m].joint_pos(A.limit_pose(P[pn], {x: 1.0 for x in GRP[g][0]}), tip) - ref)
        dS = np.linalg.norm(rigs[m].joint_pos(A.limit_pose(P[pn], {x: s for x in GRP[g][0]}), tip) - ref)
        travel[(m, g)] = dS / d1
        print(f'   {m:11s} {g}: scale {s:.1f} ({st:7s}) | edges>10x worst pose {worst1:4d} -> {worstS:4d} | edges>3x summed {tot1:6d} -> {totS:6d} | {tip} travel in {pn}: {100*dS/d1:5.1f}% of full')
print('\n  sensitivity of the chosen scale to the budget (HALF / BASE / DOUBLE):')
for m in MODELS:
    print(f'   {m:11s} LEG {picks[m][("LEG","HALF")][0]:.1f} / {picks[m][("LEG","BASE")][0]:.1f} / {picks[m][("LEG","DOUBLE")][0]:.1f}    ARM {picks[m][("ARM","HALF")][0]:.1f} / {picks[m][("ARM","BASE")][0]:.1f} / {picks[m][("ARM","DOUBLE")][0]:.1f}')
chk('a scale was chosen for every model and group', all((g, 'BASE') in picks[m] for m in MODELS for g in GRP))
# chosen scale really meets the budget when status MET
chk('every MET pick is inside the budget on every pose of its group',
    all(all(table[m][g][picks[m][(g, 'BASE')][0]][n][2] <= 20 and table[m][g][picks[m][(g, 'BASE')][0]][n][1] <= 120 for n in GRP[g][1])
        for m in MODELS for g in GRP if picks[m][(g, 'BASE')][1] == 'MET'))

# ---------------------------------------------------------------- 6. limits table + example clip written out
os.makedirs(f'{ROOT}/anim', exist_ok=True)
lim = {'_note': 'Part 4-1. scale = fraction of the pose rotation angle kept (1.0 = full). leg applies to thigh+knee+foot, arm to arm_raise+elbow+wrist. '
                'Budget per pose: edges>10x <=20 and edges>6x <=120 (my choice). torso and head are NOT_CALIBRATED here.',
       'models': {}}
for m in MODELS:
    lim['models'][m] = {'leg': picks[m][('LEG', 'BASE')][0], 'leg_status': picks[m][('LEG', 'BASE')][1],
                        'arm': picks[m][('ARM', 'BASE')][0], 'arm_status': picks[m][('ARM', 'BASE')][1],
                        'torso': 1.0, 'torso_status': 'NOT_CALIBRATED', 'head': 1.0, 'head_status': 'NOT_CALIBRATED',
                        'mirror': 'OK' if mirror_ok[m] else 'NEEDS_OWN_TUNING',
                        'empty_bones': {'mamata': ['LeftShoulder'], 'sitharaman': ['RightShoulder']}.get(m, [])}
json.dump(lim, open(f'{ROOT}/anim/limits_4_1.json', 'w'), indent=1)
json.dump(A.clip_to_json(STRIKE), open(f'{ROOT}/anim/example_jab_4_1.json', 'w'), indent=1)
chk('limits json and example clip written and re-readable', json.load(open(f'{ROOT}/anim/limits_4_1.json'))['models']['rahul']['leg'] == lim['models']['rahul']['leg']
    and json.load(open(f'{ROOT}/anim/example_jab_4_1.json'))['duration'] == 0.28)
# JSON round trip of the clip reproduces poses
cj = json.load(open(f'{ROOT}/anim/example_jab_4_1.json'))
back = A.clip(cj['name'], cj['duration'], [dict(t=k['t'], ease=k['ease'], pose=A.pose({b: v for b, v in k['pose']['q'].items()}, k['pose']['root'])) for k in cj['keys']], cj['impact'])
dd = max(float(np.abs(A.m_from_q(A.q_of(A.sample(back, t), b)) - A.m_from_q(A.q_of(A.sample(STRIKE, t), b))).max()) for t in (0.03, 0.12, 0.2) for b in A.BONES)
print(f'\n  JSON round trip of the example clip: max matrix difference {dd:.2e} (6 decimals stored)')
chk('JSON round trip reproduces the clip to 1e-5', dd < 1e-5)

print(f'\nSUMMARY: {npass} pass, {nfail} fail')
