import { Politician, Combatant, AIDecision, GameEnding, PowerUp } from './types';
import { VOICE, VOICE_LUFS, SUPER_RANGE, BLOCK_DAMAGE_MULT, MOVE, INPUT_BUFFER_SECONDS, BODY, HIT_FEEL, CUTSCENE_SKIP_AFTER, CUTSCENE_FADE_AT, RENDER, HUD_TEXT, GHOST_BAR, CLOCK, FLOAT_TEXT, ARENA_ART, GAME_OVER, PAD, PHONE_HUD, MAP_PINS, MAP_TEXT, STRIKE_DAMAGE, PICKUP_LINE, INVINCIBLE_LOOK } from './balance';
import { wrapText } from './textFit';
import { primaryLabel } from './controls';

export const POLITICIANS: Politician[] = [
  {
    id: 'modi',
    name: 'Narendra Modi',
    nameHi: 'नरेन्द्र मोदी',
    title: 'The Prime Minister',
    role: 'Heavy Momentum & Guard Crusher',
    state: 'Gujarat / Delhi (National)',
    pos: [38, 28],
    col: '#ff9933',
    colSecondary: '#e65100',
    pants: '#f8f4e6',
    skin: '#e0ac69',
    hairColor: '#f5f5f5',
    hairStyle: 'beard_glasses',
    accessory: 'modi_jacket',
    specialName: 'Mitron Shockwave',
    superName: 'Vande Bharat Express',
    superType: 'train',
    specialType: 'proj',
    memeDialogue: 'अङ्गेन गात्रं नयनेन वक्त्रं न्यायेन राज्यं लवणेन भोज्यम्…',
    speechText: 'अङ्गेन गात्रं नयनेन वक्त्रं न्यायेन राज्यं लवणेन भोज्यम्!',
    pickupLine: 'Mitron! Are you a development bill? Because I pass you unanimously!',
    description: 'Impeccable white beard, rimless spectacles, silk kurta with iconic saffron Modi jacket & gold lotus badge.'
  },
  {
    id: 'shah',
    name: 'Amit Shah',
    nameHi: 'अमित शाह',
    title: 'The Home Minister',
    role: 'Tactical Trapper & Meter Stealer',
    state: 'Gujarat / Delhi (Home)',
    pos: [21, 46],
    col: '#263238',
    colSecondary: '#37474f',
    pants: '#f8f4e6',
    skin: '#e5b887',
    hairColor: '#f0f0f0',
    hairStyle: 'bald_beard',
    accessory: 'waistcoat',
    specialName: 'Operation Lotus',
    superName: 'Chanakya Lockdown',
    superType: 'chain',
    specialType: 'grab',
    memeDialogue: 'अरे भाई बैठो ना! शांति से बैठो!',
    speechText: 'अरे भाई बैठो ना! शांति से बैठो!',
    pickupLine: 'Aap chronology samajhiye—first we meet, then we form an eternal coalition!',
    description: 'Crisp bald crown with salt-and-pepper side trim, dense beard, glasses, white khadi kurta and dark formal vest.'
  },
  {
    id: 'rahul',
    name: 'Rahul Gandhi',
    nameHi: 'राहुल गांधी',
    title: 'Leader of Opposition',
    role: 'High-Stamina Sprinter & Crossup',
    state: 'Rae Bareli / Wayanad',
    pos: [44, 38],
    col: '#ffffff',
    colSecondary: '#00b4d8',
    pants: '#1e293b',
    skin: '#ebbfa0',
    hairColor: '#2c3539',
    hairStyle: 'wavy_stubble',
    accessory: 'tshirt',
    specialName: 'Mohabbat Ki Dukaan',
    superName: 'Aloo-Sona Gold Cannon',
    superType: 'aloo_gold',
    specialType: 'heal_aura',
    memeDialogue: 'इस साइड से आलू डालो, उस साइड से सोना निकलेगा! (Is side se aloo dalo, us side se sona nikale ga!)',
    speechText: 'इस साइड से आलू डालो, उस साइड से सोना निकलेगा!',
    pickupLine: 'Forget hatred, I opened a Mohabbat Ki Dukaan just for you!',
    description: 'Wavy dark hair, salt-and-pepper athletic stubble, iconic White Bharat Jodo Polo T-shirt and denim trousers.'
  },
  {
    id: 'yogi',
    name: 'Yogi Adityanath',
    nameHi: 'योगी आदित्यनाथ',
    title: 'Chief Minister UP',
    role: 'Super-Armor Brawler & Ground Pounder',
    state: 'Uttar Pradesh',
    pos: [49, 32],
    col: '#ff6d00',
    colSecondary: '#d32f2f',
    pants: '#ff6d00',
    skin: '#dfa672',
    hairColor: '#ff6d00',
    hairStyle: 'shaved_kundal',
    accessory: 'mala',
    specialName: 'Saffron Blast',
    superName: 'Bulldozer Cleave',
    superType: 'bulldozer',
    specialType: 'burn',
    memeDialogue: 'टोंटीचोर टोंटी चोरी करते रहेंगे, तो क्षति तो गाँव की होनी...',
    speechText: 'टोंटीचोर टोंटी चोरी करते रहेंगे, तो क्षति तो गाँव की होनी!',
    pickupLine: 'Even my bulldozer stops in its tracks when you enter the House!',
    description: 'Shaved head with red chandan tilak, saffron monk robes, dark brown rudraksha mala and gold ear kundals.'
  },
  {
    id: 'rajnath',
    name: 'Rajnath Singh',
    nameHi: 'राजनाथ सिंह',
    title: 'The Defence Minister',
    role: 'Long-Range Zoner & Air Controller',
    state: 'Lucknow / UP (Defence)',
    pos: [40, 24],
    col: '#1b5e20',
    colSecondary: '#ffd700',
    pants: '#ffffff',
    skin: '#e0ab76',
    hairColor: '#37474f',
    hairStyle: 'parted_tilak',
    accessory: 'bandhgala',
    specialName: 'Kadi Ninda Stun',
    superName: 'Moye-Moye Rafale Strike',
    superType: 'rafale',
    specialType: 'confuse',
    memeDialogue: 'Iss desh ki janata iska bhi moye moye kar degi!',
    speechText: 'इस देश की जनता इसका भी मोये-मोये कर देगी!',
    pickupLine: 'I refuse to do Kadi Ninda when your smile disarms all my radar shields!',
    description: 'Side-parted grey hair, crimson tilak, crisp white kurta with dark olive-navy bandhgala vest and tricolor pocket square.'
  },
  {
    id: 'sitharaman',
    name: 'Nirmala Sitharaman',
    nameHi: 'निर्मला सीतारमण',
    title: 'The Finance Minister',
    role: 'Stamina Drainer & Fiscal Siphoner',
    state: 'Tamil Nadu / Karnataka (Finance)',
    pos: [40, 78],
    col: '#b71c1c',
    colSecondary: '#ffd700',
    pants: '#b71c1c',
    skin: '#d4996a',
    hairColor: '#1c1c1c',
    hairStyle: 'bun_bindi',
    accessory: 'saree_zari',
    specialName: 'GST Siphon',
    superName: 'Budget Deficit Stamp',
    superType: 'gst_blocks',
    specialType: 'drain',
    memeDialogue: 'I too belong to the middle class so I can understand the pressures of the middle class!',
    speechText: 'I too belong to the middle class so I can understand the pressures of the middle class!',
    pickupLine: 'You are the only special exemption in my Union Budget with zero percent GST!',
    description: 'Rich maroon Sambalpuri/Kanjeevaram silk saree with gilded zari border, red round bindi, silver-streaked low bun, and red Bahi-Khata ledger.'
  },
  {
    id: 'kharge',
    name: 'Mallikarjun Kharge',
    nameHi: 'मल्लिकार्जुन खड़गे',
    title: 'Opposition Leader (RS)',
    role: 'Gavel Counter & Cooldown Silencer',
    state: 'Karnataka (Opposition)',
    pos: [32, 65],
    col: '#ffffff',
    colSecondary: '#ff9933',
    pants: '#ffffff',
    skin: '#b87d52',
    hairColor: '#ffffff',
    hairStyle: 'glasses_scarf',
    accessory: 'angavastram',
    specialName: 'Point of Order Gavel',
    superName: 'Veto of Elders',
    superType: 'veto',
    specialType: 'counter',
    memeDialogue: 'Modi ka baap bhi jayega!',
    speechText: 'मोदी का बाप भी जाएगा!',
    pickupLine: 'Forget Rule 267—I move to suspend all parliamentary business just to listen to you!',
    description: 'Prominent dark frame spectacles, snow white hair, spotless white khadi kurta, Congress tricolor angavastram stole, and giant mahogany gavel.'
  },
  {
    id: 'kejriwal',
    name: 'Arvind Kejriwal',
    nameHi: 'अरविंद केजरीवाल',
    title: 'AAP Convener',
    role: 'Agile Trickster & Dharna Bubble',
    state: 'New Delhi (Assembly)',
    pos: [27, 20],
    col: '#0277bd',
    colSecondary: '#880e4f',
    pants: '#1e293b',
    skin: '#d89e6c',
    hairColor: '#111111',
    hairStyle: 'muffler_topi',
    accessory: 'muffler',
    specialName: 'Muffler Hook',
    superName: 'Dharna Electric Vortex',
    superType: 'dharna',
    specialType: 'pull',
    memeDialogue: 'वो एलजी कहता है कि तुम नहीं कर सकते, मैं करूँगा। तो कर ना… परेशान हो गए हम लोग ढाई साल से!',
    speechText: 'तो कर ना, परेशान हो गए हम लोग ढाई साल से!',
    pickupLine: '200 units of electricity are totally free, and my vote for you is 100% unconditional!',
    description: 'Iconic white AAP Gandhi cap with lettering, thick maroon woolen muffler wrapped around ears/neck, navy sweater, and golden broom (jhadu).'
  },
  {
    id: 'mamata',
    name: 'Mamata Banerjee',
    nameHi: 'ममता बनर्जी',
    title: 'Chief Minister WB',
    role: 'High-Speed Combo Sprinter',
    state: 'West Bengal',
    pos: [60, 44],
    col: '#ffffff',
    colSecondary: '#0288d1',
    pants: '#ffffff',
    skin: '#dfb185',
    hairColor: '#1a1a1a',
    hairStyle: 'bun_saree',
    accessory: 'tant_blue_border',
    specialName: 'Hawai Chappal Flurry',
    superName: 'Khela Hobe Volley',
    superType: 'khela_volley',
    specialType: 'combo',
    memeDialogue: 'हुम्बा-हुम्बा, रम्बा-रम्बा, डम्बा-डम्बा!',
    speechText: 'हुम्बा हुम्बा रम्बा रम्बा डम्बा डम्बा!',
    pickupLine: 'Khela Hobe! Pass the football to Didi and we will win the parliamentary cup together!',
    description: 'Crisp white Dhaniakhali Tant cotton saree with striking blue border, neat low bun, spectacles, white-and-blue rubber Hawai chappals, and football.'
  }
];

