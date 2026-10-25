import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { applyJob, jobChance, resign, reputation, stature } from '../src/jobs.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('vacancies open, applications decided by weighted chance, resign works', () => {
  // Seed-robust: take the first career that survives long enough to see a vacancy (a sacking ends the loop early).
  let s, r0, moved = false;
  for (const seed of [11, 12, 13, 14, 15]) {
    s = newGame(seed); r0 = reputation(s); moved = false;
    assert.ok(r0 >= 0 && r0 <= 100);
    for (let w = 0; w < 54 && !s.sacked && (w < 30 || !s.vacancies.length); w++) { s = advanceWeek(simToEnd(startMatch(s))); moved ||= reputation(s) !== r0; }
    if (!s.sacked) break;
  }
  assert.ok(s.vacancies.length > 0, 'some AI club sacked its manager');
  assert.ok(moved, 'reputation moves with results');
  const big = [...s.clubs].sort((a, b) => stature(b) - stature(a))[0];
  const small = [...s.clubs].filter((c) => c.id !== s.clubId).sort((a, b) => stature(a) - stature(b))[0];
  assert.ok(jobChance(s, big.id).chance < jobChance(s, small.id).chance);
  const v = s.vacancies[0];
  const [a, res] = applyJob(s, v.clubId);
  assert.ok(res.interview && res.chance > 0);
  if (res.ok) assert.equal(a.clubId, v.clubId); else { assert.ok(res.reason); assert.equal(applyJob(a, v.clubId)[1].chance, 0); }
  const q = resign(a);
  assert.ok(q.sacked && q.resigned && q.offers.length > 0);
  assert.ok(decodeSave(encodeSave(q)));
  const old = structuredClone(s); delete old.reputation; delete old.vacancies;
  assert.ok(decodeSave(encodeSave(old)));
});
test('reputation factor is capped at ±40', async () => {
  const { newGame } = await import('../src/game.ts'); const { jobChance } = await import('../src/jobs.ts');
  const s = newGame(9); s.reputation = 100;
  const small = [...s.clubs].sort((a, b) => a.rating - b.rating)[0];
  const big = [...s.clubs].sort((a, b) => b.rating - a.rating)[0];
  assert.equal(jobChance(s, small.id).factors[0].value, 40);
  s.reputation = 0;
  assert.equal(jobChance(s, big.id).factors[0].value, -40);
});
test('job rows show the two biggest factors first', async () => {
  const { topFactors } = await import('../src/jobs.ts');
  const f = [{ label: 'a', value: 3 }, { label: 'b', value: -20 }, { label: 'c', value: 12 }, { label: 'd', value: 0 }];
  assert.deepEqual(topFactors(f).map((x) => x.label), ['b', 'c']);
});
