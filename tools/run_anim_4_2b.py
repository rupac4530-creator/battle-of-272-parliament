"""run_anim_4_2b.py -- Part 4-2b: a real narrow guard for the wide four (Kejriwal, Mamata, Sitharaman, Kharge) and a larger light hit.
Run: python3 tools/run_anim_4_2b.py > previews4_2b/part4_2b_checks.txt      (writes anim/narrow_guard_4_2b.json)

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Rig data only from rigged_models/<n>.glb via animrig.Rig. Poses are the 4-4 poses (same sign convention); limits anim/limits_4_1.json applied to every pose
   (note: limit_pose scales the COMBINED rotation angle of each bone, so an inward arm rotation shrinks with the arm scale, Mamata's is 0.4).
 * PART A, inward guard. Stance for the wide four = the 4-2 narrow stance with the arm swing-in d added: LeftArm z = -d, RightArm z = +d (degrees), x stays -35.
   Candidates d = 0 (the shipped 4-2 narrow stance), 10, 20, 30, 40. The 4-4 block, stun and confused poses are rebuilt on each candidate stance (same deltas).
   Measured per model/candidate (after limits): hand joint distance from the midline (cm), hand-joint to nearest trunk-owned posed vertex (cm, crude: a joint is inside the hand),
   edge counts >6x, >10x and worst edge for stance, block, heavy hit and stun sway.
   A candidate is ELIGIBLE if all of: (a) hand-to-trunk gap in the stance and in the block >= 5 cm; (b) for each of stance, block, heavy hit, stun: edges >6x <= (d=0 value) + 10,
   edges >10x <= max(20, d=0 value), worst edge <= max(2 x d=0 worst, 25x).  PICK = the largest eligible d (the narrowest). d=0 is always eligible.
 * PART B, light hit. hit_light key pose H1 deltas scaled by k = 1, 1.5, 2 (all 8 models, on the picked stance). Metric of visibility = max posed-vertex displacement from the stance (cm).
   ELIGIBLE if edges >6x <= (stance value) + 10, edges >10x <= max(20, stance value), worst <= max(2 x stance worst, 25x). PICK = the largest eligible k.
 * Nothing else changes: no weight, no clip file from 4-1..4-4, no limit.
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
src = open(f'{HERE}/run_anim_4_4.py').read().split("print('Part 4-4 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_4.py', '__name__': 'r44'}
exec(compile(src, 'run_anim_4_4_head', 'exec'), ns)
import numpy as np
A, Rig, MODELS, WIDE, B = ns['A'], ns['Rig'], ns['MODELS'], ns['WIDE'], ns['B']
add, merge, X, Z, both, P, lim = ns['add'], ns['merge'], ns['X'], ns['Z'], ns['both'], ns['P'], ns['lim']
DS = [0, 10, 20, 30, 40]; KS = [1.0, 1.5, 2.0]
TRUNK = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck']
orig_stance = ns['stance_spec']
def with_d(d):
    def f(narrow):
        s = orig_stance(narrow)
        if narrow: s['LeftArm'] = [('z', -d), ('x', -35)]; s['RightArm'] = [('z', d), ('x', -35)]
        return s
    return f
def pose_set(d):
    ns['stance_spec'] = with_d(d); r = ns['poses'](True); ns['stance_spec'] = orig_stance; return r
def h1_pose(d, k):
    ns['stance_spec'] = with_d(d); S = ns['stance_spec'](True); ns['stance_spec'] = orig_stance
    return P(add(S, merge({'Spine': X(-5*k), 'Spine1': X(-4*k), 'Spine2': X(-3*k), 'Head': X(-10*k)}, both('Arm', 8*k), both('ForeArm', 10*k), both('UpLeg', 3*k), both('Foot', -3*k))))

print('Part 4-2b checks (rig data from rigged_models/*.glb only)\n')
rigs = {m: Rig(f'{ROOT}/rigged_models/{m}.glb') for m in WIDE}
tmask = {}
for m, r in rigs.items():
    main = r.J[np.arange(len(r.V)), r.W.argmax(1)]; tmask[m] = np.isin(main, [r.bi[b] for b in TRUNK])
def hand_metrics(m, p):
    r = rigs[m]; Pm = r.skin(p); out = []
    for side in ('Left', 'Right'):
        h = r.joint_pos(p, side + 'Hand'); out.append((abs(h[0]) * 100, np.linalg.norm(Pm[tmask[m]] - h, axis=1).min() * 100))
    return min(o[0] for o in out), min(o[1] for o in out)
def cnt(m, p): n3, n6, n10, w = rigs[m].counts(p); return n6, n10, w
ELI = {}; PICK = {}; RES = {}
KEYP = [('stance', 'st'), ('block', 'B'), ('heavy', 'H2'), ('stun', 'Sa')]
print('== A. inward guard. per model and d: hand lateral dist from midline (cm) / hand-to-trunk gap in stance and block (cm); then edges >6x/>10x/worst for stance, block, heavy hit, stun')
for m in WIDE:
    base = None
    for d in DS:
        ps = pose_set(d); row = {}
        for nm, key in KEYP: row[nm] = cnt(m, lim(ps[key], m))
        lat, gapS = hand_metrics(m, lim(ps['st'], m)); _, gapB = hand_metrics(m, lim(ps['B'], m))
        RES[(m, d)] = (lat, gapS, gapB, row)
        if d == 0: base = row
        ok = gapS >= 5 and gapB >= 5
        for nm, _ in KEYP:
            a, b, w = row[nm]; a0, b0, w0 = base[nm]
            ok = ok and a <= a0 + 10 and b <= max(20, b0) and w <= max(2 * w0, 25)
        ELI[(m, d)] = ok or d == 0
        print(f'{m:10s} d={d:2d} lat {lat:5.1f} gap {gapS:5.1f}/{gapB:5.1f} | ' + ' | '.join(f'{nm} {row[nm][0]}/{row[nm][1]}/{row[nm][2]:.1f}' for nm, _ in KEYP) + f' | {"ELIGIBLE" if ELI[(m, d)] else "refused"}')
    PICK[m] = max(d for d in DS if ELI[(m, d)])
    print(f'  -> pick d = {PICK[m]} (hand distance from midline {RES[(m, 0)][0]:.1f} -> {RES[(m, PICK[m])][0]:.1f} cm)\n')
print('== B. light hit scale k (all 8 models, on the picked stance for the wide four, on the 4-2 stance for the other four)')
KPICK = {}
for m in MODELS:
    wide = m in WIDE; d = PICK.get(m, 0)
    r = rigs[m] if wide else Rig(f'{ROOT}/rigged_models/{m}.glb')
    ns['stance_spec'] = with_d(d); S = ns['stance_spec'](wide); ns['stance_spec'] = orig_stance
    pst = lim(P(S), m); st = r.counts(pst); st6, st10, stw = st[1], st[2], st[3]; Pst = r.skin(pst)
    picked = 1.0
    for k in KS:
        ns['stance_spec'] = with_d(d)
        Sx = ns['stance_spec'](wide)
        pk = lim(P(add(Sx, merge({'Spine': X(-5*k), 'Spine1': X(-4*k), 'Spine2': X(-3*k), 'Head': X(-10*k)}, both('Arm', 8*k), both('ForeArm', 10*k), both('UpLeg', 3*k), both('Foot', -3*k)))), m)
        ns['stance_spec'] = orig_stance
        n3, n6, n10, w = r.counts(pk); disp = np.linalg.norm(r.skin(pk) - Pst, axis=1).max() * 100
        ok = n6 <= st6 + 10 and n10 <= max(20, st10) and w <= max(2 * stw, 25)
        if ok: picked = k
        print(f'{m:10s} k={k:3.1f} max displacement {disp:5.1f} cm | >6x {n6} >10x {n10} worst {w:.1f}x (stance {st6}/{st10}/{stw:.1f}) | {"ok" if ok else "refused"}')
    KPICK[m] = picked; print(f'  -> pick k = {picked}\n')
json.dump({'note': 'Part 4-2b picks. arm_in_deg: LeftArm z = -d, RightArm z = +d added to the 4-2 narrow stance (wide four only). light_hit_scale: multiply the 4-4 H1 deltas.',
           'arm_in_deg': PICK, 'light_hit_scale': KPICK}, open(f'{ROOT}/anim/narrow_guard_4_2b.json', 'w'), indent=1)
print('picks d:', PICK); print('picks k:', KPICK)
