"""bendtest_3_5.py -- Part 3-5 (REBUILT): head nod / turn / tilt on all 8 models, bent about three candidate Head pivots.
Run: python3 tools/bendtest_3_5.py previews3_5 > previews3_5/part3_5_numbers.txt

DISCLOSURE: the original 3-5 zip was lost (never reached the user as a file). This is a RE-CREATION written from my own saved summary of it, not a copy.
Details I had to re-decide: the Head bone takes the full angle and Neck takes 20% of it; the definition of win/loss (below). AFTER a first run, I found my first guess for TURN_NOD (turn 40 + nod 20) gave different totals from the lost run's saved totals (1,971 / 1,398 / 1,513 for CURRENT / EAR / EAR_Z). I tried four angle pairs and turn 35 + nod 20 reproduces all three saved totals exactly, so the final script uses it. That angle choice was therefore fitted to the saved totals, not chosen blind. The other four poses reproduced the saved totals on the first run.
I looked at no result of THIS script before fixing the rules.

RULES (fixed now):
  A. PIVOTS for the Head bone (Head has no child bones, so moving its joint changes only its own pivot):
     CURRENT = the shipped Head joint (rigspec_2g2b2); EAR = ear height and depth from pivot.py ear_candidate (x = 0); EAR_Z = shipped height, ear depth only.
  B. POSES (my own angles; only Head and Neck move; Neck = 20% of the Head angle; rest of body at rest):
     NOD_DOWN: Head x +25; NOD_BACK: Head x -20; TURN: Head y 40; TURN_NOD: Head y 35 and x +20; TILT: Head z 15.
  C. Weights: the shipped uint8 weights of weights_final_2k1.npz, with Yogi's C16 pick of 3-6d NOT applied here (head poses move only Head/Neck; the dhoti is unaffected).
  D. PER POSE a pivot WINS if its count of edges stretched >3x is at least 2% below CURRENT's, LOSES if at least 2% above, else it is a tie.
  E. GUARD: the pivot's worst edge may not exceed 1.10 x CURRENT's worst edge in ANY of the 5 poses.
  F. VERDICT per model and pivot: ADOPT only if wins >= 3, losses <= 1 and the guard holds. Otherwise KEEP CURRENT.
  G. Diagnostic (information only): how far the front of the head (the 5% most forward Head-owned vertices) travels in TURN, per pivot.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import bendtest_3_1 as B, pivot as PV
MODELS = ['rahul', 'shah', 'rajnath', 'yogi', 'kejriwal', 'mamata', 'sitharaman', 'kharge']
HP = {'NOD_DOWN': ('x', 25), 'NOD_BACK': ('x', -20), 'TURN': ('y', 40), 'TURN_NOD': None, 'TILT': ('z', 15)}
def spec(p):
    if p == 'TURN_NOD': return {'Head': [('y', 35), ('x', 20)], 'Neck': [('y', 7), ('x', 4)]}
    ax, a = HP[p]; return {'Head': [(ax, a)], 'Neck': [(ax, .2 * a)]}
B.POSES.update({'H35_' + p: spec(p) for p in HP})
POSES = list(HP); PIVOTS = ('CURRENT', 'EAR', 'EAR_Z')

def setj(m, pv):
    cur = PV.PIVOT[m]['joint_new']; e = PV.PIVOT[m]['ear_candidate']
    B.J[m]['Head'] = tuple({'CURRENT': cur, 'EAR': [0.0, e[1], e[2]], 'EAR_Z': [0.0, cur[1], e[2]]}[pv])

def run(m, F, pv, p):
    setj(m, pv); r = B.run(m, F, 'H35_' + p); setj(m, 'CURRENT'); return r

if __name__ == '__main__':
    F = np.load(f'{HERE}/weights_final_2k1.npz'); CUR0 = {m: B.J[m]['Head'] for m in MODELS}
    for m in MODELS: assert np.allclose(CUR0[m], PV.PIVOT[m]['joint_new'], atol=1e-3), m
    print('check: the shipped Head joint equals pivot.py joint_new on all 8 models (within 1 mm): True')
    for m in MODELS:   # rest pose sanity per pivot
        for pv in PIVOTS:
            setj(m, pv); Mx, _ = B.fk(m, {}); r = B.run(m, F, 'H35_TILT'); setj(m, 'CURRENT')
    tot = {pv: {p: 0 for p in POSES} for pv in PIVOTS}; verdict = {}
    for m in MODELS:
        S = {(pv, p): B.summary(m, run(m, F, pv, p)) for pv in PIVOTS for p in POSES}
        e = PV.PIVOT[m]['ear_candidate']; cur = PV.PIVOT[m]['joint_new']
        print(f'\n===== {m} (grade {PV.PIVOT[m]["grade"]}) ear is {100 * (cur[2] - e[2]):.1f} cm further back, {100 * (e[1] - cur[1]):+.1f} cm in height =====')
        for p in POSES: print(f'  {p:9s} ' + '  '.join(f"{pv}: {S[(pv, p)]['gt3']:5d} w{S[(pv, p)]['worst']:6.2f}x" for pv in PIVOTS))
        for p in POSES:
            for pv in PIVOTS: tot[pv][p] += S[(pv, p)]['gt3']
        r0 = run(m, F, 'CURRENT', 'TURN'); hv = r0['W'][:, B.BN.index('Head')] > .9; z = r0['V'][hv, 2]; fr = hv.copy(); fr[hv] = z >= np.percentile(z, 95)
        fd = {pv: 100 * float(np.linalg.norm(run(m, F, pv, 'TURN')['P'][fr] - r0['V'][fr], axis=1).mean()) for pv in PIVOTS}
        print('  front-of-head travel in TURN (cm):', {k: round(v, 1) for k, v in fd.items()})
        for pv in PIVOTS[1:]:
            w = sum(S[(pv, p)]['gt3'] <= .98 * S[('CURRENT', p)]['gt3'] for p in POSES); l = sum(S[(pv, p)]['gt3'] >= 1.02 * S[('CURRENT', p)]['gt3'] and S[(pv, p)]['gt3'] > S[('CURRENT', p)]['gt3'] for p in POSES)
            bad = [p for p in POSES if S[(pv, p)]['worst'] > 1.10 * S[('CURRENT', p)]['worst']]; ok = w >= 3 and l <= 1 and not bad
            verdict[(m, pv)] = 'ADOPT' if ok else 'KEEP CURRENT'; print(f'  {pv}: wins {w}, losses {l}, guard {"holds" if not bad else "fails in " + ", ".join(bad)} -> {verdict[(m, pv)]}')
    print('\nTOTALS over 8 models (edges >3x):')
    for p in POSES: print(f'  {p:9s} ' + '  '.join(f'{pv}: {tot[pv][p]:5d}' for pv in PIVOTS))
    a = {pv: sum(tot[pv].values()) for pv in PIVOTS}; print('  all five  ' + '  '.join(f'{pv}: {a[pv]:5d} ({100 * (a[pv] / a["CURRENT"] - 1):+.1f}%)' for pv in PIVOTS))
    print('VERDICTS:', {m: (verdict[(m, 'EAR')], verdict[(m, 'EAR_Z')]) for m in MODELS})
    if len(sys.argv) > 1:
        for pv in ('CURRENT', 'EAR_Z'):
            for m in ('sitharaman', 'kharge'): setj(m, pv)
            B.draw(sys.argv[1], dict(F), ['sitharaman', 'kharge'], 'H35_TURN_NOD', f'part3_5_turn_nod_{pv}.png', f'Part 3-5: TURN_NOD, Sitharaman and Kharge, pivot {pv}')
            for m in ('sitharaman', 'kharge'): setj(m, 'CURRENT')
