---
name: fighting-game-combat-feel
description: >
  Mandatory rules for combat responsiveness, frame-data timing, hit-stop
  feedback, input buffering, and frame-rate-independent physics in the
  Battle-of-272 parliament brawler. Ensures every punch, kick, block, and
  super move feels immediate and satisfying regardless of device frame rate.
---

# Fighting Game Combat Feel — Skill Rules

> **Scope:** `src/game/logic.ts` (combat simulation), `src/game/fighter3d.ts`
> (visual feedback), `src/game/audio.ts` (sound feedback), and
> `src/game/renderer.ts` (screen effects).

---

## 1. Delta-Time Physics & Frame Independence

### 1a. Game Loop Contract
The game loop runs at **variable frame rate** via `requestAnimationFrame`.
All physics, timers, and cooldowns MUST be driven by `deltaTime` (seconds),
**never** by frame count.

```typescript
// CORRECT:
combatant.stun -= deltaTime;
combatant.x += combatant.vx * deltaTime;

// FORBIDDEN:
combatant.stun -= 1;        // Frame-dependent!
combatant.x += combatant.vx; // Speed doubles at 120fps!
```

### 1b. Delta-Time Clamping
Clamp `deltaTime` to prevent physics explosions during tab-switches or
garbage collection pauses:

```typescript
const dt = Math.min(performance.now() - lastTime, 33.33) / 1000; // Cap at ~30fps
```

### 1c. Fixed-Step Accumulator (If Needed)
For deterministic hit detection, consider a fixed-step accumulator:
```typescript
const FIXED_DT = 1 / 60;
accumulator += dt;
while (accumulator >= FIXED_DT) {
  stepPhysics(FIXED_DT);
  accumulator -= FIXED_DT;
}
```

---

## 2. Hit-Stop / Freeze Frames

### 2a. What Is Hit-Stop?
When a strike connects, **both** the attacker and the defender freeze for a
short duration. This creates the visceral "impact" feel that separates a
good fighting game from a floaty one.

### 2b. Freeze Frame Durations
| Event                      | Freeze Duration | Visual Effect               |
|:---------------------------|:----------------|:----------------------------|
| Light punch connects       | 60 ms (3–4 f)   | Subtle screen shake         |
| Heavy punch / cross        | 100 ms (6 f)    | Medium screen shake + flash |
| Kick connects              | 80 ms (5 f)     | Medium screen shake         |
| Dropkick connects          | 120 ms (7 f)    | Heavy shake + chromatic     |
| Special move connects      | 140 ms (8 f)    | Heavy shake + colour flash  |
| Super move connects        | 200 ms (12 f)   | Max shake + slowmo trail    |
| Blocked hit                | 40 ms (2–3 f)   | Minimal shake, guard spark  |

### 2c. Implementation Pattern
The `Combatant.freeze` field in `types.ts` already exists. Use it:

```typescript
// On hit:
attacker.freeze = 0.06;  // 60ms
defender.freeze = 0.06;
defender.stun = 0.3;     // 300ms stun

// In game loop:
if (combatant.freeze > 0) {
  combatant.freeze -= dt;
  return; // Skip physics and animation update for this combatant
}
```

### 2d. The Golden Rule
> **Hit-stop must freeze the GAME LOGIC, not the VISUAL EFFECTS.**
> Particles, screen shake, and flash effects continue playing during
> hit-stop. Only position updates, velocity changes, and state transitions
> are paused.

---

## 3. Input Buffering

### 3a. Why Buffer?
If the player presses "punch" 2 frames before their current attack animation
ends, the game should queue the punch and execute it on the first actionable
frame. Without buffering, inputs feel "eaten" and unresponsive.

### 3b. Buffer Window
| Context                    | Buffer Window    |
|:---------------------------|:-----------------|
| During attack recovery     | 100 ms (6 f)     |
| During stun recovery       | 150 ms (9 f)     |
| During block stun          | 80 ms (5 f)      |
| During landing recovery    | 100 ms (6 f)     |

### 3c. Implementation Pattern
```typescript
interface InputBuffer {
  action: 'strike' | 'special' | 'jump' | 'block' | 'superMove';
  timestamp: number;  // When the input was pressed
}

const BUFFER_WINDOW = 0.100; // 100ms

function bufferInput(action: string) {
  inputBuffer = { action, timestamp: gameTime };
}

function consumeBuffer(): InputBuffer | null {
  if (inputBuffer && (gameTime - inputBuffer.timestamp) < BUFFER_WINDOW) {
    const buf = inputBuffer;
    inputBuffer = null;
    return buf;
  }
  inputBuffer = null; // Expired
  return null;
}
```

### 3d. Buffer Priority
If multiple inputs are buffered, execute by priority:
```
1. Super Move  (highest — player committed meter)
2. Special     (costs cooldown)
3. Jump        (escape option)
4. Strike      (punch / kick)
5. Block       (lowest — defensive default)
```

---

## 4. Attack Frame Data

