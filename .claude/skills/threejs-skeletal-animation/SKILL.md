---
name: threejs-skeletal-animation
description: >
  Mandatory rules for runtime skeletal animation in the Battle-of-272 Three.js
  brawler. Covers scene cloning, AnimationMixer usage, crossfading, rest-pose
  alignment, GPU skinning, and FBX retargeting for the Modi character.
---

# Three.js Skeletal Animation — Skill Rules

> **Scope:** All code in `src/game/fighter3d.ts`, `src/game/renderer.ts`, and
> any future animation modules MUST follow these rules.

---

## 1. Scene Cloning & Culling

### 1a. Always Clone with `SkeletonUtils.clone()`
When instantiating a rigged character from a loaded GLTF/FBX scene:

```typescript
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
// OR from three-stdlib:
// import { SkeletonUtils } from 'three-stdlib';

const instance = cloneSkeleton(gltf.scene);
```

**Never** use `gltf.scene.clone(true)` — it does **not** rebind `SkinnedMesh`
bones to the new skeleton, producing an invisible or T-posed model.

### 1b. Disable Frustum Culling on Every SkinnedMesh
After cloning or loading, traverse and disable frustum culling:

```typescript
instance.traverse((child) => {
  if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
    child.frustumCulled = false;
  }
});
```

**Why:** The GPU-skinned bounding box is computed from the rest pose, not the
current animated pose. If the character raises an arm above the rest-pose
bounding box, Three.js will cull the entire mesh — making the character
flicker or vanish during punches, kicks, and jumps.

### 1c. Current Codebase Pattern
The existing `fighter3d.ts` already does this correctly at lines ~83 and ~102:
```typescript
obj.traverse((o: any) => { if (o.isMesh) o.frustumCulled = false; });
```
Preserve this pattern in all future model-loading code paths.

---

## 2. Animation Playback & Crossfading

### 2a. Use `THREE.AnimationMixer` for Clip-Based Animation
```typescript
const mixer = new THREE.AnimationMixer(characterRoot);
const action = mixer.clipAction(clip);
action.play();

// In the game loop:
mixer.update(deltaTime);
```

### 2b. State-Transition Crossfading
When transitioning between animation states (idle → walk, walk → attack, etc.):

```typescript
const CROSSFADE_DURATION = 0.08; // 60–120 ms, never > 0.12s

function transitionTo(newAction: THREE.AnimationAction) {
  newAction.reset();
  newAction.setEffectiveTimeScale(1);
  newAction.setEffectiveWeight(1);
  newAction.play();
  currentAction.crossFadeTo(newAction, CROSSFADE_DURATION, true);
  currentAction = newAction;
}
```

**Timing rules:**
| Transition               | Duration     |
|:-------------------------|:-------------|
| Idle ↔ Walk              | `0.10s`      |
| Any → Attack             | `0.06s`      |
| Attack → Idle/Walk       | `0.10s`      |
| Any → Stunned            | `0.04s`      |
| Stunned → Idle           | `0.12s`      |
| Any → Block              | `0.06s`      |
| Any → Super              | `0.08s`      |

**Never** set crossfade to `0` (causes pose snapping) or above `0.15s`
(causes mushy, unresponsive feel).

### 2c. Deterministic Quaternion Mixer (Alternative Path)
The current `fighter3d.ts` uses a **procedural parametric pose system** rather
than clip-based `AnimationMixer`. This is valid and preferred for the procedural
bodies. Rules for this path:

- All rotations MUST use the `pose()` function's `lean`, `twist`, `tiltX`,
  `head`, `sL/sR`, `eL/eR`, `lL/lR`, `kL/kR` parameters.
- Interpolation between pose states must use the `ease()` easing function
  (smoothstep: `v * v * (3 - 2 * v)`) — never linear lerp for visible
  joint angles.
- When GLB models gain embedded animation clips, the `AnimationMixer` path
  must coexist with the procedural path, selected per-character based on
  whether `rig.a === true` (procedural) or `rig.a === null` (clip-driven).

---

## 3. Rest-Pose & FBX Retargeting

### 3a. The Modi FBX Problem
Modi's model (`public/models/modi/modi.fbx`) has an **87-bone FBX skeleton**
in T-pose. The other 8 characters use **22-bone GLB skeletons** in A-pose.
This mismatch requires special handling:

### 3b. FBX Loading Rules
```typescript
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const mgr = new THREE.LoadingManager();

// CRITICAL: Remap texture URLs to the correct subfolder
mgr.setURLModifier((url: string) => {
  if (/\.(jpe?g|png)$/i.test(url)) {
    return `${BASE_URL}/models/modi/textures/` + url.split(/[\/\\]/).pop();
  }
  return url;
});
```

### 3c. Post-Load Normalisation (Modi FBX → Game Space)
After loading, the FBX must be normalised to match GLB conventions:

1. **Scale** to 1.82 m tall (measure bounding box, divide).
2. **Centre** at origin (`X = 0`, `Z = 0`), feet at `Y = 0`.
3. **Rotate** `Y += π/2` (FBX faces `+Z`, game expects `+X`).
4. **Disable frustum culling** on all meshes.

The existing `loadModi()` function in `fighter3d.ts` (lines 69–90) implements
this correctly. Do not refactor without preserving all four steps.

### 3d. Future Retargeting (When Modi Gets a 22-Bone GLB)
When Modi is eventually converted to a 22-bone GLB:
- Use `SkeletonUtils.retargetClip()` or a manual bone-name mapping to
  transfer any FBX animation clips to the 22-bone skeleton.
- Strip the 65 extra bones (twist bones, IK chains, facial bones) during
  the conversion pipeline in `tools/optimize_fbx.py`.
- Verify that `inverseBindMatrices` are recomputed from the new rest pose.

---

## 4. GPU Skinning & Performance

### 4a. WebGL Skinning Budget
| Metric                | Limit                                   |
|:----------------------|:----------------------------------------|
| Max bones per skin    | 22 (fits in a single uniform block)     |
| Skinning method       | `THREE.WebGLRenderer` default (uniform) |
| Vertex shader limit   | 4 influences per vertex (`JOINTS_0`)    |
| Max simultaneous rigs | 2 (one per combatant on screen)         |

### 4b. Render Pipeline Integration
The brawler uses an **offscreen render** pattern:
1. A dedicated `384×384` `WebGLRenderer` renders each fighter into a
   `<canvas>` element.
2. The result is composited onto the main 2D game canvas via
   `ctx.drawImage()`.
3. Each fighter is added to the scene, rendered, then **immediately removed**
   (`scene.add(rig.root)` → `renderer.render()` → `scene.remove(rig.root)`).

This means:
- **No persistent scene graph** — bones/meshes must tolerate being
  add/removed every frame without state leaks.
- **No shared materials** between fighters — each fighter's materials are
  independent to avoid render-state conflicts.
- The `OrthographicCamera` is fixed; do not switch to `PerspectiveCamera`
  without updating the projection math in `draw3D()`.

---

## 5. Import Conventions

### Approved Three.js Imports
```typescript
// Core (dynamic import at runtime to allow 2D fallback)
const T = await import('three');

// Loaders
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Utilities
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
```

**Never** import from `three/src/` paths — they bypass tree-shaking entry
points and may break Vite bundling.

**Never** use `require()` — the project uses ES modules exclusively.
