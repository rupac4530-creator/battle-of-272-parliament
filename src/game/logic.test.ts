import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POLITICIANS,
  calculateHitDamage,
  checkVictoryCondition,
  calculateAIUtilities,
  getCounterfactualExplanation,
  createCombatant
} from './logic';

test('Politicians roster contains all 9 authentic politicians', () => {
  assert.equal(POLITICIANS.length, 9);
  const ids = POLITICIANS.map(p => p.id);
  assert.ok(ids.includes('modi'), 'Missing Modi');
  assert.ok(ids.includes('shah'), 'Missing Shah');
  assert.ok(ids.includes('rahul'), 'Missing Rahul');
  assert.ok(ids.includes('yogi'), 'Missing Yogi');
  assert.ok(ids.includes('rajnath'), 'Missing Rajnath');
  assert.ok(ids.includes('sitharaman'), 'Missing Sitharaman');
  assert.ok(ids.includes('kharge'), 'Missing Kharge');
  assert.ok(ids.includes('kejriwal'), 'Missing Kejriwal');
  assert.ok(ids.includes('mamata'), 'Missing Mamata');
});

test('Politician speech and meme dialogues are accurate', () => {
  const modi = POLITICIANS.find(p => p.id === 'modi');
  assert.ok(modi?.speechText.includes('अङ्गेन गात्रं'), 'Modi shloka missing');

  const shah = POLITICIANS.find(p => p.id === 'shah');
  assert.ok(shah?.speechText.includes('अरे भाई बैठो ना'), 'Shah meme missing');

  const rahul = POLITICIANS.find(p => p.id === 'rahul');
  assert.ok(rahul?.memeDialogue.includes('आलू'), 'Rahul meme missing');

  const yogi = POLITICIANS.find(p => p.id === 'yogi');
  assert.ok(yogi?.speechText.includes('टोंटीचोर'), 'Yogi meme missing');

  const rajnath = POLITICIANS.find(p => p.id === 'rajnath');
  assert.ok(rajnath?.speechText.includes('मोये-मोये'), 'Rajnath meme missing');

  const sitharaman = POLITICIANS.find(p => p.id === 'sitharaman');
  assert.ok(sitharaman?.speechText.includes('middle class'), 'Sitharaman meme missing');

  const kharge = POLITICIANS.find(p => p.id === 'kharge');
  assert.ok(kharge?.speechText.includes('बाप'), 'Kharge meme missing');

  const kejriwal = POLITICIANS.find(p => p.id === 'kejriwal');
  assert.ok(kejriwal?.speechText.includes('परेशान'), 'Kejriwal meme missing');

  const mamata = POLITICIANS.find(p => p.id === 'mamata');
  assert.ok(mamata?.speechText.includes('हुम्बा'), 'Mamata meme missing');
});

test('calculateHitDamage applies blocking defense correctly', () => {
  const normalHit = calculateHitDamage(0, false, 20);
  assert.equal(normalHit.finalDamage, 20);
  assert.equal(normalHit.knockbackMultiplier, 1.0);

  const blockedHit = calculateHitDamage(0, true, 20);
  assert.equal(blockedHit.finalDamage, 5); // 75% reduction
  assert.equal(blockedHit.knockbackMultiplier, 0.3);

  const boostedHit = calculateHitDamage(5, false, 20);
  assert.equal(boostedHit.finalDamage, 30); // 1.5x boost
});

test('checkVictoryCondition detects HP knockout and 272 seats victory', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const p2 = createCombatant(POLITICIANS[1], 600, true);

  // Active match
  assert.equal(checkVictoryCondition(p1, p2, 50), null);

  // Knockout
  p2.hp = 0;
  const koResult = checkVictoryCondition(p1, p2, 50);
  assert.ok(koResult != null);
  assert.equal(koResult?.winner.c.id, 'modi');
  assert.ok(koResult?.reason.includes('Knockout'));

  // 272 Seats Majority
  p2.hp = 100;
  p1.seats = 272;
  const seatsResult = checkVictoryCondition(p1, p2, 50);
  assert.ok(seatsResult != null);
  assert.equal(seatsResult?.winner.c.id, 'modi');
  assert.ok(seatsResult?.title.includes('272 MAJORITY'));
});

test('calculateAIUtilities chooses Super when 100% full', () => {
  const p1 = createCombatant(POLITICIANS[0], 200, false);
  const ai = createCombatant(POLITICIANS[1], 300, true);
  ai.meter = 100;

  const decision = calculateAIUtilities(ai, p1, []);
  assert.equal(decision.best, 'Super');
  assert.ok(decision.why.includes('100% primed'));

  const cf = getCounterfactualExplanation('Strike', 10, decision);
  assert.ok(cf.includes('Strike yielded EV'));
});
