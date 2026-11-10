"""check_final_2k1.py -- validation of tools/weights_final_2k1.npz. Run: python3 check_final_2k1.py > previews2k1/part2k1_checks.txt"""
import os, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import build_final_2k1 as B
import rigspec_2g2b2 as R2
import poselib as PL
from glbio import load_mesh, read_glb

M = B.MODELS; BN = B.BN
F = np.load(f'{HERE}/weights_final_2k1.npz'); Z6b = np.load(f'{HERE}/weights_2i6b.npz'); Z6 = np.load(f'{HERE}/weights_2i6.npz')
npass = nfail = 0
def chk(name, ok):
    global npass, nfail
    npass += bool(ok); nfail += (not ok); print(('PASS ' if ok else 'FAIL ') + name)
def pct(a, b): return 100 * a / b if b else 0.0
choice = str(F['choice']); scale = 255 if choice == 'uint8' else 65535
mesh = {m: load_mesh(f'{HERE}/static_models/{m}.glb') for m in M}

print('== 1. source: the final file is a straight copy of 2I-6b, and 2I-6b equals 2I-6 on five models ==')
for m in M:
    same6b = all((F[f'{m}_{a}'] == Z6b[f'{m}_{b}']).all() for a, b in (('joints', 'joints'), ('w', 'w')))
    chk(f'{m}: joints and float weights identical to weights_2i6b.npz', same6b)
    if B.SRC[m] == '2I-6':
        chk(f'{m}: source says 2I-6, and weights_2i6b equals weights_2i6 (joints, w, w8, w16)', all((Z6b[f'{m}_{k}'] == Z6[f'{m}_{k}']).all() for k in ('joints', 'w', 'w8', 'w16')))
    else:
        d = int((Z6b[f'{m}_w'] != Z6[f'{m}_w']).any(1).sum())
        chk(f'{m}: source says 2I-6b, and it differs from 2I-6 on {d} vertices', d > 0)
    chk(f'{m}: stored source label is {B.SRC[m]}', str(F[f'source_{m}']) == B.SRC[m])

print('\n== 2. validity per model ==')
tot_n = 0; infl = np.zeros(5, int)
for m in M:
    j = F[f'{m}_joints'].astype(int); w = F[f'{m}_w'].astype(float); q = F[f'{m}_wq']; n = len(w); tot_n += n
    chk(f'{m}: vertex count {n} equals the mesh ({len(mesh[m]["pos"])})', n == len(mesh[m]['pos']))
    chk(f'{m}: joints 0..21, weights >= 0, float sum error {abs(w.sum(1)-1).max():.1e}, slots sorted largest first', j.max() <= 21 and (w >= 0).all() and abs(w.sum(1) - 1).max() < 1e-5 and (np.diff(w, axis=1) <= 1e-9).all())
    empty = w == 0
    chk(f'{m}: every empty slot is bone 0 with weight 0', (j[empty] == 0).all())
    dup = 0
    for s in range(4):
        for t in range(s + 1, 4): dup += int(((j[:, s] == j[:, t]) & (w[:, s] > 0) & (w[:, t] > 0)).sum())
    chk(f'{m}: no vertex lists the same bone twice with weight ({dup})', dup == 0)
    chk(f'{m}: chosen copy is {q.dtype}, sums to exactly {scale} on all {n} vertices', str(q.dtype) == choice and (q.astype(np.int64).sum(1) == scale).all())
    chk(f'{m}: quantised weight is 0 exactly where the float weight is 0 (no invented influence); {int(((q==0)&(w>0)).sum())} small real weights rounded to 0', not ((q > 0) & (w == 0)).any())
    qi = q.astype(np.int64); uns = (np.diff(qi, axis=1) > 0); sw = []
    for s_ in range(3):
        r = uns[:, s_]; sw += list((w[r, s_] - w[r, s_ + 1]))
    # a swapped pair has float order (larger first) but quantised order reversed: the float gap of that pair must be tiny
    chk(f'{m}: {int(uns.any(1).sum())} rows have quantised slots out of order (glTF does not need order); each swapped pair is a near-tie, largest float gap {max([abs(x) for x in sw]) if sw else 0:.4f}', (not sw) or max(abs(x) for x in sw) <= 0.005)
    infl += np.bincount((w > 0).sum(1), minlength=5)[:5]
print(f'influences per vertex over {tot_n} vertices: ' + ', '.join(f'{k} bones {pct(infl[k], tot_n):.2f}%' for k in range(1, 5)))

print('\n== 3. bones that carry almost no weight (vertices with weight > 0.01), per model ==')
for m in M:
    j = F[f'{m}_joints'].astype(int); w = F[f'{m}_w'].astype(float); cnt = np.zeros(22, int)
    for s in range(4): np.add.at(cnt, j[:, s], (w[:, s] > 0.01).astype(int))
    low = [(BN[b], int(cnt[b])) for b in range(22) if cnt[b] < 20]
    print(f'{m:11s} bones with < 20 vertices: {low if low else "none"}   (smallest non-low: {min([int(c) for c in cnt if c >= 20])})')

