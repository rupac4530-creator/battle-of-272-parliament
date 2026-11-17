// Pure text-fitting helpers (no DOM), so they can be unit-tested.

/**
 * Largest font size in [minPx, startPx] (0.5 px steps) at which `measure(px)` fits in `maxWidth`.
 * Returns minPx when nothing fits. Width is close to linear in size, so we estimate, then verify by stepping.
 */
export function fitFontSize(
  measure: (px: number) => number,
  maxWidth: number,
  startPx: number,
  minPx: number
): number {
  const startWidth = measure(startPx);
  if (startWidth <= maxWidth) return startPx;
  let px = Math.max(minPx, Math.floor(((startPx * maxWidth) / startWidth) * 2) / 2);
  while (px > minPx && measure(px) > maxWidth) px -= 0.5;
  return Math.max(minPx, px);
}

/** Shorten `text` with an ellipsis until `measure(text)` fits `maxWidth` (last resort after shrinking). */
export function ellipsize(measure: (t: string) => number, text: string, maxWidth: number): string {
  if (measure(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && measure(t + '…') > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}


/** Split into user-visible characters, so typing never cuts a Devanagari conjunct or combining mark in half. */
export function splitGraphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), s => s.segment);
  return Array.from(text);
}

/**
 * Word-wrap `text` to `maxWidth` using the real measured width. The caller wraps the FULL text once, so line
 * breaks and box size never change while the text is being typed. A single word wider than the box is broken.
 */
export function wrapText(measure: (t: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  const pushWord = (word: string) => {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = '';
    if (measure(word) <= maxWidth) {
      line = word;
      return;
    }
    // overlong single word: break between characters
    let chunk = '';
    for (const g of splitGraphemes(word)) {
      if (chunk && measure(chunk + g) > maxWidth) {
        lines.push(chunk);
        chunk = '';
      }
      chunk += g;
    }
    line = chunk;
  };
  text.split(/\s+/).filter(Boolean).forEach(pushWord);
  if (line) lines.push(line);
  return lines;
}

/** Number of characters a typewriter has to type to show `lines` completely (a space at each line break). */
export function totalChars(lines: string[]): number {
  return lines.reduce((n, l) => n + splitGraphemes(l).length, 0) + Math.max(0, lines.length - 1);
}

/**
 * The lines visible after `count` characters have been typed. Only the last visible line is partial;
 * every earlier line is final, so words never jump between lines.
 */
export function revealLines(lines: string[], count: number): string[] {
  const out: string[] = [];
  let remaining = count;
  for (const line of lines) {
    if (remaining <= 0) break;
    const g = splitGraphemes(line);
    if (remaining >= g.length) {
      out.push(line);
      remaining -= g.length + 1;
    } else {
      out.push(g.slice(0, remaining).join(''));
      break;
    }
  }
  return out;
}
