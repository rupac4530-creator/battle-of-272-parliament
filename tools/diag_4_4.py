"""diag_4_4.py -- ADDED AFTER SEEING the 4-4 results; changes no clip, rule or pick.
 (a) per key pose (limits applied): edges >6x / >10x / worst edge, per model;
 (b) for every clip whose worst edge broke the S2 cap: the worst frame, the worst edge's owner pair (bone with the larger weight at each end) and rest height."""
import os, sys, io, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import importlib.util, numpy as np
with contextlib.redirect_stdout(io.StringIO()):
    spec = importlib.util.spec_from_file_location('r44', f'{HERE}/run_anim_4_4.py'); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
A = R.A
print('(a) per key pose: edges >6x / >10x / worst edge')
for m in R.MODELS:
    var = m in R.WIDE; r = R.rigs[m]
    print(f'  {m:11s} ' + '  '.join(f'{p} {(c:=r.counts(R.lim(R.PP[var][p], m)))[1]}/{c[2]}/{c[3]:.1f}' for p in ('st', 'B', 'H1', 'H2', 'Sd', 'Sa', 'Fd', 'Fa')))
print('\n(b) worst edge of each cap-breaking clip: clip, time, stretch, owner pair, rest height (cm)')
for m in R.MODELS:
    var = m in R.WIDE; r = R.rigs[m]; st_w = r.counts(R.lim(R.PP[var]['st'], m))[3]; cap = max(2 * st_w, 25)
    for cn in R.CN:
        c = R.CL[var][cn]; best = (0, None)
        for i in range(R.NF + 1):
            t = i * c['duration'] / R.NF; s = r.stretch(R.lim(A.sample(c, t), m)); j = int(np.argmax(s))
            if s[j] > best[0]: best = (s[j], (t, j))
        if best[0] > cap:
            t, j = best[1]; a, b = r.E[j]; oa = r.names[int(r.J[a][np.argmax(r.W[a])])]; ob = r.names[int(r.J[b][np.argmax(r.W[b])])]
            h = (r.V[a][1] + r.V[b][1]) / 2 * 100
            print(f'  {m:11s} {cn:11s} t={t:.3f} {best[0]:6.1f}x  {oa}|{ob}  height {h:5.1f}')
