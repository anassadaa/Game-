import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, takeJob, startMatch, advanceWeek, signPlayer, negotiate, askingPrice, acceptBid, ownerVoteWeek } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet, myStake, buyShares as legacyBuy, dividendSeason } from '../src/wallet.ts';
import { earnedCosts, sync } from '../src/finance.ts';
import { simToEnd } from '../src/highlights.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade, clubDecision, fundClub, repayClubLoan, clubCandidates, hireClubManager, investmentWeek, portfolioSummary, validInvestments, makeTransfer } from '../src/investments.ts';

const fixture = newGame(73);
const setup = () => { const s = setMode(structuredClone(fixture), 'owner'); wallet(s).cash = 100000; return prepareInvestments(s); };
const target = s => marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75);
const buy = (s, id, pct) => executeTrade(s, quoteTrade(s, id, 'buy', pct));

test('legacy migration preserves wallet and archived assets without mutating input', () => {
  const old = setMode(structuredClone(fixture), 'director'); wallet(old).cash = 4321;
  const id = old.clubs.find(c => c.id !== old.clubId).id;
  old.wallet.holdings = { [id]: { stake: 20, loan: 750, investorStakes: 30, investorRaised: 400 } };
  const s = prepareInvestments(old);
  assert.equal(old.investments, undefined); assert.equal(s.wallet.cash, 4321);
  const c = marketClubs(s).find(c => c.id === id); assert.equal(c.stake, 20); assert.equal(c.loan, 750);
  assert.equal(marketClubs(s).length, s.clubs.length); assert.ok(validInvestments(s));
});

test('existing-share purchase pays seller, never the club bank; fees prevent free round trips', () => {
  const s = setup(), c = target(s), q = quoteTrade(s, c.id, 'buy', 5);
  assert.ok(q.ok); const cash = s.wallet.cash, clubCash = c.cash;
  const b = executeTrade(s, q), after = marketClubs(b).find(x => x.id === c.id);
  assert.equal(b.wallet.cash, cash - q.total); assert.equal(after.cash, clubCash); assert.equal(after.stake, 5);
  assert.equal(marketClubs(s).find(x => x.id === c.id).stake, 0);
  const sell = quoteTrade(b, c.id, 'sell', 5); assert.ok(sell.ok);
  const sold = executeTrade(b, sell); assert.ok(sold.wallet.cash < cash);
  assert.equal(marketClubs(sold).find(x => x.id === c.id).stake, 0);
});

test('stale quotes, invalid amounts and unaffordable trades do not execute', () => {
  const s = setup(), id = target(s).id, q = quoteTrade(s, id, 'buy', 5);
  const b = buy(s, id, 1); assert.ok(executeTrade(b, q) === b);
  for (const pct of [0, -1, NaN, Infinity, 101, 0.5]) assert.equal(quoteTrade(s, id, 'buy', pct).ok, false);
  s.wallet.cash = 0; assert.equal(quoteTrade(s, id, 'buy', 1).ok, false);
});

test('50 percent does not grant unilateral control; 51 does, with a disclosed premium', () => {
  let s = setup(); const id = target(s).id;
  const large = quoteTrade(s, id, 'buy', 51); assert.ok(large.premium > 0);
  s = buy(s, id, 50); assert.ok(clubDecision(s, id, 'strategy', 'youth') === s);
  s = buy(s, id, 1); const changed = clubDecision(s, id, 'strategy', 'youth');
  assert.ok(changed !== s); assert.equal(marketClubs(changed).find(c => c.id === id).controlled, true);
  changed.investments.clubs[id].liquidity = 100000;
  s = executeTrade(changed, quoteTrade(changed, id, 'sell', 2));
  assert.equal(marketClubs(s).find(c => c.id === id).controlled, false);
  assert.ok(clubDecision(s, id, 'strategy', 'growth') === s);
});

test('loans isolate club accounts and remain liabilities, not profit', () => {
  let s = setup(); const a = target(s).id, b = s.clubs.find(c => c.id !== a && c.id !== s.clubId).id;
  const bank = marketClubs(s).find(c => c.id === a).cash, untouched = marketClubs(s).find(c => c.id === b).cash;
  const own = s.budget, cash = s.wallet.cash;
  s = fundClub(s, a, 1000, 'loan');
  let c = marketClubs(s).find(c => c.id === a);
  assert.equal(c.cash, bank + 1000); assert.equal(c.loan, 1000); assert.equal(c.profit, 0);
  assert.equal(s.budget, own); assert.equal(marketClubs(s).find(c => c.id === b).cash, untouched);
  s = repayClubLoan(s, a); c = marketClubs(s).find(c => c.id === a);
  assert.equal(c.loan, 0); assert.equal(c.cash, bank); assert.equal(s.wallet.cash, cash);
});

