/**
 * Real-Life Politician Meme Voice & Audio Engine
 * Plays actual recorded voice soundbites from /voices/{id}.mp3 with procedural acoustic meme hooks.
 */

import { VOICE, AUDIO_UI } from './balance';
import { voiceFadeVolume, useFallbackHook, voiceGainFor, duckedMusicVolume, lowNoteCopy } from './logic';

let audioCtx: AudioContext | null = null;
const audioCache: Record<string, HTMLAudioElement> = {};
let isVoiceEnabled = true;

// ── Background Battle Music ──────────────────────────────────────────
let bgMusic: HTMLAudioElement | null = null;
let bgMusicVolume = 0.55;
let musicActive = false; // battle music is meant to be playing (so resume knows to restart it)

// ── Global pause (the game's "House adjourned") ──────────────────────
let audioPaused = false;
const voicesPausedByGame = new Set<HTMLAudioElement>();

// ── One voice at a time (F35) ────────────────────────────────────────
let currentVoice: HTMLAudioElement | null = null;
let voiceSeq = 0; // counts voice starts; a late rejection only counts if no newer voice (even of the same clip) started since
let voiceFadeTimer: ReturnType<typeof setInterval> | null = null;

// ── Voice loudness graph (F36): clip element → gain → shared limiter → speakers ──
const voiceGainNodes = new WeakMap<HTMLAudioElement, GainNode>(); // an element can be wired into the graph only once
let voiceLimiter: DynamicsCompressorNode | null = null;
let voiceLimiterCtx: AudioContext | null = null;

// ── Music ducking (F36): the music dips while a voice clip plays ─────
let voiceDucking = false;
let musicRampTimer: ReturnType<typeof setInterval> | null = null;

/** Move the music volume to where it should be now (base volume, ducked or not). */
function applyMusicVolume(smooth: boolean) {
  if (musicRampTimer !== null) {
    clearInterval(musicRampTimer);
    musicRampTimer = null;
  }
  const m = bgMusic;
  if (!m) return;
  const target = duckedMusicVolume(bgMusicVolume, voiceDucking);
  if (!smooth || VOICE.duckRampMs <= 0) {
    m.volume = target;
    return;
  }
  // the full dip is (1 - musicDuck) of the base volume, covered in duckRampMs
  const step = Math.max(0.001, (bgMusicVolume * (1 - VOICE.musicDuck) * VOICE.fadeStepMs) / VOICE.duckRampMs);
  musicRampTimer = setInterval(() => {
    const d = target - m.volume;
    if (Math.abs(d) <= step) {
      m.volume = target;
      if (musicRampTimer !== null) clearInterval(musicRampTimer);
      musicRampTimer = null;
    } else {
      m.volume = Math.max(0, Math.min(1, m.volume + Math.sign(d) * step));
    }
  }, VOICE.fadeStepMs);
}

function setMusicDucked(on: boolean) {
  if (voiceDucking === on) return;
  voiceDucking = on;
  applyMusicVolume(true);
}

/**
 * Start looping background music during battle.
 * Uses the Ramayan "Ram Hi Janey Mahasangram" track from /music/.
 * Handles browser autoplay policy gracefully.
 */
/** The battle music element, created (not played) on first use so the intro can preload it (F38). */
function ensureMusicElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!bgMusic || bgMusic.error) {
    const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
    bgMusic = new Audio(`${base}/music/ram-hi-janey-mahasangram.mp3`);
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
  }
  return bgMusic;
}

/** For the intro's preloader: the same element the battle will play, so nothing is downloaded twice. */
export function getBattleMusicElement(): HTMLAudioElement | null {
  try { return ensureMusicElement(); } catch { return null; }
}

