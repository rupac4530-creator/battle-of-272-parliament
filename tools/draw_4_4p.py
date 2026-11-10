"""draw_4_4p.py -- Part 4-4p: contact sheets of the 4-4 key poses on all 8 models.  Run: python3 tools/draw_4_4p.py previews4_4p
RULES FIXED BEFORE ANY PICTURE: poses are exactly the 4-4 key poses (limits applied per model, narrow stance for the wide four).
Rows: stance, block (B), light hit (H1), heavy hit (H2), stun sway (Sa), confused look (Fa). Columns per model: side view and front view.
Side view: horizontal axis = z (the models face +z, so the face points to the RIGHT), vertical = y.  Front view: horizontal = x (figure's left = +x, shown on the right).
Dots: grey = edge stretch up to 3x at that vertex, orange 3-6x, red above 6x. Vertices subsampled to 14000 per panel. Drawn back to front.
No weight, clip or limit is changed. Nothing is judged by this script; the pictures are for your eyes."""
import os, sys, types
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
src = open(f'{HERE}/run_anim_4_4.py').read().split("print('Part 4-4 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_4.py', '__name__': 'r44'}
exec(compile(src, 'run_anim_4_4_head', 'exec'), ns)
import numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
A, Rig, MODELS, WIDE = ns['A'], ns['Rig'], ns['MODELS'], ns['WIDE']
out = sys.argv[1] if len(sys.argv) > 1 else 'previews4_4p'; os.makedirs(out, exist_ok=True)
ROWS = [('stance', 'st'), ('block', 'B'), ('light hit', 'H1'), ('heavy hit', 'H2'), ('stun sway', 'Sa'), ('confused', 'Fa')]
PP = {False: ns['poses'](False), True: ns['poses'](True)}
rng = np.random.default_rng(0)
nums = []
def panel(ax, P, vs, view):
    h = P[:, 0] if view == 'front' else P[:, 2]; d = P[:, 2] if view == 'front' else P[:, 0]
    o = np.argsort(d if view == 'front' else -d)
    col = np.where(vs > 6, 'red', np.where(vs > 3, 'darkorange', '#8a8f98'))
    ax.scatter(h[o], P[o, 1], s=0.5, c=col[o], linewidths=0); ax.set_xlim(-1.1, 1.1); ax.set_ylim(-0.05, 2.0); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
for si, grp in enumerate([MODELS[:4], MODELS[4:]]):
    fig, axs = plt.subplots(len(ROWS), 8, figsize=(17, 13.5))
    for gi, m in enumerate(grp):
        r = Rig(f'{ROOT}/rigged_models/{m}.glb'); narrow = m in WIDE
        sel = rng.choice(len(r.V), min(14000, len(r.V)), replace=False)
        for ri, (rn, key) in enumerate(ROWS):
            p = ns['lim'](PP[narrow][key], m); P = r.skin(p); s = r.stretch(p)
            vs = np.ones(len(r.V)); np.maximum.at(vs, r.E[:, 0], s); np.maximum.at(vs, r.E[:, 1], s)
            n3, n6, n10, w = r.counts(p); nums.append((m, rn, n3, n6, n10, w))
            panel(axs[ri, gi*2], P[sel], vs[sel], 'side'); panel(axs[ri, gi*2+1], P[sel], vs[sel], 'front')
            if ri == 0: axs[ri, gi*2].set_title(f'{m} side', fontsize=9); axs[ri, gi*2+1].set_title(f'{m} front', fontsize=9)
            if gi == 0: axs[ri, 0].set_ylabel(rn, fontsize=10)
            axs[ri, gi*2].text(-1.05, 1.9, f'>6x:{n6}', fontsize=6)
    fig.suptitle('Part 4-4p: key poses of the 4-4 clips (face points right in side views; red = stretch above 6x, orange 3-6x)', fontsize=10)
    plt.tight_layout(); fig.savefig(f'{out}/part4_4p_sheet_{si+1}.png', dpi=90); plt.close(fig)
with open(f'{out}/part4_4p_numbers.txt', 'w') as f:
    f.write('model pose edges>3x >6x >10x worst\n')
    for t in nums: f.write(f'{t[0]} {t[1]} {t[2]} {t[3]} {t[4]} {t[5]:.1f}\n')
print('done')