export const SHOUTS: Record<string, string> = {
  modi: 'MITRON!',
  shah: 'ARRE BHAI, BAITHO!',
  rahul: 'ALOO DALO, SONA NIKALO!',
  yogi: 'BULLDOZER ON!',
  rajnath: 'MOYE MOYE!',
  sitharaman: 'MIDDLE CLASS ALERT!',
  kharge: 'POINT OF ORDER!',
  kejriwal: 'TO KAR NA!',
  mamata: 'KHELA HOBE!'
};

export const SPEED_FACTORS: Record<string, number> = {
  proj: 0.95,
  grab: 0.95,
  heal_aura: 1.15,
  burn: 0.90,
  confuse: 0.95,
  drain: 0.96,
  counter: 0.90,
  pull: 1.18,
  combo: 1.25
};

export const POWERUP_NAMES: Record<string, string> = {
  case: 'Budget Briefcase: +50 Meter & Cooldown Reset',
  cup: 'Kullad Chai: Heals +30 HP Instantly',
  gavel: 'Constitution Gavel: 8s of 1.5x Strike Damage',
  mic: 'Speaker Megaphone: Radial Soundwave Knockback'
};

export function createCombatant(c: Politician, x: number, isAI: boolean): Combatant {
  return {
    c,
    x,
    y: 372,
    vx: 0,
    vy: 0,
    facing: x < 400 ? 1 : -1,
    hp: 100,
    meter: 0,
    seats: 120,
    cdSpecial: 0,
    lineCd: 0,
    lineUses: 0,
    stun: 0,
    atk: 0,
    freeze: 0,
    invincible: 0,
    damageBoost: 0,
    confused: 0,
    counter: 0,
    comboTimer: 0,
    comboCount: 0,
    burstCount: 0,
    burstTimer: 0,
    whip: 0,
    hookPending: false,
    surge: 0,
    blast: 0,
    chain: 0,
    rain: 0,
    rainTimer: 0,
    isAI,
    thought: '',
    blocking: false,
    buffer: null,
    input: {
      left: 0,
      right: 0,
      jump: 0,
      block: 0,
      strike: 0,
      special: 0,
      superMove: 0,
      pickupLine: 0,
      kick: 0
    }
  };
}

/**
 * Picks which strike animation/damage profile a standard strike uses.
 * `wantKick` is a one-shot flag (U/I key or kick button), never stored on the fighter,
 * so one kick press gives exactly one kick and later strikes return to punch/cross.
 */
export function pickStrikeType(opts: {
  airborne: boolean;
  forward: boolean;
  wantKick: boolean;
  comboCount: number;
}): 'punch' | 'cross' | 'kick' | 'dropkick' {
  if (opts.wantKick) return 'kick';
  if (opts.airborne) return 'dropkick';
  if (opts.forward || opts.comboCount % 3 === 2) return 'kick';
  return opts.comboCount % 2 === 1 ? 'cross' : 'punch';
}

/**
 * Pure calculation of damage and consequences
 */
export function calculateHitDamage(
  attackerDamageBoost: number,
  isTargetBlocking: boolean,
  baseDamage: number
): { finalDamage: number; knockbackMultiplier: number } {
  let dmg = baseDamage * (attackerDamageBoost > 0 ? 1.5 : 1.0);
  let kb = 1.0;

  if (isTargetBlocking) {
    dmg *= BLOCK_DAMAGE_MULT;
    kb = 0.3;
  }

  return { finalDamage: Math.round(dmg * 10) / 10, knockbackMultiplier: kb };
}

/** True when the fighter's super can reach the target (most supers have no range limit). */
export function superInRange(a: Combatant, b: Combatant): boolean {
  const range = SUPER_RANGE[a.c.superType];
  return range === undefined || Math.abs(a.x - b.x) <= range;
}

const PODIUM_X = 400;

/**
 * Tie-break used by double knockouts and timeouts: more seats, then the fighter closer to the
 * Speaker's podium. A full tie (same seats and same distance) goes to Player 1.
 */
function breakTieBySeatsThenPodium(p1: Combatant, p2: Combatant): Combatant {
  if (p1.seats !== p2.seats) return p1.seats > p2.seats ? p1 : p2;
  const d1 = Math.abs(p1.x - PODIUM_X);
  const d2 = Math.abs(p2.x - PODIUM_X);
  if (d1 !== d2) return d1 < d2 ? p1 : p2;
  return p1;
}

function knockoutEnding(winner: Combatant, loser: Combatant, code: number): GameEnding {
  return {
    winner,
    reason: 'Floor Knockout in the Lok Sabha Well',
    code,
    title: 'GOVERNMENT COLLAPSE BY KNOCKOUT',
    narrative: `${loser.c.name} collapses on the floor of the Lok Sabha! ${winner.c.name} marches to Rashtrapati Bhavan to stake claim to form the new union cabinet.`
  };
}

/**
 * Check if the game has ended and determine victory reason
 */
