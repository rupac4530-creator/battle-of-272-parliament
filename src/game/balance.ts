// Central tuning numbers for the fix plan. Retune gameplay here instead of hunting through App.tsx.

/** Pickup lines: seats gained per line, cooldown between lines (s), max lines per match. */
export const PICKUP_LINE = {
  seats: 8,
  cooldown: 4,
  maxUses: 5
} as const;

/** Damage-over-time supers that used to set timers nobody read. */
export const SUPER_TICK = {
  // Sitharaman: GST blocks rain over the whole chamber (blockable). 6 ticks x 5 = 30 damage (F59b: was 4 per tick; she won 29-42% of CPU-vs-CPU matches).
  gst_blocks: { duration: 2.4, interval: 0.4, dmg: 5, knockback: 40 },
  // Kejriwal: Dharna vortex drags a nearby opponent closer. 8 ticks x 3 = 24 damage.
  dharna: { duration: 4, interval: 0.5, dmg: 3, pull: 70, range: 240 }
} as const;

/** Kejriwal's Muffler Hook: how long the pull takes and the max reach (px). */
export const MUFFLER_HOOK = { duration: 0.25, range: 230, dmg: 7, knockback: 70 } as const; // F59: was range 260, dmg 9 (F59b re-check: Kejriwal is mid-table, so no further nerf)

/** Rahul's Mohabbat ki Dukaan: was +12 HP and 1.2 s invincible every 2.6 s (about 46% uptime). */
export const RAHUL_HEAL = { heal: 7, invincible: 0.6, cooldown: 6 } as const;

/** Supers that only make sense up close: out of this range they refuse to fire and keep the meter. */
export const SUPER_RANGE: Partial<Record<string, number>> = { chain: 320, veto: 380 };

/** Super tuning from the balance pass. */
export const SHAH_CHAIN_DMG = 18; // F59c: was a hard-coded 14
export const SHAH_FREEZE_SECONDS = 3.0; // F59b: was 2.0 (F9 cut it from 3.5); Shah won 23-38% of CPU-vs-CPU matches
export const RAFALE = { missiles: 5, gapMs: 150, spreadPx: 100, dmg: 14 } as const; // F59c: dmg 14 (F59b: 13); F59b: dmg 13 (F59: 12)

/**
 * F59 balance pass (from the CPU-vs-CPU re-check: Kharge 85%, Kejriwal 77%, Mamata 75% against
 * Modi 21% and Rajnath 17%; target is every fighter between 30% and 70%).
 * Each value is one line to retune.
 */
export const VETO = { stun: 1.0, silenceSeconds: 4 } as const; // was stun 1.4
export const DHARNA_INVINCIBLE_SECONDS = 2.5; // was the full 4 s of the vortex
export const MAMATA_COMBO_COOLDOWN = 5.5; // was 3, F59: 4.5. F59b: she was 73-77% in two CPU-vs-CPU runs
/** Chance the CPU jumps over an incoming train or bulldozer when it gets the chance (was always). */
export const AI_DODGE_CHANCE = 0.6;
/** Kharge's Point of Order parry. Was window 0.85 s, cooldown 3.2 s, reflect 14, meter +25 (90% win rate). */
export const PARRY = { window: 0.5, cooldown: 7, reflectDmg: 9, meterGain: 15 } as const; // was window 0.85, cooldown 3.2, reflect 14, meter +25. F59: 4.5 / 12. F59b: 5.5 / 10 (Kharge averaged about 75% at the F59 numbers)
/** Rajnath's Kadi Ninda Stun. Was a 3.5 s movement flip only (15% win rate). */
export const KADI_NINDA = { confuseSeconds: 5, stunSeconds: 0.6, stunRange: 220 } as const; // F59b: stun 0.6 (F59: 0.45)

/** Modi's special, the Lotus Wave projectile. Was a hard-coded 10 damage (Modi won 27% in the CPU-vs-CPU re-check). */
export const MODI_WAVE = { dmg: 12 } as const;

/** Block now chips 35% of damage (was 25%) so turtling is less dominant. */
export const BLOCK_DAMAGE_MULT = 0.35;