### 4a. Attack Phases
Every attack has three phases:

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Startup  │→│  Active  │→│ Recovery │
│ (wind-up)│ │ (hitbox) │ │(cooldown)│
└──────────┘ └──────────┘ └──────────┘
```

### 4b. Frame Data Table
| Attack      | Startup    | Active     | Recovery   | Total      |
|:------------|:-----------|:-----------|:-----------|:-----------|
| Jab/Punch   | 50 ms      | 80 ms      | 120 ms     | 250 ms     |
| Cross       | 80 ms      | 100 ms     | 180 ms     | 360 ms     |
| Kick        | 100 ms     | 120 ms     | 200 ms     | 420 ms     |
| Dropkick    | 140 ms     | 150 ms     | 250 ms     | 540 ms     |
| Special     | 120 ms     | Varies     | 300 ms     | Varies     |
| Super       | 200 ms     | 500 ms     | 400 ms     | 1100 ms    |

### 4c. The 3-Frame Rule
> **The player must SEE the startup animation for at least 3 frames (50 ms)
> before the hitbox activates.** This gives the opponent a chance to react
> (block or dodge). Attacks that appear to hit on frame 1 feel "cheap"
> and unfair.

### 4d. Attack Cancelling
- **Normal → Special:** Allowed during Active phase (cancel into special).
- **Normal → Super:** Allowed during Active or Recovery phase.
- **Special → Super:** Allowed during Recovery phase only.
- **No Normal → Normal chains** without a gap (prevents infinite jab locks).

---

## 5. Screen Feedback & Juice

### 5a. Screen Shake
```typescript
function screenShake(intensity: number, duration: number) {
  // intensity: pixels of maximum displacement
  // duration: seconds
  // Decay: exponential falloff over duration
  // Direction: random 2D offset, recomputed each frame
}
```

| Impact Level | Intensity | Duration |
|:-------------|:----------|:---------|
| Light        | 3 px      | 0.08 s   |
| Medium       | 6 px      | 0.12 s   |
| Heavy        | 10 px     | 0.18 s   |
| Catastrophic | 16 px     | 0.25 s   |

### 5b. Hit Flash
On hit, the damaged character's materials should flash white for 1 frame
(16 ms), then return to normal. For the procedural body, temporarily set
all `MeshStandardMaterial.emissive` to `0xffffff` at intensity `0.8`.

### 5c. Damage Numbers / Floating Text
The `FloatingText` system in `types.ts` is already defined. Rules:
- Float upward at `80 px/s`, fade out over `0.8 s`.
- Critical hits: 1.5× font size, gold colour (`#ffd700`).
- Healing: green colour (`#4caf50`), floats upward.
- Blocked: grey colour (`#9e9e9e`), smaller font, text says "BLOCKED".

---

## 6. Audio Feedback Timing

### 6a. Sound Effect Trigger Points
| Event              | When to Play                                    |
|:-------------------|:------------------------------------------------|
| Punch whoosh       | Start of Active phase (not startup)             |
| Hit impact         | Frame of hitbox collision                        |
| Block clang        | Frame of blocked-hit collision                   |
| KO slam            | Frame HP reaches 0                               |
| Super activation   | Start of Super Startup phase                     |
| Super impact       | Start of Super Active phase                      |
| Crowd reaction     | 200 ms after any hit that deals > 15% HP         |

### 6b. Audio Layering
- **Never** play more than 3 simultaneous SFX (causes audio clipping).
- Prioritise: Impact > Whoosh > Crowd > Ambient.
- Use `audio.ts` `playSound()` with volume ducking for lower-priority sounds.

---

## 7. Combo System Rules

### 7a. Combo Counter
The `comboCount` and `comboTimer` fields on `Combatant` track consecutive hits:
- **Combo window:** 600 ms between hits to maintain the combo.
- **Combo scaling:** Each subsequent hit in a combo deals `5%` less damage
  (prevents infinite loops from being overpowered).
- **Combo break:** If the defender successfully blocks or the timer expires,
  the combo resets.

### 7b. Burst Mechanic
The `burstCount` and `burstTimer` fields provide a defensive escape:
- **Burst availability:** Once per 8-second cooldown.
- **Burst effect:** Pushes attacker back, grants 0.3 s invincibility.
- **Visual:** White radial shockwave emanating from the defender.

---

## 8. Balance Invariants

These ratios MUST be maintained to keep the game fair:

| Invariant                                    | Value       |
|:---------------------------------------------|:------------|
| Fastest attack startup (jab)                 | ≥ 50 ms     |
| Slowest attack total (super)                 | ≤ 1200 ms   |
| Block recovery advantage (defender)          | ≥ 2 frames  |
| Maximum single-hit damage (non-super)        | ≤ 18% HP    |
| Maximum single-hit damage (super)            | ≤ 35% HP    |
| Minimum stun duration                        | ≥ 200 ms    |
| Maximum stun duration (non-super)            | ≤ 500 ms    |
| Invincibility after hit                      | 100 ms      |

> [!CAUTION]
> Changing any of these values affects the entire meta-game balance.
> Always test with AI vs AI simulations (at least 50 rounds) before
> committing balance changes. Use `logic.test.ts` for automated checks.
