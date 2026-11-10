"""diag_4_3.py -- ADDED AFTER SEEING the 4-3 results; changes no clip, rule or pick.
 (a) which key pose drives the stretch: edges >6x / >10x / worst edge per static key pose (limits applied), per model;
 (b) the step-bound failure of jump_rise: ratio step/bound per frame with the bound taken over EVERY segment the frame step spans
     (max of peak*tot/span*dt over the segments overlapped), which is the fair bound when a step crosses a key;
 (c) the stance->crouch crossfade checked against the crouch END pose (what the crossfade actually moves toward)."""
import os, sys, json, importlib.util, io, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import numpy as np
buf = io.StringIO()
with contextlib.redirect_stdout(buf):                       # import the main script's definitions without printing its report
    spec = importlib.util.spec_from_file_location('r43', f'{HERE}/run_anim_4_3.py'); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
A = R.A; np_ = np
print('(a) per key pose: edges >6x / >10x / worst edge (limits applied)')
for m in R.MODELS:
    var = m in R.WIDE; r = R.rigs[m]; o = []
    for n in ('st', 'C', 'E', 'T', 'R', 'A'):
        c = r.counts(R.lim(R.PP[var][n], m)); o.append(f'{n} {c[1]}/{c[2]}/{c[3]:.1f}x')
    print(f'  {m:11s} ' + '   '.join(o))
print('\n(b) jump_rise step vs bound over every spanned segment (max ratio over frames and bones; <=1 means within the bound)')
for hz in (60, 120):
    c = R.CL[False]['jump_rise']; ks = c['keys']; dt = 1.0 / hz; worst = (0, None); prev = A.sample(c, 0.0); n = int(np.ceil(c['duration'] * hz - 1e-9))
    for i in range(1, n + 1):
        t0 = (i - 1) * dt; t1 = min(i * dt, c['duration']); cur = A.sample(c, t1)
        segs = [j for j in range(1, len(ks)) if ks[j]['t'] > t0 + 1e-12 and ks[j-1]['t'] < t1 - 1e-12]
        for b in A.BONES:
            step = R.ang({'q': {b: A.q_of(prev, b)}}, {'q': {b: A.q_of(cur, b)}})
            bound = max(A.EASE_PEAK_SPEED[ks[j].get('ease', 'smooth')] * R.ang({'q': {b: A.q_of(ks[j-1]['pose'], b)}}, {'q': {b: A.q_of(ks[j]['pose'], b)}}) / (ks[j]['t'] - ks[j-1]['t']) * dt for j in segs) + 1e-3 + 1e-6
            if step / bound > worst[0]: worst = (step / bound, (b, round(t0, 4), len(segs)))
        prev = cur
    print(f'  {hz} Hz: worst ratio {worst[0]:.3f} at {worst[1]} (bone, t, segments spanned)')
print('\n(c) stance -> crouch END crossfade (0.08 s, 5 steps): worst step edges >6x vs max(endpoint counts) + 5')
for m in R.MODELS:
    var = m in R.WIDE; r = R.rigs[m]; pa = R.PP[var]['st']; pb = R.PP[var]['C']
    ends = max(r.counts(R.lim(pa, m))[1], r.counts(R.lim(pb, m))[1]); mx = max(r.counts(R.lim(A.crossfade(pa, pb, s * 0.02, 0.08), m))[1] for s in range(5))
    print(f'  {m:11s} ends {ends}, worst step {mx}  -> {"OK" if mx <= ends + 5 else "OVER"}')
