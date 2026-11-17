/**
 * Realistic 2.5D Canvas2D Renderer for The Parliament House
 */

import { Politician, Combatant, Projectile, Particle, FloatingText, PowerUp } from './types';
import { fitFontSize, ellipsize, wrapText, revealLines } from './textFit';
import { CUTSCENE_FADE_AT, CUTSCENE_END, QUOTE_CHARS_PER_SECOND, CUTSCENE_SKIP_AFTER, CUTSCENE_HUD_STRIP, RENDER, ARENA_ART } from './balance';
import { chamberLayout, portraitSlideOffset } from './logic';
import { prefersReducedMotion } from './motion';
import { draw3D } from './fighter3d';

const TAU = Math.PI * 2;
export const STAGE_WIDTH = 800;
export const STAGE_HEIGHT = 450;
export const FLOOR_Y = 372;

/**
 * Sizes the stage canvas to (STAGE x scale) backing pixels and maps the 800x450 logical stage onto it, so all
 * drawing code keeps using stage units. Call at the start of every frame: it resizes only when the scale changed
 * (assigning width/height clears the canvas and resets its state), then sets the base transform.
 */
export function prepareStageCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, scale: number): void {
  const w = Math.round(STAGE_WIDTH * scale);
  const h = Math.round(STAGE_HEIGHT * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(w / STAGE_WIDTH, 0, 0, h / STAGE_HEIGHT, 0, 0);
  // The 3D fighters are 384 px renders drawn smaller (arena) or larger (cutscene portrait): scale them with the
  // browser's best filter instead of the default 'low' one. Costs nothing when nothing is resized.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

// Cached background canvases, one per render scale (a few at most; the oldest is dropped).
const backgroundCache = new Map<number, HTMLCanvasElement>();

export function getChamberBackground(scale: number = 1): HTMLCanvasElement {
  const cached = backgroundCache.get(scale);
  if (cached) return cached;

  const bg = document.createElement('canvas');
  bg.width = Math.round(STAGE_WIDTH * scale);
  bg.height = Math.round(STAGE_HEIGHT * scale);
  const ctx = bg.getContext('2d');
  if (!ctx) return bg;
  // Everything below is drawn in 800x450 stage units.
  ctx.scale(bg.width / STAGE_WIDTH, bg.height / STAGE_HEIGHT);

  // 1. Vaulted High Ceiling with Rich Teakwood & Architectural Shadow
  const wallGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  wallGrad.addColorStop(0, '#091510');
  wallGrad.addColorStop(0.5, '#050c09');
  wallGrad.addColorStop(1, '#020604');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  // 2. Carved Teakwood Grand Columns & Arches with Gold Accents
  // Layout comes from chamberLayout(): symmetric, inside the stage, arches meeting the pillar shafts exactly.
  const layout = chamberLayout(STAGE_WIDTH);
  // Arches first, so each pillar is painted over the foot of the arch and the joint looks clean.
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = ARENA_ART.archLine;
  for (const arch of layout.arches) {
    ctx.beginPath();
    ctx.arc(arch.cx, arch.springY, arch.r, Math.PI, 0);
    ctx.stroke();
  }
  const shaftW = ARENA_ART.pillarWidth;
  const capW = shaftW + ARENA_ART.capitalOverhang * 2;
  for (const centre of layout.pillars) {
    const px = centre - shaftW / 2;
    // Pillar shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px - 4, ARENA_ART.pillarTop - 5, shaftW + 8, FLOOR_Y - ARENA_ART.pillarTop + 5);

    // Pillar body
    const colGrad = ctx.createLinearGradient(px, 0, px + shaftW, 0);
    colGrad.addColorStop(0, '#3e2723');
    colGrad.addColorStop(0.5, '#5d4037');
    colGrad.addColorStop(1, '#2d1b18');
    ctx.fillStyle = colGrad;
    ctx.fillRect(px, ARENA_ART.pillarTop, shaftW, FLOOR_Y - ARENA_ART.pillarTop);

    // Gold capitals and bases
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(px - ARENA_ART.capitalOverhang, ARENA_ART.pillarTop, capW, 8);
    ctx.fillRect(px - ARENA_ART.capitalOverhang, FLOOR_Y - 8, capW, 8);
  }

  // 3. Central Gilded Ashok Chakra Mural
  ctx.save();
  ctx.translate(ARENA_ART.chakraX, ARENA_ART.chakraY);
  // Outer bronze halo
  const haloGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 48);
  haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
  haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, TAU);
  ctx.fill();

  // Chakra rim
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, TAU);
  ctx.stroke();

  // 24 Spokes
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
  for (let i = 0; i < 24; i++) {
    const angle = (i * TAU) / 24;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
    ctx.lineTo(Math.cos(angle) * 38, Math.sin(angle) * 38);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, TAU);
  ctx.fill();
  ctx.restore();

  // 4. Semicircular MP Benches (Peacock Green Fabric with Teak Desks)
  const benchTiers = [
    { y: 250, h: 26, inset: 26, col: '#165034' },
    { y: 284, h: 28, inset: 56, col: '#12412a' },
    { y: 320, h: 32, inset: 86, col: '#0d3220' }
  ];

  benchTiers.forEach(tier => {
    // Desk surface
    ctx.fillStyle = tier.col;
    ctx.beginPath();
    ctx.roundRect(tier.inset, tier.y, STAGE_WIDTH - tier.inset * 2, tier.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#2d1b18';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Desktop brass microphones and document piles
    const numDesks = 8;
    const step = (STAGE_WIDTH - tier.inset * 2 - 40) / numDesks;
    for (let k = 0; k < numDesks; k++) {
      const mx = tier.inset + 20 + k * step;
      // Paper bundle
      ctx.fillStyle = '#e8dec5';
      ctx.fillRect(mx - 8, tier.y + 4, 16, 6);
      // Brass mic stand
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(mx + 10, tier.y + 2, 2, 9);
      ctx.beginPath();
      ctx.arc(mx + 11, tier.y + 2, 2.5, 0, TAU);
      ctx.fill();
    }
  });

  // 5. Main Lok Sabha Emerald Carpet Floor
  const carpetGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, STAGE_HEIGHT);
  carpetGrad.addColorStop(0, '#1c7447');
  carpetGrad.addColorStop(0.2, '#145634');
  carpetGrad.addColorStop(1, '#0b311e');
  ctx.fillStyle = carpetGrad;
  ctx.fillRect(0, FLOOR_Y, STAGE_WIDTH, STAGE_HEIGHT - FLOOR_Y);

  // Gilded border line
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(0, FLOOR_Y, STAGE_WIDTH, 4);

  // Intricate Carpet Weave Stripes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let i = 0; i < 24; i++) {
    ctx.fillRect(i * 36, FLOOR_Y + 4, 18, STAGE_HEIGHT - FLOOR_Y);
  }

  // 6. Elevated Speaker's Podium (Central 272 Seats Control Point)
  const podX = 366;
  const podW = 68;
  const podH = 68;

  // Podium base shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(400, FLOOR_Y + 6, 48, 12, 0, 0, TAU);
  ctx.fill();

  // Dark polished mahogany rostrum
  const podGrad = ctx.createLinearGradient(podX, 0, podX + podW, 0);
  podGrad.addColorStop(0, '#3e2723');
  podGrad.addColorStop(0.5, '#5d4037');
  podGrad.addColorStop(1, '#2d1b18');
  ctx.fillStyle = podGrad;
  ctx.fillRect(podX, FLOOR_Y - podH, podW, podH);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.strokeRect(podX, FLOOR_Y - podH, podW, podH);

  // Upper lectern desk
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(podX - 8, FLOOR_Y - podH - 10, podW + 16, 12);
  ctx.strokeRect(podX - 8, FLOOR_Y - podH - 10, podW + 16, 12);

  // Lion capital emblem plaque. The "272" is sized to fit the plaque (measured, so any font works), with a light
  // outline so it stays readable when the background is scaled.
  const plaqueY = FLOOR_Y - podH + 24;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(400, plaqueY, ARENA_ART.plaqueRadius, 0, TAU);
  ctx.fill();
  const numberPx = fitFontSize(
    px => {
      ctx.font = `bold ${px}px sans-serif`;
      return ctx.measureText('272').width;
    },
    ARENA_ART.podiumNumberMaxWidth,
    ARENA_ART.podiumNumberStart,
    ARENA_ART.podiumNumberMin
  );
  ctx.font = `bold ${numberPx}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 248, 220, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.strokeText('272', 400, plaqueY + 1);
  ctx.fillStyle = '#2d1b18';
  ctx.fillText('272', 400, plaqueY + 1);
  ctx.textBaseline = 'alphabetic';

  if (backgroundCache.size >= RENDER.backgroundCacheMax) {
    const oldest = backgroundCache.keys().next().value;
    if (oldest !== undefined) backgroundCache.delete(oldest);
  }
  backgroundCache.set(scale, bg);
  return bg;
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16);
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  return `rgb(${cl(((n >> 16) & 255) + amt)},${cl(((n >> 8) & 255) + amt)},${cl((n & 255) + amt)})`;
}

/**
 * Shaded, articulated politician renderer (3/4 view, feet at y = 0, facing +x)
 */
export function drawPolitician(
  ctx: CanvasRenderingContext2D,
  c: Politician,
  x: number,
  y: number,
  facing: number,
  options: {
    scale?: number; time?: number; isWalking?: boolean; walkSpeed?: number;
    attackProg?: number; attackPhase?: number;
    attackType?: 'punch' | 'cross' | 'kick' | 'dropkick' | 'special' | 'super';
    airborne?: boolean; blocking?: boolean; stunned?: boolean;
    isSuper?: boolean; superPhase?: number; superType?: string;
    facing?: number; vx?: number; vy?: number;
  } = {}
) {
  if (draw3D(ctx, c, x, y, facing, options.scale || 1, options)) return;
  const s = options.scale || 1.0;
  const t = options.time || 0;
  const ph = options.isWalking ? Math.sin(t * 12) : 0;
  const br = Math.sin(t * 2.2) * 1.1;
  const at = options.attackProg || 0;
  const OUT = '#0b100d';
  const vest = c.accessory === 'modi_jacket' || c.accessory === 'bandhgala' || c.accessory === 'waistcoat';
  const skirt = c.id === 'sitharaman' || c.id === 'mamata' || c.id === 'yogi';
  const sleeve = vest ? '#f1e9d3' : c.col;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const limb = (x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  const disc = (cx: number, cy: number, r: number, col: string) => {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
  };
  const shoe = (sx: number, col: string) => {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(sx + 4, -2.5, 9, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
  };
  const footCol = c.id === 'mamata' ? '#2aa3dc' : '#17120f';

  // Ground contact shadow-free: legs with kicking & jumping support
  if ((options.attackType === 'kick' || options.attackType === 'dropkick') && at > 0) {
    const kickExt = 26 + at * 28;
    // Plant leg
    limb(-8, -42, -14, -4, 11, shade(c.pants, -30));
    shoe(-14, footCol);
    // Extended kicking leg
    limb(6, -42, 6 + kickExt, -32 - at * 12, 11, c.pants);
    shoe(6 + kickExt, footCol);
  } else {
    limb(-5, -42, -5 + ph * 9, -4, 11, shade(c.pants, -30));
    limb(5, -42, 5 - ph * 9, -4, 11, c.pants);
    shoe(-5 + ph * 9, footCol);
    shoe(5 - ph * 9, footCol);
  }

  if (skirt) {
    // Saree / robe drape over legs with pleats
    const g = ctx.createLinearGradient(-16, 0, 16, 0);
    g.addColorStop(0, shade(c.pants, 18)); g.addColorStop(0.6, c.pants); g.addColorStop(1, shade(c.pants, -40));
    ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-14, -46); ctx.lineTo(14, -46); ctx.lineTo(17 + ph * 2, -7); ctx.lineTo(-17 + ph * 2, -7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -44); ctx.lineTo(i * 6.5 + ph * 2, -8); ctx.stroke(); }
    if (c.id === 'mamata') { ctx.fillStyle = '#0288d1'; ctx.fillRect(-17 + ph * 2, -12, 34, 5); }
    if (c.id === 'sitharaman') { ctx.fillStyle = '#ffd700'; ctx.fillRect(-17 + ph * 2, -12, 34, 4); }
  }

  // Back arm
  limb(-11, -69, -13 - ph * 3, -45 + br, 8, shade(sleeve, -35));
  disc(-13 - ph * 3, -42 + br, 4.2, shade(c.skin, -25));

  // Torso
  const tg = ctx.createLinearGradient(-16, 0, 16, 0);
  const base = vest ? '#f1e9d3' : c.col;
  tg.addColorStop(0, shade(base, 22)); tg.addColorStop(0.55, base); tg.addColorStop(1, shade(base, -45));
  ctx.fillStyle = tg; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-15, -72 + br); ctx.quadraticCurveTo(0, -77 + br, 15, -72 + br);
  ctx.lineTo(13, -43); ctx.lineTo(-13, -43); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6, -62); ctx.quadraticCurveTo(-3, -52, -7, -44); ctx.moveTo(6, -60); ctx.quadraticCurveTo(8, -52, 5, -44); ctx.stroke();

  if (vest) {
    ctx.fillStyle = c.accessory === 'modi_jacket' ? '#ff9933' : c.col;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-14, -71 + br); ctx.lineTo(-2, -73 + br); ctx.lineTo(-1, -44); ctx.lineTo(-13, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -71 + br); ctx.lineTo(2, -73 + br); ctx.lineTo(1, -44); ctx.lineTo(13, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-4, -64 + i * 6, 1.1, 0, TAU); ctx.fill(); }
    if (c.accessory === 'modi_jacket') { disc(8, -63, 2.6, '#ffd700'); }
    if (c.accessory === 'bandhgala') { ctx.fillStyle = '#ff9933'; ctx.fillRect(6, -66, 4, 2.5); ctx.fillStyle = '#fff'; ctx.fillRect(6, -63.5, 4, 2.5); ctx.fillStyle = '#138808'; ctx.fillRect(6, -61, 4, 2.5); }
  } else if (c.accessory === 'saree_zari' || c.accessory === 'tant_blue_border') {
    const border = c.accessory === 'saree_zari' ? '#ffd700' : '#0288d1';
    ctx.fillStyle = c.pants; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-14, -72 + br); ctx.lineTo(15, -70 + br); ctx.lineTo(16, -40); ctx.lineTo(-4, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = border; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-14, -72 + br); ctx.lineTo(16, -42); ctx.stroke();
  } else if (c.accessory === 'angavastram') {
    ctx.strokeStyle = '#ff9933'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, -72 + br); ctx.lineTo(8, -44); ctx.stroke();
    ctx.strokeStyle = '#138808'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -72 + br); ctx.lineTo(12, -44); ctx.stroke();
  } else if (c.accessory === 'muffler') {
    ctx.fillStyle = '#880e4f'; ctx.strokeStyle = '#3d0020'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(-13, -79 + br, 26, 10, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(4, -72, 8, 26, 3); ctx.fill(); ctx.stroke();
  } else if (c.accessory === 'mala') {
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -73 + br, 9, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.fillStyle = '#3e2723';
    for (let m = 0; m < 6; m++) { const a = 0.3 + m * 0.5; ctx.beginPath(); ctx.arc(Math.cos(a) * 9, -73 + br + Math.sin(a) * 9, 1.7, 0, TAU); ctx.fill(); }
  }
  if (c.id === 'rahul') { ctx.fillStyle = '#00b4d8'; ctx.fillRect(-9, -60, 18, 2); }

  // Front arm
  if (at > 0) {
    const ext = 16 + at * 30;
    limb(9, -68, 9 + ext, -66 - at * 3, 9, sleeve);
    disc(11 + ext, -66 - at * 3, 5.2, c.skin);
  } else {
    limb(11, -69, 14 + ph * 3, -44 + br, 9, sleeve);
    disc(14 + ph * 3, -41 + br, 4.6, c.skin);
  }

  // Neck
  ctx.fillStyle = shade(c.skin, -28); ctx.fillRect(-4, -82 + br, 8, 9);

  // Hair behind head (buns)
  if (c.hairStyle === 'bun_bindi' || c.hairStyle === 'bun_saree') disc(-12, -95 + br, 6, c.hairColor);

  // Head
  ctx.save();
  ctx.translate(0, br);
  const hg = ctx.createRadialGradient(4, -94, 2, 0, -90, 17);
  hg.addColorStop(0, shade(c.skin, 22)); hg.addColorStop(0.7, c.skin); hg.addColorStop(1, shade(c.skin, -38));
  ctx.fillStyle = hg; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -90, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // ear + nose
  ctx.fillStyle = shade(c.skin, -12);
  ctx.beginPath(); ctx.ellipse(-11, -89, 2.6, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -91); ctx.lineTo(14.5, -85); ctx.lineTo(10, -84); ctx.closePath(); ctx.fill(); ctx.stroke();

  const cap = (col: string) => {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12.6, -90); ctx.ellipse(0, -91, 12.8, 15, 0, Math.PI, TAU);
    ctx.lineTo(12.6, -92); ctx.quadraticCurveTo(2, -100, -12.6, -90); ctx.fill(); ctx.stroke();
  };
  const jaw = (col: string, depth: number) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-11, -88); ctx.quadraticCurveTo(-9, -76 + depth, 0, -75 + depth);
    ctx.quadraticCurveTo(9, -76 + depth, 11, -87); ctx.quadraticCurveTo(0, -83, -11, -88); ctx.fill();
  };

  const hs = c.hairStyle;
  if (hs === 'beard_glasses') { cap('#f4f4f4'); jaw('#f1f1f1', 0); }
  else if (hs === 'bald_beard') { jaw('rgba(225,225,225,0.9)', -4); ctx.fillStyle = '#cfd4d6'; ctx.fillRect(-12, -92, 3, 6); }
  else if (hs === 'wavy_stubble') {
    cap('#1f2528'); ctx.beginPath(); ctx.arc(-9, -102, 4, 0, TAU); ctx.arc(-2, -104, 4, 0, TAU); ctx.arc(6, -102, 4, 0, TAU); ctx.fill();
    jaw('rgba(70,74,78,0.55)', -4);
  } else if (hs === 'shaved_kundal') {
    ctx.fillStyle = 'rgba(40,30,25,0.28)'; ctx.beginPath(); ctx.ellipse(0, -93, 11.5, 11, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-1.2, -100, 2.4, 8); ctx.fillStyle = '#ffb300'; ctx.fillRect(-4.5, -99, 9, 1.6);
    disc(-12, -84, 2.4, '#ffd700');
  } else if (hs === 'parted_tilak') {
    cap('#8e9aa0'); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -104); ctx.lineTo(8, -95); ctx.stroke();
    ctx.fillStyle = '#d50000'; ctx.fillRect(-1, -98, 2.4, 6);
  } else if (hs === 'bun_bindi') { cap('#1a1a1a'); ctx.fillStyle = '#c8ccd0'; ctx.fillRect(-2, -104, 2, 9); disc(-11, -83, 1.8, '#ffd700'); }
  else if (hs === 'glasses_scarf') { cap('#f5f5f5'); }
  else if (hs === 'muffler_topi') {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12, -93); ctx.quadraticCurveTo(0, -112, 12, -93); ctx.lineTo(10, -90); ctx.lineTo(-10, -90); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0277bd'; ctx.fillRect(-10, -92, 20, 2); ctx.fillStyle = '#111'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('AAP', 0, -96);
  } else if (hs === 'bun_saree') { cap('#161616'); ctx.fillStyle = '#d9dde0'; ctx.fillRect(-4, -104, 2, 8); }

  // Face: brows, eyes, mouth
  ctx.strokeStyle = hs === 'beard_glasses' || hs === 'glasses_scarf' ? '#cfcfcf' : '#1a1410'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-4, -96); ctx.lineTo(1, -96.5); ctx.moveTo(4, -96.5); ctx.lineTo(9, -96); ctx.stroke();
  [[-1.5], [6.5]].forEach(([ex]) => {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(ex, -92, 2.6, 1.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a0f08'; ctx.beginPath(); ctx.arc(ex + 0.8, -92, 1.1, 0, TAU); ctx.fill();
  });
  if (c.id === 'rajnath' || c.id === 'kejriwal' || c.id === 'kharge') { ctx.fillStyle = c.id === 'kejriwal' ? '#111' : '#cfd4d6'; ctx.fillRect(0, -83.5, 10, 2.2); }
  ctx.strokeStyle = '#5a2a22'; ctx.lineWidth = 1.5; ctx.fillStyle = '#4a1612';
  if (at > 0) { ctx.beginPath(); ctx.ellipse(5, -80, 3.2, 2.6, 0, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(1, -80); ctx.quadraticCurveTo(5, -78.5, 9, -80.5); ctx.stroke(); }
  if (c.id === 'sitharaman' || hs === 'bun_bindi') disc(3.5, -98, 1.7, '#b71c1c');

  // Spectacles
  if (['beard_glasses', 'bald_beard', 'glasses_scarf', 'muffler_topi', 'bun_saree'].includes(hs)) {
    ctx.strokeStyle = hs === 'glasses_scarf' ? '#000' : '#2a2a2a'; ctx.lineWidth = hs === 'glasses_scarf' ? 2 : 1.3;
    ctx.fillStyle = 'rgba(180,215,235,0.25)';
    ctx.beginPath(); ctx.roundRect(-5.5, -95, 7.5, 6, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(3, -95, 7.5, 6, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -92.5); ctx.lineTo(3, -92.5); ctx.moveTo(-5.5, -92.5); ctx.lineTo(-11, -93); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/**
 * Render Power-Up Icon
 */
export function drawPowerUp(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, scale = 1.4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#090e0b';
  ctx.lineJoin = 'round';

  if (type === 'case') {
    // Leather Budget Briefcase with Gold Clasp
    ctx.fillStyle = '#795548';
    ctx.fillRect(-11, -7, 22, 15);
    ctx.strokeRect(-11, -7, 22, 15);
    ctx.beginPath();
    ctx.arc(0, -7, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-3, -2, 6, 5);
  } else if (type === 'cup') {
    // Terracotta Kullad Chai with Steaming Vapor
    ctx.fillStyle = '#d87a4c';
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(6, 8);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f4ecd6';
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.quadraticCurveTo(-6, -13, -2, -15);
    ctx.moveTo(3, -9);
    ctx.quadraticCurveTo(0, -13, 4, -15);
    ctx.stroke();
  } else if (type === 'gavel') {
    // Solid Constitution Gavel
    ctx.rotate(-0.6);
    ctx.fillStyle = '#a8743c';
    ctx.fillRect(-2, -4, 4, 16);
    ctx.strokeRect(-2, -4, 4, 16);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-9, -10, 18, 8);
    ctx.strokeRect(-9, -10, 18, 8);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-9, -8, 18, 2);
  } else if (type === 'mic') {
    // Parliamentary Microphone
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.arc(0, -5, 6, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-1.5, 0, 3, 11);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-5, 10, 10, 3);
  }
  ctx.restore();
}

/**
 * Render dynamic projectiles
 */
export function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const f = p.vx >= 0 ? 1 : -1;
  ctx.scale(f, 1);

  // The body is flipped so a left-flying projectile points left, but text must never be mirrored.
  // Flipping again (f * f = 1) puts the label back the right way round. Labels are centred on x = 0,
  // so the second flip does not move them.
  const label = (text: string, y: number, font: string, color: string) => {
    ctx.save();
    ctx.scale(f, 1);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, y);
    ctx.restore();
  };

  if (p.kind === 'wave') {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 1 - i * 0.3;
      ctx.beginPath();
      ctx.arc(-i * 14, 0, 18 + i * 7, -1, 1);
      ctx.stroke();
    }
  } else if (p.kind === 'gold_coin') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    label('24K', 3, 'bold 8px sans-serif', '#000000');
  } else if (p.kind === 'ball') {
    // Football
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fill();
  } else if (p.kind === 'flame') {
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(4, 0, 9, 0, TAU);
    ctx.fill();
  } else if (p.kind === 'missile') {
    ctx.fillStyle = '#78909c';
    ctx.fillRect(-4, -14, 8, 26);
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-4, 10, 8, 6);
  } else if (p.kind === 'bulldozer') {
    // Armored Yellow JCB Bulldozer
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(-85, -34, 170, 68);
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.strokeRect(-85, -34, 170, 68);

    // Tread wheels
    ctx.fillStyle = '#212121';
    ctx.fillRect(-75, 20, 150, 18);
    for (let w = 0; w < 5; w++) {
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.arc(-60 + w * 30, 29, 6, 0, TAU);
      ctx.fill();
    }

    // Heavy iron shovel blade
    ctx.fillStyle = '#424242';
    ctx.fillRect(80, -28, 22, 60);

    label('JCB BULLDOZER', 4, 'bold 15px sans-serif', '#000000');
  } else if (p.kind === 'train') {
    // Vande Bharat Express Bullet Train
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-135, -62, 270, 70);
    ctx.strokeStyle = '#15251c';
    ctx.lineWidth = 3;
    ctx.strokeRect(-135, -62, 270, 70);

    // Saffron tricolor racing stripe
    ctx.fillStyle = '#ff9933';
    ctx.fillRect(-135, -32, 270, 14);

    // Aerodynamic nose cone
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(135, -62);
    ctx.lineTo(170, -20);
    ctx.lineTo(135, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blue tinted panoramic windows
    ctx.fillStyle = '#4fc3f7';
    for (let w = 0; w < 5; w++) {
      ctx.fillRect(-120 + w * 46, -55, 32, 16);
    }

    label('VANDE BHARAT EXPRESS', -8, 'bold 15px sans-serif', '#0277bd');
  }

  ctx.restore();
}

/**
 * Fullscreen Cinematic Super Move Anime Cutscene
 */
/**
 * Set ctx.font to the largest size that fits, and return the text to draw (ellipsized only if even the
 * minimum size is too wide). Measured at runtime, because Georgia/sans widths differ between devices.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontAt: (px: number) => string,
  startPx: number,
  minPx: number
): string {
  const px = fitFontSize(
    p => {
      ctx.font = fontAt(p);
      return ctx.measureText(text).width;
    },
    maxWidth,
    startPx,
    minPx
  );
  ctx.font = fontAt(px);
  return ellipsize(t => ctx.measureText(t).width, text, maxWidth);
}

/** Text with a dark outline so it stays readable on any stripe colour (white outfits, saffron...). */
function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  outline = 'rgba(5, 12, 8, 0.92)',
  lineWidth = 4
) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawSuperCinematic(
  ctx: CanvasRenderingContext2D,
  combatant: Combatant,
  elapsed: number
) {
  const c = combatant.c;
  const alpha =
    Math.min(1, elapsed / 0.25) *
    (elapsed > CUTSCENE_FADE_AT ? Math.max(0, 1 - (elapsed - CUTSCENE_FADE_AT) / (CUTSCENE_END - CUTSCENE_FADE_AT)) : 1);

  ctx.save();
  // The top strip (names, health and meter bars, seats line, clock) stays undimmed and readable.
  ctx.beginPath();
  ctx.rect(0, CUTSCENE_HUD_STRIP, STAGE_WIDTH, STAGE_HEIGHT - CUTSCENE_HUD_STRIP);
  ctx.clip();
  // 1. Dark dramatic backdrop
  ctx.globalAlpha = 0.85 * alpha;
  ctx.fillStyle = '#030805';
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  ctx.globalAlpha = alpha;

  // 2. Diagonal Power Stripe in Politician's Attire Color
  ctx.fillStyle = c.col;
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(STAGE_WIDTH, 40);
  ctx.lineTo(STAGE_WIDTH, 360);
  ctx.lineTo(0, 410);
  ctx.closePath();
  ctx.fill();

  // 3. Radiant Energy Speedlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 32; i++) {
    const angle = (i * TAU) / 32;
    const r1 = 140 + ((i * 47 + (prefersReducedMotion() ? 0 : elapsed * 900)) % 320);
    const r2 = r1 + 120;
    ctx.beginPath();
    ctx.moveTo(STAGE_WIDTH / 2 + Math.cos(angle) * r1 * 1.8, STAGE_HEIGHT / 2 + Math.sin(angle) * r1);
    ctx.lineTo(STAGE_WIDTH / 2 + Math.cos(angle) * r2 * 1.8, STAGE_HEIGHT / 2 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // 4. Large caricature portrait slide-in. Sized so the head starts just under the undimmed HUD strip
  // (the figure is about 108 px tall per 1.0 of scale; at 3.4 with the feet at 442 the head top is ~y 75).
  const slideIn = portraitSlideOffset(elapsed, prefersReducedMotion());
  drawPolitician(ctx, c, 210 + slideIn, 442, 1, {
    scale: 3.4,
    time: elapsed,
    attackProg: 1.0,
    attackPhase: Math.min(1, elapsed / CUTSCENE_END),
    attackType: 'super',
    isSuper: true,
    superPhase: Math.min(1, elapsed / CUTSCENE_END),
    superType: c.superType
  });

  // 5. Super Move Title Banner
  // The text must fit the space right of the portrait at its FINAL position (the slide-in only moves it).
  const TITLE_LEFT = 360;
  const titleMaxWidth = STAGE_WIDTH - TITLE_LEFT - 16;
  const titleX = TITLE_LEFT + (1 - Math.min(1, elapsed / 0.4)) * 500;
  ctx.textAlign = 'left';

  const titleText = fitText(
    ctx,
    c.superName.toUpperCase(),
    titleMaxWidth,
    px => `italic 900 ${px}px Georgia, serif`,
    38,
    24
  );
  outlinedText(ctx, titleText, titleX, 155, '#ffd700', '#050c08', 6);

  // Two short lines instead of one long one: the kicker, then the role (shrunk to fit, never clipped).
  ctx.font = '800 12px sans-serif';
  outlinedText(ctx, 'PARLIAMENTARY SUPER MOVE', titleX, 80, '#ffffff');
  const roleText = fitText(ctx, c.title.toUpperCase(), titleMaxWidth, px => `800 ${px}px sans-serif`, 16, 11);
  outlinedText(ctx, roleText, titleX, 101, '#ffffff');

  // 6. Meme Dialogue Typewriter Box
  // Wrap the FULL quote once (by real pixel width) and size the box once; typing only reveals characters.
  const QUOTE_FONT = (px: number) =>
    `italic 700 ${px}px Georgia, 'Noto Serif Devanagari', 'Nirmala UI', 'Kohinoor Devanagari', serif`;
  const QUOTE_INNER_WIDTH = 392; // box is 420 wide with 14 px padding
  let quotePx = 16;
  let lines: string[] = [];
  for (; quotePx >= 13; quotePx--) {
    ctx.font = QUOTE_FONT(quotePx);
    lines = wrapText(t => ctx.measureText(t).width, c.memeDialogue, QUOTE_INNER_WIDTH);
    if (lines.length <= 5) break; // keep the box on the stage
  }
  const lineHeight = (quotePx * 26) / 16;
  const boxHeight = 30 + lines.length * lineHeight;
  const visibleLines = revealLines(lines, Math.floor(elapsed * QUOTE_CHARS_PER_SECOND));

  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = '#08120d';
  ctx.fillRect(350, 210, 420, boxHeight);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(350, 210, 420, boxHeight);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5eedb';
  ctx.font = QUOTE_FONT(quotePx);
  visibleLines.forEach((line, idx) => {
    ctx.fillText(line, 364, 238 + idx * lineHeight);
  });

  // Skip hint, once skipping is possible and until the scene starts to fade.
  if (elapsed >= CUTSCENE_SKIP_AFTER && elapsed < CUTSCENE_FADE_AT) {
    ctx.globalAlpha = 0.75 * alpha;
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'right';
    outlinedText(ctx, 'TAP OR PRESS ANY KEY TO SKIP', STAGE_WIDTH - 14, STAGE_HEIGHT - 12, '#f5eedb');
  }

  ctx.restore();
}
