export const IDENT = [0, 0, 0, 1];
export function qn(q) {
    const n = Math.hypot(q[0], q[1], q[2], q[3]);
    return n < 1e-12 ? [0, 0, 0, 1] : [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}
export function slerp(a0, b0, t) {
    const a = qn(a0);
    let b = qn(b0);
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) {
        b = [-b[0], -b[1], -b[2], -b[3]];
        d = -d;
    }
    if (d > 0.9995)
        return qn([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])]);
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return qn([wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2], wa * a[3] + wb * b[3]]);
}
export const qOf = (p, b) => p.q[b] ?? IDENT;
export function blend(a, b, t) {
    const names = new Set([...Object.keys(a.q), ...Object.keys(b.q)]);
    const q = {};
    names.forEach((n) => { q[n] = slerp(qOf(a, n), qOf(b, n), t); });
    return { q, root: [0, 1, 2].map((i) => (1 - t) * a.root[i] + t * b.root[i]) };
}
export function mirrorName(b) {
    return b.startsWith('Left') ? b.replace('Left', 'Right') : b.startsWith('Right') ? b.replace('Right', 'Left') : b;
}
export function mirrorPose(p) {
    const q = {};
    for (const b of Object.keys(p.q)) {
        const v = p.q[b];
        q[mirrorName(b)] = [v[0], -v[1], -v[2], v[3]];
    }
    return { q, root: [-p.root[0], p.root[1], p.root[2]] };
}
const EASE = {
    linear: (u) => u, smooth: (u) => u * u * (3 - 2 * u), out: (u) => 1 - (1 - u) * (1 - u), in: (u) => u * u,
};
export function sample(c, t0) {
    const ks = c.keys;
    const t = Math.min(Math.max(t0, ks[0].t), ks[ks.length - 1].t);
    for (let i = 1; i < ks.length; i++) {
        if (t <= ks[i].t) {
            const a = ks[i - 1], b = ks[i], span = b.t - a.t;
            const u = span <= 0 ? 1 : (t - a.t) / span;
            return blend(a.pose, b.pose, EASE[b.ease ?? 'smooth'](u));
        }
    }
    return ks[ks.length - 1].pose;
}
export function crossfade(pa, pb, elapsed, fade) {
    const u = fade > 0 ? Math.min(Math.max(elapsed / fade, 0), 1) : 1;
    return blend(pa, pb, u * u * (3 - 2 * u));
}
export const GROUPS = {
    arm_raise: ['LeftShoulder', 'LeftArm', 'RightShoulder', 'RightArm'], elbow: ['LeftForeArm', 'RightForeArm'],
    wrist: ['LeftHand', 'RightHand'], thigh: ['LeftUpLeg', 'RightUpLeg'], knee: ['LeftLeg', 'RightLeg'],
    foot: ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'], torso: ['Hips', 'Spine', 'Spine1', 'Spine2'], head: ['Neck', 'Head'],
};
const BONE_GROUP = {};
for (const g of Object.keys(GROUPS))
    for (const b of GROUPS[g])
        BONE_GROUP[b] = g;
export function limitPose(p, scales, maxDeg) {
    const out = {};
    for (const b of Object.keys(p.q)) {
        const g = BONE_GROUP[b];
        const s = g ? scales[g] ?? 1 : 1;
        const cap = g && maxDeg ? maxDeg[g] : undefined;
        let q = qn(p.q[b]);
        if (q[3] < 0)
            q = [-q[0], -q[1], -q[2], -q[3]];
        const vn = Math.hypot(q[0], q[1], q[2]);
        let ang = 2 * Math.atan2(vn, q[3]);
        const ax = [q[0] / (vn + 1e-15), q[1] / (vn + 1e-15), q[2] / (vn + 1e-15)];
        ang *= s;
        if (cap !== undefined)
            ang = Math.min(ang, (cap * Math.PI) / 180);
        out[b] = ang > 1e-12 ? qn([ax[0] * Math.sin(ang / 2), ax[1] * Math.sin(ang / 2), ax[2] * Math.sin(ang / 2), Math.cos(ang / 2)]) : [0, 0, 0, 1];
    }
    return { q: out, root: [...p.root] };
}
export function clipFromJson(j) { return j; }
