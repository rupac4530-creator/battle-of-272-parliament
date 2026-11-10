"""run_anim_4_5.py -- Part 4-5: jab (left lead) and cross (right rear) in the 4-1 format + checks.
Run: python3 tools/run_anim_4_5.py > previews4_5/part4_5_checks.txt     (about 2 minutes; writes anim/punches_4_5.json and anim/punch_pick_4_5.json)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data only from rigged_models/<name>.glb via animrig.Rig. Stance = the 4-4 stance (3-1 GUARD table; narrow variant for the wide four) PLUS the 4-2b inward guard
   (anim/narrow_guard_4_2b.json: LeftArm z=-d, RightArm z=+d, d = 40 Kejriwal/Sitharaman/Kharge, 0 Mamata). Angles are my own choice, not measured, not mocap.
   Sign convention as in 4-4: arm x NEGATIVE = raise forward; Spine y NEGATIVE = turn the left side forward (left punch), y POSITIVE = right side forward; LeftArm z + = swing out.
   Root is 0 (the game owns movement). Per-character limits (anim/limits_4_1.json) are applied to every pose at play time.
 * Clips, both 0.28 s (the game's strike time), one-shot:
     jab    keys: 0 stance | 0.05 JW (smooth) | 0.12 JI IMPACT (ease out) | 0.17 JH (smooth) | 0.28 stance (smooth).
       JW = stance + LeftArm x +8, LeftForeArm x -12, Spine y +3, Spine1 y +3.
       JI = stance with LeftArm = [z (5 - e), x -88], LeftForeArm = [x -8], LeftHand = [x -5], then Spine y -6, Spine1 y -6.   (e = inward swing, see below)
       JH = blend(JI, stance, 0.25).
     cross  keys: 0 stance | 0.07 CW (smooth) | 0.13 CI IMPACT (ease out) | 0.18 CH (smooth) | 0.28 stance (smooth).
       CW = stance + RightArm x +8, RightForeArm x -12, Hips y -4, Spine y -6, Spine1 y -6.
       CI = stance with RightArm = [z (-5 + e), x -88], RightForeArm = [x -8], RightHand = [x -5], then Hips y +8, Spine y +12, Spine1 y +12.
       CH = blend(CI, stance, 0.25).
   e = 0 for the four narrow-body models (Rahul, Shah, Rajnath, Yogi). For the wide four e is chosen from 0, 10, 20, 30, 40 (see PICK).
 * Format checks: both clips start and end in the stance; duration 0.28 and impact time equals the IMPACT key time; per-frame step at 60 and 120 Hz <= max over EVERY segment
   the step spans of EASE_PEAK_SPEED(ease) * segment angle / segment time * dt + 1e-3; sample() is a pure function of t; mirror_pose twice is the identity.
 * Stretch: 13 grid frames (ends included) PLUS the exact impact frame, limits applied, GLB skinning; max over frames of edges >3x, >6x, >10x and the worst edge.
   S1 budget: edges >10x <= 20 and >6x <= 120 in every frame (a model whose limited stance already breaks it = INHERITED).
   S2 worst-edge cap: worst edge <= max(2 x stance worst edge, 25x).
   S3 between-frames: clip max edges >6x <= max over the clip's key poses + 10.
 * PICK (wide four only): candidate e in 0, 10, 20, 30, 40, measured on both clips (after limits). Eligible if, relative to e = 0, in BOTH clips:
   edges >6x <= (e=0 value) + 10, edges >10x <= max(20, e=0 value), worst <= max(2 x e=0 worst, 25x), AND the impact hand joint is still at least 0.9 x as far in front of the Head joint
   (z, cm) as at e = 0. PICK = the largest eligible e. e = 0 is always eligible. Reported: impact hand |x| (cm from the midline) per candidate.
 * Reach (reported, every model, after limits): impact hand joint z minus Head joint z (cm), impact hand |x| (cm), shoulder-to-hand distance at impact divided by the hanging
   arm length at rest, and the share of the unlimited reach kept after the limits (hand z gain from the stance, limited / unlimited).
 * Combo crossfade (reported + check): jab at t = 0.20 s into the cross start pose CW over 0.06 s (7 steps): worst step edges >6x <= max(endpoint counts) + 5.
 * Ground contact: GROUND_LOCK need (cm) for JI and CI, flagged if |need| > 12.
 * Sensitivity (reported only): jab punch arm x = -75 / -88 / -100 -> max edges >6x over the jab clip.
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
src = open(f'{HERE}/run_anim_4_4.py').read().split("print('Part 4-4 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_4.py', '__name__': 'r44'}
exec(compile(src, 'run_anim_4_4_head', 'exec'), ns)
import numpy as np
A, Rig, MODELS, WIDE, B = ns['A'], ns['Rig'], ns['MODELS'], ns['WIDE'], ns['B']
add, merge, X, Y, Z, both, P, lim = ns['add'], ns['merge'], ns['X'], ns['Y'], ns['Z'], ns['both'], ns['P'], ns['lim']
orig_stance = ns['stance_spec']
GUARD_PICK = json.load(open(f'{ROOT}/anim/narrow_guard_4_2b.json'))['arm_in_deg']
ES = [0, 10, 20, 30, 40]
npass = nfail = 0
def chk(name, ok):
    global npass, nfail
    npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)

def stance_for(m):
    narrow = m in WIDE; s = orig_stance(narrow); d = GUARD_PICK.get(m, 0) if narrow else 0
    if narrow: s['LeftArm'] = [('z', -d), ('x', -35)]; s['RightArm'] = [('z', d), ('x', -35)]
    return s

def build(m, e, xext=-88):
    S = stance_for(m); st = P(S)
    # jab
    JW = P(add(S, merge({'LeftArm': X(8), 'LeftForeArm': X(-12), 'Spine': Y(3), 'Spine1': Y(3)})))
    Sj = {b: list(it) for b, it in S.items()}
    Sj['LeftArm'] = [('z', 5 - e), ('x', xext)]; Sj['LeftForeArm'] = [('x', -8)]; Sj['LeftHand'] = [('x', -5)]
    JI = P(add(Sj, {'Spine': Y(-6), 'Spine1': Y(-6)})); JH = A.blend(JI, st, 0.25)
    # cross
    CW = P(add(S, merge({'RightArm': X(8), 'RightForeArm': X(-12), 'Hips': Y(-4), 'Spine': Y(-6), 'Spine1': Y(-6)})))
    Sc = {b: list(it) for b, it in S.items()}
    Sc['RightArm'] = [('z', -5 + e), ('x', xext)]; Sc['RightForeArm'] = [('x', -8)]; Sc['RightHand'] = [('x', -5)]
    CI = P(add(Sc, {'Hips': Y(8), 'Spine': Y(12), 'Spine1': Y(12)})); CH = A.blend(CI, st, 0.25)
    k = lambda t, ea, p: {'t': t, 'ease': ea, 'pose': p}
    jab = A.clip('jab', 0.28, [k(0, 'smooth', st), k(0.05, 'smooth', JW), k(0.12, 'out', JI), k(0.17, 'smooth', JH), k(0.28, 'smooth', st)], impact=0.12)
    cross = A.clip('cross', 0.28, [k(0, 'smooth', st), k(0.07, 'smooth', CW), k(0.13, 'out', CI), k(0.18, 'smooth', CH), k(0.28, 'smooth', st)], impact=0.13)
    return dict(st=st, JW=JW, JI=JI, JH=JH, CW=CW, CI=CI, CH=CH), {'jab': jab, 'cross': cross}
KEYS = {'jab': ['st', 'JW', 'JI', 'JH'], 'cross': ['st', 'CW', 'CI', 'CH']}
IMP = {'jab': 'JI', 'cross': 'CI'}
HAND = {'jab': 'LeftHand', 'cross': 'RightHand'}; ARM = {'jab': 'LeftArm', 'cross': 'RightArm'}

def ang(pa, pb): return max([A.q_angle_deg(A.qmul(np.r_[-A.q_of(pa, b)[:3], A.q_of(pa, b)[3]], A.q_of(pb, b))) for b in A.BONES])
def qa(pa, pb, b): return A.q_angle_deg(A.qmul(np.r_[-A.q_of(pa, b)[:3], A.q_of(pa, b)[3]], A.q_of(pb, b)))

NF = 12
def times(c): return sorted(set([i * c['duration'] / NF for i in range(NF + 1)] + [c['impact']]))
def run_clip(m, c, r):
    mx = [0, 0, 0, 0.0]
    for t in times(c):
        n3, n6, n10, w = r.counts(lim(A.sample(c, t), m)); mx = [max(mx[0], n3), max(mx[1], n6), max(mx[2], n10), max(mx[3], w)]
    return mx
def reach(m, r, p, name):
    q = lim(p, m); H = r.joint_pos(q, HAND[name]); hd = r.joint_pos(q, 'Head'); sh = r.joint_pos(q, ARM[name])
    return (H[2] - hd[2]) * 100, abs(H[0]) * 100, np.linalg.norm(H - sh) * 100
f = lambda x: f'{x[0]}/{x[1]}/{x[2]}/{x[3]:.1f}'

print('Part 4-5 checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
rest = A.pose()
armlen = {m: {n: np.linalg.norm(rigs[m].joint_pos(rest, HAND[n]) - rigs[m].joint_pos(rest, ARM[n])) * 100 for n in KEYS} for m in MODELS}

print('== 0. e sweep for the wide four (after limits). per e and clip: max edges >6x / >10x / worst, impact hand z-in-front-of-head (cm), impact hand |x| (cm)')
PICK = {}; SW = {}
for m in WIDE:
    r = rigs[m]; rows = {}
    for e in ES:
        pp, cc = build(m, e)
        rows[e] = {n: (run_clip(m, cc[n], r), reach(m, r, pp[IMP[n]], n)) for n in cc}
        print(f"  {m:11s} e={e:2d}  jab {f(rows[e]['jab'][0])} z {rows[e]['jab'][1][0]:5.1f} |x| {rows[e]['jab'][1][1]:5.1f}   cross {f(rows[e]['cross'][0])} z {rows[e]['cross'][1][0]:5.1f} |x| {rows[e]['cross'][1][1]:5.1f}")
    def ok(e):
        for n in ('jab', 'cross'):
            a, rch = rows[e][n]; b, rch0 = rows[0][n]
            if not (a[1] <= b[1] + 10 and a[2] <= max(20, b[2]) and a[3] <= max(2 * b[3], 25) and rch[0] >= 0.9 * rch0[0]): return False
        return True
    el = [e for e in ES if ok(e)]; PICK[m] = max(el) if el else 0; SW[m] = rows
    print(f"  {m:11s} eligible e: {el}  -> PICK e = {PICK[m]}")

print('\n== 1. format and chain (picked e)')
CL = {}; PPS = {}
for m in MODELS:
    e = PICK.get(m, 0); PPS[m], CL[m] = build(m, e)
    pp, cc = PPS[m], CL[m]
    for n in ('jab', 'cross'):
        c = cc[n]; ks = c['keys']
        chk(f'{m} {n}: starts and ends in the stance', ang(ks[0]['pose'], pp['st']) < 1e-9 and ang(ks[-1]['pose'], pp['st']) < 1e-9)
        chk(f'{m} {n}: duration 0.28 s and impact time equals the IMPACT key time ({c["impact"]})', abs(c['duration'] - 0.28) < 1e-12 and any(abs(k['t'] - c['impact']) < 1e-12 and ang(k['pose'], pp[IMP[n]]) < 1e-9 for k in ks))
        for hz in (60, 120):
            dt = 1.0 / hz; nn = int(np.ceil(c['duration'] * hz - 1e-9)); prev = A.sample(c, 0.0); ok_ = True
            for i in range(1, nn + 1):
                t0 = (i - 1) * dt; t1 = min(i * dt, c['duration']); cur = A.sample(c, t1)
                segs = [j for j in range(1, len(ks)) if ks[j]['t'] > t0 + 1e-12 and ks[j - 1]['t'] < t1 - 1e-12]
                for b in A.BONES:
                    step = A.q_angle_deg(A.qmul(np.r_[-A.q_of(prev, b)[:3], A.q_of(prev, b)[3]], A.q_of(cur, b)))
                    bound = max(A.EASE_PEAK_SPEED[ks[j].get('ease', 'smooth')] * qa(ks[j - 1]['pose'], ks[j]['pose'], b) / (ks[j]['t'] - ks[j - 1]['t']) * dt for j in segs) + 1e-3 + 1e-6
                    if step > bound: ok_ = False
                prev = cur
            chk(f'{m} {n}: per-frame step within bound at {hz} Hz', ok_)
        a1 = A.sample(c, 0.05); a2 = A.sample(c, 0.05)
        chk(f'{m} {n}: sample() is a pure function of t', all(np.array_equal(a1['q'][b], a2['q'][b]) for b in a1['q']))
    mj = A.mirror_pose(A.mirror_pose(pp['JI']))
    chk(f'{m}: mirror_pose twice is the identity on the jab impact pose', ang(mj, pp['JI']) < 1e-9)

print('\n== 2. stretch per clip (13 grid frames + impact frame, limits applied). max over frames: >3x / >6x / >10x / worst edge')
print(f"{'model':11s} {'e':>3s} {'stance':>16s} {'jab':>17s} {'cross':>17s}  verdict")
for m in MODELS:
    r = rigs[m]; pp, cc = PPS[m], CL[m]; g = r.counts(lim(pp['st'], m))
    row = {n: run_clip(m, cc[n], r) for n in cc}; kc = {p: r.counts(lim(pp[p], m)) for p in pp}
    inb = lambda v: v[2] <= 20 and v[1] <= 120
    s1 = all(inb(row[n]) for n in row); s2 = all(row[n][3] <= max(2 * g[3], 25) for n in row)
    s3 = all(row[n][1] <= max(kc[p][1] for p in KEYS[n]) + 10 for n in row)
    verdict = ('PASS' if s1 else ('INHERITED' if not inb(g) else 'FAIL')) + ('' if s2 else ' +CAP') + ('' if s3 else ' +BETWEEN')
    print(f"{m:11s} {PICK.get(m, 0):3d} {f(g):>16s} {f(row['jab']):>17s} {f(row['cross']):>17s}  {verdict}")
    chk(f'{m}: S1 budget in both clips (or inherited from an over-budget stance)', s1 or not inb(g))
    chk(f'{m}: S2 worst edge <= max(2 x stance worst, 25x) in both clips', s2)
    chk(f'{m}: S3 no clip peaks above its own key poses + 10 edges >6x', s3)

print('\n== 3. reach at impact (cm, after limits): hand z in front of Head joint | hand |x| from midline | shoulder-to-hand / hanging arm length | share of unlimited reach kept')
for m in MODELS:
    pp = PPS[m]; r = rigs[m]; out = []
    for n in ('jab', 'cross'):
        zf, ax_, sh = reach(m, r, pp[IMP[n]], n)
        r0 = r.joint_pos(A.pose(), HAND[n])[2] * 100
        zs = r.joint_pos(lim(pp['st'], m), HAND[n])[2] * 100; zl = r.joint_pos(lim(pp[IMP[n]], m), HAND[n])[2] * 100; zu = r.joint_pos(pp[IMP[n]], HAND[n])[2] * 100; zus = r.joint_pos(pp['st'], HAND[n])[2] * 100
        keep = (zl - zs) / (zu - zus) * 100 if abs(zu - zus) > 1e-6 else float('nan')
        out.append(f"{n}: z {zf:5.1f} |x| {ax_:5.1f} ext {sh / armlen[m][n]:.2f} keep {keep:5.1f}%")
    print(f'  {m:11s} ' + '   '.join(out))

print('\n== 4. combo crossfade jab (t = 0.20) -> cross start CW over 0.06 s (7 steps): worst edges >6x vs endpoints + 5')
for m in MODELS:
    r = rigs[m]; pa = A.sample(CL[m]['jab'], 0.20); pb = PPS[m]['CW']
    ends = max(r.counts(lim(pa, m))[1], r.counts(lim(pb, m))[1]); mx = max(r.counts(lim(A.crossfade(pa, pb, s * 0.01, 0.06), m))[1] for s in range(7))
    print(f'  {m:11s} ends {ends}, worst {mx}'); chk(f'{m}: combo crossfade worst ({mx}) <= endpoints ({ends}) + 5', mx <= ends + 5)

print('\n== 5. ground contact (cm). need = rest foot-min minus current foot-min (+ raise root, - lower root)')
FOOT = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def foot_min(r, p): return min(r.joint_pos(p, b)[1] for b in FOOT)
for m in MODELS:
    r = rigs[m]; rs = foot_min(r, A.pose()); o = {n: (rs - foot_min(r, lim(PPS[m][n], m))) * 100 for n in ('st', 'JI', 'CI')}
    print(f"  {m:11s} " + '   '.join(f'{n} {v:+5.1f}' for n, v in o.items()))
    chk(f'{m}: ground-lock need within +-12 cm for JI and CI', abs(o['JI']) <= 12 and abs(o['CI']) <= 12)

print('\n== 6. sensitivity of the jab punch arm x (max edges >6x over the jab clip, x = -75 / -88 / -100)')
for m in MODELS:
    print(f'  {m:11s} {[run_clip(m, build(m, PICK.get(m, 0), xe)[1]["jab"], rigs[m])[1] for xe in (-75, -88, -100)]}')

os.makedirs(f'{ROOT}/anim', exist_ok=True)
out = {}
for m in MODELS:
    for n in ('jab', 'cross'):
        key = f'{n}_4_5' if m not in WIDE else f'{n}_4_5_{m}'
        if m in WIDE or m == 'rahul': out[key] = A.clip_to_json({**CL[m][n], 'name': key})
json.dump({'_note': 'Part 4-5. One-shot jab (left lead) and cross (right rear), 0.28 s. jab_4_5 / cross_4_5 are for the four narrow-body models (identical for them); the wide four have their own clip with the picked inward punch angle. Apply limits_4_1.json at play time. Root is 0.', 'clips': out},
          open(f'{ROOT}/anim/punches_4_5.json', 'w'), indent=1, sort_keys=True)
json.dump({'note': 'Part 4-5 picks: e = inward swing of the punch arm (degrees) for the wide four; the guard stance uses anim/narrow_guard_4_2b.json.', 'punch_in_deg': PICK},
          open(f'{ROOT}/anim/punch_pick_4_5.json', 'w'), indent=1)
print(f'\n{npass} checks passed, {nfail} failed')
