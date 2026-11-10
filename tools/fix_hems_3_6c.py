"""fix_hems_3_6c.py -- Part 3-6c: TAPERED HIP-THIGH SMOOTHING for Shah, Rajnath, Kharge (third fix of the 3-6 fix pass).
Run: python3 tools/fix_hems_3_6c.py previews3_6c > previews3_6c/part3_6c_numbers.txt

WHAT I LOOKED AT BEFORE FIXING THE RULES (disclosed): the shipped weights in FRONT_KICK and KNEE_LIFT on the three models. 97-98% of Shah's and Rajnath's stretched edges (82-86% on Kharge) lie below the crotch, 91-99% within 25 cm of it;
the weights at the stretched ends are about Hips 0.3 / left leg 0.55-0.6 / right leg 0 (Kharge Hips 0.0-0.1); the weight jump across a stretched edge is small (median 0.13, almost never above 0.3) against 0.000 for all edges.
Reading (not tested): the hip-to-thigh blend is too steep for an 80-95 degree hip flexion. 2I-2c smoothed it uniformly, cut counts, but its worst edge grew and my guard refused it on these three models.
I tested NO weight change of this step before fixing the rules.

RULES (fixed now, before any result):
  A. CORE = vertices whose Hips weight is in [0.02, 0.98] and that lie below (crotch y + 0.10 m). d_v = mesh-hop distance from the core (0 for the core itself).
  B. SCOPE and TAPER: vertices with d_v <= R. Strength lam_v = 0.5 * (1 - d_v / (R + 1)), so it falls to nearly zero at the scope edge (this is the difference from 2I-2c's uniform step).
  C. STEP: W_v <- (1 - lam_v) W_v + lam_v * mean over mesh neighbours u of W_u (the full 22-bone vector, so the sum stays 1). Repeat N times. Vertices outside the scope never change.
  D. CANDIDATES: S0 = shipped; T10 = (N 10, R 6); T20 = (N 20, R 12); T40 = (N 40, R 12).
  E. FINISH: keep the 4 largest bones, renormalise, uint8 as in 2I-5 (build_hems_2j2.pack, build_final_2i5.quant).
  F. POSES: GUARD_ARMS, GUARD, ARMS_UP, JAB, CROSS, FRONT_KICK, FRONT_KICK_R, SIDE_KICK, KNEE_LIFT (3-1, 3-3, 3-4 tables, unchanged).
  G. GUARDS, per model (candidate ELIGIBLE only if all hold):
     G1: no pose gets more stretched edges (>3x) than S0 by more than 2% (or by more than 5 when S0's count is below 250);
     G2: no pose's worst edge grows by more than 10% against S0;
     G3: vertices with S0 LeftUpLeg weight above 0.9: their mean displacement in FRONT_KICK must be >= 90% of S0's (the thigh still moves).
  H. DECISION per model: the eligible candidate with the lowest total over the 9 poses wins only if it is at least 5% below S0's total. Otherwise the model keeps S0.
  I. NOTHING ELSE changes; the other five models are untouched. Output weights_3_6c.npz: <m>_<tag>_joints / _w / _w8 for the three models.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from scipy.sparse import coo_matrix
import bendtest_3_1 as B, bendtest_3_3 as C, bendtest_3_4 as D
import build_hems_2j2 as H2, build_final_2i5 as F5, build_cloth_2j1 as K, trunk as T
from glbio import load_mesh
BN = B.BN; HIPS = BN.index('Hips'); LUP = BN.index('LeftUpLeg')
MODELS = ('shah', 'rajnath', 'kharge'); CANDS = {'T10': (10, 6), 'T20': (20, 12), 'T40': (40, 12)}
POSES = ('GUARD_ARMS', 'GUARD', 'ARMS_UP', 'JAB', 'CROSS', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT')

def adj(E, n): return coo_matrix((np.ones(2 * len(E)), (np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]])), shape=(n, n)).tocsr()

def tapered(m, V, W, E, N, R):
    n = len(V); A = adj(E, n); deg = np.asarray(A.sum(1)).ravel(); core = (W[:, HIPS] >= .02) & (W[:, HIPS] <= .98) & (V[:, 1] < T.CROTCH[m]['y'] + .10)
    d = np.full(n, 99.0); d[core] = 0; fr = core.copy()
    for h in range(1, R + 1):
        nb = (A @ fr.astype(float)) > 0; new = nb & (d > 90); d[new] = h; fr = new
    lam = np.where(d <= R, .5 * (1 - d / (R + 1)), 0.0); Wn = W.copy()
    for _ in range(N): Wn = (1 - lam)[:, None] * Wn + lam[:, None] * (A @ Wn) / deg[:, None]
    return Wn, int((d <= R).sum()), int(core.sum())

def build(F):
    out = {}
    for m in MODELS:
        V, Tr, W0, E = B.load(m, F); W = K.dense(F[f'{m}_joints'].astype(int), F[f'{m}_w'])
        for tag, (N, R) in CANDS.items():
            Wn, ns, nc = tapered(m, V, W, E, N, R); b, w, dr = H2.pack(Wn)
            out[f'{m}_{tag}_joints'] = b; out[f'{m}_{tag}_w'] = w; out[f'{m}_{tag}_w8'] = F5.quant(w, 255, np.uint8)
            print(f'build {m} {tag}: core {nc}, scope {ns} vertices, max dropped weight {dr.max():.4f}')
    return out

def variant(F, out, m, tag):
    G = {k: F[k] for k in F.files}
    if tag != 'S0': G[f'{m}_joints'] = out[f'{m}_{tag}_joints']; G[f'{m}_wq'] = out[f'{m}_{tag}_w8']
    return G

if __name__ == '__main__':
    B.POSES.update(C.NEW_POSES); B.POSES.update(D.NEW_POSES); F = np.load(f'{HERE}/weights_final_2k1.npz')
    out = build(F); out2 = build(F); print('determinism: two builds identical:', all((out[k] == out2[k]).all() for k in out)); np.savez(f'{HERE}/weights_3_6c.npz', **out)
    tags = ['S0'] + list(CANDS); picks = {}
    for m in MODELS:
        res = {}
        for t in tags:
            G = variant(F, out, m, t)
            for p in POSES: res[(t, p)] = B.run(m, G, p)
        S = lambda t, p: B.summary(m, res[(t, p)])
        print(f'\n===== {m} =====')
        for p in POSES: print(f'  {p:13s} ' + '  '.join(f"{t}: {S(t, p)['gt3']:5d} w{S(t, p)['worst']:6.2f}x" for t in tags))
        tot = {t: sum(S(t, p)['gt3'] for p in POSES) for t in tags}; print('  totals:', tot)
        L = res[('S0', 'FRONT_KICK')]['W'][:, LUP] > .9
        mv = {t: 100 * float(np.linalg.norm(res[(t, 'FRONT_KICK')]['P'][L] - res[(t, 'FRONT_KICK')]['V'][L], axis=1).mean()) for t in tags}
        print('  left-thigh displacement in FRONT_KICK (cm):', {t: round(v, 1) for t, v in mv.items()})
        elig = {}
        for t in tags[1:]:
            g1 = all(S(t, p)['gt3'] <= (S('S0', p)['gt3'] + 5 if S('S0', p)['gt3'] < 250 else S('S0', p)['gt3'] * 1.02) for p in POSES)
            g2 = all(S(t, p)['worst'] <= 1.10 * S('S0', p)['worst'] for p in POSES); g3 = mv[t] >= .9 * mv['S0']; elig[t] = g1 and g2 and g3
            print(f'  {t}: G1 {g1} G2 {g2} G3 {g3} -> eligible {elig[t]}')
        cand = [t for t in tags[1:] if elig[t]]; best = min(cand, key=lambda t: tot[t]) if cand else None
        picks[m] = best if best and tot[best] <= .95 * tot['S0'] else 'S0'; print(f'  DECISION {m}: best eligible {best}; PICK {picks[m]}')
    print('\nPICKS:', picks)
    if len(sys.argv) > 1:   # pictures only: front kick, current weights against T20 (two models per sheet: Shah+Kharge)
        for t, fn in (('S0', 'part3_6c_kick_S0.png'), ('T20', 'part3_6c_kick_T20.png')):
            G = {k: F[k] for k in F.files}
            if t != 'S0':
                for m in ('shah', 'kharge'): G[f'{m}_joints'] = out[f'{m}_{t}_joints']; G[f'{m}_wq'] = out[f'{m}_{t}_w8']
            B.draw(sys.argv[1], G, ['shah', 'kharge'], 'FRONT_KICK', fn, f'Part 3-6c: FRONT_KICK, Shah and Kharge with {t} weights')
