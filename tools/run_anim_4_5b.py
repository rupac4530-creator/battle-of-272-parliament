"""run_anim_4_5b.py -- Part 4-5b: torso-twist scale per model and per clip for the jab and cross.
Run: python3 tools/run_anim_4_5b.py > previews4_5b/part4_5b_checks.txt     (about 3 minutes; writes anim/punches_4_5b.json and anim/twist_pick_4_5b.json)

DISCLOSURE: this rule was written AFTER the 4-5 run and its diagnostic (diag_4_5.py) showed the torso twist drives Mamata's cross (201 edges >6x) and Shah's cross worst edge.
It is not a blind test. The rules below were fixed in this header before this script was run.

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Everything is the 4-5 build (same stance incl. the 4-2b inward guard, same punch arm angles, same punch inward swing e from anim/punch_pick_4_5.json, same timings, same
   limits at play time). Only the torso twist changes: every Hips/Spine/Spine1 y delta of the clip (windup and impact) is multiplied by ts.
   jab twist = Spine y +3 / -6 and Spine1 y +3 / -6 (windup / impact). cross twist = Hips y -4 / +8, Spine y -6 / +12, Spine1 y -6 / +12.
 * ts is chosen SEPARATELY for the jab and for the cross, from 0, 0.25, 0.5, 0.75, 1.0 (1.0 = the shipped 4-5 clip).
 * Per clip and candidate ts, measured as in 4-5 (13 grid frames + exact impact frame, limits applied, GLB skinning): max edges >3x/>6x/>10x and worst edge.
   Three checks, as in 4-5:
     S1 budget: edges >10x <= 20 and edges >6x <= 120.
     S2 worst-edge cap: worst edge <= max(2 x stance worst edge, 25x).
     S3 between frames: clip max edges >6x <= max over the clip's key poses (st, W, I, H) + 10.
 * A check is ATTAINABLE for a clip if ts = 0 satisfies it. A check that ts = 0 cannot satisfy is not something twist can fix, and is ignored for the pick (but still reported).
 * Reach floor: the impact hand joint z in front of the Head joint (cm, limits applied) must be >= 0.75 x its value at ts = 1.0.
 * ELIGIBLE ts = satisfies every attainable check AND the reach floor. PICK = the largest eligible ts. If nothing is eligible the pick is 1.0 and flagged UNRESOLVED.
 * Reported with the pick (every model): reach cost (impact hand z, ts = 1.0 -> pick), and the stretch numbers.
 * Integrity checks: ts = 1.0 rebuilds exactly the shipped 4-5 clips (JSON equal) for Kejriwal and Mamata; the format checks of 4-5 on the picked clips (start/end in stance,
   duration 0.28, impact key, per-frame step at 60 and 120 Hz, pure sample); combo crossfade jab(0.20) -> cross start over 0.06 s with the picked clips: worst >6x <= endpoints + 5;
   ground-lock need within +-12 cm for the impact poses.
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
src = open(f'{HERE}/run_anim_4_5.py').read().split("print('Part 4-5 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_5.py', '__name__': 'r45'}
exec(compile(src, 'run_anim_4_5_head', 'exec'), ns)
import numpy as np
A, Rig, MODELS, WIDE = ns['A'], ns['Rig'], ns['MODELS'], ns['WIDE']
add, merge, X, Y, P, lim, stance_for = ns['add'], ns['merge'], ns['X'], ns['Y'], ns['P'], ns['lim'], ns['stance_for']
run_clip, reach, IMP, KEYS, ang, qa, f = ns['run_clip'], ns['reach'], ns['IMP'], ns['KEYS'], ns['ang'], ns['qa'], ns['f']
PICKE = json.load(open(f'{ROOT}/anim/punch_pick_4_5.json'))['punch_in_deg']
TS = [0.0, 0.25, 0.5, 0.75, 1.0]
npass = nfail = 0
def chk(name, ok):
    global npass, nfail
    npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)
k = lambda t, ea, p: {'t': t, 'ease': ea, 'pose': p}

def build(m, n, ts):
    e = PICKE.get(m, 0); S = stance_for(m); st = P(S)
    if n == 'jab':
        W = P(add(S, merge({'LeftArm': X(8), 'LeftForeArm': X(-12), 'Spine': Y(3 * ts), 'Spine1': Y(3 * ts)})))
        Sj = {b: list(it) for b, it in S.items()}; Sj['LeftArm'] = [('z', 5 - e), ('x', -88)]; Sj['LeftForeArm'] = [('x', -8)]; Sj['LeftHand'] = [('x', -5)]
        I = P(add(Sj, {'Spine': Y(-6 * ts), 'Spine1': Y(-6 * ts)})); H = A.blend(I, st, 0.25)
        c = A.clip('jab', 0.28, [k(0, 'smooth', st), k(0.05, 'smooth', W), k(0.12, 'out', I), k(0.17, 'smooth', H), k(0.28, 'smooth', st)], impact=0.12)
    else:
        W = P(add(S, merge({'RightArm': X(8), 'RightForeArm': X(-12), 'Hips': Y(-4 * ts), 'Spine': Y(-6 * ts), 'Spine1': Y(-6 * ts)})))
        Sc = {b: list(it) for b, it in S.items()}; Sc['RightArm'] = [('z', -5 + e), ('x', -88)]; Sc['RightForeArm'] = [('x', -8)]; Sc['RightHand'] = [('x', -5)]
        I = P(add(Sc, {'Hips': Y(8 * ts), 'Spine': Y(12 * ts), 'Spine1': Y(12 * ts)})); H = A.blend(I, st, 0.25)
        c = A.clip('cross', 0.28, [k(0, 'smooth', st), k(0.07, 'smooth', W), k(0.13, 'out', I), k(0.18, 'smooth', H), k(0.28, 'smooth', st)], impact=0.13)
    return dict(st=st, W=W, I=I, H=H), c

print('Part 4-5b checks  (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in MODELS}
print('== 0. twist sweep per model and clip: ts -> max edges >3x/>6x/>10x/worst (frames), key-pose max >6x, impact hand z (cm). S1/S2/S3 flags: 1 = satisfied')
PICK = {}; CL = {}; KP = {}
for m in MODELS:
    r = rigs[m]; st0 = P(stance_for(m)); g = r.counts(lim(st0, m)); PICK[m] = {}
    for n in ('jab', 'cross'):
        rows = {}
        for ts in TS:
            kp, c = build(m, n, ts); v = run_clip(m, c, r)
            kc = max(r.counts(lim(kp[q], m))[1] for q in ('st', 'W', 'I', 'H'))
            zf = reach(m, r, kp['I'], n)[0]
            s1 = v[2] <= 20 and v[1] <= 120; s2 = v[3] <= max(2 * g[3], 25); s3 = v[1] <= kc + 10
            rows[ts] = (v, kc, zf, (s1, s2, s3), kp, c)
            print(f"  {m:11s} {n:5s} ts={ts:4.2f}  {f(v):>17s}  keys>6x {kc:3d}  z {zf:5.1f}  S1S2S3 {int(s1)}{int(s2)}{int(s3)}")
        att = [rows[0.0][3][i] for i in range(3)]; z1 = rows[1.0][2]
        def elig(ts):
            fl = rows[ts][3]
            return all((not att[i]) or fl[i] for i in range(3)) and rows[ts][2] >= 0.75 * z1
        el = [ts for ts in TS if elig(ts)]
        pk = max(el) if el else 1.0
        PICK[m][n] = pk
        print(f"  {m:11s} {n:5s} attainable S1S2S3 {''.join(str(int(a)) for a in att)}  eligible {el}  -> PICK ts = {pk}" + ('' if el else '  UNRESOLVED'))
        KP[(m, n)] = rows[pk][4]; CL[(m, n)] = rows[pk][5]

print('\n== 1. integrity: ts = 1.0 rebuilds the shipped 4-5 clips')
shipped = json.load(open(f'{ROOT}/anim/punches_4_5.json'))['clips']
for m, key in (('kejriwal', 'kejriwal'), ('mamata', 'mamata')):
    for n in ('jab', 'cross'):
        kp, c = build(m, n, 1.0); a = json.dumps(A.clip_to_json({**c, 'name': f'{n}_4_5_{m}'}), sort_keys=True); b = json.dumps(shipped[f'{n}_4_5_{m}'], sort_keys=True)
        chk(f'{m} {n}: ts = 1.0 clip equals the shipped 4-5 clip', a == b)

print('\n== 2. format checks on the picked clips')
for m in MODELS:
    for n in ('jab', 'cross'):
        c = CL[(m, n)]; kp = KP[(m, n)]; ks = c['keys']
        chk(f'{m} {n}: starts and ends in the stance', ang(ks[0]['pose'], kp['st']) < 1e-9 and ang(ks[-1]['pose'], kp['st']) < 1e-9)
        chk(f'{m} {n}: duration 0.28 s and impact time equals the IMPACT key time', abs(c['duration'] - 0.28) < 1e-12 and any(abs(kk['t'] - c['impact']) < 1e-12 and ang(kk['pose'], kp['I']) < 1e-9 for kk in ks))
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

print('\n== 3. result with the picks: clip max edges >3x/>6x/>10x/worst (S1 S2 S3 verdict), reach cost (impact hand z, ts=1.0 -> pick, cm), and the 4-5 value at ts = 1.0')
for m in MODELS:
    r = rigs[m]; g = r.counts(lim(P(stance_for(m)), m)); out = []
    for n in ('jab', 'cross'):
        c = CL[(m, n)]; kp = KP[(m, n)]; v = run_clip(m, c, r); kc = max(r.counts(lim(kp[q], m))[1] for q in ('st', 'W', 'I', 'H'))
        s1 = v[2] <= 20 and v[1] <= 120; s2 = v[3] <= max(2 * g[3], 25); s3 = v[1] <= kc + 10
        z1 = reach(m, r, build(m, n, 1.0)[0]['I'], n)[0]; zp = reach(m, r, kp['I'], n)[0]
        v1 = run_clip(m, build(m, n, 1.0)[1], r)
        out.append(f"{n} ts {PICK[m][n]:4.2f} {f(v)} [{'S1' if s1 else 's1-FAIL'} {'S2' if s2 else 's2-FAIL'} {'S3' if s3 else 's3-FAIL'}] z {z1:.1f}->{zp:.1f} (4-5: {f(v1)})")
    print(f'  {m:11s} ' + '\n              '.join(out))
    for n in ('jab', 'cross'):
        c = CL[(m, n)]; kp = KP[(m, n)]; v = run_clip(m, c, r); kc = max(r.counts(lim(kp[q], m))[1] for q in ('st', 'W', 'I', 'H'))
        chk(f'{m} {n}: S1 budget with the pick', v[2] <= 20 and v[1] <= 120)
        chk(f'{m} {n}: S3 between-frames with the pick', v[1] <= kc + 10)

print('\n== 4. combo crossfade jab (t = 0.20) -> cross start (W) over 0.06 s (7 steps), picked clips: worst >6x vs endpoints + 5')
for m in MODELS:
    r = rigs[m]; pa = A.sample(CL[(m, 'jab')], 0.20); pb = KP[(m, 'cross')]['W']
    ends = max(r.counts(lim(pa, m))[1], r.counts(lim(pb, m))[1]); mx = max(r.counts(lim(A.crossfade(pa, pb, s * 0.01, 0.06), m))[1] for s in range(7))
    print(f'  {m:11s} ends {ends}, worst {mx}'); chk(f'{m}: combo crossfade worst ({mx}) <= endpoints ({ends}) + 5', mx <= ends + 5)

print('\n== 5. ground contact (cm), impact poses with the picks')
FOOT = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def foot_min(r, p): return min(r.joint_pos(p, b)[1] for b in FOOT)
for m in MODELS:
    r = rigs[m]; rs = foot_min(r, A.pose()); o = {n: (rs - foot_min(r, lim(KP[(m, n)]['I'], m))) * 100 for n in ('jab', 'cross')}
    print(f"  {m:11s} " + '   '.join(f'{n} {v:+5.1f}' for n, v in o.items()))
    chk(f'{m}: ground-lock need within +-12 cm for both impact poses', all(abs(v) <= 12 for v in o.values()))

out = {}
for m in MODELS:
    for n in ('jab', 'cross'): out[f'{n}_4_5b_{m}'] = A.clip_to_json({**CL[(m, n)], 'name': f'{n}_4_5b_{m}'})
json.dump({'_note': 'Part 4-5b. One-shot jab and cross, 0.28 s, per model, with the torso-twist scale picked per model and clip (anim/twist_pick_4_5b.json). Apply limits_4_1.json at play time. Root is 0.', 'clips': out},
          open(f'{ROOT}/anim/punches_4_5b.json', 'w'), indent=1, sort_keys=True)
json.dump({'note': 'Part 4-5b picks: torso-twist scale ts per model and clip (1.0 = the 4-5 clip). Punch inward swing e is unchanged (anim/punch_pick_4_5.json).', 'twist_scale': PICK},
          open(f'{ROOT}/anim/twist_pick_4_5b.json', 'w'), indent=1)
print(f'\n{npass} checks passed, {nfail} failed')
