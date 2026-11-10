---
name: threejs-brawler-rig
description: >
  Project-specific rules for the Battle-of-272 procedural 3D body system and
  its interaction with loaded GLB/FBX rigs. Defines the parametric pose API,
  procedural body construction, model loading fallback chain, and per-character
  customisation rules.
---

# Three.js Brawler Rig — Skill Rules

> **Scope:** The procedural body builder (`build()` in `fighter3d.ts`), the
> parametric pose system (`pose()`), the model loading pipeline (`loadGlb()`,
> `loadModi()`), and the render entry point (`draw3D()`).

---

## 1. The Three-Tier Model Fallback Chain

Every fighter goes through this loading sequence:

```
1. Check for loaded GLB/FBX model  →  if available, use it
2. If not loaded yet, build procedural body  →  use it temporarily
3. Start async model load (GLB or FBX)  →  when ready, swap out procedural body
```

### Rig Object Shape
Every rig (procedural or model-based) must have this shape:
```typescript
interface Rig {
  root: THREE.Group;     // Top-level group added/removed from scene each frame
  body: THREE.Group;     // Receives position, rotation, scale from pose()
  a: boolean | null;     // true = procedural (has articulated joints)
                         // null = loaded model (pose() skips joint articulation)
  // Procedural-only fields (present when a === true):
  tor?: THREE.Group;     // Torso pivot
  head?: THREE.Group;    // Head pivot
  hips?: THREE.Group[];  // [left, right] hip joints
  knees?: THREE.Group[]; // [left, right] knee joints
  sh?: THREE.Group[];    // [left, right] shoulder joints
  el?: THREE.Group[];    // [left, right] elbow joints
  mouth?: THREE.Mesh;    // Mouth mesh (scales for expressions)
  skirt?: THREE.Mesh;    // Skirt/dhoti mesh (optional)
}
```

### Rules
- **Never remove a rig from `rigs` Map** except when replacing it with a
  loaded model (lines 86, 106 in `fighter3d.ts`).
- **Procedural bodies are built lazily** — `build(c)` is called on first
  `draw3D()` request, not at init time.
- **GLB loading is fire-and-forget** — `loadGlb()` is idempotent
  (guards via `glbLoading` Set).

---

## 2. Parametric Pose System

### 2a. Pose Parameters
The `pose(rig, poseData)` function accepts a `Pose3D` interface:

```typescript
interface Pose3D {
  time?: number;           // Monotonic time for oscillation-based animation
  isWalking?: boolean;     // Walking state
  walkSpeed?: number;      // Walk speed multiplier
  attackProg?: number;     // Attack progress [0..1]
  attackPhase?: number;    // Refined phase within attack
  attackType?: 'punch' | 'cross' | 'kick' | 'dropkick' | 'special' | 'super';
  airborne?: boolean;      // In the air
  blocking?: boolean;      // Holding block
  stunned?: boolean;       // Hit-stunned
  isSuper?: boolean;       // Super move active
  superPhase?: number;     // Phase within super [0..1]
  superType?: string;      // Which super (for aura colour)
  facing?: number;         // 1 = right, -1 = left
  vx?: number;             // Horizontal velocity
  vy?: number;             // Vertical velocity
}
```

### 2b. Internal Pose Variables
The `pose()` function computes these intermediate variables:

| Variable   | Meaning                           | Range         |
|:-----------|:----------------------------------|:--------------|
| `bob`      | Vertical offset (hop/crouch)      | −0.10 … +0.30 |
| `lunge`    | Forward/back offset               | −0.16 … +0.36 |
| `swayX`    | Lateral body sway                 | ±0.03         |
| `swayZ`    | Z-axis micro-movement             | ±0.03         |
| `lean`     | Forward/backward torso tilt (Z)   | −0.18 … +0.78 |
| `twist`    | Rotational torso twist (Y)        | −0.42 … +0.62 |
| `tiltX`    | X-axis body tilt                  | ±0.22         |
| `head`     | Head nod angle                    | −0.10 … +0.40 |
| `scaleX/Y/Z` | Body scale pulse              | 0.97 … 1.05   |
| `lL/lR`    | Left/Right hip rotation           | −0.42 … +1.85 |
| `kL/kR`    | Left/Right knee rotation          | −0.05 … +1.45 |
| `sL/sR`    | Left/Right shoulder rotation      | −0.85 … +1.90 |
| `eL/eR`    | Left/Right elbow rotation         | 0.04 … 1.85   |

