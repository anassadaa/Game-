import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, takeJob } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet, buyShares, sellShares, injectCash, repayLoan, dividendSeason, myStake, valuation, salaryReview, weeklySalary } from '../src/wallet.ts';
import { investorWeek, acceptInvestment } from '../src/investors.ts';
import { closeLedger, totalIn, totalOut } from '../src/finance.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

const fixture = newGame(3);
const game = (mode = 'owner') => setMode(structuredClone(fixture), mode);

test('loan principal is cash flow, never distributable earnings', () => {
  let s = game(); wallet(s).cash = 10000;
  const opening = s.budget;
  s = injectCash(s, 1000, 'loan');
  assert.equal(opening + totalIn(s.ledger) - totalOut(s.ledger), s.budget);
  closeLedger(s); dividendSeason(s);
  assert.equal(s.ledger.prev.income - s.ledger.prev.costs, 0);
  assert.equal(s.wallet.dividends, 0);
  assert.equal(s.wallet.loan, 1000);
  s = repayLoan(s); closeLedger(s);
  assert.equal(s.ledger.prev.costs, 0, 'repayment is not an operating loss');
  assert.equal(s.wallet.cash, 10000);
});

test('equity contributions and investor funding are not income', () => {
  let s = game(); wallet(s).cash = 10000;
  s = injectCash(s, 1000, 'equity');
  s.investor = { stakes: 0, raised: 0, offer: { name: 'Test fund', cash: 1000, stake: 10, season: 1 } };
  s = acceptInvestment(s); closeLedger(s); dividendSeason(s);
  assert.equal(s.ledger.prev.income, 0);
  assert.equal(s.wallet.dividends, 0);
});

test('director equity dilutes every existing holder and preserves the cap table', () => {
  let s = game('director'); s.investor = { stakes: 40, raised: 1000 };
  wallet(s).cash = 1000000; s = buyShares(s, 25);
  s = injectCash(s, valuation(s), 'equity');
  assert.equal(myStake(s), 63); // (25 + 100) / 2, rounded to whole percent
  assert.equal(s.investor.stakes, 20);
  assert.equal(100 - myStake(s) - s.investor.stakes, 17);
  for (let i = 0; i < 8; i++) {
    s = injectCash(s, 1000, 'equity');
    assert.ok(myStake(s) + s.investor.stakes <= 100);
  }
});

test('selling shares cancels a pending investor offer before ownership changes again', () => {
  let s = game(); s.investor = { stakes: 30, raised: 0, offer: { name: 'Fund', cash: 1000, stake: 19, season: 1 } };
  s = sellShares(s, 60);
  assert.equal(s.investor.offer, undefined);
  assert.ok(acceptInvestment(s) === s);
  assert.equal(myStake(s) + s.investor.stakes, 100);
});

test('investment acceptance rejects stale, oversized and in-match offers', () => {
  for (const patch of [{ stakes: 90 }, { offer: { name: 'Fund', cash: 100, stake: 10, season: 0 } }]) {
    const s = game(); s.investor = { stakes: 30, raised: 0, offer: { name: 'Fund', cash: 1000, stake: 19, season: 1 }, ...patch };
    assert.ok(acceptInvestment(s) === s);
  }
  const s = game(); s.match = {}; s.investor = { stakes: 0, raised: 0, offer: { name: 'Fund', cash: 1000, stake: 10, season: 1 } };
  assert.ok(acceptInvestment(s) === s);
});

test('investor payouts depend on profit and policy, with no unconditional weekly charge', () => {
  let s = game(); s.investor = { stakes: 10, raised: 1000 }; wallet(s).cash = 10000;
  s = buyShares(s, 10); s.week = 11;
  const bank = s.budget; investorWeek(s);
  assert.equal(s.investor.stakes, 0);
  assert.equal(s.budget, bank);
});

test('dividends do not reduce the following season operating profit', () => {
  const s = game(); wallet(s); s.budget = 100000;
  s.ledger.prev = { season: 1, income: 1000, costs: 0 };
  dividendSeason(s); assert.equal(s.wallet.dividends, 200);
  s.ledger.last = s.budget; closeLedger(s);
  assert.equal(s.ledger.prev.costs, 0);
});

test('changing clubs keeps old shares and loans tied to their original club', () => {
  let s = game('director'); wallet(s).cash = 10000;
  s = buyShares(s, 5); s = injectCash(s, 1000, 'loan');
  const old = s.clubId, cash = s.wallet.cash, next = s.clubs.find(c => c.id !== old).id;
  s.offers = [next]; s = takeJob(s, next);
  assert.equal(s.wallet.cash, cash);
  assert.equal(s.wallet.loan, 0);
  assert.equal(myStake(s), 0);
  assert.ok(repayLoan(s) === s);
  assert.equal(s.wallet.holdings[old].loan, 1000);
  assert.equal(s.wallet.holdings[old].stake, 5);
  s.offers = [old]; s = takeJob(s, old);
  assert.equal(s.wallet.loan, 1000);
  assert.equal(myStake(s), 5);
});

test('old investors and hired manager do not follow a new appointment', () => {
  let s = game(); wallet(s); s.investor = { stakes: 30, raised: 1000 };
  s.hiredManager = { id: 'x', name: 'Old boss', wage: 10, rating: 3, since: 1 };
  s.offers = [s.clubs.find(c => c.id !== s.clubId).id]; s = takeJob(s, s.offers[0]);
  assert.equal(s.investor, undefined);
  assert.equal(s.hiredManager, undefined);
  assert.equal(myStake(s), 0, 'a job offer is not a free purchase of the destination club');
});

test('malformed wallet data is rejected without accepting a corrupt career', () => {
  for (const patch of [{ base: 'abc' }, { base: -1 }, { investorMood: {} }, { log: [null] }, { log: 'x' }, { stake: 101 }, { cash: -1 }, { holdings: { x: { stake: 150, loan: 100 } } }]) {
    const s = game(); Object.assign(wallet(s), patch);
    assert.ok(decodeSave(encodeSave(s)) === null, JSON.stringify(patch));
  }
});

test('valid v2.3 wallet and missing-wallet saves still load', () => {
  const s = game(); wallet(s); s.wallet.cash = 1234;
  const loaded = decodeSave(encodeSave(s));
  assert.ok(loaded); assert.equal(loaded.wallet.cash, 1234);
  delete s.wallet; assert.ok(decodeSave(encodeSave(s)));
});

test('season-end salary review retains completed season transfer profit', () => {
  const s = game('director'); wallet(s); s.ledger.inc.sales = 1000; s.ledger.out.signings = 100; s.budget += 900; s.ledger.last = s.budget;
  const pay = s.wallet.cash; closeLedger(s); const base = weeklySalary(s);
  salaryReview(s, 10, { outcome: 'Stayed the course', trophies: 0 });
  assert.equal(s.wallet.cash - pay, base * 4); // profitable-sales bonus: four weeks of the pre-review base
  assert.ok(s.wallet.log.some(e => e.kind === 'bonus' && e.reason.includes('profitable sales')));
});
