"""draw_weights_2k2.py -- pictures of the FINAL shipped skin weights (the uint8 copy in weights_final_2k1.npz, divided by 255).

RULES, FIXED BEFORE ANY PICTURE WAS LOOKED AT
  P1 Weights drawn: <m>_wq / scale of weights_final_2k1.npz (the copy the GLBs will use), not the float reference.
  P2 part2k2_weights_front.png : row 1 = front, row 2 = back. Colour = sum over bones of weight x bone colour. A pure colour is a vertex owned by one bone;
     a mixed colour is a soft zone. 22 fixed colours (legend on the sheet): trunk orange / yellow / lime / blue / purple, head white,
     left arm reds, right arm greens, left leg blues, right leg browns.
  P3 part2k2_weights_side.png : row 1 = side view (viewed from the figure's left side, +X; the face points left), same colours. Row 2 = same view, softness = 1 - largest weight
     (black 0, then dark red to bright yellow at 0.5 or more).
  P4 part2k2_weights_soft.png : row 1 = front softness (same scale). Row 2 = number of bones with weight > 0 : 1 dark grey, 2 yellow, 3 orange, 4 red.
  P5 part2k2_numbers.txt : per model share of vertices with largest weight >= 0.99, < 0.9, < 0.6; share with 4 influences. Printed by this script, nothing hand typed.
  Depth order: far points are drawn first so the nearest surface is on top. Nothing is judged from a picture by a rule; the pictures are for eyes.
usage: python3 tools/draw_weights_2k2.py <outdir>
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from glbio import load_mesh
import rigspec_2g2b2 as R

BN = R.BONES; MODELS = ['rahul', 'shah', 'rajnath', 'yogi', 'kejriwal', 'mamata', 'sitharaman', 'kharge']
PAL = {'Hips': (0.95, 0.55, 0.10), 'Spine': (0.98, 0.85, 0.15), 'Spine1': (0.65, 0.85, 0.25), 'Spine2': (0.25, 0.45, 0.95), 'Neck': (0.65, 0.25, 0.85), 'Head': (0.96, 0.96, 0.96),
       'LeftShoulder': (1.0, 0.5, 0.7), 'LeftArm': (0.90, 0.15, 0.15), 'LeftForeArm': (0.55, 0.05, 0.20), 'LeftHand': (1.0, 0.72, 0.60),
       'RightShoulder': (0.55, 0.92, 0.55), 'RightArm': (0.10, 0.65, 0.20), 'RightForeArm': (0.05, 0.35, 0.15), 'RightHand': (0.75, 1.0, 0.85),
       'LeftUpLeg': (0.0, 0.75, 0.80), 'LeftLeg': (0.0, 0.50, 0.65), 'LeftFoot': (0.0, 0.30, 0.55), 'LeftToeBase': (0.55, 0.80, 1.0),
       'RightUpLeg': (0.75, 0.50, 0.15), 'RightLeg': (0.55, 0.35, 0.10), 'RightFoot': (0.40, 0.25, 0.05), 'RightToeBase': (0.90, 0.75, 0.50)}
PC = np.array([PAL[b] for b in BN])
BG = '#161a18'
F = np.load(f'{HERE}/weights_final_2k1.npz'); SC = 255.0 if str(F['choice']) == 'uint8' else 65535.0


def dense(m):
    j = F[f'{m}_joints'].astype(int); q = F[f'{m}_wq'].astype(float) / SC; D = np.zeros((len(q), 22))
    for s in range(4): np.add.at(D, (np.arange(len(q)), j[:, s]), q[:, s])
    return D


def soft_colour(x):
    """x = 1 - largest weight. exactly 0 -> near-black; above 0 -> inferno ramp from dark red to yellow at 0.5 or more."""
    x = np.asarray(x, float); c = matplotlib.colormaps['inferno'](0.30 + 0.70 * np.clip(x / 0.5, 0, 1))[:, :3]
    c[x <= 1e-9] = (0.10, 0.10, 0.12); return c


def infl_colour(k):
    t = {1: (0.22, 0.24, 0.27), 2: (0.98, 0.85, 0.15), 3: (0.95, 0.50, 0.10), 4: (0.92, 0.12, 0.12)}; return np.array([t[int(i)] for i in k])


def view(V, v):
    if v == 'front': return V[:, 0], V[:, 2]
    if v == 'back': return -V[:, 0], -V[:, 2]
    return -V[:, 2], V[:, 0]            # side, from +X: face points left


def sheet(out, rows, title_txt):
    fig, axes = plt.subplots(2, 8, figsize=(28, 10.4)); fig.patch.set_facecolor(BG)
    for i, m in enumerate(MODELS):
        V = load_mesh(f'{HERE}/static_models/{m}.glb')['pos']; D = dense(m); mx = D.max(1); nn = (D > 0).sum(1)
        for r, (v, mode) in enumerate(rows):
            h, d = view(V, v); idx = np.argsort(d); a = axes[r, i]; a.set_facecolor(BG)
            if mode == 'mix': col = np.clip(D @ PC, 0, 1)
            elif mode == 'soft': col = soft_colour(1 - mx)
            else: col = infl_colour(nn)
            a.scatter(h[idx], V[idx, 1], c=col[idx], s=0.9, linewidths=0); a.set_aspect('equal'); a.set_xticks([]); a.set_yticks([]); a.set_title(f'{m} ({v}, {mode})', color='w', fontsize=9)
    fig.text(0.01, 0.005, title_txt, color='w', fontsize=9); plt.subplots_adjust(left=0.005, right=0.995, top=0.95, bottom=0.075, wspace=0.02, hspace=0.06)
    return fig


def legend(fig, kind):
    if kind == 'mix':
        ax = fig.add_axes([0.01, 0.03, 0.98, 0.035]); ax.axis('off')
        ax.legend(handles=[Patch(color=PAL[b], label=b) for b in BN], ncol=11, loc='center', fontsize=7.5, frameon=False, labelcolor='w', handlelength=1.0, columnspacing=0.9)
    elif kind in ('soft', 'softonly'):
        ax = fig.add_axes([0.01, 0.03, 0.98, 0.035]); ax.axis('off')
        hs = [Patch(color=soft_colour(np.array([x]))[0], label=f'1 - largest weight = {x:.2f}') for x in (0.0, 0.05, 0.15, 0.3, 0.5)]
        if kind == 'soft': hs += [Patch(color=infl_colour([k])[0], label=f'{k} bone(s)') for k in (1, 2, 3, 4)]
        ax.legend(handles=hs, ncol=9, loc='center', fontsize=8, frameon=False, labelcolor='w')


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'; os.makedirs(out, exist_ok=True)
    f = sheet(None, [('front', 'mix'), ('back', 'mix')], 'colour = weight-weighted mix of the 22 bone colours (shipped uint8 weights). Pure colour = one bone; mixed colour = soft zone. Rows: front, back.'); legend(f, 'mix')
    f.savefig(f'{out}/part2k2_weights_front.png', dpi=95, facecolor=BG); plt.close(f)
    f = sheet(None, [('side', 'mix'), ('side', 'soft')], 'side view from the left side of the figure (+X, the face points left). Row 1: bone colour mix. Row 2: softness = 1 - largest weight.'); legend(f, 'softonly')
    f.savefig(f'{out}/part2k2_weights_side.png', dpi=95, facecolor=BG); plt.close(f)
    f = sheet(None, [('front', 'soft'), ('front', 'infl')], 'row 1: front softness = 1 - largest weight. Row 2: how many bones have weight on the vertex.'); legend(f, 'soft')
    f.savefig(f'{out}/part2k2_weights_soft.png', dpi=95, facecolor=BG); plt.close(f)
    tot8 = [0, 0, 0]
    L = ['model        n   largest>=0.99   <0.9    <0.6   4 bones (uint8, shipped)   4 bones (float reference)']
    for m in MODELS:
        D = dense(m); mx = D.max(1); nn = (D > 0).sum(1); n = len(mx)
        nf = (F[f'{m}_w'] > 0).sum(1); tot8[0] += int((nn == 4).sum()); tot8[1] += int((nf == 4).sum()); tot8[2] += n
        L.append(f'{m:11s} {n:6d}   {100*(mx>=0.99).mean():6.1f}%  {100*(mx<0.9).mean():6.1f}% {100*(mx<0.6).mean():6.1f}%  {100*(nn==4).mean():6.1f}%                      {100*(nf==4).mean():6.1f}%')
    L.append(f'ALL        {tot8[2]:6d}   4 bones: uint8 {100*tot8[0]/tot8[2]:.2f}%, float {100*tot8[1]/tot8[2]:.2f}%')
    open(f'{out}/part2k2_numbers.txt', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