/**
 * Movement feel. Friction/drag values are "multiplier per 60 fps frame" and are converted to the real
 * frame time with decayPerFrame(), so a kick slides the same distance at 30, 60 or 144 fps.
 */
export const MOVE = {
  groundFriction: 0.8,   // no input / blocking
  stunFriction: 0.9,     // stunned or frozen
  airDrag: 0.98,         // no steering input in the air: keep most of the jump's momentum
  airAccel: 1400,        // px/s^2 while steering in the air
  shakeDecay: 0.85,      // camera shake
  gravity: 1800,
  jumpSpeed: 650
} as const;

/**
 * A press made during an attack/recovery is kept this long (s) and fires the moment the fighter is free.
 * 0.18 = the original 0.12 + the 0.06 hit-stop that now lengthens every landed attack in real time,
 * so the chain window opens at the same moment (~140 ms into a punch) as before hit-stop existed.
 */
export const INPUT_BUFFER_SECONDS = 0.18;

/** Fighters are solid on the ground: minimum centre gap (px), how fast overlap is resolved, and the wall limits. */
export const BODY = { minGap: 44, maxPushSpeed: 520, wallMin: 30, wallMax: 770 } as const;

/**
 * Hit feedback. Hit-stop freezes the simulation (drawing continues) for a moment on impact.
 * Chip hits and damage-over-time ticks (below minDamage, measured as the unblocked-equivalent) get none,
 * and a cooldown stops multi-hit volleys (coins, missiles) from freezing the game repeatedly.
 */
export const HIT_FEEL = {
  hitStop: 0.06,
  blockStop: 0.03,
  heavyStop: 0.10,
  minDamage: 5,
  heavyDamage: 14,
  stopCooldown: 0.35,
  spark: { hit: '#ffd700', block: '#58a6ff' },
  numberColor: { hit: '#ffffff', block: '#9aa5b1' }
} as const;

/**
 * Super cutscene timing (seconds of game time). The fade starts late enough that the longest quote
 * (96 characters) is fully typed and has been readable for ~1 s before it goes.
 */
export const CUTSCENE_FADE_AT = 2.4;
export const CUTSCENE_END = 2.7;
export const QUOTE_CHARS_PER_SECOND = 70;
/** A key/tap skips a super cutscene only after this long, so the press that fired the super (or mashing) cannot skip it. */
export const CUTSCENE_SKIP_AFTER = 0.8;
/** Top strip of the stage (names, bars, seats, clock) that a super cutscene must not dim. */
export const CUTSCENE_HUD_STRIP = 70;

/**
 * Stage render resolution. The stage is authored in 800x450 logical units; the canvas backing store is
 * (800x450) x scale so text and edges stay sharp on retina phones and when the canvas is shown larger than 800 px.
 * Scale = displayed size x devicePixelRatio, rounded UP to a step (so a window drag does not rebuild the
 * background on every pixel) and capped (a 2x canvas is 4x the pixels to fill).
 * Steps of 0.5 keep both 800*s and 450*s whole numbers.
 */
export const RENDER = { minScale: 1, maxScale: 2, step: 0.5, slack: 0.05, backgroundCacheMax: 3 } as const;

/** HUD text sizes (stage px). The old 9.5 px thought bubble and 11 px seats line were unreadable on phones. */
export const HUD_TEXT = { thoughtFont: 12, thoughtHeight: 22, thoughtPadX: 8, thoughtMinWidth: 84, seatsFont: 13, edgeMargin: 4 } as const;

/** F24: the "ghost" health bar. A lighter bar behind the HP bar shows the chunk you just lost, then drains away. */
export const GHOST_BAR = {
  /** HP per second the ghost drains once it starts (plan: 40). */
  drainPerSecond: 40,
  /** Seconds the ghost holds still after a hit before draining, so even a small hit leaves a visible chunk. */
  holdSeconds: 0.3,
  color: '#f2cc60',
} as const;

