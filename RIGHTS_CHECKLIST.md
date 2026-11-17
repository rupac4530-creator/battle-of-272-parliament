# Rights checklist

**This is a to-do list for you, not legal advice.** I am not a lawyer. The in-game and README parody notice does not replace permission, and it does not by itself make any use lawful. For each row, decide: **keep (with permission)**, **replace**, or **remove**, and write it in the last column.

| # | Item | Where it lives | Question to answer | Your decision |
|---|------|----------------|--------------------|---------------|
| 1 | Map-screen background: a photorealistic face of a real politician, with a small "INCO" watermark | `public/menu-bg.jpg` | Who made it, and do you have the right to use a real person's likeness this way? The watermark suggests it came from someone else's tool or account. | |
| 2 | Intro-screen background | `public/loading-bg.jpg` | Same question: source, licence, and any real likenesses in it. | |
| 3 | A photo card of a politician, shipped in every build but not used by the game | `public/assets/amit-shah-card.jpg` (714 KB) | Nothing references it. Removing it costs nothing and removes one question. (F52 removes it.) | |
| 4 | Nine recorded voice clips | `public/voices/` (kejriwal, kharge, mamata, modi, rahul, rajnath, shah, sitharaman, yogi) | Are these real recordings, imitations, or generated? Do you have permission from the speakers or a licence for the source? | |
| 5 | Battle music: "Ram Hi Janey Mahasangram" | `public/music/ram-hi-janey-mahasangram.mp3` | Who owns the composition and the recording? Is there a licence for use in a game? | |
| 6 | Nine 3D character models (Modi as FBX with textures, the rest as `.glb`) | `public/models/` | Where did each model come from, and does its licence allow this use, including the likeness of a real person? | |
| 7 | Invented quotes and pickup lines attributed to named people | Intro quotes, each fighter's `memeDialogue`, `speechText` and `pickupLine` in `src/game/logic.ts`, and the "Speaker Om Birla" line in the sidebar | These put words in real people's mouths. Decide whether to keep them as obvious parody, make them generic, or remove them. | |
| 8 | README line: "All political voice lines and likenesses are used under transformative fair-use parody and satire." | `README.md`, near the end | This states a legal conclusion as fact. Decide whether to keep, reword, or remove it. | |
| 9 | Recorded gameplay clips and screenshots | `media_clips/`, `EPIC_GAMEPLAY_CLIPS_AND_PICTURES/`, `screenshots/` | They show items 1 to 7 above, so they carry the same questions. They need re-recording after any change to those items (F54). | |

Rows 1 to 7 should be settled before the clips are re-recorded.