export function startBattleMusic() {
  if (typeof window === 'undefined') return;
  try {
    // A stale or errored element is replaced; a preloaded one (F38) is reused.
    ensureMusicElement();
    if (!bgMusic) return;
    bgMusic.currentTime = 0;
    applyMusicVolume(false);
    musicActive = true;
    if (audioPaused) return; // resumeAllAudio() will start it

    const tryPlay = () => {
      if (!bgMusic) return;
      bgMusic.play().catch(() => {});
    };

    const p = bgMusic.play();
    if (p) {
      p.catch(() => {
        // Autoplay blocked — retry on very next user interaction
        const resume = () => {
          tryPlay();
          window.removeEventListener('pointerup', resume);
          window.removeEventListener('keydown', resume);
          window.removeEventListener('touchstart', resume);
          window.removeEventListener('click', resume);
        };
        window.addEventListener('pointerup', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
        window.addEventListener('touchstart', resume, { once: true });
        window.addEventListener('click', resume, { once: true });
      });
    }
  } catch {
    // Ignore — music is non-critical
  }
}

/**
 * Stop/pause the background battle music.
 */
export function stopBattleMusic() {
  musicActive = false;
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}

/**
 * Set background music volume (0.0 – 1.0).
 */
export function setBattleMusicVolume(v: number) {
  bgMusicVolume = Math.max(0, Math.min(1, v));
  applyMusicVolume(false);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended' && !audioPaused) {
    audioCtx.resume();
  }
  return audioCtx;
}

/** True only when the audio context already exists and is running. Never creates it, so a beep can be skipped before the first gesture. */
export function audioIsRunning(): boolean {
  return !!audioCtx && audioCtx.state === 'running' && !audioPaused;
}

/** Call from a user gesture (tap, key, click): creates the audio context if needed and wakes it. */
export function unlockAudio(): void {
  if (audioPaused) return;
  try { getAudioContext(); } catch { /* audio is non-critical */ }
}

/** Freeze all sound: music, any voice clip that is playing, and the synth context. */
export function pauseAllAudio() {
  audioPaused = true;
  try {
    bgMusic?.pause();
    for (const a of Object.values(audioCache)) {
      if (!a.paused && !a.ended) {
        a.pause();
        voicesPausedByGame.add(a);
      }
    }
    audioCtx?.suspend();
  } catch {
    // non-critical
  }
}

/** Undo pauseAllAudio(): continue music and voices from where they stopped. */
export function resumeAllAudio() {
  if (!audioPaused) return;
  audioPaused = false;
  try {
    audioCtx?.resume();
    if (musicActive) bgMusic?.play().catch(() => {});
    for (const a of voicesPausedByGame) a.play().catch(() => {});
    voicesPausedByGame.clear();
  } catch {
    // non-critical
  }
}

function clearVoiceFade() {
  if (voiceFadeTimer !== null) {
    clearInterval(voiceFadeTimer);
    voiceFadeTimer = null;
  }
}

/** A clip that was allowed to play while the game is held (inspector preview) is over: put the synth context back to sleep. */
function holdContextIfPaused() {
  if (!audioPaused) return;
  try { audioCtx?.suspend(); } catch { /* non-critical */ }
}

/** Stop one clip right now and rewind it. */
function hardStopVoice(a: HTMLAudioElement) {
  voicesPausedByGame.delete(a);
  if (a === currentVoice) setMusicDucked(false);
  try {
    if (!a.paused) a.pause();
    a.currentTime = 0;
    a.volume = 1.0;
  } catch { /* not loaded yet */ }
  holdContextIfPaused();
}

/** Cut every voice clip that is currently playing (match start, match end, back to map). */
export function stopAllVoices() {
  voiceSeq++;
  clearVoiceFade();
  currentVoice = null;
  setMusicDucked(false);
  voicesPausedByGame.clear();
  for (const a of Object.values(audioCache)) hardStopVoice(a);
}

/** Stop the current voice, fading it out over `fadeSeconds` (0 = at once). Used when a cutscene ends. */
export function stopVoice(fadeSeconds = 0) {
  const a = currentVoice;
  clearVoiceFade();
  if (!a) return;
  if (fadeSeconds <= 0 || a.paused) {
    currentVoice = null;
    setMusicDucked(false);
    hardStopVoice(a);
    return;
  }
  const totalMs = fadeSeconds * 1000;
  const t0 = Date.now();
  voiceFadeTimer = setInterval(() => {
    const elapsed = Date.now() - t0;
    try { a.volume = voiceFadeVolume(elapsed, totalMs); } catch { /* ignore */ }
    if (elapsed >= totalMs) {
      clearVoiceFade();
      if (currentVoice === a) currentVoice = null;
      setMusicDucked(false);
      hardStopVoice(a);
    }
  }, VOICE.fadeStepMs);
}

