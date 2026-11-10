"""fix_mamata_3_6b.py -- Part 3-6b: MAMATA'S FLANK (second fix of the 3-6 fix pass). Changes weights on Mamata only.
Run: python3 tools/fix_mamata_3_6b.py previews3_6b > previews3_6b/part3_6b_numbers.txt

WHAT I LOOKED AT BEFORE FIXING THE RULES (disclosed): 3-3 and 3-4 numbers, and one measurement of the shipped weights in four arm poses: stretched edges sit at 72-108 cm height and 41-62 cm to the side,
Hips|Hips is the top owner pair, 367 Hips-owned vertices carry arm weight above 0.05 (they sit at about 95 cm height, 50 cm to the side), and 295 of 389 Hips-owned stretched-edge ends have arm weight above 0.05
(GUARD_ARMS). Hypothesis: arm weight leaks onto Hips-owned side cloth (pallu / sari fall). I tested NO weight change before fixing these rules.

RULES (fixed now, before any result):
  A. SCOPE: Mamata only. A vertex is HIPS-OWNED if Hips has its largest weight in the shipped float weights (weights_final_2k1.npz <m>_joints/_w).
  B. CANDIDATES: S0 = shipped. H50 = on HIPS-OWNED vertices, multiply every arm-bone weight (Left/Right Shoulder, Arm, ForeArm, Hand) by 0.5 and add the removed weight to Hips.
     H100 = the same with factor 0 (all arm weight moved to Hips). Nothing else changes.
  C. After the move: keep the 4 largest bones, renormalise, quantise to uint8 as in 2I-5 (build_hems_2j2.pack, build_final_2i5.quant).
  D. POSES: GUARD_ARMS, GUARD, ARMS_UP, JAB, CROSS, FRONT_KICK, FRONT_KICK_R, SIDE_KICK, KNEE_LIFT (3-1, 3-3, 3-4 tables, unchanged).
  E. GUARDS (candidate ELIGIBLE only if all hold):
     G1: no pose gets more stretched edges (>3x) than S0 by more than 2% (or more than 5 edges when S0's count is below 250).
     G2: no pose's worst edge grows by more than 10% against S0.
     G3: the arms still move: mean displacement of vertices owned by an arm bone (Shoulder, Arm, ForeArm, Hand, either side) in ARMS_UP must be >= 90% of S0's.
  F. DECISION: the eligible candidate with the lowest total over the 9 poses wins only if its total is at least 5% below S0's. Otherwise S0 stays.
  G. NOTHING ELSE changes (no owner, joint, radius or flag; other seven models untouched). Output weights_3_6b.npz holds only Mamata (per tag: joints / w / w8).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import bendtest_3_1 as B, bendtest_3_3 as C, bendtest_3_4 as D
import build_hems_2j2 as H2, build_final_2i5 as F5, build_cloth_2j1 as K
from glbio import load_mesh
M = 'mamata'; BN = B.BN; HIPS = BN.index('Hips')
ARM = [i for i, b in enumerate(BN) if any(q in b for q in ('Shoulder', 'Arm', 'Hand'))]
TAGS = {'H50': .5, 'H100': 0.0}
POSES = ('GUARD_ARMS', 'GUARD', 'ARMS_UP', 'JAB', 'CROSS', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT')

def move(W, keep):
    Wn = W.copy(); hm = W.argmax(1) == HIPS; a = W[:, ARM].sum(1)
    for i in ARM: Wn[hm, i] = W[hm, i] * keep
    Wn[hm, HIPS] = W[hm, HIPS] + a[hm] * (1 - keep); return Wn, hm & (a > 0)

def build():
    F = np.load(f'{HERE}/weights_final_2k1.npz'); W = K.dense(F[f'{M}_joints'].astype(int), F[f'{M}_w']); out = {}
    for tag, keep in TAGS.items():
        Wn, ch = move(W, keep); b, w, dr = H2.pack(Wn)
        out[f'{M}_{tag}_joints'] = b; out[f'{M}_{tag}_w'] = w; out[f'{M}_{tag}_w8'] = F5.quant(w, 255, np.uint8)
        print(f'build {tag}: changed {int(ch.sum())} Hips-owned vertices, max dropped weight {dr.max():.4f}')
    return F, out

def variant(F, out, tag):
    G = {k: F[k] for k in F.files}
    if tag != 'S0': G[f'{M}_joints'] = out[f'{M}_{tag}_joints']; G[f'{M}_wq'] = out[f'{M}_{tag}_w8']
    return G

if __name__ == '__main__':
    B.POSES.update(C.NEW_POSES); B.POSES.update(D.NEW_POSES)
    F, out = build(); _, out2 = build(); print('determinism: two builds identical:', all((out[k] == out2[k]).all() for k in out))
    np.savez(f'{HERE}/weights_3_6b.npz', **out); tags = ['S0'] + list(TAGS); res = {}
    for t in tags:
        G = variant(F, out, t)
        for p in POSES: res[(t, p)] = B.run(M, G, p)
    S = lambda t, p: B.summary(M, res[(t, p)])
    print('\n== stretched (>3x) edges and worst edge ==')
    for p in POSES: print(f'  {p:13s} ' + '   '.join(f"{t}: {S(t, p)['gt3']:5d} w{S(t, p)['worst']:6.2f}x" for t in tags))
    tot = {t: sum(S(t, p)['gt3'] for p in POSES) for t in tags}; print('totals over 9 poses:', tot)
    armown = {t: np.isin(res[(t, 'ARMS_UP')]['W'].argmax(1), ARM) for t in tags}; S0own = armown['S0']
    mv = {t: 100 * float(np.linalg.norm(res[(t, 'ARMS_UP')]['P'][S0own] - res[(t, 'ARMS_UP')]['V'][S0own], axis=1).mean()) for t in tags}
    print('arm-owned (S0 owners) mean displacement in ARMS_UP (cm):', {t: round(v, 1) for t, v in mv.items()})
    elig = {}
    for t in tags[1:]:
        g1 = all(S(t, p)['gt3'] <= (S('S0', p)['gt3'] + 5 if S('S0', p)['gt3'] < 250 else S('S0', p)['gt3'] * 1.02) for p in POSES)
        g2 = all(S(t, p)['worst'] <= 1.10 * S('S0', p)['worst'] for p in POSES); g3 = mv[t] >= .9 * mv['S0']
        elig[t] = g1 and g2 and g3; print(f'  {t}: G1 {g1} G2 {g2} G3 {g3} -> eligible {elig[t]}')
    cand = [t for t in tags[1:] if elig[t]]; best = min(cand, key=lambda t: tot[t]) if cand else None
    pick = best if best and tot[best] <= .95 * tot['S0'] else 'S0'; print(f'\nDECISION: best eligible {best}; total {tot.get(best)} against S0 {tot["S0"]} -> PICK {pick}')
    if len(sys.argv) > 1:   # pictures only (not a rule): Mamata + Rahul (draw helper needs 2 models)
        for t, fn in (('S0', 'part3_6b_arms_S0.png'), ('H100', 'part3_6b_arms_H100.png')):
            B.draw(sys.argv[1], variant(F, out, t), [M, 'rahul'], 'ARMS_UP', fn, f'Part 3-6b: ARMS_UP, Mamata with {t} weights; Rahul unchanged')