### 2c. State Priority (Highest to Lowest)
```
1. Super Move    (isSuper === true)
2. Stunned       (stunned === true)
3. Blocking      (blocking === true)
4. Kick/Dropkick (attackPhase > 0 && type is kick/dropkick/airborne)
5. Punch/Cross   (attackPhase > 0 && type is punch/cross)
6. Airborne      (airborne === true, no attack)
7. Walking       (isWalking === true)
8. Idle Stance   (default)
```

**Never** add a new pose state below idle — idle is the catch-all default.
New states must be inserted at the correct priority level.

---

## 3. Procedural Body Construction Rules

### 3a. Geometry Standards
| Body Part   | Geometry              | Typical Radius/Size   |
|:------------|:----------------------|:----------------------|
| Torso       | CapsuleGeometry       | r=0.17, l=0.34        |
| Upper arm   | CapsuleGeometry       | r=0.052, l=0.20       |
| Forearm     | CapsuleGeometry       | r=0.045, l=0.18       |
| Thigh       | CapsuleGeometry       | r=0.075, l=0.30       |
| Shin        | CapsuleGeometry       | r=0.06, l=0.30        |
| Head        | SphereGeometry        | r=0.11                |
| Hand/Foot   | SphereGeometry        | r=0.05–0.06           |
| Eyes        | SphereGeometry        | r=0.018 (white), 0.01 (iris) |
| Neck        | CylinderGeometry      | r=0.045, h=0.12       |

### 3b. Material Rules
- Use `MeshStandardMaterial` exclusively (never `MeshBasicMaterial` or
  `ShaderMaterial` for character bodies).
- Roughness range: `0.3–0.95` (skin ≈ 0.55, cloth ≈ 0.75–0.85, metal ≈ 0.3).
- No emissive materials on body parts (aura uses `PointLight` instead).

### 3c. Per-Character Accessories
Each character has unique visual elements defined by `Politician` fields:

| Field        | Drives                                        |
|:-------------|:----------------------------------------------|
| `col`        | Primary attire colour                         |
| `pants`      | Lower body / skirt colour                     |
| `skin`       | Skin tone for all exposed geometry            |
| `hairColor`  | Hair cap colour                               |
| `hairStyle`  | Head construction variant (beard, glasses, bun, topi, etc.) |
| `accessory`  | Body accessory variant (jacket, saree, muffler, mala, etc.) |

**When adding new characters**, always define all six visual fields and add
the corresponding geometry in `build()`.

---

## 4. Lighting Setup (Fixed)

The brawler scene uses a fixed 4-light setup:

```typescript
HemisphereLight(sky=0xcfe3ff, ground=0x3a2a1a, intensity=1.0)
DirectionalLight(0xfff1dc, 2.4)  @ position(-2, 4, 4)   // Key light
DirectionalLight(0xffb86b, 1.6)  @ position(3, 2, -3)    // Rim light
PointLight(0xffd700, 0, 8)       @ position(0, 1.3, 1.8) // Aura (dynamic)
```

**Rules:**
- Do NOT modify the hemisphere, key, or rim lights without a before/after
  screenshot comparison across all 9 characters.
- The aura `PointLight` intensity is controlled dynamically in `pose()`:
  - `0` during idle/walk/block
  - `1.2–1.8` during attacks
  - `3.6+` during super moves
- Aura colour is mapped from `superType` or `attackType`.

---

## 5. Render Entry Point Contract

```typescript
export function draw3D(
  ctx: CanvasRenderingContext2D,
  c: Politician,
  x: number,          // Screen X (canvas pixels)
  y: number,          // Screen Y (feet position)
  facing: number,     // 1 = right, -1 = left
  scale: number,      // Display scale multiplier
  p: Pose3D           // Current pose state
): boolean            // true = 3D rendered; false = use 2D fallback
```

**Contract:**
- Returns `false` if WebGL failed to initialise — caller must fall back to
  2D sprite rendering.
- The function is called **every frame** for every visible fighter.
- `draw3D()` is **self-contained**: it adds the rig to the scene, renders,
  removes it, and composites onto the 2D canvas. No external render loop
  needed.
- The `384×384` offscreen canvas and `DRAW = 2/3` scale factor are fixed
  for the current art style. Changing them affects all character proportions.
