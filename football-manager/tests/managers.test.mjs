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
  const cash = a.budget; const f = fireManager(a); assert.equal(f.hiredManager, undefined); assert.equal(f.budget, cash - a.hiredManager.wage * ((a.hiredManager.contractEnd - a.season) * 18 + 18 - a.week));
});
test('weekly: hired manager paid in non-manager modes only', () => {
  const s = newGame(12); const m = managerCandidates(s)[1]; const a = hireManager(s, m.id);
  const c = a.budget; managerWeek(a); assert.equal(a.budget, c);
  a.mode = 'chairman'; managerWeek(a); assert.equal(a.budget, c - m.wage);
});
test('validation', () => { assert.ok(validHired({})); assert.equal(validHired({ hiredManager: { id: 3 } }), false); });
import { setMode, MODES } from '../src/managers.ts';
import { advanceWeek, startMatch } from '../src/game.ts';
test('chairman mode: survives board collapse', async () => {
  let s = setMode(newGame(5), 'chairman'); assert.equal(s.mode, 'chairman'); assert.ok(MODES.some((m) => m.id === 'chairman'));
  s.trust = 1; s.week = 8;
  for (let i = 0; i < 3; i++) { s = startMatch(s); while (!s.match.complete) s = (await import('../src/game.ts')).advanceMatch(s); s = advanceWeek(s); s.trust = 1; }
  assert.equal(s.sacked, false);
});
import { canHire } from '../src/managers.ts';
test('director mode: hiring needs board trust 40+', () => {
  const s = setMode(newGame(9), 'director'); assert.equal(s.mode, 'director');
  const id = managerCandidates(s)[0].id;
  s.trust = 30; assert.equal(canHire(s), false); assert.equal(hireManager(s, id), s);
  s.trust = 50; assert.equal(canHire(s), true); assert.equal(hireManager(s, id).hiredManager.id, id);
});
