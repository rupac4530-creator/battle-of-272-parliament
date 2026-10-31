/**
 * Realistic 2.5D Canvas2D Renderer for The Parliament House
 */

import { Politician, Combatant, Projectile, Particle, FloatingText, PowerUp } from './types';

const TAU = Math.PI * 2;
export const STAGE_WIDTH = 800;
export const STAGE_HEIGHT = 450;
export const FLOOR_Y = 372;

// Cached Background Canvas
let cachedBackground: HTMLCanvasElement | null = null;

export function getChamberBackground(): HTMLCanvasElement {
  if (cachedBackground) return cachedBackground;

  const bg = document.createElement('canvas');
  bg.width = STAGE_WIDTH;
  bg.height = STAGE_HEIGHT;
  const ctx = bg.getContext('2d');
  if (!ctx) return bg;

  // 1. Vaulted High Ceiling with Rich Teakwood & Architectural Shadow
  const wallGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  wallGrad.addColorStop(0, '#091510');
  wallGrad.addColorStop(0.5, '#050c09');
  wallGrad.addColorStop(1, '#020604');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  // 2. Carved Teakwood Grand Columns & Arches with Gold Accents
  for (let i = 0; i < 7; i++) {
    const px = 18 + i * 128;
    // Pillar shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px - 4, 20, 32, FLOOR_Y - 20);

    // Pillar body
    const colGrad = ctx.createLinearGradient(px, 0, px + 24, 0);
    colGrad.addColorStop(0, '#3e2723');
    colGrad.addColorStop(0.5, '#5d4037');
    colGrad.addColorStop(1, '#2d1b18');
    ctx.fillStyle = colGrad;
    ctx.fillRect(px, 25, 24, FLOOR_Y - 25);

    // Gold capitals and bases
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(px - 3, 25, 30, 8);
    ctx.fillRect(px - 3, FLOOR_Y - 8, 30, 8);

    // Arch connecting pillars
    if (i < 6) {
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px + 64, 45, 52, Math.PI, 0);
      ctx.stroke();
    }
  }

  // 3. Central Gilded Ashok Chakra Mural
  ctx.save();
  ctx.translate(400, 78);
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

  // Lion capital emblem plaque
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(400, FLOOR_Y - podH + 24, 12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2d1b18';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('272', 400, FLOOR_Y - podH + 27);

  cachedBackground = bg;
  return bg;
}

/**
 * Detailed 2.5D Articulated Politician Renderer
 */
