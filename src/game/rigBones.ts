/**
 * Part 5-1: helpers for the rigged fighter models (public/models/<id>/<id>.rigged.glb).
 * No three.js import: it works on the loaded object graph, so it can be tested with plain objects.
 * The 22 bone names and parents are the ones written by tools/build_glb_3_7.py.
 */
export const BONE_NAMES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
] as const;
export type BoneName = typeof BONE_NAMES[number];

export const BONE_PARENT: Record<BoneName, BoneName | null> = {
  Hips: null, Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck',
  LeftShoulder: 'Spine2', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine2', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot',
};

export interface RigInfo {
  ok: boolean;
  bones: Record<string, any>;     // bone name -> three.js Bone
  skinned: any[];                 // SkinnedMesh objects
  missing: string[];              // bone names not found
  badParent: string[];            // bones whose parent is not the expected bone
  problems: string[];             // human-readable reasons when ok is false
}

/** Finds the 22 bones and the skinned meshes in a loaded glTF scene and checks them. Never throws. */
export function collectRig(root: any): RigInfo {
  const bones: Record<string, any> = {};
  const skinned: any[] = [];
  const problems: string[] = [];
  try {
    root.traverse((o: any) => {
      if (o.isBone && typeof o.name === 'string' && !(o.name in bones)) bones[o.name] = o;
      if (o.isSkinnedMesh) skinned.push(o);
    });
  } catch (e) { problems.push('traverse failed'); }
  const missing = BONE_NAMES.filter(n => !bones[n]);
  const badParent = BONE_NAMES.filter(n => {
    const want = BONE_PARENT[n];
    return !!bones[n] && !!want && bones[n].parent !== bones[want];
  });
  if (missing.length) problems.push('missing bones: ' + missing.join(','));
  if (badParent.length) problems.push('wrong parent: ' + badParent.join(','));
  if (!skinned.length) problems.push('no skinned mesh');
  for (const m of skinned) {
    const n = m.skeleton?.bones?.length;
    if (n !== BONE_NAMES.length) problems.push(`skeleton has ${n} bones, expected ${BONE_NAMES.length}`);
  }
  return { ok: problems.length === 0, bones, skinned, missing, badParent, problems };
}

/** A skinned mesh must not be culled by its rest-pose bounds (a big kick can leave them). */
export function disableCulling(root: any): number {
  let n = 0;
  root.traverse((o: any) => { if (o.isMesh) { o.frustumCulled = false; n++; } });
  return n;
}
