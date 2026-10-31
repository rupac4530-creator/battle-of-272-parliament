/**
 * Real-Life Politician Meme Voice & Audio Engine
 * Plays actual recorded voice soundbites from /voices/{id}.mp3 with procedural acoustic meme hooks.
 */

let audioCtx: AudioContext | null = null;
const audioCache: Record<string, HTMLAudioElement> = {};
let isVoiceEnabled = true;

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
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(
  freq: number,
  duration = 0.1,
  type: OscillatorType = 'square',
  volume = 0.08,
  sweep = -60
) {
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
}

export function getVoiceEnabled(): boolean {
  return isVoiceEnabled;
}

/**
 * Play REAL-LIFE recorded meme audio file (/voices/{politicianId}.mp3)
 */
export function playRealPoliticianVoice(politicianId: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isVoiceEnabled) return false;

  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
  const soundPath = `${base}/voices/${politicianId}.mp3`;

  try {
    let audio = audioCache[soundPath];
    if (!audio) {
      audio = new Audio(soundPath);
      audio.preload = 'auto';
      audioCache[soundPath] = audio;
    }
    audio.currentTime = 0;
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Fallback to acoustic hook if browser policy blocks autoplay before interaction
        playPoliticianAcousticHook(politicianId);
      });
    }
    // Also trigger the acoustic signature hook for extra comedic presence
    playPoliticianAcousticHook(politicianId);
    return true;
  } catch {
    playPoliticianAcousticHook(politicianId);
    return false;
  }
}

/**
 * Main voice dispatcher: Plays real voice recording from MP3 files.
 */
export function speakPoliticianVoice(
  _fallbackText: string,
  _pitch = 1.0,
  _rate = 1.0,
  _force = false,
  politicianId?: string
) {
  if (politicianId) {
    playRealPoliticianVoice(politicianId);
  }
}
