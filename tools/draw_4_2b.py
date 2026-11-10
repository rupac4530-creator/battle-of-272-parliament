"""draw_4_2b.py -- Part 4-2b picture. Run: python3 tools/draw_4_2b.py previews4_2b
RULES FIXED BEFORE ANY PICTURE: wide four only. Rows: stance d=0 (4-2 stance), stance with the picked d, block d=0, block with the picked d (front views),
light hit k=1 and light hit k=2 on the picked stance (side views, face points right). Dots: grey <=3x stretch, orange 3-6x, red >6x. Limits applied. Reads anim/narrow_guard_4_2b.json."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
src = open(f'{HERE}/run_anim_4_4.py').read().split("print('Part 4-4 checks")[0]
ns = {'__file__': f'{HERE}/run_anim_4_4.py', '__name__': 'r44'}; exec(compile(src, 'h', 'exec'), ns)
import numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
Rig, WIDE, P, X, add, merge, both, lim = ns['Rig'], ns['WIDE'], ns['P'], ns['X'], ns['add'], ns['merge'], ns['both'], ns['lim']
out = sys.argv[1]; os.makedirs(out, exist_ok=True); PK = json.load(open(f'{ROOT}/anim/narrow_guard_4_2b.json'))
orig = ns['stance_spec']
def ps(d):
    def f(n):
        s = orig(n)
        if n: s['LeftArm'] = [('z', -d), ('x', -35)]; s['RightArm'] = [('z', d), ('x', -35)]
        return s
    ns['stance_spec'] = f; r = ns['poses'](True); S = f(True); ns['stance_spec'] = orig; return r, S
def hit(S, k): return P(add(S, merge({'Spine': X(-5*k), 'Spine1': X(-4*k), 'Spine2': X(-3*k), 'Head': X(-10*k)}, both('Arm', 8*k), both('ForeArm', 10*k), both('UpLeg', 3*k), both('Foot', -3*k))))
rng = np.random.default_rng(0)
fig, axs = plt.subplots(6, 4, figsize=(11, 20))
for gi, m in enumerate(WIDE):
    r = Rig(f'{ROOT}/rigged_models/{m}.glb'); d = PK['arm_in_deg'][m]; k = PK['light_hit_scale'][m]
    p0, S0 = ps(0); p1, S1 = ps(d); sel = rng.choice(len(r.V), min(14000, len(r.V)), replace=False)
    items = [('stance d=0', p0['st'], 'front'), (f'stance d={d}', p1['st'], 'front'), ('block d=0', p0['B'], 'front'), (f'block d={d}', p1['B'], 'front'),
             ('light hit k=1', hit(S1, 1.0), 'side'), (f'light hit k={k}', hit(S1, k), 'side')]
    for ri, (nm, pose, view) in enumerate(items):
        p = lim(pose, m); Pm = r.skin(p); s = r.stretch(p); vs = np.ones(len(r.V)); np.maximum.at(vs, r.E[:, 0], s); np.maximum.at(vs, r.E[:, 1], s)
        h = (Pm[:, 0] if view == 'front' else Pm[:, 2])[sel]; dep = (Pm[:, 2] if view == 'front' else Pm[:, 0])[sel]; o = np.argsort(dep if view == 'front' else -dep)
        col = np.where(vs[sel] > 6, 'red', np.where(vs[sel] > 3, 'darkorange', '#8a8f98'))
        ax = axs[ri, gi]; ax.scatter(h[o], Pm[sel][o, 1], s=0.5, c=col[o], linewidths=0); ax.set_xlim(-1.1, 1.1); ax.set_ylim(-0.05, 2.0); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
        if ri == 0: ax.set_title(m, fontsize=10)
        ax.text(-1.05, 1.88, nm, fontsize=7)
fig.suptitle('Part 4-2b: inward guard and larger light hit on the wide four (limits applied; red >6x, orange 3-6x)', fontsize=10)
plt.tight_layout(); fig.savefig(f'{out}/part4_2b_guard.png', dpi=90)
