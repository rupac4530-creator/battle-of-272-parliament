"""sens_3_6d.py -- Part 3-6d sensitivity (written AFTER the 3-6d verdicts; changes no rule, pick or weight).
For each guard variant, which candidate would win per model? Variants: BASE (the 3-6d rule), NO_S4 (no worst-edge cap), S4x2 (cap max(2.0 x S0 worst, 12x)),
S2x125 (S2 allows n>10x to rise by max(2, 25%)), NO_S4_S2x125 (both loosened). Everything else as in decide_3_6d.py.
Run: python3 tools/sens_3_6d.py > previews3_6d/part3_6d_sens.txt"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, decide_3_6d as D
B = D.B; POSES = D.POSES
V = {'BASE': (1.5, True, 1.10), 'NO_S4': (None, True, 1.10), 'S4x2': (2.0, True, 1.10), 'S2x125': (1.5, True, 1.25), 'NO_S4_S2x125': (None, True, 1.25)}
if __name__ == '__main__':
    B.POSES.update(D.C.NEW_POSES); B.POSES.update(D.D.NEW_POSES); F = np.load(f'{HERE}/weights_final_2k1.npz')
    for m, (fn, tc) in D.PLAN.items():
        X = np.load(f'{HERE}/{fn}'); tags = ['S0'] + list(tc); M = {}
        for t in tags:
            G = D.variant(F, X, m, t)
            for p in POSES: M[(t, p)] = D.met(B.run(m, G, p))
        tot = {t: sum(M[(t, p)]['sev'] for p in POSES) for t in tags}
        mvok = {}  # movement guard S5 is taken as passed (it passed for every candidate in decide_3_6d.py)
        print(f'== {m}: total SEV {tot}')
        for vn, (cap, _, k2) in V.items():
            el = []
            for t in tags[1:]:
                s1 = all(M[(t, p)]['sev'] <= (M[('S0', p)]['sev'] * 1.10 if M[('S0', p)]['sev'] >= 100 else M[('S0', p)]['sev'] + 10) for p in POSES)
                s2 = all(M[(t, p)]['n10'] <= max(2 + M[('S0', p)]['n10'], k2 * M[('S0', p)]['n10']) for p in POSES)
                s3 = all(M[(t, p)]['p999'] <= 1.10 * M[('S0', p)]['p999'] for p in POSES)
                s4 = True if cap is None else all(M[(t, p)]['worst'] <= max(cap * M[('S0', p)]['worst'], 12.0) for p in POSES)
                if s1 and s2 and s3 and s4: el.append(t)
            best = min(el, key=lambda t: tot[t]) if el else None; pick = best if best and tot[best] <= .95 * tot['S0'] else 'S0'
            print(f'   {vn:14s} eligible {el}  PICK {pick}' + (f'  ({100 * (tot[pick] / tot["S0"] - 1):+.1f}% SEV)' if pick != 'S0' else ''))
