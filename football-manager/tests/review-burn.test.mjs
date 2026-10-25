import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { budgetLeft, setBudgetMod, boardRescue, plan } from '../src/delegate.ts';
import { ledger } from '../src/finance.ts';
const club = (seed = 12) => { const s = setMode(newGame(seed), 'chairman'); return structuredClone(hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3)); };
test('the transfer budget leaves enough cash to cover the real weekly burn to season end, even at +100%', () => {
  let s = setBudgetMod(club(), 100); s = structuredClone(s); s.week = 1; s.budget = 1000;
  const l = ledger(s); l.weeks = [{ w: 1, net: -90 }, { w: 2, net: -110 }]; delete s.mgr.auto;
  assert.ok(budgetLeft(s) <= Math.max(0, 1000 - 100 * 17), `left ${budgetLeft(s)}`);
  s.budget = 4000; delete s.mgr.auto; assert.ok(budgetLeft(s) > 0 && budgetLeft(s) <= 4000 - 1700, `left ${budgetLeft(s)}`);
});
test('board-forced sales happen in the January window when in the red', () => {
  const s = club(); s.week = 9; s.budget = -500; const n = ours => ours.players.filter(p => p.clubId === ours.clubId).length;
  const before = n(s); assert.ok(before > 15); const b = boardRescue(s); assert.equal(n(b), before - 1); assert.ok(plan(b).frozen);
});
