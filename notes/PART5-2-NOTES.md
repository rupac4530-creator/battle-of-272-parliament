# Part 5-2: Modi's T-pose fix

Unzip over your Part 5-1 result, this zip last. It REPLACES `src/game/fighter3d.ts` (the 5-1 version plus 8 lines) and adds `src/game/modiStance.ts`, three tools and two data files. **Back up `fighter3d.ts` first.** No other game file changes. The 8 other fighters are untouched.

## What I found
- I wrote a small binary-FBX reader (`tools/fbxp.py`) because none exists here. `modi.fbx` has 87 bones, including all 22 standard bone names plus fingers, eyes and neck extras.
- His rest pose is a real T-pose: both upper arms point 87.4 deg away from hanging (x = +-0.995, y = -0.046).

## What I did
1. Aligned each of his rest bones to the standard rig's bind direction with a shortest-arc rotation, using Rajnath's rigged bind pose as the standard.
2. Applied the standard idle stance (first key of `idle` in 4-2) through that alignment, with fingers/extras following their nearest standard ancestor.
3. Stored the resulting local bone quaternions in `src/game/modiStance.ts` (87 bones).
4. In `loadModi`, after the existing scale and centring, set `bone.quaternion` for every bone named there and update matrices. `?modi=tpose` skips it. A console warning appears if fewer than 20 bones were posed.

## Checks (Python reference, not three.js)
- Posed bone directions vs the standard rig's idle, 17 bones: max error 0.0 deg. This is largely by construction, because the alignment forces rest directions to match. It shows the maths is consistent, not that the mesh looks right.
- `tsc --strict` on the patched file gives the same 6 errors as the 5-1 file, all from three.js types missing in this sandbox. No new errors.

## Honest caveats
- **Not seen in a browser or run in three.js.** The real test: run the game, pick Modi, and check the arms hang in a guard instead of sticking out. Add `?modi=tpose` to compare.
- **Skinning risk:** the FBX has 1,094 deformers. If any mesh is skinned to non-standard bones, parts could look stretched. I did not check which meshes use which bones.
- **Unverified assumption:** the bone `name` strings in three's FBXLoader match the FBX names (they should, there are no dots).
- **Roll about bone axes is not fitted.** Directions match, twist may differ, so wrists and forearms could look rotated.
- **Feet:** the stance bends the knees a little, so his feet may sit slightly off the floor line. The ground lock comes in 5-3. I did not re-measure his height after posing.
- **Static only.** He holds the idle stance. His special/super clips are not played yet (5-3).
- Rest rotations are read with FBX XYZ Euler order and PreRotation, and I did not handle rotation order other than XYZ.

## Next
5-3 (clip player with 0.12 s crossfade, amplitude picks, ground lock, Modi's clips through this retarget), 5-4 (phone performance), Part 6, Part 7. About 10 steps remain.

## Improvements without new features
- Judge Modi only in the browser; this is the one fix I can't see here.
- Keep the old `?modi=procedural` fallback.