export function checkVictoryCondition(
  p1: Combatant,
  p2: Combatant,
  remainingTime: number
): GameEnding | null {
  // Knockouts. A double KO goes to the higher seat count (then podium distance), not always to P2.
  if (p1.hp <= 0 && p2.hp <= 0) {
    const winner = breakTieBySeatsThenPodium(p1, p2);
    return winner === p1 ? knockoutEnding(p1, p2, 1) : knockoutEnding(p2, p1, 2);
  }
  if (p1.hp <= 0) return knockoutEnding(p2, p1, 2);
  if (p2.hp <= 0) return knockoutEnding(p1, p2, 1);

  const seatsNarrative = (w: Combatant) =>
    `By commanding the central Speaker's podium, ${w.c.name} crossed the magic 272 seat threshold! A stable full-term government is officially sworn in.`;

  if (p1.seats >= 272 && p2.seats >= 272) {
    const winner = breakTieBySeatsThenPodium(p1, p2);
    return {
      winner,
      reason: 'Reached 272 Constitutional Majority Seats',
      code: winner === p1 ? 1 : 2,
      title: 'HISTORIC 272 MAJORITY SECURED',
      narrative: seatsNarrative(winner)
    };
  }

  if (p1.seats >= 272) {
    return {
      winner: p1,
      reason: 'Reached 272 Constitutional Majority Seats',
      code: 1,
      title: 'HISTORIC 272 MAJORITY SECURED',
      narrative: seatsNarrative(p1)
    };
  }

  if (p2.seats >= 272) {
    return {
      winner: p2,
      reason: 'Reached 272 Constitutional Majority Seats',
      code: 2,
      title: 'HISTORIC 272 MAJORITY SECURED',
      narrative: seatsNarrative(p2)
    };
  }

  if (remainingTime <= 0) {
    // Health first, then seats, then podium position. (It used to add HP and seats together,
    // so the 0-272 seat count drowned out the 0-100 health.)
    let winner: Combatant;
    if (p1.hp !== p2.hp) winner = p1.hp > p2.hp ? p1 : p2;
    else winner = breakTieBySeatsThenPodium(p1, p2);
    return {
      winner,
      reason: 'Zero-Hour Expired — Healthier Leader Takes the Chair',
      code: 3,
      title: 'HUNG PARLIAMENT: LEADING ALLIANCE SWORN IN',
      narrative: `Time ran out during the turbulent Zero Hour! With the stronger health and standing, ${winner.c.name} leads the governing coalition.`
    };
  }

  return null;
}

/**
 * Mathematical Expected Value (EV) calculation for Explainable AI
 */
export function calculateAIUtilities(
  ai: Combatant,
  target: Combatant,
  powerUps: PowerUp[],
  previousBest?: string
): AIDecision {
  const d = Math.abs(ai.x - target.x);

  let closestPowerUp: PowerUp | null = null;
  let minPowerUpDist = 1e9;
  for (const pu of powerUps) {
    if (pu.collected) continue;
    const dist = Math.abs(pu.x - ai.x);
    if (dist < minPowerUpDist) {
      minPowerUpDist = dist;
      closestPowerUp = pu;
    }
  }

  // Specials that only make sense in the right situation score very low otherwise.
  let specialScore: number;
  if (ai.cdSpecial > 0) specialScore = -99;
  else if (ai.c.specialType === 'heal_aura' && ai.hp > 85) specialScore = -99; // no wasted heal
  else if (ai.c.specialType === 'combo' && d >= 100) specialScore = -99; // combo needs close range
  else specialScore = d < 220 ? 48 + (target.blocking ? 18 : 0) : 10;

  const onPodiumBonus = Math.abs(target.x - PODIUM_X) < 46 ? 12 : 0; // contest the podium

  const utilities: Record<string, number> = {
    Strike: (d < 72 ? 62 : -20) + (target.stun > 0 ? 20 : 0) - (ai.atk > 0 ? 50 : 0),
    Special: specialScore,
    Super: ai.meter >= 100 && superInRange(ai, target) ? 78 + (100 - target.hp) * 0.35 : -99,
    Approach: d > 72 ? 15 + (d - 72) * 0.12 : -15,
    Retreat: (ai.hp < 30 && d < 170) ? 42 + (30 - ai.hp) : (d < 45 ? 14 : -20),
    Block: (target.atk > 0 && d < 100) ? 62 : -5,
    Pickup: closestPowerUp ? (35 + (closestPowerUp.type === 'cup' ? (100 - ai.hp) * 0.6 : closestPowerUp.type === 'case' ? (100 - ai.meter) * 0.3 : 15) - minPowerUpDist * 0.06 - (d < 110 ? 40 : 0)) : -99,
    Podium: 22 + (272 - ai.seats) * 0.05 - Math.abs(ai.x - 400) * 0.04 + onPodiumBonus,
    // The CPU recites a pickup line when it has uses left, the cooldown is done, and the opponent is
    // far enough away that a strike would not be better. Scores just above Podium so it is a sometimes-
    // action, not a dominant one (the max-uses cap stops it from being an exploit).
    PickupLine: (ai.lineUses < PICKUP_LINE.maxUses && ai.lineCd <= 0 && d > 160) ? 28 + (272 - ai.seats) * 0.08 : -99
  };

  let best = 'Strike';
  let bestVal = -1e9;
  const evPairs: [string, number][] = [];

  for (const action in utilities) {
    const val = utilities[action];
    evPairs.push([action, Math.round(val)]);
    if (val > bestVal) {
      bestVal = val;
      best = action;
    }
  }

  // Hysteresis: keep the current action unless something else is clearly better (by more than 8),
  // so the CPU stops flipping between actions every decision. Reacting with Block is exempt.
  if (
    previousBest &&
    previousBest !== best &&
    best !== 'Block' &&
    utilities[previousBest] !== undefined &&
    utilities[previousBest] > -50 &&
    bestVal - utilities[previousBest] <= 8
  ) {
    best = previousBest;
    bestVal = utilities[previousBest];
  }

  const whyMap: Record<string, string> = {
    Strike: `Target is within close melee reach (${Math.round(d)}px)`,
    Special: `${ai.c.specialName} is primed and target is in target trajectory (${Math.round(d)}px)`,
    Super: `Super meter is 100% primed, capitalizing on opponent (${Math.round(target.hp)} HP)`,
    Approach: `Target is ${Math.round(d)}px away, closing distance to engage`,
    Retreat: `Health is critical (${Math.round(ai.hp)} HP), repositioning to safety`,
    Block: `Opponent is mid-swing within striking distance (${Math.round(d)}px)`,
    Pickup: closestPowerUp ? `Grabbing high-priority ${POWERUP_NAMES[closestPowerUp.type]?.split(':')[0]} (${Math.round(minPowerUpDist)}px away)` : 'No item nearby',
    Podium: `Controlling Speaker Podium (${Math.round(ai.seats)}/272 seats)`,
    PickupLine: `Reciting a witty pickup line for +${PICKUP_LINE.seats} seats (${PICKUP_LINE.maxUses - ai.lineUses} left)`
  };

  return {
    best,
    why: whyMap[best] || 'Optimizing position',
    expectedValues: evPairs.sort((a, b) => b[1] - a[1]),
    distance: d,
    aiStats: { hp: ai.hp, meter: ai.meter, seats: ai.seats },
    targetStats: { hp: target.hp, blocking: target.blocking, attacking: target.atk > 0 },
    utilityMap: utilities
  };
}

/** The one place that names the CPU's actions for the player. Ids stay internal; every screen shows these labels. */
export const ACTION_LABEL: Record<string, string> = {
  Strike: 'Strike',
  Special: 'Special',
  Super: 'Super',
  Block: 'Block',
  Approach: 'Approach',
  Retreat: 'Retreat',
  Podium: '272 Seats',
  Pickup: 'Canteen',
  PickupLine: 'Taunt'
};

/** Player-facing name for an AI action id (unknown ids are shown as they are). */
export function actionLabel(id: string): string {
  return ACTION_LABEL[id] ?? id;
}

/** "positive", "negative" or "neutral" for a decision score, from the rounded number (so +0.4 is neutral, not positive). */
export function evWord(ev: number): 'positive' | 'negative' | 'neutral' {
  const r = Math.round(ev);
  return r > 0 ? 'positive' : r < 0 ? 'negative' : 'neutral';
}

/** Signed, rounded score: +12, -5 or 0 (never "+-5"). */
export function formatEv(ev: number): string {
  const r = Math.round(ev);
  return r > 0 ? `+${r}` : `${r}`;
}

/** Bar for one option's score: sized by distance from zero (so negatives are visible), with a thin minimum. */
export function scoreBar(ev: number, maxAbs: number): { widthPct: number; negative: boolean } {
  const m = Math.max(1, maxAbs);
  const widthPct = Math.min(100, Math.max(3, (Math.abs(ev) / m) * 100));
  return { widthPct, negative: Math.round(ev) < 0 };
}

