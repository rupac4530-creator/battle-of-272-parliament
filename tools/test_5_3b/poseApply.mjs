import { IDENT } from './animLib.mjs';
/** Sets every bone's local rotation from the pose. A bone missing from the pose is set to identity,
 *  so a bone never keeps a stale rotation. Hips also gets pose.root added to its rest position.
 *  The rigged files have identity rest rotations, so the pose quaternion is the local rotation. Returns bones written. */
export function applyPose(bones, pose, hipsRest) {
    let n = 0;
    for (const name in bones) {
        const b = bones[name];
        const q = pose.q[name] ?? IDENT;
        b.quaternion.set(q[0], q[1], q[2], q[3]);
        n++;
    }
    const h = bones['Hips'];
    if (h && h.position && hipsRest) {
        h.position.set(hipsRest[0] + pose.root[0], hipsRest[1] + pose.root[1], hipsRest[2] + pose.root[2]);
    }
    return n;
}
/** Resets all bones to the rest pose (identity rotations, Hips at its rest position). */
export function resetPose(bones, hipsRest) {
    applyPose(bones, { q: {}, root: [0, 0, 0] }, hipsRest);
}