test('new equity reaches club cash and dilutes existing holders proportionately', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 25);
  const before = marketClubs(s).find(c => c.id === id);
  s = fundClub(s, id, before.value, 'equity');
  const c = marketClubs(s).find(c => c.id === id);
  assert.equal(c.stake, 63); assert.equal(c.cash, before.cash + before.value); assert.equal(c.profit, 0);
  assert.ok(c.stake + c.investors <= 100);
});

test('all clubs evolve weekly, repeated ticks are inert, and losses move prices', () => {
  const s = setup(), id = target(s).id, before = marketClubs(s).find(c => c.id === id);
  s.investments.clubs[id].wageLimit = 10000; s.investments.clubs[id].manager.wage = 500;
  s.week = 1; investmentWeek(s);
  const c = marketClubs(s).find(c => c.id === id); assert.notEqual(c.cash, before.cash); assert.ok(c.profit < 0);
  const snapshot = JSON.stringify(s.investments); investmentWeek(s); assert.equal(JSON.stringify(s.investments), snapshot);
  assert.ok(c.history.length > 1); assert.ok(c.reasons.length > 0);
});

test('season dividends are paid once from profit and never from a loan injection', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 60);
  s = clubDecision(s, id, 'dividend', 'high');
  const b = s.investments.clubs[id]; b.ledger.inc.gate = 1000; b.cash += 1000; b.ledger.last = b.cash;
  s.week = 18; const before = s.wallet.cash; investmentWeek(s);
  assert.ok(s.wallet.cash > before); const paid = s.wallet.cash;
  investmentWeek(s); assert.equal(s.wallet.cash, paid);
  s = setup(); const next = target(s).id; s = fundClub(s, next, 1000, 'loan');
  s.investments.clubs[next].manager.wage = 1000; s.week = 18; const start = s.wallet.cash; investmentWeek(s);
  assert.equal(s.wallet.cash, start);
});

test('manager hiring, projects and budgets are paid by the controlled club', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 60); const cash = s.wallet.cash;
  const candidate = clubCandidates(s, id)[0]; s = hireClubManager(s, id, candidate.id);
  assert.equal(s.investments.clubs[id].manager.id, candidate.id);
  const bank = marketClubs(s).find(c => c.id === id).cash;
  s = clubDecision(s, id, 'academy'); assert.ok(marketClubs(s).find(c => c.id === id).cash < bank);
  assert.equal(s.wallet.cash, cash);
  s.week = 1; investmentWeek(s); s.week = 2; investmentWeek(s);
  assert.equal(s.investments.clubs[id].academy, 2);
});

test('job changes restore the destination bank and preserve independent investments', () => {
  let s = setup(); const old = s.clubId, next = target(s).id;
  s = buy(s, next, 60); s = fundClub(s, next, 500, 'loan');
  const bank = marketClubs(s).find(c => c.id === next).cash, cash = s.wallet.cash;
  s.offers = [next]; s = takeJob(s, next);
  assert.equal(s.budget, bank); assert.equal(s.wallet.cash, cash); assert.equal(myStake(s), 60); assert.equal(s.wallet.loan, 500);
  assert.ok(marketClubs(s).find(c => c.id === old).stake > 0);
  assert.ok(decodeSave(encodeSave(s)));
});

test('portfolio records costs, realized returns, dividends and loan claims separately', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 5); s = fundClub(s, id, 500, 'loan');
  const p = portfolioSummary(s); assert.equal(p.cash, s.wallet.cash); assert.ok(p.equity > 0); assert.equal(p.loans, 500);
  assert.equal(p.netWorth, p.cash + p.equity + p.loans);
  assert.ok(decodeSave(encodeSave(s)));
});

test('significant minority shareholders can propose but not impose strategy', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 30);
  const b = clubDecision(s, id, 'proposal', 'youth');
  assert.ok(b !== s); assert.equal(b.investments.clubs[id].strategy, 'youth');
  assert.ok(b.investments.log[0].message.includes('shareholders'));
  assert.ok(clubDecision(s, id, 'strategy', 'growth') === s);
});

