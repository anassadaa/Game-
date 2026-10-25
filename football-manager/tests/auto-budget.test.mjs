import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { plan, autoBudget, setBudgetMod, delegateWeek } from '../src/delegate.ts';
import { wallet } from '../src/wallet.ts';
import { wageLimit } from '../src/budget.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade, clubDecision, investmentWeek, clubAuto } from '../src/investments.ts';
const owner = (seed = 5) => { const s = setMode(newGame(seed), 'chairman'); return structuredClone(hireManager(s, managerCandidates(s).find(m => m.rating < 5).id, 2)); };
test('auto budget is deterministic and follows bank balance and results', () => {
  const s = owner(); const a = autoBudget(s); assert.deepEqual(autoBudget(structuredClone(s)), a);
  assert.ok(a.transfer > 0 && a.wage > 0);
  const rich = structuredClone(s); rich.budget *= 3; assert.ok(autoBudget(rich).transfer > a.transfer);
  const bad = structuredClone(s); bad.results = Array.from({ length: 6 }, () => ({ us: 0, them: 3 }));
  const good = structuredClone(s); good.results = Array.from({ length: 6 }, () => ({ us: 3, them: 0 }));
  assert.ok(autoBudget(good).transfer > autoBudget(bad).transfer);
});
test('% modifier: -50..+100, persists, applied on top of auto', () => {
  const s = owner(); const p0 = plan(s); const a = autoBudget(s);
  assert.equal(p0.transfer, a.transfer);
  const m = setBudgetMod(s, 20); assert.equal(plan(m).mod, 20); assert.equal(plan(m).transfer, Math.round(a.transfer * 1.2)); assert.equal(plan(m).wage, Math.min(wageLimit(m), Math.round(a.wage * 1.2))); assert.ok(plan(setBudgetMod(s, 100)).wage <= wageLimit(s));
  assert.equal(setBudgetMod(s, 101), s); assert.equal(setBudgetMod(s, -51), s); assert.equal(setBudgetMod(s, 2.5), s);
  assert.equal(plan(setBudgetMod(s, -50)).transfer, Math.round(a.transfer * 0.5));
  // next window / season: recomputed, mod persists
  const n = structuredClone(m); n.week = 9; n.budget *= 2; delegateWeek(n); assert.equal(plan(n).mod, 20); assert.equal(plan(n).transfer, Math.round(autoBudget(n).transfer * 1.2));
  const ns = structuredClone(m); ns.season += 1; ns.week = 1; assert.equal(plan(ns).mod, 20); assert.equal(plan(ns).spent, 0);
});
test('boardroom clubs: auto budgets at windows with a persistent % modifier', () => {
  let s = setMode(newGame(73), 'owner'); wallet(s).cash = 1e5; s = prepareInvestments(s);
  const id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id; s = executeTrade(s, quoteTrade(s, id, 'buy', 60));
  const a = clubAuto(s, id); assert.ok(a.transfer >= 0 && a.wage > 0); assert.deepEqual(clubAuto(structuredClone(s), id), a);
  s = clubDecision(s, id, 'budget-mod', 50); assert.equal(s.investments.clubs[id].budgetMod, 50);
  assert.equal(s.investments.clubs[id].transferBudget, Math.round(clubAuto(s, id).transfer * 1.5));
  assert.equal(clubDecision(s, id, 'budget-mod', 200), s);
  s = structuredClone(s); s.week = 9; investmentWeek(s);
  assert.equal(s.investments.clubs[id].budgetMod, 50); const tb = s.investments.clubs[id].transferBudget, want = clubAuto(s, id).transfer * 1.5; assert.ok(tb <= want * 1.05 + 1 && tb >= 0, `${tb} vs ${want}`); assert.ok(Math.abs(s.investments.clubs[id].wageLimit - clubAuto(s, id).wage * 1.5) <= clubAuto(s, id).wage * 0.1);
});
