"""diag_4_5.py -- Part 4-5 diagnostic, WRITTEN AFTER the main run showed Mamata's cross at 201 edges >6x and S2 (worst-edge cap) failing on Shah, Rajnath, Kejriwal.
Changes no clip, no pick, no limit. Question: how much of that stretch comes from the torso twist (the y deltas on Hips/Spine/Spine1)?
Method: rebuild jab and cross with every torso y delta (windup and impact) multiplied by ts = 0, 0.5, 1.0, and report max edges >6x / >10x / worst over the clip
(grid + impact frame, limits applied) and the impact hand z in front of the Head joint (cm). Models: the four that failed a check, plus rahul as a reference.
Run: python3 tools/diag_4_5.py > previews4_5/part4_5_diag.txt"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
src = open(f'{HERE}/run_anim_4_5.py').read().split("print('Part 4-5 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_5.py', '__name__': 'r45'}
exec(compile(src, 'run_anim_4_5_head', 'exec'), ns)
A, Rig, WIDE = ns['A'], ns['Rig'], ns['WIDE']
add, merge, X, Y, P, lim, stance_for = ns['add'], ns['merge'], ns['X'], ns['Y'], ns['P'], ns['lim'], ns['stance_for']
run_clip, reach, IMP = ns['run_clip'], ns['reach'], ns['IMP']
PICK = json.load(open(f'{ROOT}/anim/punch_pick_4_5.json'))['punch_in_deg']
def build_ts(m, ts):
    e = PICK.get(m, 0); S = stance_for(m); st = P(S)
    JW = P(add(S, merge({'LeftArm': X(8), 'LeftForeArm': X(-12), 'Spine': Y(3 * ts), 'Spine1': Y(3 * ts)})))
    Sj = {b: list(it) for b, it in S.items()}; Sj['LeftArm'] = [('z', 5 - e), ('x', -88)]; Sj['LeftForeArm'] = [('x', -8)]; Sj['LeftHand'] = [('x', -5)]
    JI = P(add(Sj, {'Spine': Y(-6 * ts), 'Spine1': Y(-6 * ts)})); JH = A.blend(JI, st, 0.25)
    CW = P(add(S, merge({'RightArm': X(8), 'RightForeArm': X(-12), 'Hips': Y(-4 * ts), 'Spine': Y(-6 * ts), 'Spine1': Y(-6 * ts)})))
    Sc = {b: list(it) for b, it in S.items()}; Sc['RightArm'] = [('z', -5 + e), ('x', -88)]; Sc['RightForeArm'] = [('x', -8)]; Sc['RightHand'] = [('x', -5)]
    CI = P(add(Sc, {'Hips': Y(8 * ts), 'Spine': Y(12 * ts), 'Spine1': Y(12 * ts)})); CH = A.blend(CI, st, 0.25)
    k = lambda t, ea, p: {'t': t, 'ease': ea, 'pose': p}
    return ({'jab': A.clip('jab', 0.28, [k(0, 'smooth', st), k(0.05, 'smooth', JW), k(0.12, 'out', JI), k(0.17, 'smooth', JH), k(0.28, 'smooth', st)], impact=0.12),
             'cross': A.clip('cross', 0.28, [k(0, 'smooth', st), k(0.07, 'smooth', CW), k(0.13, 'out', CI), k(0.18, 'smooth', CH), k(0.28, 'smooth', st)], impact=0.13)},
            {'jab': JI, 'cross': CI})
print('Part 4-5 diagnostic: torso-twist scale ts (all Hips/Spine/Spine1 y deltas x ts). max edges >6x / >10x / worst, impact hand z (cm)\n')
for m in ['rahul', 'shah', 'rajnath', 'kejriwal', 'mamata']:
    r = Rig(f'{ROOT}/rigged_models/{m}.glb')
    for ts in (0.0, 0.5, 1.0):
        cc, imp = build_ts(m, ts); out = []
        for n in ('jab', 'cross'):
            v = run_clip(m, cc[n], r); out.append(f"{n} {v[1]}/{v[2]}/{v[3]:.1f} z {reach(m, r, imp[n], n)[0]:.1f}")
        print(f'  {m:9s} ts={ts:3.1f}   ' + '   '.join(out))