/** F24: the match clock turns red and pulses in the last seconds, with a soft tick per second. */
export const CLOCK = {
  urgentSeconds: 10,
  normalColor: '#f5eedb',
  urgentColor: '#ff4d4d',
  /** Extra scale at the instant a new second starts; it eases back to 1 over the rest of that second. */
  pulseScale: 0.22,
  tickVolume: 0.035,
  tickFreq: 660,
  /** The last few ticks are higher, so the countdown has a rising feel. */
  finalTickSeconds: 3,
  finalTickFreq: 880,
} as const;

/** F24: floating combat text. Long lines (pickup lines) wrap, stay inside the stage and live long enough to read. */
export const FLOAT_TEXT = {
  baseLife: 0.9,
  perChar: 0.03,
  maxLife: 2.4,
  wrapChars: 26,
  margin: 8,
  lineHeight: 17,
  outline: 3,
} as const;

/** A "can't do that" message (line cooling down...) is not repeated while the same one is still on screen nearby. */
export const REFUSAL_TEXT = { duplicateRadius: 140 } as const;

/**
 * F26: arena background layout (stage px). An EVEN number of pillars centred on x = 400 puts the Chakra mural in the
 * middle bay, so no pillar sits behind it. Arches run from the inner edge of one pillar to the inner edge of the next.
 */
export const ARENA_ART = {
  pillarCount: 6,
  bay: 140, // centre-to-centre distance between neighbouring pillars
  pillarWidth: 24,
  capitalOverhang: 3, // the gold capital is this much wider than the shaft on each side
  pillarTop: 25,
  archSpringY: 62, // height where an arch leaves the pillar; its crown is at springY - radius
  archLine: 4,
  chakraX: 400,
  chakraY: 92, // was 78: its rim ran into the match clock above it
  chakraHalo: 48,
  podiumNumberMaxWidth: 27, // widest the "272" may be inside its plaque
  podiumNumberStart: 14,
  podiumNumberMin: 9,
  plaqueRadius: 16
} as const;

/**
 * F27: the winner portrait on the game-over modal (canvas px). `figureHeight` is how tall a fighter is at scale 1
 * (the same 112 px the freeze box uses). The old portrait drew at scale 1.4 with the feet at canvas height - 6, so
 * the figure was about 157 px tall inside a 125 px canvas and the head was cut off.
 */
export const GAME_OVER = {
  portraitW: 100,
  portraitH: 125,
  figureHeight: 112,
  headMargin: 8, // room kept above the head
  footMargin: 6, // room kept below the feet
  maxScale: 1.4,
  confettiCount: 30
} as const;

/**
 * F28: on-screen gamepad sizes (CSS px). Every button must be at least `minTarget` (the 44 px touch guideline);
 * the old phone sizes were 38 px (LINE, SPECIAL, SUPER, BLOCK, JUMP) and 48 px (STRIKE), with 8 px labels.
 */
export const PAD = {
  minTarget: 44,
  minLabel: 11,
  labelRatio: 0.14, // label font = max(minLabel, size * labelRatio)
  // 52 px (not 48) so a five-letter label such as BLOCK or SUPER still fits inside the circle at 11 px
  phone: { stick: 88, small: 52, big: 58 },
  compact: { stick: 96, small: 52, big: 60 },
  full: { stick: 124, small: 56, big: 68 },
  iconSmall: 14,
  iconBig: 16,
  vibrateMs: 8,
  // Two one-sided pads (2-Player) on a screen narrower than this get 48 px, icon-free buttons so both pads fit side by side.
  // (48 px is still above the 44 px guideline, and with no icon the 11 px label sits at the circle's widest part.)
  narrowBelowWidth: 720,
  narrow: { stick: 88, small: 48, big: 56 },
  phoneMaxHeight: 520,
  phoneMaxWidth: 768
} as const;

/**
 * F29: phone HUD layout. On a short screen the top HUD strip (names, bars, seats, clock) is `stripStagePx` of the
 * 450-unit stage; the pause / rotate / fullscreen buttons and the telemetry pill sit in a column below it, and the
 * Rule Coach becomes one short line centred just below the strip (between the pill and the button column; the bottom corners hold the pads), which dismisses itself.
 */