/** Why "Why Did You Do That?" cannot open right now, or null when it can. */
export function inspectDisabledReason(is2Player: boolean, hasDecision: boolean): string | null {
  if (is2Player) return 'Only available against the CPU (no AI in 2-Player)';
  if (!hasDecision) return 'Waiting for the CPU to make a decision';
  return null;
}

/**
 * Counterfactual reasoning: explains why an alternative action was NOT chosen
 */
export function getCounterfactualExplanation(
  action: string,
  ev: number,
  decision: AIDecision
): string {
  const d = Math.round(decision.distance);
  const bestEv = Math.round(decision.utilityMap[decision.best] ?? 0);

  const label = actionLabel(action);
  const bestLabel = actionLabel(decision.best);
  const explanations: Record<string, string> = {
    Strike: `${label} lost out because the opponent is ${d}px away (melee needs under 72px). Swinging here would whiff and leave the CPU open to a counter-attack.`,
    Special: `${label} lost out because the signature move is either on cooldown or the target is outside its range.`,
    Super: `${label} lost out because the Super meter is only ${Math.round(decision.aiStats.meter)}% (it needs 100%).`,
    Block: `${label} lost out because the opponent was not attacking. Blocking with no incoming hit gives up the chance to strike first.`,
    Approach: `${label} lost out because the distance is already closed (${d}px) or another action pays off more right now.`,
    Retreat: `${label} lost out because the CPU's health (${Math.round(decision.aiStats.hp)}%) is stable, so giving up ground would cost it stage control.`,
    Podium: `${label} lost out because fighting took priority over collecting seats right now.`,
    Pickup: `${label} lost out because no canteen item is close enough to be worth leaving the fight.`
  };

  const base =
    explanations[action] || `${label} scored lower than ${bestLabel}.`;
  // The score's sign comes from the number itself, never assumed.
  return `${base} Its score was ${evWord(ev)} (${formatEv(ev)}) against ${bestLabel} (${formatEv(bestEv)}).`;
}


// ── Frame-rate independent movement ─────────────────────────────────────────

/** Convert a "multiplier per 60 fps frame" into the multiplier for a frame of `dt` seconds. */
export function decayPerFrame(perFrame: number, dt: number): number {
  return Math.pow(perFrame, dt * 60);
}

/** Trapezoid integration: exact for constant acceleration, so jump height does not depend on fps. */
export function integrate(pos: number, vBefore: number, vAfter: number, dt: number): number {
  return pos + ((vBefore + vAfter) / 2) * dt;
}

export interface HorizontalInput {
  onGround: boolean;
  /** -1, 0 or 1 (already flipped if confused). */
  dir: number;
  walkSpeed: number;
  blocking: boolean;
  /** stunned or frozen: no steering */
  locked: boolean;
}

/**
 * One frame of horizontal motion. Returns the new velocity and the velocity to integrate the position with.
 * - Grounded and walking: speed is set instantly (snappy), as before.
 * - Grounded with no input, blocking: friction.
 * - Airborne: steer with acceleration (capped at walk speed) and keep momentum when not steering.
 *   Speeds above walk speed (knockback) are never boosted further, only dragged down.
 */
export function stepHorizontal(vx: number, i: HorizontalInput, dt: number): { vx: number; avg: number } {
  const slide = (k: number) => {
    const next = vx * decayPerFrame(k, dt);
    return { vx: next, avg: (vx + next) / 2 };
  };
  if (i.locked) return slide(MOVE.stunFriction);
  if (i.onGround) {
    if (i.blocking || i.dir === 0) return slide(MOVE.groundFriction);
    const v = i.dir * i.walkSpeed;
    return { vx: v, avg: v };
  }
  // airborne
  if (i.dir === 0) return slide(MOVE.airDrag);
  let next = vx + i.dir * MOVE.airAccel * dt;
  if (i.dir > 0) next = Math.min(next, Math.max(vx, i.walkSpeed));
  else next = Math.max(next, Math.min(vx, -i.walkSpeed));
  return { vx: next, avg: (vx + next) / 2 };
}


// ── Input buffer ────────────────────────────────────────────────────────────

export type BufferedAction = 'strike' | 'special' | 'pickupLine' | 'superMove';
export interface InputBuffer { action: BufferedAction; kick: number; t: number }
export interface ActionInput { strike: number; special: number; pickupLine: number; superMove: number; kick: number }

/**
 * Decide which action (if any) fires this frame, with a short buffer for presses made while busy.
 * Same priority order as the old else-if chain: strike, special, pickup line, super.
 * - Free: a fresh press fires, otherwise a still-valid buffered press fires (and the buffer empties).
 * - Busy: a fresh press is remembered for INPUT_BUFFER_SECONDS (newest wins); nothing fires.
 */
export function bufferStep(
  input: ActionInput,
  buffer: InputBuffer | null | undefined,
  busy: boolean,
  dt: number
): { fire: BufferedAction | null; kick: number; buffer: InputBuffer | null } {
  const pressed: BufferedAction | null = input.strike
    ? 'strike'
    : input.special
      ? 'special'
      : input.pickupLine
        ? 'pickupLine'
        : input.superMove
          ? 'superMove'
          : null;
  if (!busy) {
    if (pressed) return { fire: pressed, kick: input.kick, buffer: null };
    if (buffer && buffer.t > 0) return { fire: buffer.action, kick: buffer.kick, buffer: null };
    return { fire: null, kick: 0, buffer: null };
  }
  if (pressed) return { fire: null, kick: 0, buffer: { action: pressed, kick: input.kick, t: INPUT_BUFFER_SECONDS } };
  if (buffer && buffer.t - dt > 0) return { fire: null, kick: 0, buffer: { ...buffer, t: buffer.t - dt } };
  return { fire: null, kick: 0, buffer: null };
}

// ── Body collision ──────────────────────────────────────────────────────────

/**
 * Push two grounded fighters apart so they cannot walk through each other. Airborne fighters pass over
 * (jumping across is the way out of a corner). Overlap is resolved at a capped speed so a landing does not pop.
 * Fighters keep to the wall limits; if one is pinned against a wall the other takes the whole push.
 */
export function separateFighters(
  ax: number,
  bx: number,
  bothGrounded: boolean,
  dt: number,
  aIsLeftOnTie = true
): [number, number] {
  if (!bothGrounded) return [ax, bx];
  const overlap = BODY.minGap - Math.abs(ax - bx);
  if (overlap <= 0) return [ax, bx];
  const dirA = ax < bx ? -1 : ax > bx ? 1 : aIsLeftOnTie ? -1 : 1; // direction A moves
  const push = Math.min(overlap, BODY.maxPushSpeed * dt * 2); // total movement available this frame
  let moveA = push / 2;
  let moveB = push / 2;
  let nax = ax + dirA * moveA;
  let nbx = bx - dirA * moveB;
  // wall handling: give any clamped movement to the other fighter
  const clampA = Math.max(BODY.wallMin, Math.min(BODY.wallMax, nax));
  const clampB = Math.max(BODY.wallMin, Math.min(BODY.wallMax, nbx));
  const lostA = Math.abs(nax - clampA);
  const lostB = Math.abs(nbx - clampB);
  nax = clampA;
  nbx = clampB;
  if (lostA > 0) nbx = Math.max(BODY.wallMin, Math.min(BODY.wallMax, nbx - dirA * lostA));
  if (lostB > 0) nax = Math.max(BODY.wallMin, Math.min(BODY.wallMax, nax + dirA * lostB));
  return [nax, nbx];
}


// ── Hit feedback ────────────────────────────────────────────────────────────

export interface HitFeel {
  /** seconds to freeze the simulation (0 = none) */
  hitStop: number;
  sparkColor: string;
  sparkCount: number;
  shake: number;
  numberColor: string;
  /** text for the floating damage number */
  label: string;
}