export function playSound(
  freq: number,
  duration = 0.1,
  type: OscillatorType = 'square',
  volume = 0.08,
  sweep = -60
) {
  if (audioPaused) return; // a beep while paused must not wake the audio context
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, freq + sweep), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(now + duration);

    // F37: phone speakers barely reproduce 55-120 Hz, so a low note also plays a quieter copy one octave up.
    const low = lowNoteCopy(freq, sweep, AUDIO_UI.lowNote.belowHz, AUDIO_UI.lowNote.gainMult, AUDIO_UI.lowNote.minFreq);
    if (low) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = type;
      osc2.frequency.setValueAtTime(low.freq, now);
      osc2.frequency.exponentialRampToValueAtTime(low.endFreq, now + duration);
      gain2.gain.setValueAtTime(volume * low.gainMult, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start();
      osc2.stop(now + duration);
    }
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}

/**
 * Procedural synthesis of the viral "Moye Moye" vocal melody
 */
export function playMoyeMoyeTune() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [
    { f: 493.88, d: 0.35, v: 0.12 }, // B4 ("Mo-")
    { f: 440.0, d: 0.35, v: 0.12 },  // A4 ("-ye")
    { f: 392.0, d: 0.35, v: 0.14 },  // G4 ("Mo-")
    { f: 369.99, d: 0.45, v: 0.14 }, // F#4 ("-ye...")
    { f: 329.63, d: 0.7, v: 0.16 }   // E4 (resolve)
  ];

  let timeOffset = 0;
  notes.forEach((n) => {
    const startTime = now + timeOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, startTime);
    osc.frequency.linearRampToValueAtTime(n.f * 1.01, startTime + n.d * 0.5);
    osc.frequency.linearRampToValueAtTime(n.f, startTime + n.d);

    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.exponentialRampToValueAtTime(n.v, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + n.d);

    timeOffset += n.d * 0.85;
  });
}

/**
 * Signature Meme Acoustic & Sound Hooks for Each Politician
 */
export function playPoliticianAcousticHook(id: string) {
  switch (id) {
    case 'rajnath': {
      playMoyeMoyeTune();
      break;
    }
    case 'modi': {
      playSound(1320, 0.4, 'sine', 0.1, -100);
      setTimeout(() => playSound(880, 0.6, 'triangle', 0.12, -40), 150);
      setTimeout(() => {
        playSound(440, 0.5, 'sawtooth', 0.1, 10);
        playSound(554, 0.7, 'sawtooth', 0.1, -20);
      }, 400);
      break;
    }
    case 'shah': {
      playSound(160, 0.3, 'sawtooth', 0.15, -60);
      setTimeout(() => playSound(280, 0.25, 'square', 0.1, -120), 180);
      setTimeout(() => playSound(90, 0.5, 'sine', 0.18, -40), 320);
      break;
    }
    case 'rahul': {
      playSound(180, 0.25, 'triangle', 0.12, 380);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          playSound(1200 + i * 180, 0.15, 'triangle', 0.08, 150);
        }, 120 + i * 90);
      }
      break;
    }
    case 'yogi': {
      playSound(55, 0.8, 'sawtooth', 0.16, 25);
      setTimeout(() => playSound(85, 0.6, 'triangle', 0.14, -20), 160);
      setTimeout(() => playSound(140, 0.3, 'square', 0.12, -80), 300);
      break;
    }
    case 'sitharaman': {
      playSound(1800, 0.15, 'sine', 0.12, 200);
      setTimeout(() => playSound(2400, 0.2, 'triangle', 0.1, 100), 80);
      setTimeout(() => playSound(75, 0.5, 'square', 0.15, -40), 220);
      break;
    }
    case 'kharge': {
      playSound(110, 0.35, 'sawtooth', 0.18, -80);
      setTimeout(() => playSound(65, 0.6, 'triangle', 0.22, -30), 120);
      break;
    }
    case 'kejriwal': {
      playSound(320, 0.18, 'sawtooth', 0.12, -180);
      for (let i = 0; i < 4; i++) {
        setTimeout(() => playSound(420 + i * 60, 0.12, 'sine', 0.08, 100), 100 + i * 100);
      }
      break;
    }
    case 'mamata': {
      const beats = [220, 330, 220, 440, 330, 220];
      beats.forEach((f, i) => {
        setTimeout(() => playSound(f, 0.12, 'triangle', 0.12, -80), i * 120);
      });
      break;
    }
    default:
      playSound(220, 0.2, 'triangle', 0.1);
      break;
  }
}

