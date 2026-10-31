import { Politician, Combatant, AIDecision, GameEnding, PowerUp } from './types';

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
    voicePitch: 0.85,
    voiceRate: 0.95,
    pickupLine: 'Mitron! Are you a development bill? Because I pass you unanimously!',
    description: 'Impeccable white beard, rimless spectacles, silk kurta with iconic saffron Modi jacket & gold lotus badge.',
    stats: { power: 92, speed: 78, defense: 88 }
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
    voicePitch: 0.75,
    voiceRate: 0.9,
    pickupLine: 'Aap chronology samajhiye—first we meet, then we form an eternal coalition!',
    description: 'Crisp bald crown with salt-and-pepper side trim, dense beard, glasses, white khadi kurta and dark formal vest.',
    stats: { power: 85, speed: 75, defense: 95 }
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
    voicePitch: 1.05,
    voiceRate: 1.05,
    pickupLine: 'Forget hatred, I opened a Mohabbat Ki Dukaan just for you!',
    description: 'Wavy dark hair, salt-and-pepper athletic stubble, iconic White Bharat Jodo Polo T-shirt and denim trousers.',
    stats: { power: 78, speed: 96, defense: 76 }
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
    voicePitch: 0.8,
    voiceRate: 1.0,
    pickupLine: 'Even my bulldozer stops in its tracks when you enter the House!',
    description: 'Shaved head with red chandan tilak, saffron monk robes, dark brown rudraksha mala and gold ear kundals.',
    stats: { power: 98, speed: 72, defense: 94 }
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
    voicePitch: 0.9,
    voiceRate: 0.95,
    pickupLine: 'I refuse to do Kadi Ninda when your smile disarms all my radar shields!',
    description: 'Side-parted grey hair, crimson tilak, crisp white kurta with dark olive-navy bandhgala vest and tricolor pocket square.',
    stats: { power: 86, speed: 80, defense: 84 }
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
    voicePitch: 1.25,
    voiceRate: 1.0,
    pickupLine: 'You are the only special exemption in my Union Budget with zero percent GST!',
    description: 'Rich maroon Sambalpuri/Kanjeevaram silk saree with gilded zari border, red round bindi, silver-streaked low bun, and red Bahi-Khata ledger.',
    stats: { power: 82, speed: 84, defense: 86 }
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
    voicePitch: 0.72,
    voiceRate: 0.92,
    pickupLine: 'Forget Rule 267—I move to suspend all parliamentary business just to listen to you!',
    description: 'Prominent dark frame spectacles, snow white hair, spotless white khadi kurta, Congress tricolor angavastram stole, and giant mahogany gavel.',
    stats: { power: 89, speed: 74, defense: 92 }
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
    voicePitch: 1.15,
    voiceRate: 1.1,
    pickupLine: '200 units of electricity are totally free, and my vote for you is 100% unconditional!',
    description: 'Iconic white AAP Gandhi cap with lettering, thick maroon woolen muffler wrapped around ears/neck, navy sweater, and golden broom (jhadu).',
    stats: { power: 76, speed: 94, defense: 80 }
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
    voicePitch: 1.35,
    voiceRate: 1.15,
    pickupLine: 'Khela Hobe! Pass the football to Didi and we will win the parliamentary cup together!',
    description: 'Crisp white Dhaniakhali Tant cotton saree with striking blue border, neat low bun, spectacles, white-and-blue rubber Hawai chappals, and football.',
    stats: { power: 84, speed: 98, defense: 78 }
  }
];

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
    meter: 100,
    seats: 120,
    cdSpecial: 0,
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
    surge: 0,
    blast: 0,
    chain: 0,
    rain: 0,
    rainTimer: 0,
    isAI,
    thought: '',
    blocking: false,
    input: {
      left: 0,
      right: 0,
      jump: 0,
      block: 0,
      strike: 0,
      special: 0,
      superMove: 0,
      pickupLine: 0
    }
  };
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
    dmg *= 0.25;
    kb = 0.3;
  }

  return { finalDamage: Math.round(dmg * 10) / 10, knockbackMultiplier: kb };
}

/**
 * Check if the game has ended and determine victory reason
 */