/** How a hit should look and feel, from the damage that actually landed and whether it was blocked. */
export function hitFeel(finalDamage: number, blocked: boolean): HitFeel {
  const unblockedEquivalent = blocked ? finalDamage / BLOCK_DAMAGE_MULT : finalDamage;
  const heavy = unblockedEquivalent >= HIT_FEEL.heavyDamage;
  const big = unblockedEquivalent >= HIT_FEEL.minDamage;
  const hitStop = !big ? 0 : blocked ? HIT_FEEL.blockStop : heavy ? HIT_FEEL.heavyStop : HIT_FEEL.hitStop;
  return {
    hitStop,
    sparkColor: blocked ? HIT_FEEL.spark.block : HIT_FEEL.spark.hit,
    sparkCount: blocked ? 8 : 14,
    shake: blocked ? 2.5 : heavy ? 9 : 6,
    numberColor: blocked ? HIT_FEEL.numberColor.block : HIT_FEEL.numberColor.hit,
    label: finalDamage >= 1 ? String(Math.round(finalDamage)) : finalDamage.toFixed(1)
  };
}

/**
 * Where a super cutscene's clock should jump to when the player presses a key or taps.
 * Before CUTSCENE_SKIP_AFTER nothing happens (the press that fired the super must not skip it).
 * After that it jumps to the start of the fade, so the scene fades out instead of cutting.
 * Already fading or finished scenes are left alone.
 */
export function cutsceneSkipTo(elapsed: number): number {
  if (elapsed < CUTSCENE_SKIP_AFTER) return elapsed;
  return Math.max(elapsed, CUTSCENE_FADE_AT);
}

/**
 * Backing-store scale for the stage canvas. The canvas is letterboxed (object-contain) inside its element, so the
 * picture is only as wide as the smaller of the element width and the element height at the stage aspect ratio.
 * Returns a multiple of RENDER.step in [RENDER.minScale, RENDER.maxScale].
 */
export function pickRenderScale(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  stageWidth: number,
  stageHeight: number
): number {
  if (!(cssWidth > 0) || !(cssHeight > 0) || !(stageWidth > 0) || !(stageHeight > 0)) return RENDER.minScale;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const shownWidth = Math.min(cssWidth, (cssHeight * stageWidth) / stageHeight);
  const needed = (shownWidth * dpr) / stageWidth;
  const stepped = Math.ceil((needed - RENDER.slack) / RENDER.step) * RENDER.step;
  return Math.max(RENDER.minScale, Math.min(RENDER.maxScale, stepped));
}

/**
 * The "super ready" tag under a fighter's seat count. It names the key the human at that side presses:
 * P1 uses Q (or L), P2 uses O in 2-Player mode, and the CPU has no key, so it shows none.
 */
export function superReadyLabel(isRight: boolean, twoPlayer: boolean): string {
  if (!isRight) return `\u2605 SUPER READY [${primaryLabel('p1', 'super')}]`;
  return twoPlayer ? `\u2605 SUPER READY [${primaryLabel('p2', 'super')}]` : '\u2605 SUPER READY';
}

export interface ThoughtBubbleBox { left: number; width: number; height: number; pointerX: number; }

/**
 * Placement of the CPU thought bubble above a fighter: wide enough for its text, kept inside the stage,
 * with the little pointer still aimed at the fighter.
 */
export function thoughtBubbleBox(textWidth: number, anchorX: number, stageWidth: number): ThoughtBubbleBox {
  const width = Math.max(HUD_TEXT.thoughtMinWidth, textWidth + HUD_TEXT.thoughtPadX * 2);
  const left = Math.max(HUD_TEXT.edgeMargin, Math.min(stageWidth - width - HUD_TEXT.edgeMargin, anchorX - width / 2));
  const pointerX = Math.max(left + 8, Math.min(left + width - 8, anchorX));
  return { left, width, height: HUD_TEXT.thoughtHeight, pointerX };
}


// ---------------------------------------------------------------------------------------------
// F24: ghost health bar, last-seconds clock, floating text. All pure, so they can be unit-tested.
// ---------------------------------------------------------------------------------------------

export interface GhostBar {
  /** The lighter "chunk just lost" bar, in HP (>= the real HP). */
  value: number;
  /** Seconds left before the ghost starts draining. */
  hold: number;
  /** The HP seen on the previous step, to spot a new hit. */
  last: number;
}

export function newGhostBar(hp: number): GhostBar {
  return { value: hp, hold: 0, last: hp };
}

/**
 * One simulation step of the ghost bar. Healing snaps it up with the real bar; a new hit restarts the hold;
 * after the hold it drains toward the real HP at GHOST_BAR.drainPerSecond.
 */
export function stepGhostBar(g: GhostBar, hp: number, dt: number, reducedMotion = false): GhostBar {
  let { value, hold } = g;
  if (hp >= value) {
    value = hp;
    hold = 0;
  } else {
    if (hp < g.last) hold = GHOST_BAR.holdSeconds;
    if (hold > 0) hold = Math.max(0, hold - dt);
    // Reduced motion: the amber chunk holds, then simply disappears instead of sliding away.
    else value = reducedMotion ? hp : Math.max(hp, value - GHOST_BAR.drainPerSecond * dt);
  }
  return { value, hold, last: hp };
}

export interface ClockLook {
  urgent: boolean;
  color: string;
  /** 1 normally; up to 1 + CLOCK.pulseScale right after a new second starts while urgent. */
  scale: number;
}

/** How the match clock looks for `timeLeft` seconds remaining. Driven by the match clock itself, so it pauses with the game. */
export function clockLook(timeLeft: number, reducedMotion = false): ClockLook {
  const shown = Math.ceil(timeLeft);
  if (timeLeft <= 0 || shown > CLOCK.urgentSeconds) {
    return { urgent: false, color: CLOCK.normalColor, scale: 1 };
  }
  // The digit changes as timeLeft crosses an integer, so the fraction is ~1 just after a tick and falls to 0.
  const frac = timeLeft - Math.floor(timeLeft);
  const pulse = Math.max(0, (frac - 0.7) / 0.3);
  // Reduced motion keeps the red colour and ring but drops the size pulse.
  return { urgent: true, color: CLOCK.urgentColor, scale: reducedMotion ? 1 : 1 + CLOCK.pulseScale * pulse };
}

/** The pitch of the tick to play when the displayed second changes from `prev` to `next`, or null for no tick. */
export function clockTickFreq(prevTimeLeft: number, nextTimeLeft: number): number | null {
  const prevShown = Math.ceil(prevTimeLeft);
  const nextShown = Math.ceil(nextTimeLeft);
  if (nextShown >= prevShown) return null;
  if (nextShown < 1 || nextShown > CLOCK.urgentSeconds) return null;
  return nextShown <= CLOCK.finalTickSeconds ? CLOCK.finalTickFreq : CLOCK.tickFreq;
}

/** Seconds a floating text stays up: longer for longer text, so a pickup line can actually be read. */
export function floatingTextLife(length: number): number {
  return Math.min(FLOAT_TEXT.maxLife, FLOAT_TEXT.baseLife + FLOAT_TEXT.perChar * length);
}

/**
 * Lay out floating text: wrap above FLOAT_TEXT.wrapChars characters, then clamp the anchor so the widest line stays
 * fully inside the stage. `measureLine` is the real pixel width of a line at the drawn font.
 */
export function layoutFloatingText(
  measureLine: (line: string) => number,
  text: string,
  anchorX: number,
  stageWidth: number
): { lines: string[]; x: number } {
  const lines = text.length > FLOAT_TEXT.wrapChars ? wrapText(t => t.length, text, FLOAT_TEXT.wrapChars) : [text];
  const widest = lines.reduce((m, l) => Math.max(m, measureLine(l)), 0);
  const half = widest / 2 + FLOAT_TEXT.margin;
  if (half * 2 >= stageWidth) return { lines, x: stageWidth / 2 };
  return { lines, x: Math.min(Math.max(anchorX, half), stageWidth - half) };
}


/**
 * Short text tag for a battle-log line. The coloured border already separates P1 / CPU lines, so only
 * item and super lines need a word. Plain text on purpose (no emoji: they render differently per device).
 */
export type LogType = 'me' | 'cpu' | 'item' | 'super';
export function logPrefix(type: LogType): string {
  return type === 'super' ? 'SUPER \u00b7 ' : type === 'item' ? 'ITEM \u00b7 ' : '';
}

/**
 * True when a floating text with the same wording is already showing near x. Used for refusal messages so
 * that tapping a key that is on cooldown does not pile 20 identical labels on top of each other.
 */
