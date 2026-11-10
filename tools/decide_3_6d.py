"""decide_3_6d.py -- Part 3-6d: ONE severity-based decision rule for the five models whose fixes 3-6a/3-6b/3-6c refused.
Run: python3 tools/decide_3_6d.py previews3_6d > previews3_6d/part3_6d_numbers.txt

DISCLOSURE (read first): this rule was written AFTER I saw the 3-6a, 3-6b and 3-6c results. In all three, the stretched-edge count fell a lot but the single worst edge
grew, and the 3-6c diagnostic showed severe-edge counts (>6x, >10x) can move the other way from the worst edge. So this rule is chosen with that knowledge. It is NOT a blind test.
No new weights are built here. The candidates are exactly the ones already stored in weights_3_6a.npz, weights_3_6b.npz and weights_3_6c.npz.
I looked at no result of THIS script before fixing the rules below.

RULES (fixed now):
  A. CANDIDATES: Yogi C08, C12, C16 (3-6a); Mamata H50, H100 (3-6b); Shah, Rajnath, Kharge T10, T20, T40 (3-6c). S0 = the shipped weights (weights_final_2k1.npz).
  B. POSES: the same 9 as 3-6a/b/c: GUARD_ARMS, GUARD, ARMS_UP, JAB, CROSS, FRONT_KICK, FRONT_KICK_R, SIDE_KICK, KNEE_LIFT.
  C. SEVERITY of a pose = sum over edges of w(s): w = 1 if 3 < s <= 6, 3 if 6 < s <= 10, 10 if s > 10 (s = edge stretch). Total SEV = sum over the 9 poses.
  D. GUARDS (candidate ELIGIBLE only if all hold):
     S1: in no pose does SEV rise by more than 10% against S0 (or by more than 10 points when S0's SEV in that pose is below 100).
     S2: in no pose does the count of edges above 10x rise by more than max(2, 10%) against S0.
     S3: in no pose does the 99.9th percentile of s rise by more than 10% against S0.
     S4: in no pose may the worst edge exceed max(1.5 x S0's worst, 12x).
     S5 (the movement guards of the earlier steps, unchanged): Shah/Rajnath/Kharge: left-thigh (S0 LeftUpLeg weight > 0.9) mean displacement in FRONT_KICK >= 90% of S0's.
        Mamata: vertices owned (S0) by an arm bone: mean displacement in ARMS_UP >= 90% of S0's. Yogi: left skirt (below crotch, x > +0.10 m) mean displacement in FRONT_KICK >= 50%
        of S0's and right skirt in FRONT_KICK_R >= 50%; (left - right) in FRONT_KICK >= 80% of S0's and (right - left) in FRONT_KICK_R >= 80% of S0's.
  E. DECISION per model: among eligible candidates the lowest total SEV wins, only if it is at least 5% below S0's total SEV. Otherwise the model keeps S0.
  F. NOTHING is written to the shipped weights. Output: a pick table (picks_3_6d.py) that 3-7 will read, and the numbers file.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import bendtest_3_1 as B, bendtest_3_3 as C, bendtest_3_4 as D, trunk as T
BN = B.BN
POSES = ('GUARD_ARMS', 'GUARD', 'ARMS_UP', 'JAB', 'CROSS', 'FRONT_KICK', 'FRONT_KICK_R', 'SIDE_KICK', 'KNEE_LIFT')
PLAN = {'yogi': ('weights_3_6a.npz', ('C08', 'C12', 'C16')), 'mamata': ('weights_3_6b.npz', ('H50', 'H100')),
        'shah': ('weights_3_6c.npz', ('T10', 'T20', 'T40')), 'rajnath': ('weights_3_6c.npz', ('T10', 'T20', 'T40')), 'kharge': ('weights_3_6c.npz', ('T10', 'T20', 'T40'))}
ARM = [BN.index(s + b) for s in ('Left', 'Right') for b in ('Shoulder', 'Arm', 'ForeArm', 'Hand')]
LUP = BN.index('LeftUpLeg')


def variant(F, X, m, t):
    G = {k: F[k] for k in F.files}
    if t != 'S0': G[f'{m}_joints'] = X[f'{m}_{t}_joints']; G[f'{m}_wq'] = X[f'{m}_{t}_w8']
    return G


def sev(s):
    return int(((s > 3) & (s <= 6)).sum()) + 3 * int(((s > 6) & (s <= 10)).sum()) + 10 * int((s > 10).sum())


def met(r):
    s = r['s']; return dict(sev=sev(s), n3=int((s > 3).sum()), n6=int((s > 6).sum()), n10=int((s > 10).sum()), p999=float(np.percentile(s, 99.9)), worst=float(s.max()))


def disp(r, mask): return 100 * float(np.linalg.norm(r['P'][mask] - r['V'][mask], axis=1).mean())


if __name__ == '__main__':
    B.POSES.update(C.NEW_POSES); B.POSES.update(D.NEW_POSES); F = np.load(f'{HERE}/weights_final_2k1.npz'); picks = {}; tab = []
    for m, (fn, tags_c) in PLAN.items():
        X = np.load(f'{HERE}/{fn}'); tags = ['S0'] + list(tags_c); res = {}
        for t in tags:
            G = variant(F, X, m, t)
            for p in POSES: res[(t, p)] = B.run(m, G, p)
        M = {(t, p): met(res[(t, p)]) for t in tags for p in POSES}
        print(f'\n===== {m} =====\n  per pose: SEV / n>6x / n>10x / worst')
        for p in POSES: print(f'  {p:13s} ' + '  '.join(f"{t}: {M[(t, p)]['sev']:5d}/{M[(t, p)]['n6']:4d}/{M[(t, p)]['n10']:3d}/{M[(t, p)]['worst']:5.1f}x" for t in tags))
        tot = {t: sum(M[(t, p)]['sev'] for p in POSES) for t in tags}; n3 = {t: sum(M[(t, p)]['n3'] for p in POSES) for t in tags}
        print('  total SEV:', tot, ' total n>3x:', n3)
        V0 = res[('S0', 'FRONT_KICK')]['V']; W0 = res[('S0', 'FRONT_KICK')]['W']; cy = T.CROTCH[m]['y']
        if m == 'mamata':
            own = np.isin(res[('S0', 'ARMS_UP')]['W'].argmax(1), ARM); mv = {t: (disp(res[(t, 'ARMS_UP')], own),) for t in tags}
        elif m == 'yogi':
            Lm = (V0[:, 1] < cy) & (V0[:, 0] > .10); Rm = (V0[:, 1] < cy) & (V0[:, 0] < -.10)
            mv = {t: (disp(res[(t, 'FRONT_KICK')], Lm), disp(res[(t, 'FRONT_KICK')], Rm), disp(res[(t, 'FRONT_KICK_R')], Lm), disp(res[(t, 'FRONT_KICK_R')], Rm)) for t in tags}
        else:
            L = W0[:, LUP] > .9; mv = {t: (disp(res[(t, 'FRONT_KICK')], L),) for t in tags}
        print('  movement (cm):', {t: tuple(round(x, 1) for x in v) for t, v in mv.items()})
        elig = {}
        for t in tags[1:]:
            s1 = all(M[(t, p)]['sev'] <= (M[('S0', p)]['sev'] * 1.10 if M[('S0', p)]['sev'] >= 100 else M[('S0', p)]['sev'] + 10) for p in POSES)
            s2 = all(M[(t, p)]['n10'] <= max(2 + M[('S0', p)]['n10'], 1.10 * M[('S0', p)]['n10']) for p in POSES)
            s3 = all(M[(t, p)]['p999'] <= 1.10 * M[('S0', p)]['p999'] for p in POSES)
            s4 = all(M[(t, p)]['worst'] <= max(1.5 * M[('S0', p)]['worst'], 12.0) for p in POSES)
            a, a0 = mv[t], mv['S0']
            if m == 'yogi': s5 = a[0] >= .5 * a0[0] and a[3] >= .5 * a0[3] and (a[0] - a[1]) >= .8 * (a0[0] - a0[1]) and (a[3] - a[2]) >= .8 * (a0[3] - a0[2])
            else: s5 = a[0] >= .9 * a0[0]
            elig[t] = s1 and s2 and s3 and s4 and s5
            print(f'  {t}: S1 {s1} S2 {s2} S3 {s3} S4 {s4} S5 {s5} -> eligible {elig[t]}')
            for nm, ok, fn_ in (('S1', s1, lambda p: M[(t, p)]['sev'] > (M[('S0', p)]['sev'] * 1.10 if M[('S0', p)]['sev'] >= 100 else M[('S0', p)]['sev'] + 10)),
                                ('S2', s2, lambda p: M[(t, p)]['n10'] > max(2 + M[('S0', p)]['n10'], 1.10 * M[('S0', p)]['n10'])),
                                ('S3', s3, lambda p: M[(t, p)]['p999'] > 1.10 * M[('S0', p)]['p999']),
                                ('S4', s4, lambda p: M[(t, p)]['worst'] > max(1.5 * M[('S0', p)]['worst'], 12.0))):
                if not ok: print(f'      {nm} fails in: ' + ', '.join(p for p in POSES if fn_(p)))
        cand = [t for t in tags[1:] if elig[t]]; best = min(cand, key=lambda t: tot[t]) if cand else None
        picks[m] = best if best and tot[best] <= .95 * tot['S0'] else 'S0'
        print(f'  DECISION {m}: best eligible {best}; PICK {picks[m]}'
              + (f' (total SEV {tot["S0"]} -> {tot[picks[m]]}, {100 * (tot[picks[m]] / tot["S0"] - 1):+.1f}%; n>3x {n3["S0"]} -> {n3[picks[m]]})' if picks[m] != 'S0' else ''))
        tab.append((m, picks[m], tot['S0'], tot[picks[m]], n3['S0'], n3[picks[m]]))
    print('\nPICKS:', picks)
    with open(f'{HERE}/picks_3_6d.py', 'w') as f: f.write('# written by decide_3_6d.py\nPICKS = ' + repr(picks) + '\n')
