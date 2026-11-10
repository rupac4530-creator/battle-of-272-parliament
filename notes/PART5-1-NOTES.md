# Part 5-1: load the rigged GLBs in the game (patch to fighter3d.ts, no visible change yet)

Copy-over zip. It ADDS new files only (the 8 rigged models, one helper, one test and the notes) and REPLACES ONE game file: `src/game/fighter3d.ts`. The diff is `previews5_1/fighter3d.patch`. It is one added import line plus a rewritten `loadGlb`, and I checked that no other file in your original zip is overwritten. Everything else in your project is untouched. Back up your `fighter3d.ts` first. Unzip over your project folder.
New files: `src/game/rigBones.ts`, `public/models/<id>/<id>.rigged.glb` (8 files, byte-identical to the Part 3-7 files), `tools/test_5_1/test_rigbones_5_1.mjs`, `tools/test_5_1/rigBones.compiled.js`, `previews5_1/*`, this file.
Test: `node tools/test_5_1/test_rigbones_5_1.mjs tools/test_5_1/rigBones.compiled.js <folder with the 8 rigged glb files>`.

## What I did
1. `loadGlb` now asks for `public/models/<id>/<id>.rigged.glb` first. The loaded scene must pass `collectRig`: all 22 bones, each with the right parent, one skinned mesh with a 22-bone skeleton.
2. If the rigged file is missing, fails to load, or fails that check, it loads the old static `<id>.glb`. If that fails too, the old procedural body stays, as before.
3. `frustumCulled = false` is set on every mesh (the old code did this too), so a big kick is not culled.
4. The rig keeps a `bones` map (name to Bone) for 5-3. Nothing uses it yet.
5. New `?rig=off` in the URL skips the rigged files (for the 6-4 fallback test). `?models=procedural` works as before.
6. Nothing else changed. `pose()` still moves only the whole body for these models, so on screen you should see the same fighter as today. This step only gets the skeleton into the scene.

## Results
- **Rigged-file test:** 83 checks pass, 0 fail. It builds a fake object graph from the real node trees of all 8 rigged files and runs `collectRig`. Each file is accepted, with 22 bones in the right order and one skinned mesh. Broken variants are rejected for each file: a renamed bone, a wrong parent, no skinned mesh, a short skeleton. A static scene and a throwing traverse are also rejected.
- **Type check:** `tsc --strict` passes on the patched `fighter3d.ts` and `rigBones.ts`, with `three` stubbed as `any`. The original file passes under the same settings, so nothing new was hidden.
- **Material check:** the rigged files use the same material as the originals (white base colour, roughness 0.7, metallic 0) and the same position, normal and vertex-colour data. The only addition is joints and weights.
- **Size:** the 8 rigged files total 20.70 MB against 17.76 MB static (+2.94 MB). Gzipped, rigging adds about 0.44 MB (Part 3-8). Only the fighters that appear are fetched.

## Honest caveats
- **I could not run three.js, GLTFLoader or a browser here.** The test uses a fake graph that I built from the file JSON, so it shows my model of what GLTFLoader produces, not GLTFLoader itself. My expectations, untested: GLTFLoader returns the 22 joint nodes as `Bone` objects and the mesh as a `SkinnedMesh` with a skeleton of 22 bones.
- **A 404 on the rigged file costs one extra request** before the static fallback. On a dev server that returns index.html for missing files, I expect GLTFLoader to fail on parse and call the error callback, which then falls back, but I did not test it.
- **If a rigged file is rejected,** the console shows a warning with the reasons, and the game uses the static model.
- **No animation yet.** The skeleton is at rest, so the look does not change. 5-3 adds the clip player. Modi is untouched (5-2).
- **Skinned meshes cost more GPU time than static ones.** I did not measure it, and the 5-4 phone pass is for that.
- **Not in this step:** the head pivot, Shah and Kharge T40, and the other open items are unchanged. I keep the current choices.
- **In-browser check (needs you, one minute):** run the game, pick Rahul, open the browser console and confirm there is no "rejected" warning. Then add `?rig=off` and confirm it looks the same. The rigged and static fighters should look identical.

## What happens next
1. **5-2:** fix Modi's T-pose by reading his FBX rest pose. This is the least certain step.
2. **5-3:** the clip player in TypeScript, with a 0.12 s crossfade, amplitude picks and the ground lock.
3. **5-4:** phone performance and tests. Then Part 6 (wiring) and Part 7 (final checks). About 12 steps remain.

## Improvements for the current game, no new features
- Keep rigged and static files side by side until Part 7, so `?rig=off` always works as a fallback.
- Serve the `.rigged.glb` files with gzip. It saves most of the size growth.
- Don't judge the look yet. Nothing animates until 5-3.