export function isDuplicateFloat(
  existing: ReadonlyArray<{ text: string; x: number }>,
  text: string,
  x: number,
  radius: number
): boolean {
  return existing.some(f => f.text === text && Math.abs(f.x - x) <= radius);
}

/**
 * F26: where the chamber's pillars and arches go. Pillars are symmetric around the stage centre; each arch spans the
 * clear gap between two neighbouring pillar shafts exactly (so it meets them) and stays inside the stage.
 */
export interface ChamberLayout {
  /** pillar shaft centres, left to right */
  pillars: number[];
  /** arches: centre x, radius, and the y where the arch springs from the pillars */
  arches: { cx: number; r: number; springY: number }[];
}
export function chamberLayout(stageWidth: number, art: typeof ARENA_ART = ARENA_ART): ChamberLayout {
  const mid = stageWidth / 2;
  const n = art.pillarCount;
  const pillars: number[] = [];
  for (let i = 0; i < n; i++) pillars.push(mid + (i - (n - 1) / 2) * art.bay);
  const arches: ChamberLayout['arches'] = [];
  for (let i = 0; i < n - 1; i++) {
    const innerLeft = pillars[i] + art.pillarWidth / 2;
    const innerRight = pillars[i + 1] - art.pillarWidth / 2;
    arches.push({ cx: (innerLeft + innerRight) / 2, r: (innerRight - innerLeft) / 2, springY: art.archSpringY });
  }
  return { pillars, arches };
}

/**
 * F27: scale and foot position that put the WHOLE fighter inside the winner-portrait canvas, with `headMargin`
 * above the head and `footMargin` below the feet. The scale never exceeds `maxScale`.
 */
export function winnerPortraitLayout(
  canvasW: number,
  canvasH: number,
  figureHeight: number = GAME_OVER.figureHeight,
  headMargin: number = GAME_OVER.headMargin,
  footMargin: number = GAME_OVER.footMargin,
  maxScale: number = GAME_OVER.maxScale
): { scale: number; x: number; baselineY: number; headY: number } {
  const room = Math.max(1, canvasH - headMargin - footMargin);
  const scale = Math.min(maxScale, room / figureHeight);
  const baselineY = canvasH - footMargin;
  return { scale, x: canvasW / 2, baselineY, headY: baselineY - figureHeight * scale };
}

export interface ConfettiPiece {
  left: string;
  delay: string;
  duration: string;
  color: string;
  rotation: number;
  size: number;
}

/** F27: the confetti for one game-over screen. Built once (the modal memoises it) so a re-render can't re-roll it. */
export function makeConfetti(colors: readonly string[], count: number = GAME_OVER.confettiCount, rand: () => number = Math.random): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: `${rand() * 100}%`,
    delay: `${rand() * 2}s`,
    duration: `${2 + rand() * 3}s`,
    color: colors[i % colors.length],
    rotation: rand() * 360,
    size: 4 + rand() * 5
  }));
}

/**
 * F28: sizes for the on-screen gamepad, from the game area the player actually sees (pass the swapped width and
 * height when the UI is force-rotated). A phone-sized area gets the phone sizes, a single-sided pad (2-Player)
 * gets the compact sizes, and only the full-width single-player pad on a big screen gets the largest.
 * Every size is clamped to the touch minimum, and the label font never drops below PAD.minLabel.
 */
export interface PadLayout {
  stick: number;
  small: number;
  big: number;
  label: number;
  bigLabel: number;
  iconSmall: number;
  iconBig: number;
  isPhone: boolean;
  /** False only for the narrow 2-Player pad, where there is no room for an icon above the label. */
  showIcons: boolean;
}

export function padLayout(areaW: number, areaH: number, variant: 'split' | 'left' | 'right'): PadLayout {
  const isPhone = areaH <= PAD.phoneMaxHeight || areaW <= PAD.phoneMaxWidth;
  const narrowTwoPlayer = variant !== 'split' && areaW < PAD.narrowBelowWidth;
  const base = narrowTwoPlayer ? PAD.narrow : isPhone ? PAD.phone : variant !== 'split' ? PAD.compact : PAD.full;
  const small = Math.max(PAD.minTarget, base.small);
  const big = Math.max(small, base.big);
  return {
    stick: base.stick,
    small,
    big,
    label: Math.max(PAD.minLabel, Math.round(small * PAD.labelRatio)),
    bigLabel: Math.max(PAD.minLabel, Math.round(big * PAD.labelRatio)),
    iconSmall: PAD.iconSmall,
    iconBig: PAD.iconBig,
    isPhone,
    showIcons: !narrowTwoPlayer
  };
}

// ---------------------------------------------------------------------------
// F29: phone HUD layout
// ---------------------------------------------------------------------------

export interface ContainRect { left: number; top: number; width: number; height: number; scale: number }

/** Where an `object-contain` picture of `aspectW:aspectH` sits inside a `boxW` x `boxH` box. */
export function containRect(boxW: number, boxH: number, aspectW: number, aspectH: number): ContainRect {
  if (!(boxW > 0) || !(boxH > 0)) return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
  const scale = Math.min(boxW / aspectW, boxH / aspectH);
  const width = aspectW * scale;
  const height = aspectH * scale;
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height, scale };
}

export interface PhoneHudLayout {
  isShort: boolean;
  /** CSS px from the top of the stage box to the bottom of the HUD strip (0 when the box is empty). */
  stripBottom: number;
  /** Top offsets (CSS px) for the corner column: [pause, rotate, fullscreen]. */
  stackTops: [number, number, number];
  /** Top offset for the telemetry pill / theater toggle on the left. */
  leftTop: number;
  /** Top offset for the Rule Coach banner (same line as the first corner button, centred between the two columns). */
  coachTop: number;
  /** Widest the banner may be: clear of the left pill and the right column (each `button` + gaps), and at most `coachMaxWidthFrac`. */
  coachMaxWidth: number;
}

export function phoneHudLayout(boxW: number, boxH: number, stageW = 800, stageH = 450): PhoneHudLayout {
  const isShort = boxH > 0 && boxH <= PHONE_HUD.shortMaxHeight;
  const c = containRect(boxW, boxH, stageW, stageH);
  const stripBottom = c.height > 0 ? c.top + (PHONE_HUD.stripStagePx / stageH) * c.height : 0;
  const first = Math.round(stripBottom + PHONE_HUD.gap);
  const step = PHONE_HUD.button + PHONE_HUD.gap;
  const sideReserve = 2 * (PHONE_HUD.sideMargin + PHONE_HUD.button + PHONE_HUD.gap);
  const coachMaxWidth = Math.max(0, Math.min(PHONE_HUD.coachMaxWidthFrac * boxW, boxW - sideReserve));
  return { isShort, stripBottom, stackTops: [first, first + step, first + 2 * step], leftTop: first, coachTop: first, coachMaxWidth };
}

/** Rule Coach rules: `next` replaces `shown` only if it is at least as important (a lower step never replaces it). */
export function coachMayReplace(currentStep: number, nextStep: number): boolean {
  return nextStep >= currentStep;
}


// ---------- F30: "is this a touch-first device" ----------

/** Phones and tablets: the main pointer is a finger, and nothing can hover.
 *  A touch-screen laptop's main pointer is the trackpad or mouse, so it does not match. */
export const TOUCH_PRIMARY_QUERY = '(pointer: coarse) and (hover: none)';

type MatchMediaLike = ((query: string) => { matches: boolean }) | undefined;

/** Pure so it can be tested: pass `window.matchMedia` (or undefined) and the user-agent string.
 *  Without matchMedia (very old browsers) only phone and tablet user agents count, so a
 *  touch laptop never gets the rotated phone layout. */
export function detectTouchPrimary(mm: MatchMediaLike, userAgent: string): boolean {
  if (typeof mm === 'function') {
    try { return mm(TOUCH_PRIMARY_QUERY).matches; } catch { /* fall through to the user agent */ }
  }
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}


// ---------- F31: map pins ----------

export interface PinPoint { id: string; x: number; y: number; ex?: number; ey?: number }

/**
 * Pushes pins apart until every pair is at least `minDist` apart (or the iteration budget runs out), then keeps them
 * `margin` px inside the map. Pure and deterministic: the same input always gives the same output, and pins that sit
 * exactly on top of each other are split along a direction chosen from their index.
 */
