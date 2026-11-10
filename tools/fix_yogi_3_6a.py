"""fix_yogi_3_6a.py -- Part 3-6a: YOGI'S DHOTI CENTRE MIX (first fix of the 3-6 fix pass). Changes weights below the crotch on Yogi only.
Run: python3 tools/fix_yogi_3_6a.py > previews3_6a/part3_6a_numbers.txt

WHAT I LOOKED AT BEFORE FIXING THE RULES (disclosed): the 3-1, 3-3 and 3-4 numbers for Yogi (stretch inside LeftLeg, inside RightLeg and between them, i.e. the dhoti between the legs) and the 2J-3b/2J-3c result that a left/right centre mix removed the centre-line stretch on the saris. I tested NO Yogi weight change before fixing these rules.

RULES (fixed now, before any result):
  A. MIX: on every Yogi vertex below the crotch (tools/trunk.py CROTCH['yogi']['y']): new = (1-u)*W + u*W_swap, Left/Right swapped on UpLeg, Leg, Foot, ToeBase only
     (the SWAP of build_saris_2j3b). t = |x| / WC, s = smoothstep(t), u = 0.5*(1-s).
  B. CANDIDATES: S0 = shipped weights (weights_final_2k1.npz); C08 = WC 8 cm; C12 = WC 12 cm; C16 = WC 16 cm. Only widths up to 16 cm: the saris showed the count keeps
     falling with width because the skirt turns into one block, and a dhoti is much narrower than a sari.
  C. After mixing: keep the 4 largest bones, renormalise, quantise to uint8 exactly as 2I-5 (build_hems_2j2.pack and build_final_2i5.quant).
  D. POSES: the 9 poses GUARD_ARMS, GUARD, ARMS_UP, JAB, CROSS, FRONT_KICK, FRONT_KICK_R, SIDE_KICK, KNEE_LIFT (3-1, 3-3, 3-4 tables, unchanged).
  E. GUARDS (a candidate is ELIGIBLE only if all hold):
     G1: in no pose does the count of edges stretched >3x rise by more than 2% against S0 (or by more than 5 edges when the S0 count is below 250).
     G2: in no pose does the worst edge grow by more than 10% against S0.
     G3: left skirt = Yogi vertices below the crotch with x > +0.10 m, right skirt = x < -0.10 m. Mean displacement (cm) of the left skirt in FRONT_KICK must be >= 50% of S0's,
         and of the right skirt in FRONT_KICK_R >= 50% of S0's.
     G4: (left mean displacement - right mean displacement) in FRONT_KICK must be >= 80% of S0's, and (right - left) in FRONT_KICK_R >= 80% of S0's
         (the two halves must not become one block, the still leg's half must not be dragged along).
  F. DECISION: the eligible candidate with the lowest total of stretched edges over the 9 poses wins, but only if its total is at least 5% below S0's. Otherwise S0 stays.
  G. NOTHING ELSE changes: no owner, joint, radius or flag; the other seven models are untouched. Output weights_3_6a.npz holds only Yogi (per tag: joints / w / w8).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import bendtest_3_1 as B
import bendtest_3_3 as C
import bendtest_3_4 as D
import build_hems_2j2 as H2
import build_final_2i5 as F5
import build_cloth_2j1 as K
import build_saris_2j3b as S3B
import trunk as T
from glbio import load_mesh

M = 'yogi'; SWAP = S3B.SWAP; smooth = H2.smooth
TAGS = {'C08': .08, 'C12': .12, 'C16': .16}
POSES = ('GUARD_ARMS', 'GUARD', 'ARMS_UP', 'JAB', 'CROSS', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT')


def mix(V, W, wc):
    Wn = W.copy(); u = np.zeros(len(V)); mk = V[:, 1] < T.CROTCH[M]['y']
    u[mk] = 0.5 * (1 - smooth(np.abs(V[mk, 0]) / wc)); Wn[mk] = (1 - u[mk])[:, None] * W[mk] + u[mk][:, None] * W[:, SWAP][mk]
    return Wn, u


def build():
    F = np.load(f'{HERE}/weights_final_2k1.npz'); V = load_mesh(f'{HERE}/static_models/{M}.glb')['pos']
    W = K.dense(F[f'{M}_joints'].astype(int), F[f'{M}_w']); out = {}
    for tag, wc in TAGS.items():
        Wn, u = mix(V, W, wc); b, w, dr = H2.pack(Wn)
        out[f'{M}_{tag}_joints'] = b; out[f'{M}_{tag}_w'] = w; out[f'{M}_{tag}_w8'] = F5.quant(w, 255, np.uint8)
        print(f'build {tag}: centre-mixed {int((u > 0).sum())} vertices, max mix {u.max():.3f}, max dropped weight {dr.max():.4f}')
    return F, out


def variant(F, out, tag):
    G = {k: F[k] for k in F.files}
    if tag != 'S0': G[f'{M}_joints'] = out[f'{M}_{tag}_joints']; G[f'{M}_wq'] = out[f'{M}_{tag}_w8']
    return G


def disp(r, mask):
    return 100 * float(np.linalg.norm(r['P'][mask] - r['V'][mask], axis=1).mean())


if __name__ == '__main__':
    B.POSES.update(C.NEW_POSES); B.POSES.update(D.NEW_POSES)
    F, out = build(); F2, out2 = build(); det = all((out[k] == out2[k]).all() for k in out)
    print('determinism: two builds identical:', det)
    np.savez(f'{HERE}/weights_3_6a.npz', **out)
    V0 = load_mesh(f'{HERE}/static_models/{M}.glb')['pos']; below = V0[:, 1] < T.CROTCH[M]['y']
    L = below & (V0[:, 0] > .10); R = below & (V0[:, 0] < -.10); print('left skirt vertices', int(L.sum()), 'right skirt vertices', int(R.sum()))
    res = {}; tags = ['S0'] + list(TAGS)
    for tag in tags:
        G = variant(F, out, tag)
        for p in POSES: res[(tag, p)] = B.run(M, G, p)
    print('\n== stretched (>3x) edges and worst edge, per pose ==')
    for p in POSES:
        print(f'  {p:13s} ' + '   '.join(f"{t}: {B.summary(M, res[(t, p)])['gt3']:5d} w{B.summary(M, res[(t, p)])['worst']:6.2f}x" for t in tags))
    tot = {t: sum(B.summary(M, res[(t, p)])['gt3'] for p in POSES) for t in tags}
    print('totals over 9 poses:', tot)
    dK = {t: (disp(res[(t, 'FRONT_KICK')], L), disp(res[(t, 'FRONT_KICK')], R), disp(res[(t, 'FRONT_KICK_R')], L), disp(res[(t, 'FRONT_KICK_R')], R)) for t in tags}
    print('\n== skirt mean displacement (cm): kickL: left,right   kickR: left,right ==')
    for t in tags: print(f'  {t}: ' + ', '.join(f'{x:.1f}' for x in dK[t]))
    elig = {}
    for t in tags[1:]:
        g1 = all(B.summary(M, res[(t, p)])['gt3'] <= max(B.summary(M, res[('S0', p)])['gt3'] * 1.02, B.summary(M, res[('S0', p)])['gt3'] + 5 if B.summary(M, res[('S0', p)])['gt3'] < 250 else 0) for p in POSES)
        g2 = all(B.summary(M, res[(t, p)])['worst'] <= 1.10 * B.summary(M, res[('S0', p)])['worst'] for p in POSES)
        a, b, c, d = dK[t]; a0, b0, c0, d0 = dK['S0']
        g3 = a >= .5 * a0 and d >= .5 * d0; g4 = (a - b) >= .8 * (a0 - b0) and (d - c) >= .8 * (d0 - c0)
        elig[t] = g1 and g2 and g3 and g4; print(f'  {t}: G1 {g1} G2 {g2} G3 {g3} G4 {g4} -> eligible {elig[t]}')
    cand = [t for t in tags[1:] if elig[t]]; best = min(cand, key=lambda t: tot[t]) if cand else None
    pick = best if best and tot[best] <= .95 * tot['S0'] else 'S0'
    print(f'\nDECISION: best eligible {best}; total {tot.get(best)} against S0 {tot["S0"]} -> PICK {pick}')
    if len(sys.argv) > 1:   # picture only (not a rule): Yogi + Rahul (the draw helper needs 2 models), kick pose, current weights against C16
        for t, fn in (('S0', 'part3_6a_kick_S0.png'), ('C16', 'part3_6a_kick_C16.png')):
            B.draw(sys.argv[1], variant(F, out, t), [M, 'rahul'], 'FRONT_KICK', fn, f'Part 3-6a: FRONT_KICK, Yogi (left) with {t} weights; Rahul (right) unchanged')
