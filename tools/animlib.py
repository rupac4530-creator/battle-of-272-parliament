"""animlib.py -- Part 4-1: the animation format, pose blending, left/right mirroring and per-character limits.
Reference implementation in Python (numpy only). The game is TypeScript, so this file is the SPEC that 5-3 ports.

FORMAT (see also anim/example_jab_4_1.json)
  Pose  = {'q': {bone: [x, y, z, w]}, 'root': [x, y, z]}    local rotation of each bone (unit quaternion, identity if absent),
                                                            'root' = extra translation of Hips in metres.
  Clip  = {'name', 'duration', 'impact', 'keys': [{'t', 'ease', 'pose'}, ...]}
          ease belongs to the segment that ENDS at the key: 'linear' | 'smooth' (smoothstep) | 'out' (fast start) | 'in' (slow start).
          sample(clip, t) is a pure function of t, so it does not depend on the frame rate.
  Euler items [('x', deg), ('y', deg), ...] (the bend-test convention: first item acts first on the vector) convert to quaternions.
  Rotations only. Bind pose has identity rest rotations; joint offsets come from the rigged GLB.
"""
import numpy as np

BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
         'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
         'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']

# ---------------------------------------------------------------- quaternion helpers (x, y, z, w)
def qn(q):
    q = np.asarray(q, float); n = np.linalg.norm(q)
    return np.array([0, 0, 0, 1.0]) if n < 1e-12 else q / n

def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw*bx + ax*bw + ay*bz - az*by, aw*by - ax*bz + ay*bw + az*bx,
                     aw*bz + ax*by - ay*bx + az*bw, aw*bw - ax*bx - ay*by - az*bz])

def q_from_matrix(R):
    t = np.trace(R)
    if t > 0:
        s = np.sqrt(t + 1) * 2; q = [(R[2, 1]-R[1, 2])/s, (R[0, 2]-R[2, 0])/s, (R[1, 0]-R[0, 1])/s, s/4]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2; q = [s/4, (R[0, 1]+R[1, 0])/s, (R[0, 2]+R[2, 0])/s, (R[2, 1]-R[1, 2])/s]
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2; q = [(R[0, 1]+R[1, 0])/s, s/4, (R[1, 2]+R[2, 1])/s, (R[0, 2]-R[2, 0])/s]
    else:
        s = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2; q = [(R[0, 2]+R[2, 0])/s, (R[1, 2]+R[2, 1])/s, s/4, (R[1, 0]-R[0, 1])/s]
    return qn(q)

def m_from_q(q):
    x, y, z, w = qn(q)
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

def slerp(a, b, t):
    a = qn(a); b = qn(b); d = float(np.dot(a, b))
    if d < 0: b = -b; d = -d                      # shortest path: q and -q are the same rotation
    if d > 0.9995: return qn(a + t*(b - a))
    th = np.arccos(d); s = np.sin(th)
    return qn((np.sin((1-t)*th)/s)*a + (np.sin(t*th)/s)*b)

def q_angle_deg(q):
    q = qn(q); w = abs(q[3]); return float(np.degrees(2*np.arccos(min(1.0, w))))

def rotm(axis, deg):
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return {'x': np.array([[1, 0, 0], [0, c, -s], [0, s, c]]), 'y': np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]),
            'z': np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])}[axis]

def q_from_items(items):
    R = np.eye(3)
    for ax, dg in reversed(items): R = R @ rotm(ax, dg)   # same order as bendtest_3_1.local_rot
    return q_from_matrix(R)

# ---------------------------------------------------------------- poses
def pose(q=None, root=(0, 0, 0)):
    return {'q': {b: qn(v) for b, v in (q or {}).items()}, 'root': np.array(root, float)}

def pose_from_items(spec, root=(0, 0, 0)):
    return pose({b: q_from_items(it) for b, it in spec.items()}, root)

IDENT = np.array([0, 0, 0, 1.0])
def q_of(p, b): return p['q'].get(b, IDENT)

def blend(a, b, t):
    """Pose blend: per-bone slerp, root lerp. t=0 gives a, t=1 gives b."""
    names = set(a['q']) | set(b['q'])
    return {'q': {n: slerp(q_of(a, n), q_of(b, n), t) for n in names}, 'root': (1-t)*a['root'] + t*b['root']}

