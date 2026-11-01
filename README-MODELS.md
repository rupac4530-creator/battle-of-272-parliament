# 3D fighter models update

Copy everything in this zip over your project (same paths), then `npm run dev` / `npm run build`.

New:      public/models/{shah,rahul,yogi,rajnath,sitharaman,kharge,kejriwal,mamata}/<id>.glb   (about 18 MB in total)
Changed:  src/game/fighter3d.ts
Tools:    tools/optimize_fbx.py, tools/fbxlib.py   (regenerate or add models; needs numpy + pillow)

Your eight FBX files were about 110 MB each (1.5 million triangles, four 4K textures). They are now 1.4-3.0 MB each,
57K-126K triangles, with the colour texture baked into vertex colours. Fighters are drawn about 285 px tall,
so this looks the same in the game and loads quickly on phones.

How it behaves in the game
- A model loads the first time that fighter is shown. Until it arrives (or if it fails to load), the old procedural
  body is used, so nothing breaks.
- ?models=procedural in the URL forces the built-in bodies. ?modi=procedural still works for Modi.
- Models move like your Modi model does: lean, twist, bob and lunge (they have no skeleton, so no limb animation).

File names follow the game ids: shah, rahul, yogi, rajnath, sitharaman, kharge, kejriwal, mamata.
