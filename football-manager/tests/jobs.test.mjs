import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { applyJob, jobChance, resign, reputation, stature } from '../src/jobs.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('vacancies open, applications decided by weighted chance, resign works', () => {
  let s = newGame(11);
  const r0 = reputation(s);
  assert.ok(r0 >= 0 && r0 <= 100);
  for (let w = 0; w < 54 && !s.sacked && (w < 30 || !s.vacancies.length); w++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(s.vacancies.length > 0, 'some AI club sacked its manager');
  assert.notEqual(reputation(s), r0);
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
