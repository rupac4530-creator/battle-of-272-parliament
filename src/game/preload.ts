/**
 * F38: preload for the intro screen.
 *
 * Voices and music are loaded through the SAME elements the game plays later (getVoiceElement / getBattleMusicElement),
 * so nothing is downloaded twice. Every file counts as done when it becomes playable, fails, or hits its timeout,
 * so a slow or offline connection (or iOS Safari, which ignores preload) can never trap the player on the intro.
 */

import { PRELOAD } from './balance';
import { preloadFraction, PreloadItem } from './logic';
import { getBattleMusicElement, getVoiceElement } from './audio';

export interface PreloadHandle {
  /** Stop listening and drop timers (the downloads themselves carry on, which is what we want). */
  cancel: () => void;
}

const HAVE_ENOUGH_DATA = 3;

function assetBase(): string {
  return (import.meta.env?.BASE_URL || './').replace(/\/$/, '');
}

/**
 * Start preloading. `onProgress` gets 0-1 whenever something finishes; `onDone` fires once, when all are done.
 * Both are called asynchronously (never during this call), so a caller may set state from them freely.
 */
export function startPreload(onProgress: (fraction: number) => void, onDone: () => void): PreloadHandle {
  const items: PreloadItem[] = [];
  const cleanups: Array<() => void> = [];
  let cancelled = false;
  let doneSent = false;

  const report = () => {
    if (cancelled) return;
    const f = preloadFraction(items);
    onProgress(f);
    if (f >= 1 && !doneSent) {
      doneSent = true;
      onDone();
    }
  };

  const track = (weight: number, timeoutMs: number, attach: (finish: () => void) => void) => {
    const item: PreloadItem = { weight, done: false };
    items.push(item);
    const finish = () => {
      if (item.done) return;
      item.done = true;
      report();
    };
    const timer = setTimeout(finish, timeoutMs);
    cleanups.push(() => clearTimeout(timer));
    attach(finish);
  };

  const trackAudio = (el: HTMLAudioElement | null, bytes: number) => {
    track(bytes, PRELOAD.audioTimeoutMs, finish => {
      if (!el) {
        // Defer so `report` never runs inside startPreload().
        queueMicrotask(finish);
        return;
      }
      const done = () => finish();
      el.addEventListener('canplaythrough', done, { once: true });
      el.addEventListener('error', done, { once: true });
      cleanups.push(() => {
        el.removeEventListener('canplaythrough', done);
        el.removeEventListener('error', done);
      });
      if (el.readyState >= HAVE_ENOUGH_DATA) queueMicrotask(finish);
      // A brand-new element normally starts loading by itself (preload = auto); only nudge one that has no source loaded at all.
      else if (el.networkState === 0) {
        try { el.load(); } catch { /* ignore */ }
      }
    });
  };

  const trackImage = (file: string, bytes: number) => {
    track(bytes, PRELOAD.imageTimeoutMs, finish => {
      const img = new Image();
      img.onload = () => finish();
      img.onerror = () => finish();
      img.src = `${assetBase()}/${file}`;
      if (img.complete) queueMicrotask(finish);
    });
  };

  trackAudio(getBattleMusicElement(), PRELOAD.music.bytes);
  for (const [id, bytes] of Object.entries(PRELOAD.voices)) trackAudio(getVoiceElement(id), bytes);
  for (const [file, bytes] of Object.entries(PRELOAD.images)) trackImage(file, bytes);

  return {
    cancel: () => {
      cancelled = true;
      for (const c of cleanups) c();
    }
  };
}