export function drawPolitician(
  ctx: CanvasRenderingContext2D,
  c: Politician,
  x: number,
  y: number,
  facing: number,
  options: {
    scale?: number;
    time?: number;
    isWalking?: boolean;
    attackProg?: number;
  } = {}
) {
  const s = options.scale || 1.0;
  const t = options.time || 0;
  const walkBob = options.isWalking ? Math.sin(t * 14) * 7 : 0;
  const at = options.attackProg || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#090e0b';
  ctx.lineJoin = 'round';

  const fillStrokeRect = (rx: number, ry: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
  };

  // 1. Legs and Formal Footwear
  fillStrokeRect(-10 + walkBob * 0.5, -34, 9, 34, c.pants);
  fillStrokeRect(1 - walkBob * 0.5, -34, 9, 34, c.pants);

  // Shoes / Chappals
  if (c.id === 'mamata') {
    // White & Cyan Blue Rubber Hawai Chappal
    ctx.fillStyle = '#0288d1';
    ctx.fillRect(-12 + walkBob * 0.5, -6, 13, 7);
    ctx.fillRect(-1 - walkBob * 0.5, -6, 13, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10 + walkBob * 0.5, -7, 3, 4);
    ctx.fillRect(1 - walkBob * 0.5, -7, 3, 4);
  } else {
    // Polished Black Formal Oxford Shoes
    ctx.fillStyle = '#151515';
    ctx.fillRect(-12 + walkBob * 0.5, -6, 13, 7);
    ctx.fillRect(-1 - walkBob * 0.5, -6, 13, 7);
    ctx.fillStyle = '#333333';
    ctx.fillRect(-12 + walkBob * 0.5, -6, 13, 2);
    ctx.fillRect(-1 - walkBob * 0.5, -6, 13, 2);
  }

  // 2. Torso & Specific Authentic Clothing
  fillStrokeRect(-14, -72, 28, 40, c.col);

  // Attire Overlays
  if (c.accessory === 'modi_jacket') {
    // Saffron Modi Jacket with Folded Collar, Buttons & Gold Lotus
    ctx.fillStyle = '#ff9933';
    ctx.fillRect(-13, -71, 26, 38);
    ctx.strokeStyle = '#c65100';
    ctx.strokeRect(-13, -71, 26, 38);
    // Button Line
    ctx.fillStyle = '#e65100';
    ctx.fillRect(-1, -68, 2, 34);
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -66 + b * 7, 1.4, 0, TAU);
      ctx.fill();
    }
    // Gilded Lotus Pin on Lapel
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(6, -62, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (c.accessory === 'saree_zari') {
    // Deep Crimson Silk Saree with Gold Zari Border Drape
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(-14, -72);
    ctx.lineTo(14, -42);
    ctx.lineTo(-14, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Shimmering Golden Zari Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -72);
    ctx.lineTo(14, -42);
    ctx.stroke();
  } else if (c.accessory === 'tant_blue_border') {
    // White Tant Saree with striking Blue Border
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-14, -72);
    ctx.lineTo(14, -40);
    ctx.stroke();
  } else if (c.accessory === 'muffler') {
    // Thick Maroon Woolen Muffler wrapped snugly
    ctx.fillStyle = '#880e4f';
    ctx.fillRect(-13, -74, 26, 9);
    ctx.fillRect(3, -70, 7, 22);
    ctx.strokeStyle = '#4a0026';
    ctx.strokeRect(-13, -74, 26, 9);
  } else if (c.accessory === 'angavastram') {
    // Congress Tricolor / Saffron Angavastram Stole
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 3;
    ctx.strokeRect(-11, -71, 22, 36);
  } else if (c.accessory === 'mala') {
    // Dark Brown Rudraksha Mala
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -66, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    for (let m = 0; m < 5; m++) {
      const a = 0.4 + m * 0.55;
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 8, -66 + Math.sin(a) * 8, 1.8, 0, TAU);
      ctx.fill();
    }
  } else if (c.accessory === 'bandhgala') {
    // Dark Bandhgala Vest with Gilded Buttons & Pocket Square
    ctx.fillStyle = '#1b3b22';
    ctx.fillRect(-12, -70, 24, 36);
    ctx.fillStyle = '#ffd700';
    for (let b = 0; b < 4; b++) {
      ctx.fillRect(-1, -66 + b * 8, 2, 3);
    }
    // Tricolor pocket square
    ctx.fillStyle = '#ff9933';
    ctx.fillRect(5, -66, 4, 3);
    ctx.fillStyle = '#138808';
    ctx.fillRect(5, -63, 4, 3);
  }

  // 3. Arms & Punch/Strike Animation
  if (at > 0) {
    const ext = 14 + at * 30;
    fillStrokeRect(6, -67, ext, 9, c.col);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(8 + ext, -62, 6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    fillStrokeRect(7, -68, 9, 26, c.col);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(11, -40, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // 4. Head, Complexion & Expressions
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(0, -86, 13, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Distinct Facial Features & Hair
  ctx.fillStyle = c.hairColor;
  if (c.hairStyle === 'beard_glasses' || c.hairStyle === 'bald_beard') {
    // White/Grey beard & mustache
    ctx.beginPath();
    ctx.arc(0, -84, 13, 0.2, Math.PI - 0.2);
    ctx.fill();
    if (c.hairStyle === 'beard_glasses') {
      ctx.beginPath();
      ctx.arc(0, -88, 14, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
      ctx.stroke();
    }
    // Rimless / Metal Spectacles
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-7, -89, 6, 4.5);
    ctx.strokeRect(1, -89, 6, 4.5);
    ctx.beginPath();
    ctx.moveTo(-1, -87);
    ctx.lineTo(1, -87);
    ctx.stroke();
  } else if (c.hairStyle === 'wavy_stubble') {
    // Wavy Dark Hair & Stubble
    ctx.beginPath();
    ctx.arc(0, -88, 14, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 65, 70, 0.55)';
    ctx.beginPath();
    ctx.arc(0, -83, 11, 0.2, Math.PI - 0.2);
    ctx.fill();
  } else if (c.hairStyle === 'shaved_kundal') {
    // Shaved head with Red Tilak & Golden Kundals
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-1, -94, 2.5, 6);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(-13, -86, 2.5, 0, TAU);
    ctx.arc(13, -86, 2.5, 0, TAU);
    ctx.fill();
  } else if (c.hairStyle === 'parted_tilak') {
    // Grey Parted Hair with Tilak
    ctx.beginPath();
    ctx.arc(0, -88, 14, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d50000';
    ctx.fillRect(-1.2, -93, 2.5, 5);
  } else if (c.hairStyle === 'bun_bindi') {
    // Silver-streaked low bun & red bindi
    ctx.beginPath();
    ctx.arc(0, -88, 14, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10, -96, 6, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.arc(0, -88, 2, 0, TAU);
    ctx.fill();
  } else if (c.hairStyle === 'glasses_scarf') {
    // White side hair & large spectacles
    ctx.fillRect(-12, -90, 4, 7);
    ctx.fillRect(8, -90, 4, 7);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -89, 6.5, 4.5);
    ctx.strokeRect(1.5, -89, 6.5, 4.5);
  } else if (c.hairStyle === 'muffler_topi') {
    // White AAP Gandhi Topi with lettering
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-13, -90);
    ctx.lineTo(0, -100);
    ctx.lineTo(13, -90);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AAP', 0, -91);
    // Mustache & Spectacles
    ctx.fillStyle = '#111111';
    ctx.fillRect(-5, -83, 10, 2.5);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-7, -89, 6, 4);
    ctx.strokeRect(1, -89, 6, 4);
  } else if (c.hairStyle === 'bun_saree') {
    // Low hair bun & spectacles
    ctx.beginPath();
    ctx.arc(0, -88, 14, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-11, -85, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-7, -88, 6, 4);
    ctx.strokeRect(1, -88, 6, 4);
  }

  // Eyes
  ctx.fillStyle = '#111111';
  ctx.fillRect(3, -89, 3, 3);
  ctx.fillRect(-6, -89, 3, 3);

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
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('24K', 0, 3);
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

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JCB BULLDOZER 🚜', 0, 4);
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

    ctx.fillStyle = '#0277bd';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VANDE BHARAT EXPRESS 🚆', 0, -8);
  }

  ctx.restore();
}