test('outside capital dilutes the owner, removes control, and remains financing', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 51);
  s.investments.clubs[id].liquidity = 100000;
  const v = marketClubs(s).find(c => c.id === id).value, cash = s.wallet.cash;
  s = clubDecision(s, id, 'outside-capital', v);
  const c = marketClubs(s).find(c => c.id === id);
  assert.equal(c.stake, 26); assert.equal(c.controlled, false); assert.equal(c.profit, 0); assert.equal(s.wallet.cash, cash);
});

test('bank financing and principal repayment change club debt without creating profit', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 60);
  const before = marketClubs(s).find(c => c.id === id), cash = s.wallet.cash;
  s = clubDecision(s, id, 'borrow', 500);
  const c = marketClubs(s).find(c => c.id === id);
  assert.equal(c.debt, before.debt + 500); assert.equal(c.cash, before.cash + 500); assert.equal(c.profit, 0);
  s = clubDecision(s, id, 'repay-bank', 500); assert.equal(marketClubs(s).find(c => c.id === id).debt, before.debt); assert.equal(s.wallet.cash, cash);
});

test('a minority-only issuer refuses an equity issue that quietly transfers control', () => {
  const s = setup(), c = marketClubs(s).find(c => c.id !== s.clubId && c.saleLimit === 20 && c.cash >= 500);
  assert.ok(c); assert.ok(fundClub(s, c.id, c.value * 2, 'equity') === s);
});

test('invalid financial market imports are rejected', () => {
  for (const mutate of [s => { s.investments.clubs[s.clubId].cash = 'x'; }, s => { s.investments.clubs[s.clubId].history = [null]; }, s => { s.investments.clubs = {}; }, s => { s.investments.log = [{ message: {} }]; }]) {
    const s = setup(); mutate(s); assert.equal(validInvestments(s), false); assert.ok(decodeSave(encodeSave(s)) === null);
  }
});

test('legacy current-club share buttons use the same executable market price', () => {
  let s = setup(); s = executeTrade(s, quoteTrade(s, s.clubId, 'sell', 5));
  const q = quoteTrade(s, s.clubId, 'buy', 5), before = s.wallet.cash;
  assert.ok(q.ok); const b = legacyBuy(s, 5);
  assert.equal(before - b.wallet.cash, q.total);
});

test('taking personal charge does not manufacture ownership and pays dismissal compensation', () => {
  let s = setup(); s.investor = { stakes: 30, raised: 0 }; s.wallet.stake = 70;
  const m = clubCandidates(s, s.clubId)[0]; s = hireClubManager(s, s.clubId, m.id);
  const cash = s.budget; s = clubDecision(s, s.clubId, 'take-charge');
  assert.equal(s.mode, 'manager'); assert.equal(myStake(s), 70); assert.equal(s.budget, cash - m.wage * 6);
});

test('a modified quote cannot manufacture selling-shareholder liquidity', () => {
  const s = setup(), id = target(s).id, q = quoteTrade(s, id, 'buy', 1);
  q.price += 1000000; assert.ok(executeTrade(s, q) === s);
});

test('invalid extra ledger data cannot reach valuation calculations', () => {
  const s = setup(); s.investments.clubs[s.clubId].ledger.inc.bad = {};
  assert.equal(validInvestments(s), false); assert.ok(decodeSave(encodeSave(s)) === null);
});

test('investment funding cannot erase an ordinary unbooked signing expense', () => {
  let s = setup(); const p = s.market[0]; s.budget = 100000; s.ledger.last = s.budget;
  s.investments.clubs[s.clubId].transferBudget = 100000; s.investments.clubs[s.clubId].wageLimit = 100000;
  s = signPlayer(s, p.id); const spent = 100000 - s.budget; assert.ok(spent > 0);
  s = fundClub(s, s.clubId, 500, 'loan'); sync(s, 'deals'); assert.equal(earnedCosts(s.ledger), spent);
});

test('personally managing a club does not remove shareholder dividend entitlement', () => {
  let s = setup(); s = clubDecision(s, s.clubId, 'take-charge');
  s.ledger.prev = { season: 1, income: 5000, costs: 0 }; s.budget = 100000;
  const cash = s.wallet.cash; dividendSeason(s); assert.equal(s.wallet.cash - cash, 1000);
});