export const PHONE_HUD = {
  shortMaxHeight: 500, // stage box height (CSS px) at or below which the phone layout applies
  stripStagePx: 70, // same strip F21 keeps undimmed during cutscenes
  gap: 6,
  button: 40, // round corner buttons
  coachSeconds: 6, // auto-dismiss on short screens
  coachDismissSize: 32, // the X (was 12 px with no label)
  sideMargin: 8, // distance of the corner buttons from the screen edge
  coachMaxWidthFrac: 0.7 // banner never wider than this share of the stage box
} as const;

/**
 * F31: map pins. Pins are drawn at 16 px (inside the 14-18 px plan range) but a tap picks the NEAREST pin within
 * `hitRadius`, so the touch target is far bigger than the dot. Pins closer than `minGap` are pushed apart (a leader
 * line still points at the real city), because on a phone-sized map the north cluster is only 7-10 px apart.
 */
export const MAP_PINS = {
  dot: 16,
  selectedScale: 1.5,
  minGap: 26, // centre-to-centre; the selected dot is 24 px wide, so it never covers a neighbour
  hitRadius: 28,
  dotHit: 16, // a tap this close to a dot always belongs to that dot, even if another pin's label is drawn over it
  labelPad: 14, // dot centre to the start of its name label
  labelCharPx: 5.8, // rough width of one label character at 9 px bold
  labelPadX: 12,
  labelsAllMinWidth: 260, // narrower maps label only the selected pin (nine labels cannot fit); the dossier card names the rest
  margin: 14, // pins stay this far inside the map edge
  iterations: 120,
  leaderMinDisplace: 3 // draw a leader line only when a pin moved at least this far (px)
} as const;

/** Map screen text (F32). */
export const MAP_TEXT = {
  hideBelow: 260, // a map narrower than this (px) draws no city, state or island names: they render at 2-3 px and only add noise
  regionAlpha: 0.55 // state names were 28% white on green; 55% reads on the land colour without competing with pins
} as const;

/** Phone-landscape map header and dossier card (F32). */
export const MAP_COMPACT = {
  buttonLabels: {
    single: '1P vs AI',
    twoPlayer: '2-Player',
    rules: 'Rules',
    intro: 'Intro',
    rotate: 'Rotate',
    rotated: 'Landscape',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit'
  }
} as const;

/** Roster strip under the map (F33): one chip per leader, a second way to pick when a pin is hard to hit. */
export const ROSTER = {
  chipHeight: 44, // touch target guideline
  gap: 6, // px between chips
  startLabel: 'ENTER CHAMBER', // phone landscape: the full "ENTER THE LOK SABHA CHAMBER" does not fit beside the strip
  scrollPad: 12 // keep the selected chip this far from the strip edge when scrolling it into view
} as const;

/** Versus card (F34): the opponent is shown before the bell instead of silently being "three places down the roster". */
export const VS = {
  autoStartSeconds: 1.5, // the card starts the match by itself after this long
  inputGraceSeconds: 0.25, // ignore skip presses this soon after the card opens, so the press that opened it cannot also skip it
  chipHeight: 44 // 2-Player "pick your fighter" chips (touch target guideline)
} as const;

/** Voice clips (F35): one clip at a time, with a short fade when a cutscene ends. */
export const VOICE = {
  cutsceneFadeSeconds: 0.3, // fade-out when a super's cutscene ends (the clip is usually longer than the 2.7 s scene)
  fadeStepMs: 30, // volume step while fading
  // F36: loudness. Every clip is brought to the same integrated loudness (LUFS). The music sits at about -21 LUFS
  // (its file is -15.9 LUFS at volume 0.55), so -16 puts voices about 5 dB above it, and about 13 dB above it while it is ducked.
  targetLufs: -16,
  musicDuck: 0.4, // music volume multiplier while a voice clip plays
  duckRampMs: 150, // how quickly the music dips and returns
  // Safety limiter after the gain stage (the clips and the boosted quiet ones must never clip)
  limiter: { threshold: -1.5, knee: 0, ratio: 20, attack: 0.003, release: 0.12 }
} as const;

/**
 * Measured integrated loudness of each voice clip, in LUFS (ffmpeg ebur128 on public/voices/*.mp3).
 * Re-measure and edit here if a clip is replaced. The spread is 19 dB: Yogi's file is clipped at source
 * (true peak +6.5 dBFS) and Mamata's is the quietest.
 */
