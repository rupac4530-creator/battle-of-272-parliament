"""diag_hems_3_6c.py -- DIAGNOSTIC ADDED AFTER SEEING THE 3-6c VERDICTS (changes no rule, no pick, no weight).
For FRONT_KICK and KNEE_LIFT on Shah, Rajnath, Kharge: S0 against T10/T20/T40: stretched >3x, >6x, >10x counts, p99.9, worst, and where the worst edge is (height cm, owner pair)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, bendtest_3_1 as B, bendtest_3_3 as C, bendtest_3_4 as D, fix_hems_3_6c as X
B.POSES.update(C.NEW_POSES); B.POSES.update(D.NEW_POSES)
F = np.load(f'{HERE}/weights_final_2k1.npz'); Z = np.load(f'{HERE}/weights_3_6c.npz'); out = {k: Z[k] for k in Z.files}
for m in X.MODELS:
    for p in ('FRONT_KICK', 'KNEE_LIFT'):
        print(f'-- {m} {p}')
        for t in ['S0'] + list(X.CANDS):
            r = B.run(m, X.variant(F, out, m, t), p); s = r['s']; E = r['E']; V = r['V']; own = r['W'].argmax(1); w = int(s.argmax())
            y = 100 * (V[E[w, 0], 1] + V[E[w, 1], 1]) / 2
            print(f'   {t:4s} >3x {int((s>3).sum()):5d}  >6x {int((s>6).sum()):4d}  >10x {int((s>10).sum()):3d}  p99.9 {np.percentile(s,99.9):5.2f}x  worst {s.max():6.2f}x at {y:.0f} cm between {B.BN[own[E[w,0]]]} and {B.BN[own[E[w,1]]]}')