test('job round trips preserve training, medical, ticket policy and construction', () => {
  let s = setup(); const old = s.clubId, next = target(s).id;
  s.facilities = { training: 5, medical: 4, stadium: 3, building: { type: 'medical', weeks: 1 } }; s.tickets = { price: 5 };
  s.offers = [next]; s = takeJob(s, next); assert.equal(s.tickets.price, 3);
  s.offers = [old]; s = takeJob(s, old);
  assert.equal(s.facilities.training, 5); assert.equal(s.facilities.medical, 4); assert.equal(s.tickets.price, 5); assert.equal(s.facilities.building.weeks, 1);
});

test('legacy recruitment obeys owner spending limits', () => {
  let s = setup(); s.budget = 100000; s.ledger.last = s.budget;
  s = clubDecision(s, s.clubId, 'transfers', 0); s = clubDecision(s, s.clubId, 'wages', 0);
  const p = s.rivals.find(p => p.clubId !== s.clubId);
  const [b] = negotiate(s, p.id, { fee: askingPrice(p, s), wage: p.wage * 2, years: 3 }); assert.ok(b === s);
});

test('ordinary sales debit the actual buying club and respect its approval policy', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 60);
  s.investments.clubs[id].transferBudget = 10000; s.investments.clubs[id].wageLimit = 100000;
  const p = s.players.find(p => !p.starting); s.bids = [{ id: 'test-sale', playerId: p.id, clubId: id, fee: 100 }];
  const cash = s.investments.clubs[id].cash, [b] = acceptBid(s, 'test-sale');
  assert.ok(b !== s); assert.equal(b.investments.clubs[id].cash, cash - 100); assert.equal(b.investments.clubs[id].ledger.out.signings, 100);
});

test('a live season, ownership and save migration continue to work together', () => {
  let s = setup(); const id = target(s).id; s = buy(s, id, 51);
  for (let i = 0; i < 20; i++) {
    if (s.sacked) s = takeJob(s, s.offers[0]);
    s = advanceWeek(simToEnd(startMatch(s)));
    assert.ok(validInvestments(s)); assert.ok(decodeSave(encodeSave(s)));
  }
  assert.ok(s.season >= 2); assert.ok(marketClubs(s).find(c => c.id === id).history.length > 1);
});

test('majority ownership survives hostile votes without a forced sale', () => {
  let s = setup(); s.fans = 0; s.trust = 0; s.week = 8;
  for (let seed = 1; seed <= 50; seed++) { s.seed = seed; ownerVoteWeek(s); assert.equal(s.sacked, false); assert.equal(myStake(s), 100); }
});

test('active-club dividends cannot be collected twice for one season', () => {
  const s = setup(); s.ledger.prev = { season: 1, income: 5000, costs: 0 }; s.budget = 100000;
  dividendSeason(s); const cash = s.wallet.cash; dividendSeason(s); assert.equal(s.wallet.cash, cash);
});

test('transfer instalments stay with the borrowing club after changing jobs', () => {
  let s = setup(); const old = s.clubId, next = target(s).id;
  s.instalments = [{ name: 'Deferred transfer', amount: 50, remaining: 150, weeks: 3, clubId: next }];
  s.offers = [next]; s = takeJob(s, next); assert.equal(s.instalments.length, 0);
  s.offers = [old]; s = takeJob(s, old); assert.equal(s.instalments.length, 1); assert.equal(s.instalments[0].remaining, 150);
});

test('AI resale commissions are funded by the selling club, not created as extra money', () => {
  const s = setup(), buyer = target(s).id;
  s.investments.clubs[buyer].transferBudget = 10000; s.investments.clubs[buyer].wageLimit = 100000;
  const p = s.rivals.find(p => p.clubId !== buyer && p.position !== 'GK' && s.rivals.filter(x => x.clubId === p.clubId).length > 14);
  const seller = p.clubId; s.sellOns = [{ playerId: p.id, name: p.name, pct: 15 }];
  const bank = s.investments.clubs[buyer].cash + s.investments.clubs[seller].cash + s.budget;
  assert.ok(makeTransfer(s, buyer, p.id, 100));
  assert.equal(s.investments.clubs[buyer].cash + s.investments.clubs[seller].cash + s.budget, bank);
  assert.equal(s.sellOns.length, 0); assert.equal(s.investments.clubs[s.clubId].cash, s.budget);
});
