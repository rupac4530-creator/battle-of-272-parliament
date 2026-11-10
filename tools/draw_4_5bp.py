"""draw_4_5bp.py -- Part 4-5b: impact poses of the three clips whose twist scale changed, before (ts = 1.0, the 4-5 clip) and after (the 4-5b pick).
Run: python3 tools/draw_4_5bp.py previews4_5b
RULES FIXED BEFORE ANY PICTURE: Shah cross, Kejriwal jab, Mamata cross (the only three picks below 1.0 in anim/twist_pick_4_5b.json). Rows: ts = 1.0, pick. Per model: side view and front view.
Side: horizontal = z (face points RIGHT). Front: horizontal = x (figure's left drawn on the right). Dots: grey up to 3x, orange 3-6x, red above 6x; 14000 vertices per panel. Nothing is judged by this script."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
src = open(f'{HERE}/run_anim_4_5b.py').read().split("print('Part 4-5b checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_5b.py', '__name__': 'r45b'}
exec(compile(src, 'run_anim_4_5b_head', 'exec'), ns)
import numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
Rig, build, lim = ns['Rig'], ns['build'], ns['lim']
PK = json.load(open(f'{ROOT}/anim/twist_pick_4_5b.json'))['twist_scale']
CASES = [('shah', 'cross'), ('kejriwal', 'jab'), ('mamata', 'cross')]
out = sys.argv[1] if len(sys.argv) > 1 else 'previews4_5b'; os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(0); nums = []
def panel(ax, P, vs, view):
    h = P[:, 0] if view == 'front' else P[:, 2]; d = P[:, 2] if view == 'front' else P[:, 0]
    o = np.argsort(d if view == 'front' else -d); col = np.where(vs > 6, 'red', np.where(vs > 3, 'darkorange', '#8a8f98'))
    ax.scatter(h[o], P[o, 1], s=0.5, c=col[o], linewidths=0); ax.set_xlim(-1.1, 1.1); ax.set_ylim(-0.05, 2.0); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
fig, axs = plt.subplots(2, 6, figsize=(15, 8))
for gi, (m, n) in enumerate(CASES):
    r = Rig(f'{ROOT}/rigged_models/{m}.glb'); sel = rng.choice(len(r.V), min(14000, len(r.V)), replace=False)
    for ri, ts in enumerate((1.0, PK[m][n])):
        kp, _ = build(m, n, ts); p = lim(kp['I'], m); P = r.skin(p); s = r.stretch(p)
        vs = np.ones(len(r.V)); np.maximum.at(vs, r.E[:, 0], s); np.maximum.at(vs, r.E[:, 1], s)
        n3, n6, n10, w = r.counts(p); nums.append((m, n, ts, n3, n6, n10, w))
        panel(axs[ri, gi*2], P[sel], vs[sel], 'side'); panel(axs[ri, gi*2+1], P[sel], vs[sel], 'front')
        axs[ri, gi*2].text(-1.05, 1.9, f'{m} {n} ts={ts}  >6x:{n6}', fontsize=7)
fig.suptitle('Part 4-5b: impact pose, ts = 1.0 (top) vs picked ts (bottom). Red = stretch above 6x, orange 3-6x', fontsize=10)
plt.tight_layout(); fig.savefig(f'{out}/part4_5b_impact.png', dpi=90); plt.close(fig)
with open(f'{out}/part4_5b_numbers.txt', 'w') as f:
    f.write('model clip ts edges>3x >6x >10x worst (impact pose only)\n')
    for t in nums: f.write(f'{t[0]} {t[1]} {t[2]} {t[3]} {t[4]} {t[5]} {t[6]:.1f}\n')
print('done')
