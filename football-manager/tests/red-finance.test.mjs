import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet, walletWeek, weeklySalary } from '../src/wallet.ts';
const own = (seed = 3) => setMode(newGame(seed), 'owner');
test('owner pay is deferred while the bank is negative and paid back after recovery', () => {
  const s = own(); const pay = weeklySalary(s); assert.ok(pay > 0);
  s.budget = -100; const cash = wallet(s).cash;
  walletWeek(s); assert.equal(s.budget, -100, 'club not charged'); assert.equal(wallet(s).cash, cash); assert.equal(wallet(s).owed, pay);
  s.budget = 10000; const pay2 = weeklySalary(s); walletWeek(s); assert.equal(wallet(s).owed, undefined); assert.equal(wallet(s).cash, cash + pay + pay2); assert.equal(s.budget, 10000 - pay - pay2);
});
test('pay that would push the bank negative is deferred, not drawn', () => {
  const s = own(); const pay = weeklySalary(s); s.budget = pay - 1; walletWeek(s); assert.equal(s.budget, pay - 1); assert.equal(wallet(s).owed, pay);
});
import { weeklyCosts, weeksUntilBroke } from '../src/budget.ts';
import { inRed, boardRescue, plan } from '../src/delegate.ts';
import { managerCandidates, hireManager } from '../src/managers.ts';
import { isProtected } from '../src/protect.ts';
test('weekly costs count staff, manager, upkeep and owner pay; weeks until broke', () => {
  let s = own(); s = hireManager(s, managerCandidates(s)[0].id); const c = weeklyCosts(s);
  assert.equal(c.total, c.players + c.staff + c.manager + c.upkeep + c.owner); assert.ok(c.manager > 0 && c.upkeep >= 0);
  s.budget = -1; assert.equal(weeksUntilBroke(s), 0); assert.ok(inRed(s));
  s.budget = 1e7; assert.ok(weeksUntilBroke(s) > 4);
});
test('red check fires on a short runway even with wages under the limit', () => {
  let s = own(); s = hireManager(s, managerCandidates(s)[0].id); s.hiredManager.wage = 5000; s.budget = 100;
  assert.ok(weeksUntilBroke(s) < 4); assert.ok(inRed(s));
});
test('overdrawn outside a window: emergency loan of an unprotected high earner, never a protected one', () => {
  let s = own(5); s = hireManager(s, managerCandidates(s)[0].id); s.week = 5; s.budget = -2000;
  const bench = s.players.filter((p) => p.clubId === s.clubId && !p.starting).sort((a, b) => b.wage - a.wage);
  const star = bench[0]; star.wage = 900; star.age = 19; star.potential = star.rating + 20; // protected top earner
  const next = bench[1]; next.wage = 800; next.age = 29;
  const b = boardRescue(s);
  assert.ok(b.players.some((p) => p.id === star.id), 'protected stays'); assert.ok(!b.players.some((p) => p.id === next.id), 'earner goes');
  assert.equal(b.loansOut.at(-1).id, next.id); assert.ok(isProtected(star));
});
import { rescueNeed } from '../src/budget.ts';
import { injectCash } from '../src/wallet.ts';
test('rescue loan clears the overdraft from the wallet in one tap', () => {
  const s = own(); s.budget = -730; const need = rescueNeed(s); assert.ok(need >= 730 && need % 50 === 0);
  wallet(s).cash = need + 10; const b = injectCash(s, need, 'loan');
  assert.ok(b.budget > 0); assert.equal(wallet(b).loan, need); assert.equal(wallet(b).cash, 10);
});
import { budgetLeft } from '../src/delegate.ts';
import { readFileSync } from 'node:fs';
test('3.2: Finance tab shows budgetLeft (0 in the red)', () => {
  let s = own(); s = hireManager(s, managerCandidates(s)[0].id); s.budget = -50; assert.equal(budgetLeft(s), 0);
  const src = readFileSync(new URL('../src/FinanceTab.tsx', import.meta.url), 'utf8'); assert.match(src, /budgetLeft\(state\)/); assert.doesNotMatch(src, /p\.transfer - p\.spent/);
});
