"""bendtest_3_4.py -- Part 3-4: kick poses (front kick, side kick, knee lift) on all 8 models.
Run: python3 tools/bendtest_3_4.py previews3_4 > previews3_4/part3_4_numbers.txt

RULES FIXED BEFORE ANY RESULT (do not edit after seeing numbers):
 * Weights, joints, skinning, stretch measure and drawing are exactly those of bendtest_3_1.py (imported, not copied).
   The 3-1 pose table is NOT changed: a check confirms its sha256 prefix (c815f6562d229baa). New poses are added after that check.
 * Conventions as in 3-1: models face +Z, Y up, left side is +X. Rx(-) swings a hanging limb forward; Rz(+) swings it toward +X.
   For a torso, Rz(+) tips the top toward -X (away from the left leg).
 * New poses (all angles are my own choice, not measured, not animation). Arms are the 3-1 guard arms in all three.
     FRONT_KICK   left leg kicks forward at the impact frame: LeftUpLeg x-80, LeftLeg x+8, LeftFoot x-10;
                  standing leg RightUpLeg x+6, RightLeg x+12, RightFoot x-4; Spine x-6, Spine1 x-6 (lean back).
     FRONT_KICK_R the exact mirror of FRONT_KICK (right leg kicks). Used only to compare left against right.
     SIDE_KICK    left leg kicks out to the side: LeftUpLeg z+70 then x-15, LeftLeg x+6, LeftFoot z-15;
                  standing leg RightUpLeg x+4, RightLeg x+6; Spine z+8, Spine1 z+8 (lean away).
     KNEE_LIFT    left knee raised: LeftUpLeg x-95, LeftLeg x+100, LeftFoot x-15; standing leg RightUpLeg x+4, RightLeg x+8;
                  Spine x+4, Spine1 x+4.
 * Reported per model and pose: edges, stretched >3x, >2x, worst, p99.9, left/right (edge-midpoint x), top owner pairs,
   stretched edges by height band (below hip joint / hip to shoulder / above shoulder).
   Compared with the GUARD numbers recomputed here (same arms, so the difference is the legs and torso).
 * Extra numbers: kicking foot joint (cm): height above the floor, forward and sideways of its rest position;
   share of stretched edges with an end in LOWER_GARMENT cloth (cloth_2j1.npz class 1) against that share of all edges;
   FRONT_KICK left against FRONT_KICK_R counts (mirror comparison).
 * Decision: nothing is changed or fixed in this step. Only measured and drawn.
"""
import os, sys, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import bendtest_3_1 as B
import bendtest_3_3 as C

ARMS = {**B._LEFT_ARM, **B.mirror(B._LEFT_ARM)}
FRONT_KICK = {**ARMS, 'Spine': [('x', -6)], 'Spine1': [('x', -6)],
              'LeftUpLeg': [('x', -80)], 'LeftLeg': [('x', 8)], 'LeftFoot': [('x', -10)],
              'RightUpLeg': [('x', 6)], 'RightLeg': [('x', 12)], 'RightFoot': [('x', -4)]}
NEW_POSES = {
    'FRONT_KICK': FRONT_KICK,
    'FRONT_KICK_R': B.mirror(FRONT_KICK),
    'SIDE_KICK': {**ARMS, 'Spine': [('z', 8)], 'Spine1': [('z', 8)],
                  'LeftUpLeg': [('z', 70), ('x', -15)], 'LeftLeg': [('x', 6)], 'LeftFoot': [('z', -15)],
                  'RightUpLeg': [('x', 4)], 'RightLeg': [('x', 6)]},
    'KNEE_LIFT': {**ARMS, 'Spine': [('x', 4)], 'Spine1': [('x', 4)],
                  'LeftUpLeg': [('x', -95)], 'LeftLeg': [('x', 100)], 'LeftFoot': [('x', -15)],
                  'RightUpLeg': [('x', 4)], 'RightLeg': [('x', 8)]},
}

