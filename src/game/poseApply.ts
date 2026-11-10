// Part 5-3b1: writes a sampled pose onto the 22 rig bones. No three.js import (bones are duck-typed).
import type { Pose, Q } from './animLib';
import { IDENT } from './animLib';

export interface BoneLike {
  quaternion: { set(x: number, y: number, z: number, w: number): unknown };
  position?: { set(x: number, y: number, z: number): unknown };
}
/** Rest local position of Hips, captured once at load. */
export type HipsRest = [number, number, number];

/** Sets every bone's local rotation from the pose. A bone missing from the pose is set to identity,
 *  so a bone never keeps a stale rotation. Hips also gets pose.root added to its rest position.
 *  The rigged files have identity rest rotations, so the pose quaternion is the local rotation. Returns bones written. */
export function applyPose(bones: Record<string, BoneLike>, pose: Pose, hipsRest?: HipsRest): number {
  let n = 0;
  for (const name in bones) {
    const b = bones[name];
    const q: Q = pose.q[name] ?? IDENT;
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
export function resetPose(bones: Record<string, BoneLike>, hipsRest?: HipsRest): void {
  applyPose(bones, { q: {}, root: [0, 0, 0] }, hipsRest);
}