export function spreadPins(
  pins: PinPoint[], width: number, height: number,
  minDist: number = MAP_PINS.minGap, margin: number = MAP_PINS.margin, iterations: number = MAP_PINS.iterations
): PinPoint[] {
  const out = pins.map(p => ({ id: p.id, x: p.x, y: p.y }));
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy);
        if (d >= minDist - 0.01) continue;
        let ux: number, uy: number;
        if (d < 1e-6) { const a = (i * 2.399963 + j); ux = Math.cos(a); uy = Math.sin(a); } else { ux = dx / d; uy = dy / d; }
        const push = (minDist - d) / 2;
        out[i].x -= ux * push; out[i].y -= uy * push;
        out[j].x += ux * push; out[j].y += uy * push;
        moved = true;
      }
    }
    for (const p of out) {
      p.x = clamp(p.x, margin, width - margin);
      p.y = clamp(p.y, margin, height - margin);
    }
    if (!moved) break;
  }
  return out;
}

/**
 * Which pin a tap belongs to, or null. Two passes:
 *  1. A tap on or right next to a dot (within `dotRadius`) always belongs to the nearest such dot, so a name label
 *     drawn over another pin's dot can never steal the tap.
 *  2. Otherwise the pin whose dot-to-label-end segment (`ex`,`ey`; just the dot when absent) is nearest, within `maxDist`.
 * Ties go to the earlier pin in the list.
 */
export function nearestPin(
  pins: PinPoint[], x: number, y: number,
  maxDist: number = MAP_PINS.hitRadius, dotRadius: number = MAP_PINS.dotHit
): string | null {
  let best: string | null = null;
  let bestD = dotRadius;
  for (const p of pins) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD && (best === null || d < bestD)) { best = p.id; bestD = d; }
  }
  if (best !== null) return best;
  bestD = maxDist;
  for (const p of pins) {
    const d = distToSegment(x, y, p.x, p.y, p.ex ?? p.x, p.ey ?? p.y);
    if (d <= bestD && (best === null || d < bestD)) { best = p.id; bestD = d; }
  }
  return best;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Where a pin's name label ends (px), so a tap on the label text counts for that pin. `side` is where the label is drawn. */
export function labelReach(name: string, side: 'l' | 'r'): number {
  const w = MAP_PINS.labelPad + MAP_PINS.labelPadX + name.length * MAP_PINS.labelCharPx;
  return side === 'r' ? w : -w;
}

/**
 * Which side of its dot a name label goes. A side is "clear" when the label fits inside the map and covers no other
 * pin's dot (`blockers`). The preferred side is kept when clear, else the other side if clear, else a side that at least
 * fits inside the map, else whichever side has more room.
 */
export function pickLabelSide(
  preferred: 'l' | 'r', x: number, labelWidth: number, mapWidth: number,
  edge = 2, y = 0, blockers: { x: number; y: number }[] = []
): 'l' | 'r' {
  const inside = (side: 'l' | 'r') => (side === 'r' ? x + labelWidth <= mapWidth - edge : x - labelWidth >= edge);
  const covers = (side: 'l' | 'r') => blockers.some(o => {
    const from = side === 'r' ? x + MAP_PINS.labelPad - 4 : x - labelWidth;
    const to = side === 'r' ? x + labelWidth : x - MAP_PINS.labelPad + 4;
    return o.x >= from - MAP_PINS.dot / 2 && o.x <= to + MAP_PINS.dot / 2 && Math.abs(o.y - y) <= MAP_PINS.dot / 2 + 8;
  });
  const other = preferred === 'r' ? 'l' : 'r';
  if (inside(preferred) && !covers(preferred)) return preferred;
  if (inside(other) && !covers(other)) return other;
  if (inside(preferred)) return preferred;
  if (inside(other)) return other;
  return mapWidth - x >= x ? 'r' : 'l';
}

/** Whether a pin's name label is drawn: every label on a map wide enough for them, only the selected pin's on a narrow one. */
export function pinLabelVisible(isSelected: boolean, mapWidth: number): boolean {
  return isSelected || mapWidth >= MAP_PINS.labelsAllMinWidth;
}

/** City, state and island names on the map. They are 7 px in a 500-unit drawing, so on a small map they
 *  shrink to 2-3 px; below MAP_TEXT.hideBelow they are left out. Unknown width (before the first measure) shows them. */
export function mapTextVisible(mapWidth: number | null): boolean {
  return mapWidth === null || mapWidth >= MAP_TEXT.hideBelow;
}


/** Next leader id in the roster, wrapping at both ends (F33). An unknown current id goes to the first (dir 1) or last (dir -1). */
export function stepRoster(ids: readonly string[], currentId: string, dir: 1 | -1): string {
  if (ids.length === 0) return currentId;
  const i = ids.indexOf(currentId);
  if (i < 0) return dir === 1 ? ids[0] : ids[ids.length - 1];
  return ids[(i + dir + ids.length) % ids.length];
}

/** New scrollLeft that brings a chip fully into a scroll strip with `pad` px to spare; unchanged when it already fits (F33). */
export function rosterScrollLeft(viewW: number, scrollLeft: number, chipLeft: number, chipW: number, pad: number): number {
  if (chipLeft - pad < scrollLeft) return Math.max(0, chipLeft - pad);
  if (chipLeft + chipW + pad > scrollLeft + viewW) return Math.max(0, chipLeft + chipW + pad - viewW);
  return scrollLeft;
}


/** Random opponent that is not the player's own fighter (F34). `rand` is Math.random-like (0 up to, not including, 1). */
export function pickOpponent(ids: readonly string[], p1Id: string, rand: () => number): string {
  const pool = ids.filter(id => id !== p1Id);
  if (pool.length === 0) return p1Id;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** Shuffle: a different opponent from both the player's fighter and the one currently shown (F34). With only two fighters there is nothing else to show. */
export function rerollOpponent(ids: readonly string[], p1Id: string, currentId: string, rand: () => number): string {
  const pool = ids.filter(id => id !== p1Id && id !== currentId);
  if (pool.length === 0) return pickOpponent(ids, p1Id, rand);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** Should a key or tap on the versus card skip to the match now? Not while it is brand new, not on key auto-repeat (F34). */
export function vsMaySkip(msSinceOpen: number, isRepeat: boolean, graceSeconds: number): boolean {
  return !isRepeat && msSinceOpen >= graceSeconds * 1000;
}


/** Linear fade-out volume (1 down to 0) after `elapsedMs` of a `totalMs` fade (F35). A zero-length fade is instantly silent. */
export function voiceFadeVolume(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));
}

/**
 * When a voice clip's play() is rejected, should the synth hook stand in for it? (F35)
 * Yes only if that clip is still the current voice and the rejection is not an AbortError:
 * stopping a clip whose play() is still pending also rejects, and that must stay silent.
 */
export function useFallbackHook(errorName: string, isStillCurrent: boolean): boolean {
  return isStillCurrent && errorName !== 'AbortError';
}


/** Linear gain that brings a voice clip to `VOICE.targetLufs` (F36). Unknown clips are left as they are. */
export function voiceGainFor(politicianId: string): number {
  const lufs = VOICE_LUFS[politicianId];
  if (typeof lufs !== 'number') return 1;
  return Math.pow(10, (VOICE.targetLufs - lufs) / 20);
}

/** Music volume while a voice clip plays or not (F36). */
export function duckedMusicVolume(base: number, ducked: boolean): number {
  return ducked ? base * VOICE.musicDuck : base;
}


/** F37: the music volume that is sent to the audio engine: 0 while muted, otherwise the slider value (clamped 0-1). */
export function effectiveMusicVolume(volume: number, muted: boolean): number {
  if (muted) return 0;
  if (!Number.isFinite(volume)) return 0;
  return Math.max(0, Math.min(1, volume));
}

/**
 * F37: the quiet octave-up copy for a low synth note, or null when the note is high enough.
 * `freq` is the start frequency and `sweep` the Hz added over the note, so the note ends at max(minFreq, freq + sweep).
 * A note counts as low if either end is under `belowHz`.
 */