export function checkVictoryCondition(
  p1: Combatant,
  p2: Combatant,
  remainingTime: number
): GameEnding | null {
  if (p1.hp <= 0) {
    return {
      winner: p2,
      reason: 'Floor Knockout in the Lok Sabha Well',
      code: 2,
      title: 'GOVERNMENT COLLAPSE BY KNOCKOUT',
      narrative: `The ruling coalition collapses on the floor of the Lok Sabha! ${p2.c.name} marches to Rashtrapati Bhavan to stake claim to form the new union cabinet.`
    };
  }

  if (p2.hp <= 0) {
    return {
      winner: p1,
      reason: 'Floor Knockout in the Lok Sabha Well',
      code: 1,
      title: 'THE 272+ SINGLE-PARTY MANDATE',
      narrative: `With total dominance on the floor, ${p1.c.name} passes 48 crucial bills in 10 minutes without disruption! The opposition stages an indefinite samosa walkout.`
    };
  }

  if (p1.seats >= 272) {
    return {
      winner: p1,
      reason: 'Reached 272 Constitutional Majority Seats',
      code: 1,
      title: 'HISTORIC 272 MAJORITY SECURED',
      narrative: `By commanding the central Speaker's podium, ${p1.c.name} crossed the magic 272 seat threshold! A stable full-term government is officially sworn in.`
    };
  }

  if (p2.seats >= 272) {
    return {
      winner: p2,
      reason: 'Reached 272 Constitutional Majority Seats',
      code: 2,
      title: 'HISTORIC 272 MAJORITY SECURED',
      narrative: `By commanding the central Speaker's podium, ${p2.c.name} crossed the magic 272 seat threshold! A stable full-term government is officially sworn in.`
    };
  }

  if (remainingTime <= 0) {
    const p1Total = p1.hp + p1.seats;
    const p2Total = p2.hp + p2.seats;
    if (p1Total >= p2Total) {
      return {
        winner: p1,
        reason: 'Zero-Hour Expired — Higher Combined Parliamentary Standing',
        code: 3,
        title: 'HUNG PARLIAMENT: LEADING ALLIANCE SWORN IN',
        narrative: `Time ran out during the turbulent Zero Hour! With higher seats and stamina, ${p1.c.name} leads the governing coalition.`
      };
    } else {
      return {
        winner: p2,
        reason: 'Zero-Hour Expired — Higher Combined Parliamentary Standing',
        code: 3,
        title: 'HUNG PARLIAMENT: LEADING ALLIANCE SWORN IN',
        narrative: `Time ran out during the turbulent Zero Hour! With higher seats and stamina, ${p2.c.name} leads the governing coalition.`
      };
    }
  }

  return null;
}

/**
 * Mathematical Expected Value (EV) calculation for Explainable AI
 */
export function calculateAIUtilities(
  ai: Combatant,
  target: Combatant,
  powerUps: PowerUp[]
): AIDecision {
  const d = Math.abs(ai.x - target.x);

  let closestPowerUp: PowerUp | null = null;
  let minPowerUpDist = 1e9;
  for (const pu of powerUps) {
    const dist = Math.abs(pu.x - ai.x);
    if (dist < minPowerUpDist) {
      minPowerUpDist = dist;
      closestPowerUp = pu;
    }
  }

  const utilities: Record<string, number> = {
    Strike: (d < 72 ? 62 : -20) + (target.stun > 0 ? 20 : 0) - (ai.atk > 0 ? 50 : 0),
    Special: ai.cdSpecial > 0 ? -99 : (d < 220 ? 48 + (target.blocking ? 18 : 0) : 10),
    Super: ai.meter >= 100 ? 78 + (100 - target.hp) * 0.35 : -99,
    Approach: d > 72 ? 15 + (d - 72) * 0.12 : -15,
    Retreat: (ai.hp < 30 && d < 170) ? 42 + (30 - ai.hp) : (d < 45 ? 14 : -20),
    Block: (target.atk > 0 && d < 100) ? 62 : -5,
    Pickup: closestPowerUp ? (35 + (closestPowerUp.type === 'cup' ? (100 - ai.hp) * 0.6 : closestPowerUp.type === 'case' ? (100 - ai.meter) * 0.3 : 15) - minPowerUpDist * 0.06) : -99,
    Podium: 22 + (272 - ai.seats) * 0.05 - Math.abs(ai.x - 400) * 0.04
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

  const whyMap: Record<string, string> = {
    Strike: `Target is within close melee reach (${Math.round(d)}px)`,
    Special: `${ai.c.specialName} is primed and target is in target trajectory (${Math.round(d)}px)`,
    Super: `Super meter is 100% primed, capitalizing on opponent (${Math.round(target.hp)} HP)`,
    Approach: `Target is ${Math.round(d)}px away, closing distance to engage`,
    Retreat: `Health is critical (${Math.round(ai.hp)} HP), repositioning to safety`,
    Block: `Opponent is mid-swing within striking distance (${Math.round(d)}px)`,
    Pickup: closestPowerUp ? `Grabbing high-priority ${POWERUP_NAMES[closestPowerUp.type]?.split(':')[0]} (${Math.round(minPowerUpDist)}px away)` : 'No item nearby',
    Podium: `Controlling Speaker Podium (${Math.round(ai.seats)}/272 seats)`
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

  const explanations: Record<string, string> = {
    Strike: `Strike yielded EV (${ev}) because opponent is ${d}px away (requires <72px melee range). Swinging here would whiff and leave AI exposed to counter-attack.`,
    Special: `Special yielded EV (${ev}) because the signature ability is either on cooldown or target is outside optimal trajectory.`,
    Super: `Super yielded EV (${ev}) because the Super Meter is only ${Math.round(decision.aiStats.meter)}% (requires full 100% charge).`,
    Block: `Block yielded EV (${ev}) because the opponent was not actively initiating a strike. Blocking with no incoming threat forfeits offensive frame advantage.`,
    Approach: `Approach yielded EV (${ev}) because distance is already closed (${d}px) or executing an immediate action grants higher mathematical payoff.`,
    Retreat: `Retreat yielded EV (${ev}) because AI health (${Math.round(decision.aiStats.hp)}%) is stable, so ceding ground would forfeit stage control.`,
    Podium: `Podium yielded EV (${ev}) because direct combat engagement took tactical precedence over seat accumulation right now.`,
    Pickup: `Pickup yielded EV (${ev}) because no canteen item is close enough to justify diverting from combat.`
  };

  return explanations[action] || `Action yielded lower Expected Value (${ev}) compared to ${decision.best} (+${bestEv}).`;
}