print('\n== 4. bind pose and skeleton ==')
chk('bone names and order equal rigspec_2g2b2.BONES', list(F['bones']) == BN)
par = F['parents'].astype(int)
chk('exactly one root and it is Hips', (par == -1).sum() == 1 and BN[int(np.where(par == -1)[0][0])] == 'Hips')
chk('every parent index is smaller than its child index', all(par[i] < i for i in range(22) if par[i] >= 0))
bad = [BN[i] for i in range(22) if par[i] >= 0 and par[i] > i]
print(f'bones whose parent index is LARGER than their own (matters for glTF node order): {bad if bad else "none"}')
for m in M:
    bp = F[f'{m}_bind'].astype(float); ref = np.array([R2.JOINTS[m][b] for b in BN], float)
    chk(f'{m}: bind joints equal rigspec_2g2b2 (max diff {abs(bp-ref).max():.1e}), x of the centre joints is 0', abs(bp - ref).max() < 1e-6 and abs(bp[[BN.index(b) for b in ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head")], 0]).max() < 1e-9)

print('\n== 5. determinism: a fresh build into a temporary file is identical ==')
tmp = os.path.join(tempfile.mkdtemp(), 'w.npz'); qt, ch2 = B.main(tmp); G = np.load(tmp)
chk('fresh build: same keys and every array equal', set(G.files) == set(F.files) and all((G[k] == F[k]).all() for k in F.files))
chk(f'fresh build chooses the same copy ({ch2})', ch2 == choice)

print('\n== 6. quantisation: cost of each copy over 8 models x 11 poses (rule R3 in build_final_2k1.py) ==')
for t in ('uint8', 'uint16'):
    d = qt[t]; print(f'{t:7s} largest vertex displacement from float skin {d["maxd"]:.4f} cm; top-bone flips {d["flips"]} (with float gap > {B.GAP}: {d["flips_big"]}); weights >= {B.SMALL} rounded to 0: {d["lost"]}')
    print('        per model largest displacement (cm): ' + ', '.join(f'{m} {v:.3f}' for m, v in d['per'].items()))
chk('rule R3 passes for uint8 (so uint8 is the choice)', choice == 'uint8' and qt['uint8']['maxd'] <= B.DISP_CM and qt['uint8']['flips_big'] == 0 and qt['uint8']['lost'] == 0)
# weight error and flips whose gap is tiny
errs = []; fl_gaps = []
for m in M:
    w = F[f'{m}_w'].astype(float); q = Z6b[f'{m}_w8'].astype(float) / 255; errs.append(abs(w - q).max())
    j = F[f'{m}_joints'].astype(int); ws = np.sort(w, axis=1)[:, ::-1]; gap = ws[:, 0] - ws[:, 1]
    fl = j[np.arange(len(w)), w.argmax(1)] != j[np.arange(len(w)), q.argmax(1)]; fl_gaps += list(gap[fl])
print(f'uint8 largest single weight error {max(errs):.4f}; {len(fl_gaps)} top-bone flips, their float gaps: max {max(fl_gaps):.4f} (all are near-ties)' if fl_gaps else 'uint8 no top-bone flips')

print('\n== 7. size (before compression, per vertex 4 bone bytes + 4 weight bytes for uint8) ==')
per_v = 4 + 4 * (1 if choice == 'uint8' else 2)
print(f'vertices {tot_n}; skin data {tot_n*per_v/1e6:.2f} MB with {choice} (uint8 would be {tot_n*8/1e6:.2f} MB, uint16 {tot_n*12/1e6:.2f} MB)')
sz = {m: os.path.getsize(f'{HERE}/static_models/{m}.glb') for m in M}
print(f'static GLBs now: {sum(sz.values())/1e6:.2f} MB total; skin data adds {100*tot_n*per_v/sum(sz.values()):.1f}% (plus a few KB for 22 bone nodes per model, not built yet)')
print(f'npz on disk {os.path.getsize(f"{HERE}/weights_final_2k1.npz")/1e6:.2f} MB (compressed, includes float copy for tests)')
for m in M:
    js, _ = read_glb(f'{HERE}/static_models/{m}.glb'); pr = js['meshes'][0]['primitives'][0]['attributes']
    print(f'  {m:11s} GLB attributes now: {sorted(pr)} ; has skins: {"skins" in js}')

print('\n== 8. reference stretch totals for the final float weights (edges stretched more than 3x), 11 fixed poses ==')
def edges(idx):
    e = np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]]); e.sort(1); return np.unique(e, axis=0)
EG = {m: edges(mesh[m]['idx'].reshape(-1, 3)) for m in M}
tab = {}
for m in M:
    V = mesh[m]['pos']; W = B.dense(F[f'{m}_joints'], F[f'{m}_w'])
    for lab, spec in B.POSES.items():
        P = PL.skin(V, W, PL.fk(m, spec)); st = PL.stretch(V, EG[m], P); tab[(m, lab)] = (int((st > 3).sum()), float(st.max()))
print('pose'.ljust(24) + ''.join(m[:7].rjust(9) for m in M) + '    total')
for lab in B.POSES:
    print(lab.ljust(24) + ''.join(str(tab[(m, lab)][0]).rjust(9) for m in M) + str(sum(tab[(m, lab)][0] for m in M)).rjust(9))
print('worst single edge (x): ' + ', '.join(f'{m} {max(tab[(m,l)][1] for l in B.POSES):.1f}' for m in M))

print('\n== 9. empty shoulder bones (carried from 2I-5) ==')
for m, b in (('mamata', 'LeftShoulder'), ('sitharaman', 'RightShoulder')):
    j = F[f'{m}_joints'].astype(int); w = F[f'{m}_w'].astype(float); bi = BN.index(b)
    print(f'{m} {b}: vertices with weight > 0.01: {int(((j == bi) & (w > 0.01)).sum())}; largest weight on it {float(w[j == bi].max()) if (j == bi).any() else 0.0:.3f}')

print(f'\nSUMMARY: {npass} pass, {nfail} fail')
