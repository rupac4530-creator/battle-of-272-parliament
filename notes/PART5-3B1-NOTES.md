# Part 5-3b1: write a sampled pose onto the 22 rig bones (new file only, nothing imports it yet)

Adds files only. `src/game/fighter3d.ts` is NOT changed in this step, so the game looks and plays the same as after 5-2/5-3a.
New files: `src/game/poseApply.ts`, `tools/test_5_3b/{test.mjs,poseApply.mjs,animLib.mjs,stance_walk_4_2.json}`, this file.
Unzip over your project after 5-1, 5-2 and 5-3a. Test: `node tools/test_5_3b/test.mjs tools/test_5_3b/stance_walk_4_2.json`.

## What it does
- `applyPose(bones, pose, hipsRest?)` sets each bone's local rotation from a sampled pose. A bone missing from the pose is set to identity, so no bone keeps a stale rotation. Hips also gets `pose.root` added to its rest position.
- `resetPose(bones, hipsRest?)` returns everything to rest.
- The rigged files have identity rest rotations (3-7), so the pose quaternion is the bone's local rotation. `bones` is the name-to-Bone map that `collectRig` already returns in 5-1. No three.js import (bones are duck-typed).

## Results
- `tsc --strict` compiles `animLib.ts` and `poseApply.ts` with no errors.
- Test: 755 pass, 0 fail. It samples all 6 clips of the 4-2 library (idle, idle_narrow, walk_fwd, walk_back and their narrow variants) at 5 times each, including times past the clip end, applies each pose to 22 fake bones and checks every quaternion equals the sampled pose exactly and Hips position equals rest plus root. It also checks that the other 21 bones' positions are never touched, that a stale rotation is cleared, that `resetPose` works, and that a missing position object or missing `hipsRest` is harmless.

## Honest caveats
- **Fake bones, not three.js.** I could not run three.js or a browser. The test shows the maths and bookkeeping, not that a real `Bone` in a `SkinnedMesh` looks right on screen.
- **Hips rest position is not captured yet.** 5-3b2 must read it from the loaded bone once, in `fighter3d.ts`. The root value in these clips is 0, so Hips would not move even if this were wrong.
- **Not tested:** the ground lock (needs world foot positions), clip selection, amplitude picks and Modi's 87-bone skeleton (his retarget from 5-2 is separate).
- The clips tested are idle and walk only. Attack, jump and reaction clips use the same code path but were not run through this test.

## What happens next
1. **5-3b2:** hook `applyPose` into `fighter3d.ts`: capture Hips rest, play the idle clip on the 8 rigged fighters, keep `?rig=off` and the procedural fallback working, then the ground lock.
2. **5-3c:** clip selection and amplitude picks. **5-4:** phone performance and tests. Then Part 6 (wiring) and Part 7 (final checks). About 8 steps remain.
3. Still open: your choices on Shah and Kharge T40 hem smoothing, the head pivot, light hit 1.5 or 2.0 (I keep the current choices), and your browser checks for 5-1 and 5-2.

## Improvements for the current game, no new features
- Always clear bones missing from a pose, so a move that skips a bone can never leave it twisted from the last move.
- Keep `?rig=off` and `?modi=tpose` while testing.
