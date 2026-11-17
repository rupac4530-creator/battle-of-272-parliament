import type { Politician } from './types';
import { drawPolitician } from './renderer';

/**
 * Starts loading a fighter's 3D model without drawing anything visible. The 3D layer builds and requests a model the
 * first time that fighter is drawn, and only after its renderer is ready, so a few calls spread over a short while
 * are needed (the VS card calls this every 150 ms). It goes through the normal draw path, so no rig code is touched.
 * Safe anywhere: no document (tests), no 2D context or a failing 3D layer simply do nothing.
 */
export function warmFighter(c: Politician): void {
  try {
    if (typeof document === 'undefined') return;
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    drawPolitician(ctx, c, 0, 0, 1, { scale: 1, time: 0 } as Parameters<typeof drawPolitician>[5]);
  } catch {
    /* warming is only an optimisation */
  }
}
