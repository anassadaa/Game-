import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { staffOffer, staffStance } from '../src/staff.ts';
import { setMode, managerCandidates, hireManager, managerOffer, managerStance, endOf } from '../src/managers.ts';

test('3.9 staff talks: counter only falls, limited rounds, then lock-out; full ask still signs', () => {
  const s = newGame(9); s.staff = [{ id: 'x1', name: 'Ted Lasco', role: 'fitness', rating: 10, wage: 14, contract: 1, rep: 10 }];
  const st = staffStance(s, s.staff[0]); assert.ok(st.floor <= st.ask && st.reasons.length >= 2);
  let b = s, m = '', prev = Infinity;
  for (let i = 0; i < 6; i++) { [b, m] = staffOffer(b, 'x1', 1); const c = b.deals?.['staff:x1']?.counter; if (c !== undefined) { assert.ok(c <= prev); prev = c; } }
  assert.match(m, /won't reopen|breaks off/);
  const [ok] = staffOffer(b, 'x1', st.ask); assert.equal(ok.staff[0].wage, st.ask); assert.equal(ok.staff[0].contract, 3);
});
test('3.9 manager talks: own stance (trophies, reputation, market), stored counter, walk-out', () => {
  let s = setMode(newGame(12), 'chairman'); s = structuredClone(hireManager(s, managerCandidates(s)[0].id, 1));
  s.season = endOf(s, s.hiredManager); s.week = 10;
  const st = managerStance(s, 2); assert.ok(st.reasons.some((r) => /Reputation/.test(r)) && st.rounds >= 2 && st.rounds <= 5);
  let b = s, m = '';
  for (let i = 0; i < 6; i++) [b, m] = managerOffer(b, 2, 1);
  assert.match(m, /ends talks|won't talk/);
  const [ok] = managerOffer(b, 2, st.ask); assert.equal(ok.hiredManager.wage, st.ask);
});
