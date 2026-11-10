# Part 5-3c3b: punch and kick picks added to ampTable.ts
Replaces `src/game/ampTable.ts` (5-3c3a content plus PUNCH_IN_DEG, TWIST_SCALE, KICK_PICK). Data only; nothing imports it. Game unchanged.
Copied from punch_pick_4_5, twist_pick_4_5b and kick_pick_4_6b, not recomputed.
Kick picks with resolved=false (13 clips) ship at 40 degrees and are not safe kicks. 4-6b found Kejriwal's rescued lead kick fails at its chamber key pose, so treat it as unresolved too.
No tsc or browser test this turn.
Next: 5-3c3c attack clips in fighter3d.ts.
