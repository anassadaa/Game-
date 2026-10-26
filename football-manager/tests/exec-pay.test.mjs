import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { execPay, weeklySalary, salaryReview, wallet } from '../src/wallet.ts';
const g = (m, seed = 3) => { const s = setMode(newGame(seed), m); s.ledger.prev = { season: 1, income: 5400, costs: 4800 }; return s; };
test('3.8: owner pay scales with revenue, wages, value, squad and league — far above rating × 0.06', () => {
  const s = g('owner'), p = execPay(s);
  assert.ok(p.target >= 8, `target ${p.target}`); assert.ok(p.parts.length >= 8);
  for (const k of [/revenue/i, /wage/i, /value/i, /squad/i, /league/i, /position|target/i, /strength|quality/i, /form/i, /profit|loss/i, /role|owner/i]) assert.ok(p.parts.some((x) => k.test(x.label)), String(k));
  const big = g('owner'); big.ledger.prev.income = 20000; assert.ok(execPay(big).target > p.target);
  const rich = g('owner'); rich.players.filter((x) => x.clubId === rich.clubId).forEach((x) => (x.price *= 4)); assert.ok(execPay(rich).target > p.target);
});
test('3.8: role and standings matter', () => {
  const o = execPay(g('owner')).target, d = execPay(g('director')).target; assert.ok(o > d);
  const hi = g('owner'); hi.board = { target: 15, objective: 'x', warnings: 0 }; const lo = g('owner'); lo.board = { target: 1, objective: 'x', warnings: 0 };
  assert.ok(execPay(hi, 2).target > execPay(lo, 2).target);
});
test('3.8: reviews move pay gradually toward the target with reasons; cap far above old 3x', () => {
  const s = g('owner'); wallet(s).base = 4; const t = execPay(s, 3).target;
  salaryReview(s, 3); const a = weeklySalary(s); assert.ok(a > 4 && a < t, `${a} vs ${t}`); assert.match(wallet(s).log[0].reason, /toward|revenue|position/i);
  for (let i = 0; i < 20; i++) salaryReview(s, 3); assert.ok(weeklySalary(s) >= t * 0.8 && weeklySalary(s) <= t * 1.6);
});
test('3.8: old saves are recalculated once', () => {
  const s = g('owner'); wallet(s).base = 4; delete s.wallet.payV; const m = migrate(s);
  assert.ok(weeklySalary(m) >= execPay(m).target * 0.95); assert.equal(m.wallet.payV, 1); assert.ok(m.wallet.log.some((e) => /recalculated/i.test(e.reason)));
});
