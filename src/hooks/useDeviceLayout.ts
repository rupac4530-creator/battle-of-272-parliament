import { useCallback, useEffect, useState } from 'react';

/**
 * Single source of truth for "what kind of screen is this and how should the
 * game be laid out".
 *
 * - On touch devices held upright the whole UI is turned 90° (CSS) so the game
 *   is always played in widescreen. A real orientation lock (see display.ts) is
 *   used first where the browser allows it; the CSS rotation is the fallback
 *   (iPhone Safari cannot lock orientation).
 * - The player can still override auto-rotation with the rotate button. The
 *   override is remembered until the phone is physically turned.
 * - `--app-w` / `--app-h` CSS variables always describe the size of the game
 *   area as the player sees it (they swap when the UI is rotated). Plain `vh`
 *   units cannot be used for this, because they keep measuring the physical
 *   screen even when the UI is rotated.
 */

export type RotateMode = 'auto' | 'on' | 'off';

export const detectTouch = (): boolean =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

/** Upright touch device small enough that landscape play is the better layout. */
export const shouldAutoRotate = (w: number, h: number, touch: boolean): boolean =>
  touch && h > w && (w <= 850 || h <= 950);

const readSize = () => ({ w: window.innerWidth, h: window.innerHeight });

export function useDeviceLayout() {
  const [viewportDims, setViewportDims] = useState(() =>
    typeof window === 'undefined' ? { w: 1024, h: 768 } : readSize()
  );
  const [mode, setMode] = useState<RotateMode>('auto');
  const touch = detectTouch();

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      // Wait a frame: some browsers report stale sizes straight after a rotation.
      raf = requestAnimationFrame(() => setViewportDims(prev => {
        const next = readSize();
        return prev.w === next.w && prev.h === next.h ? prev : next;
      }));
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  const isPortrait = viewportDims.h > viewportDims.w;

  // A manual choice only lasts until the phone is physically turned.
  useEffect(() => { setMode('auto'); }, [isPortrait]);

  const isForceRotated =
    mode === 'on' ||
    (mode === 'auto' && shouldAutoRotate(viewportDims.w, viewportDims.h, touch));

  // Size of the game area as the player sees it.
  const appW = isForceRotated ? viewportDims.h : viewportDims.w;
  const appH = isForceRotated ? viewportDims.w : viewportDims.h;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-w', `${appW}px`);
    root.style.setProperty('--app-h', `${appH}px`);
    root.dataset.rotated = isForceRotated ? 'true' : 'false';
    return () => {
      root.style.removeProperty('--app-w');
      root.style.removeProperty('--app-h');
      delete root.dataset.rotated;
    };
  }, [appW, appH, isForceRotated]);

  const toggleRotate = useCallback(() => {
    setMode(isForceRotated ? 'off' : 'on');
  }, [isForceRotated]);

  return { viewportDims, isPortrait, isTouch: touch, isForceRotated, appW, appH, toggleRotate };
}
