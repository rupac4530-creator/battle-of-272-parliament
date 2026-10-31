export interface Politician {
  id: string;
  name: string;
  nameHi: string;
  title: string;
  role: string;
  state: string;
  pos: [number, number]; // [xPercent, yPercent] on map
  col: string; // Attire primary color
  colSecondary: string; // Attire secondary color
  pants: string;
  skin: string;
  hairColor: string;
  hairStyle: string;
  accessory: string;
  specialName: string;
  superName: string;
  superType: 'train' | 'chain' | 'aloo_gold' | 'bulldozer' | 'rafale' | 'gst_blocks' | 'veto' | 'dharna' | 'khela_volley';
  specialType: 'proj' | 'grab' | 'heal_aura' | 'burn' | 'confuse' | 'drain' | 'counter' | 'pull' | 'combo';
  memeDialogue: string;
  speechText: string;
  voicePitch: number;
  voiceRate: number;
  pickupLine: string;
  description: string;
  stats: {
    power: number;
    speed: number;
    defense: number;
  };
}

export interface Combatant {
  c: Politician;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // 1 = right, -1 = left
  hp: number;
  meter: number;
  seats: number;
  cdSpecial: number;
  stun: number;
  atk: number;
  freeze: number;
  invincible: number;
  damageBoost: number;
  confused: number;
  counter: number;
  comboTimer: number;
  comboCount: number;
  burstCount: number;
  burstTimer: number;
  whip: number;
  surge: number;
  blast: number;
  chain: number;
  rain: number;
  rainTimer: number;
  isAI: boolean;
  thought: string;
  blocking: boolean;
  input: {
    left: number;
    right: number;
    jump: number;
    block: number;
    strike: number;
    special: number;
    superMove: number;
    pickupLine: number;
  };
}

export type PowerUpType = 'case' | 'cup' | 'gavel' | 'mic';

export interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  lifetime: number;
  collected?: boolean;
}

export interface Projectile {
  id: number;
  kind: 'wave' | 'flame' | 'missile' | 'bulldozer' | 'train' | 'gold_coin' | 'ball' | 'coin';
  x: number;
  y: number;
  vx: number;
  vy?: number;
  dmg: number;
  owner: Combatant;
  lifetime: number;
  width?: number;
  bounceCount?: number;
  hitOnce?: boolean;
  hasHit?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface AIDecision {
  best: string;
  why: string;
  expectedValues: [string, number][];
  distance: number;
  aiStats: { hp: number; meter: number; seats: number };
  targetStats: { hp: number; blocking: boolean; attacking: boolean };
  utilityMap: Record<string, number>;
}

export interface GameEnding {
  winner: Combatant;
  reason: string;
  title: string;
  narrative: string;
  code: number;
}
