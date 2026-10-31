/**
 * Fullscreen + orientation-lock helpers.
 *
 * Android Chrome: fullscreen + screen.orientation.lock('landscape') gives a real
 * landscape screen. iPhone Safari supports neither for web pages, so callers keep
 * the CSS 90° rotation as the fallback (see useDeviceLayout).
 */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & {
  lock?: (o: string) => Promise<void>;
};

export type ImmersiveResult = 'locked' | 'fullscreen' | 'unsupported';

export const isFullscreen = (): boolean => {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

export const canFullscreen = (): boolean => {
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
};

/** Must be called from a user gesture (tap / click). Never throws. */
export async function enterImmersive(): Promise<ImmersiveResult> {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch { /* denied or unsupported: fall through */ }

  try {
    const o = screen.orientation as LockableOrientation | undefined;
    if (o?.lock) {
      await o.lock('landscape');
      return 'locked';
    }
  } catch { /* lock only works in fullscreen on Android: ignore */ }

  return isFullscreen() ? 'fullscreen' : 'unsupported';
}

export async function exitImmersive(): Promise<void> {
  try { (screen.orientation as LockableOrientation | undefined)?.unlock?.(); } catch { /* ignore */ }
  try {
    const d = document as FsDoc;
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch { /* ignore */ }
}
