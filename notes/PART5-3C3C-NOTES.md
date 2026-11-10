# Part 5-3c3c: the strike plays the jab clip
Replaces `src/game/fighter3d.ts` (5-3c2 version plus this patch) and adds `src/game/attackClips.ts` (jab clips from 4-5b, 8 fighters). Back up fighter3d.ts first.
- The game has one strike. For the 8 rigged fighters it now plays the jab. Clip time = 0.3*attackPhase - 0.02 (the game's atk = 0.28 - ..., from App.tsx), clamped to the clip. Per-character limits apply. Crossfade 0.12 s in/out via the existing logic.
- Jump and airborne still use the old whole-body motion (next: 5-3c3d). Kicks, specials, supers are not wired (Part 6).
- Not tested: no tsc, no browser. Amplitude picks (ampTable.ts) are not used by the jab yet.
- Known: jab is fast (about 50-66 deg per 60 Hz frame at peak). Hit reaction is not delayed yet (Part 6).
- Your check: strike with Rahul and Mamata, look for pops. ?rig=off compares.
