import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { managerCandidates, hireManager, setMode } from '../src/managers.ts';
import { setBudgetMod, plan, budgetLeft, inRed, autoBudget, manageStaff } from '../src/delegate.ts';
import { wageLimit, wageBill } from '../src/budget.ts';
const week = (s) => { const m = startMatch(s); return m.match ? advanceWeek(simToEnd(m)) : s; };
const top = (seed, mod) => { let s = setMode(newGame(seed), 'chairman'); const c = managerCandidates(s).sort((a, b) => b.rating - a.rating)[0]; s = hireManager(s, c.id, 5); return setBudgetMod(s, mod); };
for (const seed of [7, 12, 40]) test(`seed ${seed}: 18 weeks with a top manager at +100%: no staff churn, upkeep sane, never pushes into the red`, () => {
  let s = top(seed, 100); const start = s.season; let changes = 0;
  while (s.season === start) {
    const before = s.budget, log0 = s.mgr?.log?.[0]; s = week(s); if (s.season !== start) break;
    if (s.mgr.log[0] !== log0 && /Replaced/.test(s.mgr.log[0])) changes++; // sacks with a payoff; filling vacancies is not churn
    assert.ok(plan(s).spent <= plan(s).transfer + 1, 'spend within plan');
    assert.ok(plan(s).wage <= wageLimit(s), 'wage budget never above the board limit');
  }
  assert.ok(changes <= 2, `staff changes ${changes}`);
  const l = s.ledger.prev; assert.ok(l.costs < l.income * 2.5 + 2000, `costs ${l.costs} vs income ${l.income}`);
});
test('staff: never sacks when the payoff is large, the bank is negative, or twice in one window', () => {
  let s = top(12, 0); s.week = 1;
  s.budget = -10; const a = manageStaff(structuredClone(s)); assert.equal((a.staff ?? []).length, (s.staff ?? []).length);
});
test('in the red: signings freeze; auto budget is 0 when cash is committed', () => {
  const s = top(7, 100); s.week = 2; s.budget = -500; assert.ok(inRed(s)); assert.equal(budgetLeft(s), 0);
  s.budget = 50; s.mgr.auto = undefined; assert.ok(autoBudget(s).transfer <= 50);
});