/**
 * Super move procedural audio profiles
 */
export function playSuperSound(superType: string) {
  switch (superType) {
    case 'train': {
      playSound(440, 0.6, 'sawtooth', 0.12, 10);
      setTimeout(() => playSound(554, 0.8, 'sawtooth', 0.12, -20), 120);
      setTimeout(() => playSound(659, 1.0, 'sawtooth', 0.14, 5), 260);
      for (let i = 0; i < 6; i++) {
        setTimeout(() => playSound(80, 0.08, 'square', 0.09, -30), i * 160);
      }
      break;
    }
    case 'bulldozer': {
      playSound(65, 0.8, 'sawtooth', 0.15, 20);
      setTimeout(() => playSound(55, 0.9, 'triangle', 0.18, -15), 200);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playSound(120 + Math.random() * 80, 0.12, 'sawtooth', 0.1, -80), 200 + i * 140);
      }
      break;
    }
    case 'rafale': {
      playMoyeMoyeTune();
      setTimeout(() => {
        playSound(380, 0.5, 'sine', 0.12, 400);
        setTimeout(() => playSound(720, 0.7, 'sawtooth', 0.14, -300), 250);
        for (let i = 0; i < 4; i++) {
          setTimeout(() => playSound(140, 0.25, 'triangle', 0.12, -100), 300 + i * 180);
        }
      }, 800);
      break;
    }
    case 'aloo_gold': {
      playSound(240, 0.2, 'square', 0.1, 150);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => playSound(1200 + Math.random() * 400, 0.15, 'triangle', 0.08, 200), i * 120);
      }
      break;
    }
    case 'chain': {
      playSound(280, 0.25, 'sawtooth', 0.1, -120);
      playSound(180, 0.35, 'square', 0.12, -80);
      setTimeout(() => playSound(80, 0.6, 'sine', 0.15, -40), 180);
      break;
    }
    case 'veto': {
      playSound(120, 0.45, 'sawtooth', 0.16, -90);
      setTimeout(() => playSound(60, 0.7, 'triangle', 0.2, -30), 80);
      break;
    }
    case 'dharna': {
      playSound(150, 0.6, 'sawtooth', 0.1, 80);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playSound(320 + i * 60, 0.18, 'sine', 0.08, -120), i * 140);
      }
      break;
    }
    case 'gst_blocks': {
      playSound(90, 0.4, 'triangle', 0.15, -60);
      setTimeout(() => playSound(980, 0.18, 'square', 0.08, 150), 150);
      break;
    }
    case 'khela_volley': {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => playSound(260 + i * 40, 0.1, 'triangle', 0.09, -140), i * 100);
      }
      break;
    }
    default:
      playSound(140, 0.4, 'sawtooth', 0.12, -80);
      break;
  }
}

export function setVoiceEnabled(enabled: boolean) {
  isVoiceEnabled = enabled;
  // Switching voice clips off cuts the clip that is playing right now (and un-ducks the music).
  if (!enabled) stopVoice(0);
}

export function getVoiceEnabled(): boolean {
  return isVoiceEnabled;
}

/**
 * Wire a clip into the loudness graph and set its gain. Returns false when it cannot be done
 * (no Web Audio, or the context is not running yet because the browser has not allowed sound): the clip then
 * plays natively, attenuated only, so a clip is never routed into a context that would swallow it.
 */