export const VOICE_LUFS: Record<string, number> = {
  modi: -6.7,
  shah: -8.3,
  yogi: -2.1,
  rahul: -11.9,
  kharge: -16.3,
  mamata: -21.0,
  kejriwal: -19.5,
  sitharaman: -10.4,
  rajnath: -14.0
};


/**
 * F37: music volume control and low-note support.
 * - The slider edits the music base volume (0-1). 0.55 is the volume the game always used, so it is the default.
 * - A note whose lowest frequency is under `belowHz` gets a quieter copy one octave up, because phone speakers
 *   can barely reproduce 55-120 Hz (the Yogi, Kharge, Shah and bulldozer sounds).
 */
export const AUDIO_UI = {
  defaultMusicVolume: 0.55,
  musicSliderStep: 0.05,
  lowNote: { belowHz: 120, gainMult: 0.5, minFreq: 25 }
} as const;


/** F47: how the intro's seat counter eases toward its target (per second), and when it snaps. */
export const INTRO_COUNTER = {
  rate: 8, // about 0.8 s from 0 to 272 after a big jump of the target
  snapBelowSeats: 0.5,
  maxFrameSeconds: 0.1 // a stalled frame must not make the counter leap
} as const;

/**
 * F38: a real loader instead of a fixed 3.4-4 s timer. The intro downloads the voices, the battle music and the two
 * background pictures while the story plays, and waits for the player's tap or key before entering.
 * `bytes` are the file sizes in public/ (they only weight the progress bar, so rough is fine).
 */
export const PRELOAD = {
  minReadySeconds: 2.5, // the story always gets at least this long, even when everything is cached
  audioTimeoutMs: 4000, // a clip that has not become playable by now counts as done (iOS Safari ignores preload)
  imageTimeoutMs: 6000, // same for a picture
  music: { bytes: 1515236 },
  voices: {
    modi: 169773, shah: 105115, rahul: 67584, yogi: 105093, rajnath: 109869,
    sitharaman: 89133, kharge: 96813, kejriwal: 138240, mamata: 96813
  } as Record<string, number>,
  images: { 'loading-bg.jpg': 392588, 'menu-bg.jpg': 402859 } as Record<string, number>
} as const;


/**
 * F39: the CPU decides every 140 ms, but React only hears about it when something on screen shows it
 * (the sidebar, the phone drawer or the inspector). While visible, a new best action shows at once and
 * the numbers otherwise refresh every `refreshMs`.
 */
export const DECISION_UI = { refreshMs: 400 } as const;

/** Damage of the three basic attacks. The rulebook prints these, so changing one here changes the text too. */
export const STRIKE_DAMAGE = { punch: 7, kick: 9, dropkick: 10 } as const;

/** F43: invincibility used to flip between 100% and 60% opacity every 50 ms (10 Hz). It is now a smooth fade. */
export const INVINCIBLE_LOOK = {
  /** Seconds for one half of the fade (full -> dim, or dim -> full). */
  halfPeriodSeconds: 0.12,
  minAlpha: 0.6,
  maxAlpha: 1,
  /** Under prefers-reduced-motion the fighter holds one steady, slightly dimmed look. */
  reducedAlpha: 0.75,
} as const;

/** F43: no text in the React UI may be smaller than this many CSS pixels (a source test enforces it). */
export const MIN_TEXT_PX = 11;

/**
 * F44: saved settings. One localStorage entry holding a small JSON object. Bump `version` in the key if the
 * shape ever changes in a way old saves can't be read.
 */
export const SETTINGS = {
  storageKey: 'battle272.settings.v1'
} as const;

/** F57: dynamic arena camera. Zooms in to frame both fighters (never past maxZoom), follows their midpoint and never
 *  shows anything outside the arena. Drawing only: hitboxes and all game rules stay in world coordinates. */
export const CAMERA = {
  maxZoom: 1.3,          // fighters look 30% bigger when close together
  fitMarginPx: 300,      // zoom so both fighters plus this much room fit the view
  zoomRate: 5,           // smoothing (per second) for zoom
  panRate: 7,            // smoothing (per second) for the centre
} as const;
