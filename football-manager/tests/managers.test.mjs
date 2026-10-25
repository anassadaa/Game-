import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { managerCandidates, hireManager, fireManager, managerWeek, validHired } from '../src/managers.ts';
test('four stable candidates with ratings 1-5 and wages', () => {
  const s = newGame(12); const c = managerCandidates(s);
  assert.equal(c.length, 4); assert.deepEqual(managerCandidates(s), c);
  assert.ok(c.every((m) => m.rating >= 1 && m.rating <= 5 && m.wage > 0));
});
test('hiring sets tactics; firing costs compensation', () => {
  const s = newGame(12); const m = managerCandidates(s)[0];
  const a = hireManager(s, m.id); assert.equal(a.hiredManager.id, m.id); assert.equal(a.tactics.mentality, m.style); assert.equal(a.tactics.formation, m.formation);
  const cash = a.budget; const f = fireManager(a); assert.equal(f.hiredManager, undefined); assert.equal(f.budget, cash - m.wage * 6);
});
test('weekly: hired manager paid in non-manager modes only', () => {
  const s = newGame(12); const m = managerCandidates(s)[1]; const a = hireManager(s, m.id);
  const c = a.budget; managerWeek(a); assert.equal(a.budget, c);
  a.mode = 'chairman'; managerWeek(a); assert.equal(a.budget, c - m.wage);
});
test('validation', () => { assert.ok(validHired({})); assert.equal(validHired({ hiredManager: { id: 3 } }), false); });
