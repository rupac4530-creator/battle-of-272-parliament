# Part 5-3a: TypeScript port of the animation maths (no visible change yet)

Adds files only: `src/game/animLib.ts` (new, no three.js dependency) and `tools/test_5_3a/*`. Nothing in your game imports it yet, so the game is unchanged. Unzip over your project after 5-1 and 5-2.

## What it contains
A port of `tools/animlib.py` from Part 4-1: quaternion normalise and shortest-path slerp, pose blend, left/right mirroring, clip sampling (linear, smooth, out, in eases; time is clamped), crossfade (smoothstep), and per-group limits (scale the rotation angle, optional max-angle cap).

## Checks
- `tsc --strict` compiles it with no errors.
- Test: `cd tools/test_5_3a && node test.mjs`. It compares the TypeScript output with the Python reference (`ref.json`, made by `ref_5_3a.py` from the 4-1 example jab) on 67 cases: 43 clip samples (including times outside the clip), 15 mirrored-clip samples, 5 crossfades, 3 limited poses, mirror-twice identity and a q/-q slerp.
- Result: 0 failures, worst difference 9e-5 degrees (the reference is rounded to 6 decimals).

## Honest caveats
- Only the 4-1 example jab was used as the reference clip, not the full library. The code path is the same for all clips, but I did not test every clip.
- My first comparison reported 0.13 degree "failures". That was my test (dot product of non-normalised rounded quaternions), not the port. I fixed the test to normalise both sides and changed no port code.
- Not done yet: applying poses to the three.js bones (rest-pose composition), the amplitude picks, the ground lock, the state machine that chooses clips, and Modi's retarget of clips. Those are 5-3b and 5-3c.
- I could not run three.js or a browser. Nothing has been seen on screen.

## Next
5-3b: apply a sampled pose to the 22 bones in `fighter3d.ts` (bind rotations are identity, so a pose quaternion is the bone's local rotation), plus the ground lock and the idle clip, still behind the existing game logic. 5-3c: clip selection and amplitude picks. Then 5-4 (phone performance), Part 6 (wiring), Part 7 (final checks).
