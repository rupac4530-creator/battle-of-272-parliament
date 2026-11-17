/**
 * F43: follows the OS "reduce motion" setting live, for the canvas code (CSS handles the DOM side itself).
 * Safe where matchMedia is missing: motion is simply on.
 */
let reduced = false;
let started = false;
const listeners = new Set<(v: boolean) => void>();

function start(): void {
  if (started) return;
  started = true;
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = !!mq.matches;
    const onChange = (e: { matches: boolean }) => {
      reduced = !!e.matches;
      listeners.forEach(l => l(reduced));
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof (mq as MediaQueryList).addListener === 'function') (mq as MediaQueryList).addListener(onChange);
  } catch {
    reduced = false;
  }
}

/** True when the player's system asks for reduced motion. Cheap to call every frame. */
export function prefersReducedMotion(): boolean {
  start();
  return reduced;
}

export function subscribeReducedMotion(fn: (v: boolean) => void): () => void {
  start();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