def cloth_share(m, r, CL):
    cls = CL[f'{m}_cls']; E = r['E']; big = r['s'] > 3
    c = (cls[E[:, 0]] == 1) | (cls[E[:, 1]] == 1)
    return int((c & big).sum()), int(big.sum()), 100 * c.mean()

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'previews3_4'; os.makedirs(out, exist_ok=True)
    F = np.load(f'{HERE}/weights_final_2k1.npz'); CL = np.load(f'{HERE}/cloth_2j1.npz'); npass = nfail = 0
    def chk(name, ok):
        global npass, nfail
        npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)
    print('== 0. tool sanity ==')
    chk('3-1 pose table unchanged (sha256 prefix c815f6562d229baa)', hashlib.sha256(repr(B.POSES).encode()).hexdigest()[:16] == 'c815f6562d229baa')
    B.POSES.update(C.NEW_POSES); B.POSES.update(NEW_POSES)
    chk('FRONT_KICK_R is the mirror of FRONT_KICK (rebuilt independently)', NEW_POSES['FRONT_KICK_R'] == B.mirror(FRONT_KICK))
    chk('mirror(mirror(FRONT_KICK)) equals FRONT_KICK', B.mirror(B.mirror(FRONT_KICK)) == FRONT_KICK)
    chk('SIDE_KICK spine z has opposite sign to LeftUpLeg z (lean away from the kick)', NEW_POSES['SIDE_KICK']['Spine'][0][1] > 0 and NEW_POSES['SIDE_KICK']['LeftUpLeg'][0][1] > 0)
    for m in B.ALL8:
        V, T, W, E = B.load(m, F); Mx, _ = B.fk(m, {}); P = B.skin(V, W, Mx)
        chk(f'{m}: rest pose gives stretch 1.0 ({B.edge_stretch(V, E, P).max():.6f})', B.edge_stretch(V, E, P).max() < 1 + 1e-6)

    POSES = ('GUARD', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT'); res = {}
    for pose in POSES:
        print(f'\n== pose {pose} (shipped uint8 weights) ==')
        for m in B.ALL8:
            r = B.run(m, F, pose); res[(pose, m)] = r; sm = B.summary(m, r); bd = C.bands(m, r)
            print(f"  {m:10s} edges {sm['n_edges']:6d}  >3x {sm['gt3']:5d} ({100 * sm['gt3'] / sm['n_edges']:.2f}%)  >2x {sm['gt2']:5d}  worst {sm['worst']:6.2f}x  p99.9 {sm['p999']:5.2f}x  left/right {sm['left']}/{sm['right']}")
            print(f"             worst edge at {sm['worst_y'] * 100:.0f} cm between {sm['worst_pair'][0]} and {sm['worst_pair'][1]}; top pairs: " + '; '.join(f'{a}|{b} {c}' for (a, b), c in sm['top']))
            print(f"             by height (below hip / hip to shoulder / above shoulder): {bd[0]} / {bd[1]} / {bd[2]}")

    print('\n== extra: stretched (>3x) counts, GUARD -> kick pose (same arms) ==')
    for pose in POSES[1:]:
        print(f'-- {pose} minus GUARD')
        for m in B.ALL8:
            g = B.summary(m, res[('GUARD', m)])['gt3']; p = B.summary(m, res[(pose, m)])['gt3']
            print(f'  {m:10s} GUARD {g:5d} -> {pose} {p:5d}  ({p - g:+d})')

    print('\n== extra: kicking foot joint (cm). Height above the floor (posed, rest), forward and sideways of rest ==')
    for pose, side in (('FRONT_KICK', 'Left'), ('FRONT_KICK_R', 'Right'), ('SIDE_KICK', 'Left'), ('KNEE_LIFT', 'Left')):
        print(f'-- {pose}: {side} foot, and the kicking foot height as a share of the Head joint height')
        for m in B.ALL8:
            r = res[(pose, m)]; f = r['Pj'][f'{side}Foot']; f0 = np.array(B.J[m][f'{side}Foot']); h0 = B.J[m]['Head'][1]
            print(f"  {m:10s} height {100 * f[1]:6.1f} cm (rest {100 * f0[1]:.1f}), forward {100 * (f[2] - f0[2]):6.1f} cm, sideways {100 * (f[0] - f0[0]):6.1f} cm; height {100 * f[1] / h0:.0f}% of Head joint height")

    print('\n== extra: share of stretched edges with an end in LOWER_GARMENT cloth, against that share of all edges ==')
    for pose in POSES:
        print(f'-- {pose}')
        for m in B.ALL8:
            a, b, base = cloth_share(m, res[(pose, m)], CL)
            print(f'  {m:10s} {a:5d} / {b:5d} = {100 * a / max(1, b):5.1f}%   (all edges: {base:.1f}%)')

    print('\n== extra: FRONT_KICK (left leg) against FRONT_KICK_R (right leg): stretched >3x and worst ==')
    for m in B.ALL8:
        a = B.summary(m, res[('FRONT_KICK', m)]); b = B.summary(m, res[('FRONT_KICK_R', m)])
        print(f"  {m:10s} left kick {a['gt3']:5d} worst {a['worst']:6.2f}x   right kick {b['gt3']:5d} worst {b['worst']:6.2f}x   difference {a['gt3'] - b['gt3']:+d}")

    print('\n== determinism: SIDE_KICK on mamata and KNEE_LIFT on yogi twice ==')
    for pose, m in (('SIDE_KICK', 'mamata'), ('KNEE_LIFT', 'yogi')):
        a = B.run(m, F, pose)['P']; b = B.run(m, F, pose)['P']; chk(f'{pose} {m}: two runs give identical posed vertices', (a == b).all())

    A, Bm = B.ALL8[:4], B.ALL8[4:]
    for pose, tag in (('FRONT_KICK', 'front_kick'), ('SIDE_KICK', 'side_kick')):
        B.draw(out, F, A, pose, f'part3_4_{tag}_1.png', f'Part 3-4: {pose} pose, shipped weights (Rahul, Shah, Rajnath, Yogi)')
        B.draw(out, F, Bm, pose, f'part3_4_{tag}_2.png', f'Part 3-4: {pose} pose, shipped weights (Kejriwal, Mamata, Sitharaman, Kharge)')
    print(f'\nSUMMARY: {npass} pass, {nfail} fail')
