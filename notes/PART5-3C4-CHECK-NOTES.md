# Part 5-3c4: type-check of all Part 5 code, one fix

Assembled: game repo + 5-1, 5-2, 5-3a, 5-3b1, 5-3b2, 5-3c1, 5-3c2, 5-3c3a-f, overlaid in order.

## Found
`attackClips.ts` (5-3c3c) failed `tsc --strict`: its 8 jab clips have no `name`, but `Clip` in `animLib.ts` required one. Nothing in animLib.ts or fighter3d.ts reads `clip.name` (fighter3d's `st.name` is a separate state field).

## Fix (one line, src/game/animLib.ts)
`name: string` -> `name?: string` in `interface Clip`.

## Result after fix
- `tsc --strict` on animLib, poseApply, limitsTable, ampTable, stanceClips, reactionClips, attackClips, jumpClips, hitClips, rigBones, modiStance: 0 errors.
- fighter3d.ts: only errors are missing `three` types and `import.meta.env` (no node_modules here); no errors in the game's own code.
- tools/test_5_3a: 67 cases, 0 failures. tools/test_5_3b: 755 pass, 0 fail.

## Not done
No browser run, no three.js, no `npm install`. Nothing seen on screen. MSB.exe not opened. 5-3c3d/e/f have no notes files, so what they change in fighter3d.ts is not documented.