export function lowNoteCopy(
  freq: number,
  sweep: number,
  belowHz: number,
  gainMult: number,
  minFreq: number
): { freq: number; endFreq: number; gainMult: number } | null {
  const end = Math.max(minFreq, freq + sweep);
  if (Math.min(freq, end) >= belowHz) return null;
  return { freq: freq * 2, endFreq: end * 2, gainMult };
}


// ── F38: the intro's real loader and tap-to-enter ────────────────────

export interface PreloadItem { weight: number; done: boolean }

/** How much of the preload is finished (0-1), weighted by file size. An empty list counts as finished. */
export function preloadFraction(items: readonly PreloadItem[]): number {
  let total = 0;
  let done = 0;
  for (const it of items) {
    const w = Math.max(0, it.weight);
    total += w;
    if (it.done) done += w;
  }
  return total <= 0 ? 1 : done / total;
}

/** The seat counter follows the story but never runs ahead of real loading. */
export function introSeats(storySeats: number, loadFraction: number, majority = 272): number {
  const loaded = Math.round(Math.max(0, Math.min(1, loadFraction)) * majority);
  return Math.max(0, Math.min(storySeats, loaded));
}

/** The intro asks for the player's tap only when the story is over, everything is loaded and the minimum time has passed. */
export function introReady(storyDone: boolean, loadDone: boolean, minTimePassed: boolean, counterDone = true): boolean {
  return storyDone && loadDone && minTimePassed && counterDone;
}

/**
 * F47: one frame of the intro seat counter easing toward its target (exponential approach, so it never overshoots
 * and never jumps). It snaps to the target once the remaining gap is under `snapBelow` seats.
 */
export function easeSeatsStep(current: number, target: number, dtSeconds: number, rate: number, snapBelow: number): number {
  if (current === target) return target;
  const dt = Math.max(0, dtSeconds);
  const next = current + (target - current) * (1 - Math.exp(-rate * dt));
  return Math.abs(target - next) < snapBelow ? target : next;
}

/** F47: the right-hand hint under the intro's progress bar. Only a player with a keyboard has a Space key to press. */
export function skipHintText(touchFirst: boolean): string | null {
  return touchFirst ? null : 'Press [Space] to skip';
}

/** F47: "STEP n OF total", never past the last step once the story is over (it used to read "STEP 8 OF 7"). */
export function introStepLabel(stepIndex: number, total: number): string {
  return `STEP ${Math.min(Math.max(stepIndex, 0) + 1, total)} OF ${total}`;
}

/**
 * What a key press does on the intro: Space, Enter and Esc always skip; modifier keys and Tab never do anything
 * (Tab moves focus to the Skip button); any other key enters, but only once ready and not for a held key's auto-repeat.
 */
export function introKeyAction(code: string, repeat: boolean, ready: boolean): 'skip' | 'enter' | 'ignore' {
  if (code === 'Space' || code === 'Enter' || code === 'Escape') return repeat ? 'ignore' : 'skip';
  if (/^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/.test(code) || code === 'Tab' || code === 'CapsLock') return 'ignore';
  return ready && !repeat ? 'enter' : 'ignore';
}


/**
 * F39: should the CPU's latest decision be pushed into React state?
 * Never when nothing on screen shows it; when visible, at once if the best action changed, else every `refreshMs`.
 */
export function shouldPublishDecision(args: {
  visible: boolean;
  best: string;
  prevBest: string | null;
  nowMs: number;
  lastPublishMs: number;
  refreshMs: number;
}): boolean {
  if (!args.visible) return false;
  if (args.prevBest === null || args.best !== args.prevBest) return true;
  return args.nowMs - args.lastPublishMs >= args.refreshMs;
}

/** The intro's enter prompt: a finger cannot "press any key", so touch-first devices only see "Tap". */
export function enterPromptText(touchFirst: boolean): string {
  return touchFirst ? 'Tap to enter' : 'Click or press any key to enter';
}

export interface RulebookRosterRow { id: string; name: string; special: string; superMove: string; }

/** One row per fighter for Rule 3, straight from the roster so a new or renamed fighter can never be missing. */
export function rulebookRoster(roster: readonly Politician[]): RulebookRosterRow[] {
  return roster.map(p => ({ id: p.id, name: p.name, special: p.specialName, superMove: p.superName }));
}

export interface RulebookFacts {
  punch: number; kick: number; dropkick: number;
  /** Share of damage a blocked hit still deals, as a whole percent. */
  blockChipPercent: number;
  lineSeats: number; lineCooldown: number; lineMax: number;
}

/** The numbers the rulebook quotes, read from the same constants the game uses. */
export function rulebookFacts(): RulebookFacts {
  return {
    punch: STRIKE_DAMAGE.punch, kick: STRIKE_DAMAGE.kick, dropkick: STRIKE_DAMAGE.dropkick,
    blockChipPercent: Math.round(BLOCK_DAMAGE_MULT * 100),
    lineSeats: PICKUP_LINE.seats, lineCooldown: PICKUP_LINE.cooldown, lineMax: PICKUP_LINE.maxUses
  };
}

/**
 * Where Tab should send focus so it never leaves an open dialog.
 * `count` = focusable controls inside, `active` = index of the focused one (-1 when focus is outside the dialog).
 * Returns the index to focus, `'container'` when the dialog has nothing focusable, or null to let the browser move focus normally.
 */
export function focusTrapTarget(count: number, active: number, shift: boolean): number | 'container' | null {
  if (count <= 0) return 'container';
  if (active < 0) return shift ? count - 1 : 0;
  if (!shift && active === count - 1) return 0;
  if (shift && active === 0) return count - 1;
  return null;
}


/**
 * Opacity of an invincible fighter at time `seconds`. A smooth triangle fade between minAlpha and maxAlpha
 * (replaces the old 10 Hz hard flip). Reduced motion gives one steady value.
 */
export function invincibleAlpha(seconds: number, reducedMotion: boolean): number {
  if (reducedMotion) return INVINCIBLE_LOOK.reducedAlpha;
  const period = INVINCIBLE_LOOK.halfPeriodSeconds * 2;
  const phase = ((seconds % period) + period) % period / period; // 0..1
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0..1..0
  return INVINCIBLE_LOOK.maxAlpha - (INVINCIBLE_LOOK.maxAlpha - INVINCIBLE_LOOK.minAlpha) * tri;
}

/** Camera shake strength actually applied to the arena. Reduced motion applies none (the strength still decays). */
export function appliedShake(strength: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : strength;
}

/** Horizontal offset of the cutscene portrait: slides in over 0.35 s, or is simply in place under reduced motion. */
export function portraitSlideOffset(elapsed: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const left = 1 - Math.min(1, elapsed / 0.35);
  return left === 0 ? 0 : Math.pow(left, 2) * -420;
}


/**
 * Which fighter is updated first this frame. Updating P1 first every frame let P1's hit stun P2
 * before P2's own attack resolved, so P1 won every simultaneous trade (about 75% of CPU-vs-CPU
 * matches in the balance check). Alternating by tick gives both sides the first move equally often.
 */
export function updateOrder<T>(a: T, b: T, tick: number): [T, T] {
  return tick % 2 === 0 ? [a, b] : [b, a];
}

// ---- F57: dynamic arena camera (pure rules; the draw loop only applies the result) ----

/** Zoom that frames both fighters: 1 when they are far apart, up to maxZoom when close. */
export function cameraTargetZoom(p1x: number, p2x: number, stageW: number, fitMarginPx: number, maxZoom: number): number {
  const span = Math.abs(p1x - p2x) + fitMarginPx;
  return Math.max(1, Math.min(maxZoom, stageW / Math.max(1, span)));
}

/** Frame-rate independent ease toward a target (dt in seconds, rate per second). */
export function cameraEase(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * Math.max(0, dt));
}

/** Transform for a zoom around world x = cx, anchored at the bottom so the floor stays put. Clamped so the view never
 *  leaves the stage. Draw with ctx.translate(tx, ty); ctx.scale(s, s). */
export function cameraTransform(zoom: number, cx: number, stageW: number, stageH: number): { s: number; tx: number; ty: number } {
  const s = Math.max(1, zoom);
  const tx = Math.min(0, Math.max(stageW - s * stageW, stageW / 2 - s * cx));
  const ty = stageH - s * stageH;
  return { s, tx, ty };
}
