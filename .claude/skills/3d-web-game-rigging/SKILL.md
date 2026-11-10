---
name: 3d-web-game-rigging
description: >
  Mandatory rules for authoring, validating, and optimising humanoid 3D character
  models (GLB / FBX) used by the Battle-of-272 parliament brawler. Covers the
  standard 22-bone skeleton, glTF skinning constraints, garment/wide-body weight
  strategies, and asset CLI tooling.
---

# 3D Web-Game Rigging — Skill Rules

> **Scope:** Every `.glb` and `.fbx` model under `public/models/` and every
> Python tool under `tools/` MUST comply with these rules. Deviations require
> an explicit note in the PR body explaining **why**.

---

## 1. Standard 22-Bone Humanoid Hierarchy

All characters share **exactly** this bone tree (names are case-sensitive):

```
Hips
├── Spine
│   └── Spine1
│       └── Spine2
│           ├── Neck
│           │   └── Head
│           ├── LeftShoulder
│           │   └── LeftArm
│           │       └── LeftForeArm
│           │           └── LeftHand
│           └── RightShoulder
│               └── RightArm
│                   └── RightForeArm
│                       └── RightHand
├── LeftUpLeg
│   └── LeftLeg
│       └── LeftFoot
│           └── LeftToeBase
└── RightUpLeg
    └── RightLeg
        └── RightFoot
            └── RightToeBase
```

### Rules
- **No extra bones** may be exported (twist, IK targets, helper bones must be
  baked and removed before export).
- **Bone names must match exactly.** The runtime `rigspec.py` and `fighter3d.ts`
  look up bones by these names; renaming silently breaks retargeting.
- **Rest pose:** GLB characters are exported in a natural A-pose with arms at
  roughly 45°, feet on `Y = 0`, facing `+Z`, scaled to `1.82 m` hip-to-top.
  The FBX (Modi) ships in T-pose and is re-scaled/re-oriented at load time.
- **Root bone** (`Hips`) origin sits at the character's centre-of-mass
  (roughly pelvis height, X ≈ 0, Z ≈ 0).

---

## 2. Skinning & glTF Validation

### 2a. Influence Limits
| Attribute       | Type             | Rule                                                    |
|:----------------|:-----------------|:--------------------------------------------------------|
| `JOINTS_0`      | `UNSIGNED_BYTE`  | Max **4** bone indices per vertex (glTF limit).         |
| `WEIGHTS_0`     | `UNSIGNED_BYTE` or `FLOAT` | Exactly 4 components; sum to **1.0** (or **255** for `UNSIGNED_BYTE`). |
| Zero-weight slots | —             | Must reference joint index **0** (Hips), never a stale index. |

### 2b. `inverseBindMatrices`
- Every skin MUST include a valid `inverseBindMatrices` accessor with the same
  count as the `joints` array.
- After any rest-pose change (e.g. T-pose → A-pose bake), re-compute
  `inverseBindMatrices` from the new world transforms. **Never** leave stale
  matrices — they produce explosive deformations at runtime.

### 2c. Validation Checklist (run before every commit)
```bash
# Inspect mesh stats, bone count, accessor types
npx @gltf-transform/cli inspect public/models/<id>/<id>.glb

# Validate glTF spec compliance
npx @gltf-transform/cli validate public/models/<id>/<id>.glb
```

If either command reports errors, the asset **must not** be committed.

---

## 3. Garment & Wide-Body Handling

### 3a. Long Garments (Saris, Dhotis, Monk Robes, Long Coats)
Garment vertices that span both legs (e.g. a sari pallu draping from chest to
ankle, or a dhoti wrapping around both thighs) **must** use smooth,
surface-heat-transferred weights that blend across `LeftUpLeg`, `RightUpLeg`,
`Hips`, `Spine`, and their children.

**Forbidden:** Hard `X = 0` mirror-plane splits. These produce visible tearing
along the character's centre line when legs spread during kicks or walks.

**Required approach:**
1. In the rigging tool (Blender / `tools/` Python scripts), use a
   surface-heat-diffusion or nearest-bone-capsule algorithm.
2. For vertices within 5 cm of the centre plane, blend weights from both
   left and right leg chains proportionally.
3. Verify with the `Part2H*` diagnostic renders (see `tools/` archives).

### 3b. Wide / Heavyset Bodies (Shah, Yogi, Kharge)
Characters with torso width > 1.15× the skeleton's default proportions:
- Apply per-character **rotation-limit scale factors** at runtime rather than
  widening bones or adding extra joint offsets.
- The `fighter3d.ts` `pose()` function already handles this through its
  parametric `lean`, `twist`, and `scaleX/Y/Z` variables.
- When authoring new GLBs, keep the skeleton at the standard scale and widen
  only the **mesh**, not the armature.

---

## 4. Asset Optimisation Pipeline

### 4a. Preferred CLI Tools
| Tool                       | When to Use                                     |
|:---------------------------|:------------------------------------------------|
| `npx @gltf-transform/cli inspect`  | Pre-commit stats check (vertex/triangle count, accessor types, texture sizes). |
| `npx @gltf-transform/cli optimize` | Quantize positions to `INT16`, normals to `INT8`, merge duplicate materials, de-duplicate accessors. |
| `npx @gltf-transform/cli meshopt`  | Apply Meshopt compression for smaller binary payloads. |
| `gltfpack` (if installed)  | Alternative all-in-one compressor. Cross-check against `@gltf-transform` output. |

### 4b. Forbidden Practices
- **No ad-hoc binary struct packers** in Python — use the official `@gltf-transform`
  or `pygltflib` libraries instead.
- **No manual buffer-view byte offset arithmetic** unless you are extending
  `glbio.py` and have unit tests covering round-trip fidelity.
- **No lossy texture re-encoding** without visual QA — always compare before/after
  renders in the browser or `Part2*` diagnostic scripts.

### 4c. Budget Targets
| Metric          | Target per Character |
|:----------------|:---------------------|
| File size       | ≤ 3 MB (compressed GLB) |
| Triangle count  | ≤ 15,000             |
| Texture atlas   | ≤ 1024×1024 per material |
| Bone count      | Exactly 22           |
| Draw calls      | ≤ 4                  |

---

## 5. File Naming & Directory Convention

```
public/models/
  <character_id>/
    <character_id>.glb        # Production asset
    textures/                 # Only for FBX characters (Modi)
      *.jpeg / *.png
tools/
  glbio.py                   # GLB I/O library
  rigspec.py                 # Skeleton specification & bone data
  optimize_fbx.py            # FBX → GLB conversion
  fbxlib.py                  # FBX parsing utilities
```

Character IDs: `modi`, `shah`, `rahul`, `yogi`, `rajnath`, `sitharaman`,
`kharge`, `kejriwal`, `mamata`. Always lowercase, no hyphens.
