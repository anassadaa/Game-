import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet, walletWeek, weeklySalary } from '../src/wallet.ts';
const own = (seed = 3) => setMode(newGame(seed), 'owner');
test('owner pay is deferred while the bank is negative and paid back after recovery', () => {
  const s = own(); const pay = weeklySalary(s); assert.ok(pay > 0);
  s.budget = -100; const cash = wallet(s).cash;
  walletWeek(s); assert.equal(s.budget, -100, 'club not charged'); assert.equal(wallet(s).cash, cash); assert.equal(wallet(s).owed, pay);
  s.budget = 10000; walletWeek(s); assert.equal(wallet(s).owed, undefined); assert.equal(wallet(s).cash, cash + 2 * pay); assert.equal(s.budget, 10000 - 2 * pay);
});
test('pay that would push the bank negative is deferred, not drawn', () => {
  const s = own(); const pay = weeklySalary(s); s.budget = pay - 1; walletWeek(s); assert.equal(s.budget, pay - 1); assert.equal(wallet(s).owed, pay);
});
