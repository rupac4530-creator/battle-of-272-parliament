"""build_final_2k1.py -- Part 2K-1: assemble the final skin-weight file.

RULES, FIXED BEFORE ANY RESULT IS COMPUTED
  R1 Source. Every model's weights come from tools/weights_2i6b.npz (2I-6b holds all 8 models: Rahul, Shah, Rajnath,
     Yogi, Kejriwal are the 2I-6 picks, Mamata, Sitharaman, Kharge are the 2I-6b picks). No weight is edited here.
  R2 Content of the output (tools/weights_final_2k1.npz), per model m:
       <m>_joints  uint8  (n,4)   bone index per slot, empty slot = bone 0 with weight 0
       <m>_w       float32 (n,4)  reference weights, sum 1, largest first
       <m>_wq      uint8 or uint16 (n,4)  the chosen quantised copy (sum exactly 255 or 65535)
       <m>_bind    float32 (22,3) joint positions at rest (rigspec_2g2b2), the bind pose (translation only, identity rotation)
     plus  bones (22 names), parents (22 ints, -1 = root), choice ('uint8' or 'uint16'), source_<m> (text).
  R3 Quantisation choice. Prefer uint8 (smaller). Use uint8 only if, over all 8 models and the 11 fixed test poses in POSES:
       (a) the largest vertex displacement of the uint8 skin from the float skin is <= 0.5 cm,
       (b) no vertex changes its largest-weight bone while the float gap between its top two weights is > 0.02,
       (c) no float weight >= 0.02 is rounded to 0.
     Otherwise use uint16. The test uses the same forward-kinematics skinning as poselib.py.
  R4 The 11 poses are my own angles (not animation). They are listed below and are not changed after a result.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import rigspec_2g2b2 as R2
import poselib as PL
from glbio import load_mesh

MODELS = R2.JOINTS.keys() if False else ['rahul', 'shah', 'rajnath', 'yogi', 'kejriwal', 'mamata', 'sitharaman', 'kharge']
BN = R2.BONES
SRC = {'rahul': '2I-6', 'shah': '2I-6', 'rajnath': '2I-6', 'yogi': '2I-6', 'kejriwal': '2I-6', 'mamata': '2I-6b', 'sitharaman': '2I-6b', 'kharge': '2I-6b'}
DISP_CM, GAP, SMALL = 0.5, 0.02, 0.02
POSES = {
 'kick (left)': {'LeftUpLeg': ('x', -60), 'LeftLeg': ('x', 20), 'LeftFoot': ('x', -20)},
 'kick (right)': {'RightUpLeg': ('x', -60), 'RightLeg': ('x', 20), 'RightFoot': ('x', -20)},
 'left leg forward 35': {'LeftUpLeg': ('x', -35)},
 'left leg out 25': {'LeftUpLeg': ('z', 25)},
 'left knee bent 90': {'LeftLeg': ('x', 90)},
 'arms out 80': {'LeftArm': ('z', 80), 'RightArm': ('z', -80)},
 'guard': {'LeftArm': ('x', -60), 'LeftForeArm': ('x', -90), 'RightArm': ('x', -60), 'RightForeArm': ('x', -90)},
 'punch': {'RightArm': ('x', -85), 'RightForeArm': ('x', -10), 'LeftArm': ('x', -50), 'LeftForeArm': ('x', -100), 'Spine': ('y', 12), 'Spine1': ('y', 12)},
 'torso twist 45': {'Spine': ('y', 15), 'Spine1': ('y', 15), 'Spine2': ('y', 15)},
 'head turn 35 + nod 20': {'Head': ('y', 35), 'Neck': ('y', 10)},
 'head nod 20': {'Head': ('x', 20)},
}

def dense(j, w):
    D = np.zeros((len(w), 22))
    for s in range(4): np.add.at(D, (np.arange(len(w)), j[:, s].astype(int)), w[:, s].astype(float))
    return D

def quant_test(z, meshes):
    """returns dict of numbers for both quantisations."""
    out = {}
    for tag, key, scale in (('uint8', 'w8', 255.0), ('uint16', 'w16', 65535.0)):
        maxd = 0.0; flips = 0; flips_big = 0; lost = 0; per = {}
        for m in MODELS:
            j = z[f'{m}_joints']; w = z[f'{m}_w'].astype(float); q = z[f'{m}_{key}'].astype(float) / scale
            Wf = dense(j, w); Wq = dense(j, q)
            ws = np.sort(w, axis=1)[:, ::-1]; gap = ws[:, 0] - ws[:, 1]
            top_f = j[np.arange(len(w)), w.argmax(1)]; top_q = j[np.arange(len(w)), q.argmax(1)]
            fl = top_f != top_q; flips += int(fl.sum()); flips_big += int((fl & (gap > GAP)).sum())
            lost += int(((w >= SMALL) & (q == 0)).sum())
            md = 0.0
            for lab, spec in POSES.items():
                Mx = PL.fk(m, spec); Pf = PL.skin(meshes[m], Wf, Mx); Pq = PL.skin(meshes[m], Wq, Mx)
                md = max(md, float(np.linalg.norm(Pf - Pq, axis=1).max()) * 100)
            per[m] = md; maxd = max(maxd, md)
        out[tag] = dict(maxd=maxd, flips=flips, flips_big=flips_big, lost=lost, per=per)
    return out

def main(outpath):
    z = np.load(f'{HERE}/weights_2i6b.npz')
    meshes = {m: load_mesh(f'{HERE}/static_models/{m}.glb')['pos'] for m in MODELS}
    qt = quant_test(z, meshes)
    u8 = qt['uint8']; ok8 = u8['maxd'] <= DISP_CM and u8['flips_big'] == 0 and u8['lost'] == 0
    choice = 'uint8' if ok8 else 'uint16'; key = 'w8' if ok8 else 'w16'
    D = {'bones': np.array(BN), 'parents': np.array([-1 if R2.PARENT[b] is None else BN.index(R2.PARENT[b]) for b in BN], np.int8), 'choice': np.array(choice)}
    for m in MODELS:
        D[f'{m}_joints'] = z[f'{m}_joints'].astype(np.uint8)
        D[f'{m}_w'] = z[f'{m}_w'].astype(np.float32)
        D[f'{m}_wq'] = z[f'{m}_{key}']
        D[f'{m}_bind'] = np.array([R2.JOINTS[m][b] for b in BN], np.float32)
        D[f'source_{m}'] = np.array(SRC[m])
    np.savez_compressed(outpath, **D)
    return qt, choice

if __name__ == '__main__':
    qt, choice = main(os.path.join(HERE, 'weights_final_2k1.npz'))
    for t in ('uint8', 'uint16'): print(t, {k: v for k, v in qt[t].items() if k != 'per'})
    print('choice', choice)