# ---------------------------------------------------------------- mirroring
def mirror_name(b):
    return b.replace('Left', 'Right', 1) if b.startswith('Left') else b.replace('Right', 'Left', 1) if b.startswith('Right') else b

def mirror_q(q):
    x, y, z, w = q; return np.array([x, -y, -z, w])      # reflection across the x = 0 plane: R' = M R M, M = diag(-1, 1, 1)

def mirror_pose(p):
    return {'q': {mirror_name(b): mirror_q(q) for b, q in p['q'].items()}, 'root': p['root'] * np.array([-1, 1, 1])}

# ---------------------------------------------------------------- clips
EASE = {'linear': lambda u: u, 'smooth': lambda u: u*u*(3-2*u), 'out': lambda u: 1-(1-u)**2, 'in': lambda u: u*u}
EASE_PEAK_SPEED = {'linear': 1.0, 'smooth': 1.5, 'out': 2.0, 'in': 2.0}

def clip(name, duration, keys, impact=None):
    return {'name': name, 'duration': float(duration), 'impact': impact, 'keys': [dict(k) for k in keys]}

def sample(c, t):
    ks = c['keys']; t = min(max(t, ks[0]['t']), ks[-1]['t'])
    for i in range(1, len(ks)):
        if t <= ks[i]['t']:
            a, b = ks[i-1], ks[i]; span = b['t'] - a['t']
            u = 1.0 if span <= 0 else (t - a['t']) / span
            return blend(a['pose'], b['pose'], EASE[b.get('ease', 'smooth')](u))
    return ks[-1]['pose']

def mirror_clip(c):
    return {**c, 'name': c['name'] + '_mirror', 'keys': [{**k, 'pose': mirror_pose(k['pose'])} for k in c['keys']]}

def crossfade(pa, pb, elapsed, fade):
    """Blend from the pose we were in (pa) to the new clip's pose (pb) over `fade` seconds, smoothstep."""
    u = min(max(elapsed / fade, 0.0), 1.0) if fade > 0 else 1.0
    return blend(pa, pb, u*u*(3-2*u))

# ---------------------------------------------------------------- per-character limits
GROUPS = {   # which bones each limit group scales
    'arm_raise': ['LeftShoulder', 'LeftArm', 'RightShoulder', 'RightArm'],
    'elbow': ['LeftForeArm', 'RightForeArm'],
    'wrist': ['LeftHand', 'RightHand'],
    'thigh': ['LeftUpLeg', 'RightUpLeg'],
    'knee': ['LeftLeg', 'RightLeg'],
    'foot': ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'],
    'torso': ['Hips', 'Spine', 'Spine1', 'Spine2'],
    'head': ['Neck', 'Head'],
}
BONE_GROUP = {b: g for g, bs in GROUPS.items() for b in bs}

def limit_pose(p, scales, max_deg=None):
    """Scale each bone's rotation ANGLE about its own axis by scales[group] (default 1), then clamp to max_deg[group] if given."""
    out = {}
    for b, q in p['q'].items():
        g = BONE_GROUP.get(b); s = scales.get(g, 1.0) if g else 1.0; cap = (max_deg or {}).get(g)
        q = qn(q); q = -q if q[3] < 0 else q
        ang = 2*np.arctan2(np.linalg.norm(q[:3]), q[3]); ax = q[:3] / (np.linalg.norm(q[:3]) + 1e-15)
        ang *= s
        if cap is not None: ang = min(ang, np.radians(cap))
        out[b] = qn(np.r_[ax*np.sin(ang/2), np.cos(ang/2)]) if ang > 1e-12 else IDENT.copy()
    return {'q': out, 'root': p['root'].copy()}

# ---------------------------------------------------------------- JSON export (what the TypeScript loader reads)
def pose_to_json(p):
    return {'q': {b: [round(float(v), 6) for v in q] for b, q in sorted(p['q'].items())}, 'root': [round(float(v), 6) for v in p['root']]}

def clip_to_json(c):
    return {'name': c['name'], 'duration': c['duration'], 'impact': c['impact'],
            'keys': [{'t': k['t'], 'ease': k.get('ease', 'smooth'), 'pose': pose_to_json(k['pose'])} for k in c['keys']]}