function routeVoice(audio: HTMLAudioElement, politicianId: string): boolean {
  try {
    const gain = voiceGainFor(politicianId);
    // An element that is already in the graph stays there for good (it cannot be taken out), so just update its gain.
    // If the context happens to be suspended, getAudioContext() asks it to resume and the clip is heard as soon as it does.
    const existing = voiceGainNodes.get(audio);
    if (existing) {
      getAudioContext();
      existing.gain.value = gain;
      return true;
    }
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return false;
    if (!voiceLimiter || voiceLimiterCtx !== ctx) {
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = VOICE.limiter.threshold;
      lim.knee.value = VOICE.limiter.knee;
      lim.ratio.value = VOICE.limiter.ratio;
      lim.attack.value = VOICE.limiter.attack;
      lim.release.value = VOICE.limiter.release;
      lim.connect(ctx.destination);
      voiceLimiter = lim;
      voiceLimiterCtx = ctx;
    }
    const src = ctx.createMediaElementSource(audio);
    const node = ctx.createGain();
    src.connect(node);
    node.connect(voiceLimiter);
    node.gain.value = gain;
    voiceGainNodes.set(audio, node);
    return true;
  } catch {
    return false;
  }
}

/** One cached element per voice clip. The intro preloads these same elements (F38), so nothing is downloaded twice. */
export function getVoiceElement(politicianId: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
  const soundPath = `${base}/voices/${politicianId}.mp3`;
  let audio = audioCache[soundPath];
  if (!audio) {
    audio = new Audio(soundPath);
    audio.preload = 'auto';
    audioCache[soundPath] = audio;
    const el = audio;
    el.addEventListener('ended', () => {
      if (currentVoice === el) {
        currentVoice = null;
        setMusicDucked(false);
      }
      holdContextIfPaused();
    });
  }
  return audio;
}

/**
 * Play REAL-LIFE recorded meme audio file (/voices/{politicianId}.mp3).
 * Only one clip plays at a time: starting a new one stops the old one. The synth hook plays only
 * when the clip could not start (autoplay blocked, file missing), never on top of a working clip.
 */
export function playRealPoliticianVoice(politicianId: string, opts?: { whilePaused?: boolean }): boolean {
  if (typeof window === 'undefined') return false;
  if (!isVoiceEnabled) return false;
  // While the game is held only a deliberate preview (the inspector's Speak button) may play, and only this one clip.
  if (audioPaused && !opts?.whilePaused) return false;

  try {
    // Whatever is playing (or fading out) stops first.
    clearVoiceFade();
    if (currentVoice) hardStopVoice(currentVoice);

    const audio = getVoiceElement(politicianId);
    if (!audio) return false;
    currentVoice = audio;
    audio.currentTime = 0;
    if (audioPaused) {
      // Music stays paused; only the synth context wakes for this one clip (it sleeps again when the clip ends).
      try { getAudioContext()?.resume(); } catch { /* falls back to native playback below */ }
    }
    // Through the loudness graph when possible; otherwise native playback, lowered but never boosted.
    audio.volume = routeVoice(audio, politicianId) ? 1.0 : Math.min(1, voiceGainFor(politicianId));
    const mySeq = ++voiceSeq;
    const playPromise = audio.play();
    setMusicDucked(true);
    if (playPromise) {
      playPromise.catch((err: unknown) => {
        const name = err instanceof Error ? err.name : '';
        if (voiceSeq === mySeq) setMusicDucked(false); // the clip never started, so the music must not stay dipped
        if (useFallbackHook(name, voiceSeq === mySeq)) playPoliticianAcousticHook(politicianId);
      });
    }
    return true;
  } catch {
    playPoliticianAcousticHook(politicianId);
    return false;
  }
}

/** Main voice dispatcher: plays the recorded clip of one politician (no id, no sound). */
export function speakPoliticianVoice(politicianId?: string, opts?: { whilePaused?: boolean }) {
  if (politicianId) {
    playRealPoliticianVoice(politicianId, opts);
  }
}