/**
 * Fullscreen Cinematic Super Move Anime Cutscene
 */
export function drawSuperCinematic(
  ctx: CanvasRenderingContext2D,
  combatant: Combatant,
  elapsed: number
) {
  const c = combatant.c;
  const alpha = Math.min(1, elapsed / 0.25) * (elapsed > 2.0 ? Math.max(0, 1 - (elapsed - 2.0) / 0.3) : 1);

  ctx.save();
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
    const r1 = 140 + ((i * 47 + elapsed * 900) % 320);
    const r2 = r1 + 120;
    ctx.beginPath();
    ctx.moveTo(STAGE_WIDTH / 2 + Math.cos(angle) * r1 * 1.8, STAGE_HEIGHT / 2 + Math.sin(angle) * r1);
    ctx.lineTo(STAGE_WIDTH / 2 + Math.cos(angle) * r2 * 1.8, STAGE_HEIGHT / 2 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // 4. Large 3.5x Caricature Portrait Slide-In
  const slideIn = Math.pow(1 - Math.min(1, elapsed / 0.35), 2) * -420;
  drawPolitician(ctx, c, 210 + slideIn, 435, 1, {
    scale: 3.6,
    time: elapsed,
    attackProg: elapsed > 0.5 ? Math.abs(Math.sin(elapsed * 5)) : 0
  });

  // 5. Super Move Title Banner
  const titleX = 360 + (1 - Math.min(1, elapsed / 0.4)) * 500;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#050c08';
  ctx.lineWidth = 6;
  ctx.font = 'italic 900 38px Georgia, serif';
  ctx.strokeText(c.superName.toUpperCase(), titleX, 155);
  ctx.fillText(c.superName.toUpperCase(), titleX, 155);

  ctx.font = '800 14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`⚡ PARLIAMENTARY SUPER MOVE • ${c.title.toUpperCase()}`, titleX, 98);

  // 6. Meme Dialogue Typewriter Box
  const fullQuote = c.memeDialogue;
  const charCount = Math.floor(elapsed * 32);
  const displayedQuote = fullQuote.slice(0, charCount);

  // Auto-wrap quote
  const words = displayedQuote.split(' ');
  const lines: string[] = [''];
  words.forEach(w => {
    if ((lines[lines.length - 1] + w).length > 34) {
      lines.push('');
    }
    lines[lines.length - 1] += w + ' ';
  });

  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = '#08120d';
  ctx.fillRect(350, 210, 420, 30 + lines.length * 26);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(350, 210, 420, 30 + lines.length * 26);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5eedb';
  ctx.font = 'italic 700 16px Georgia, serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 364, 238 + idx * 26);
  });

  ctx.restore();
}
