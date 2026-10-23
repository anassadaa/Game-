import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, advanceWeek, startMatch } from '../src/game.ts';
import { autoPick } from '../src/lineup.ts';
import { simToEnd } from '../src/highlights.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { wageBill, wageLimit, wageBreakdown, wageTarget, refreshWageBudget } from '../src/budget.ts';
const withPrev = (s, income, costs) => { s.ledger = { season: s.season, inc: { gate: 0, tv: 0, sponsor: 0, prize: 0, sales: 0, other: 0 }, out: { wages: 0, running: 0, signings: 0 }, last: s.budget, weeks: [], prev: { season: s.season - 1, income, costs } }; delete s.wageBudget; return s; };
test('target is a 55-70% share of weekly income', () => {
  for (const [inc, cost] of [[18000, 9000], [18000, 18000], [18000, 30000]]) {
    const s = withPrev(newGame(7), inc, cost); s.budget = 3000;
    const b = wageBreakdown(s);
    assert.equal(b.incomeWk, 1000);
    assert.ok(b.share >= 0.55 && b.share <= 0.70, String(b.share));
    assert.equal(wageTarget(s), b.target);
  }
});
test('profit raises, loss cuts the target; debt cuts it further', () => {
  const t = (inc, cost, cash) => { const s = withPrev(newGame(7), inc, cost); s.budget = cash; return wageTarget(s); };
  assert.ok(t(18000, 9000, 3000) > t(18000, 18000, 3000));
  assert.ok(t(18000, 18000, 3000) > t(18000, 30000, 3000));
  assert.ok(t(18000, 18000, -4000) < t(18000, 18000, 3000));
});
test('harder difficulty means a smaller wage budget for the same books', () => {
  const t = (d) => { const s = withPrev(newGame(7), 18000, 18000); s.budget = 3000; s.difficulty = d; return wageTarget(s); };
  assert.ok(t('easy') > t('medium') && t('medium') > t('hard'));
});
test('fan count alone does not move the target', () => {
  const s = withPrev(newGame(7), 18000, 18000); s.budget = 3000;
  const a = wageTarget(s); s.fans = 99; assert.equal(wageTarget(s), a);
});
test('refresh is smoothed: moves toward target but never more than 15% per step', () => {
  const s = withPrev(newGame(7), 18000, 9000); s.budget = 3000;
  s.wageBudget = { limit: 300, season: s.season, week: s.week };
  const target = wageTarget(s); assert.ok(target > 400);
  refreshWageBudget(s);
  assert.ok(s.wageBudget.limit > 300 && s.wageBudget.limit <= 345, String(s.wageBudget.limit));
  assert.equal(wageLimit(s), s.wageBudget.limit);
});
test('a new career starts with a budget that covers the current squad', () => {
  const s = newGame(7);
  assert.ok(wageLimit(s) >= wageBill(s));
});
test('stays advisory and stored budget survives weeks; recomputed every 4 weeks', () => {
  let s = newGame(7); const first = wageLimit(s);
  for (let i = 0; i < 4; i++) s = advanceWeek(simToEnd(startMatch(autoPick(s))));
  assert.ok(Number.isFinite(wageLimit(s)));
  assert.ok(s.wageBudget && s.wageBudget.week >= 1);
  assert.ok(Math.abs(wageLimit(s) - first) <= Math.ceil(first * 0.15) + 1);
});
test('saves keep the wage budget; a corrupt one is dropped, not fatal', () => {
  const s = newGame(7);
  assert.equal(decodeSave(encodeSave(s)).wageBudget.limit, s.wageBudget.limit);
  const bad = decodeSave(encodeSave({ ...s, wageBudget: { limit: 'x' } }));
  assert.ok(bad && bad.wageBudget === undefined);
  const old = { ...s }; delete old.wageBudget;
  assert.ok(decodeSave(encodeSave(old)));
});
