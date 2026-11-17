/**
 * F39: Safari before 16 has no CanvasRenderingContext2D.roundRect. This draws the same path with arcTo, and
 * `installRoundRectFallback` adds it only when the browser lacks the native method (modern browsers keep theirs).
 */
type Radii = number | DOMPointInit | Array<number | DOMPointInit>;

function radiusValue(r: number | DOMPointInit | undefined): number {
  if (typeof r === 'number') return Math.max(0, r);
  if (r && typeof r === 'object') return Math.max(0, Number(r.x ?? 0));
  return 0;
}

/** [topLeft, topRight, bottomRight, bottomLeft], following the canvas spec's 1-4 value rules. */
export function normalizeRadii(radii: Radii | undefined): [number, number, number, number] {
  const list = Array.isArray(radii) ? radii : [radii ?? 0];
  const v = list.map(radiusValue);
  if (v.length === 0) return [0, 0, 0, 0];
  if (v.length === 1) return [v[0], v[0], v[0], v[0]];
  if (v.length === 2) return [v[0], v[1], v[0], v[1]];
  if (v.length === 3) return [v[0], v[1], v[2], v[1]];
  return [v[0], v[1], v[2], v[3]];
}

export function roundRectPath(
  ctx: Pick<CanvasRenderingContext2D, 'moveTo' | 'arcTo' | 'lineTo' | 'closePath'>,
  x: number, y: number, w: number, h: number, radii?: Radii
): void {
  // A negative size draws the same rectangle from the other corner.
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  let [tl, tr, br, bl] = normalizeRadii(radii);
  const scale = Math.min(
    1,
    w / Math.max(tl + tr, 1e-9), w / Math.max(bl + br, 1e-9),
    h / Math.max(tl + bl, 1e-9), h / Math.max(tr + br, 1e-9)
  );
  if (scale < 1) { tl *= scale; tr *= scale; br *= scale; bl *= scale; }
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export function installRoundRectFallback(proto?: { roundRect?: unknown } | null): boolean {
  const target = proto ?? (typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null);
  if (!target || typeof target.roundRect === 'function') return false;
  (target as { roundRect: unknown }).roundRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radii?: Radii) {
    roundRectPath(this, x, y, w, h, radii);
  };
  return true;
}
