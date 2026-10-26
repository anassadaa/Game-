import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { salaryReview, statureSalary, weeklySalary, wallet, walletWeek, valuation, sharePrice, buyShares, sellShares, injectCash, setPolicy, dividendSeason, myStake, validWallet } from '../src/wallet.ts';
const g = (m, seed = 3) => setMode(newGame(seed), m);
test('starting wallet and stake by mode', () => {
  assert.equal(myStake(newGame(3)), 0); assert.equal(myStake(g('director')), 0);
  assert.equal(myStake(g('chairman')), 100); assert.equal(myStake(g('owner')), 100);
  assert.ok(wallet(g('owner')).cash > wallet(g('director')).cash); assert.ok(wallet(g('director')).cash > wallet(newGame(3)).cash);
});
test('weekly salary paid from club to wallet (3.8: chairman out-earns director; both scale with the club)', () => {
  const pay = (m) => { const s = g(m); const w = wallet(s).cash, b = s.budget; walletWeek(s); assert.equal(s.budget, b - (wallet(s).cash - w)); return wallet(s).cash - w; };
  const d = pay('director'), c = pay('chairman'), m = pay('manager'); assert.ok(c >= d && d > 0 && m > 0);
});
test('valuation positive; buy back investor shares lowers their stake', () => {
  const s = g('owner'); s.investor = { stakes: 30, raised: 500 }; wallet(s).cash = 1e7;
  assert.ok(valuation(s) > 0); const p = sharePrice(s);
  const a = buyShares(s, 10); assert.equal(a.investor.stakes, 20); assert.equal(myStake(a), 80); assert.equal(wallet(a).cash, 1e7 - p * 10);
  assert.equal(buyShares(a, 25), a, 'cannot buy more than available');
  const poor = g('owner'); poor.investor = { stakes: 30, raised: 0 }; wallet(poor).cash = 1; assert.equal(buyShares(poor, 5), poor);
  const b = sellShares(a, 5); assert.equal(b.investor.stakes, 25); assert.ok(wallet(b).cash > wallet(a).cash);
});
test('director can buy up to 25% from the owners; manager never', () => {
  const d = g('director'); wallet(d).cash = 1e7; const a = buyShares(d, 25); assert.equal(myStake(a), 25); assert.equal(buyShares(a, 1), a);
  const m = newGame(3); wallet(m).cash = 1e7; assert.equal(buyShares(m, 1), m);
});
test('inject cash as loan or equity', () => {
  const s = g('owner'); s.investor = { stakes: 40, raised: 0 }; wallet(s).cash = 5000; const b = s.budget;
  const l = injectCash(s, 1000, 'loan'); assert.equal(l.budget, b + 1000); assert.equal(wallet(l).loan, 1000); assert.equal(wallet(l).cash, 4000);
  const e = injectCash(s, 1000, 'equity'); assert.ok(e.investor.stakes < 40); assert.ok(myStake(e) > 60);
  assert.equal(injectCash(s, 99999, 'loan'), s);
});
test('dividends pro rata from profit by policy; none when loss', () => {
  const s = g('owner'); s.investor = { stakes: 20, raised: 0 }; wallet(s);
  s.ledger.prev = { season: 1, income: 5000, costs: 3000 };
  s.budget = 1e6; const hi = structuredClone(setPolicy(s, 'high')), lo = structuredClone(setPolicy(s, 'low')), no = structuredClone(setPolicy(s, 'none'));
  const run = (x) => { const c = wallet(x).cash, b = x.budget; dividendSeason(x); return [wallet(x).cash - c, b - x.budget]; };
  const [mh, th] = run(hi), [ml] = run(lo), [mn, tn] = run(no);
  assert.equal(th, 1000); assert.equal(mh, 800); assert.ok(ml > 0 && ml < mh); assert.equal(mn, 0); assert.equal(tn, 0);
  const loss = g('owner'); wallet(loss); loss.ledger.prev = { season: 1, income: 1000, costs: 3000 }; const c = wallet(loss).cash; dividendSeason(loss); assert.equal(wallet(loss).cash, c);
});
test('validation', () => { assert.ok(validWallet({})); assert.equal(validWallet({ wallet: { cash: 'x' } }), false); });

test('salary review: beating target + profit raises; relegation + losses cuts; logged with reasons', () => {
  const up = g('director'); up.board = { target: 10, objective: 'x', warnings: 0 }; up.fans = 80; up.ledger.inc.sales = 500;
  const b0 = weeklySalary(up); salaryReview(up, 2); assert.ok(weeklySalary(up) > b0); assert.match(wallet(up).log[0].reason, /target/);
  const dn = g('chairman'); dn.board = { target: 2, objective: 'x', warnings: 0 }; dn.fans = 20; dn.ledger.prev = { season: 1, income: 100, costs: 900 };
  const d0 = weeklySalary(dn); salaryReview(dn, 18, { outcome: 'Relegated', trophies: 0 }); assert.ok(weeklySalary(dn) < d0); assert.match(wallet(dn).log[0].reason, /relegated/);
  assert.ok(weeklySalary(dn) >= Math.round(statureSalary(dn) * 0.5));
});
test('season bonus for promotion paid from club to wallet', () => {
  const s = g('owner'); s.ledger.prev = { season: 1, income: 900, costs: 500 }; const c = wallet(s).cash, b = s.budget;
  salaryReview(s, 1, { outcome: 'Promoted', trophies: 1 }); const got = wallet(s).cash - c; assert.ok(got > 0); assert.equal(b - s.budget, got);
  assert.ok(wallet(s).log.some((e) => e.kind === 'bonus'));
});
test('manager mode: no reviews; deterministic for same state', () => {
  const m = newGame(3); const b = weeklySalary(m); m.board = { target: 10, objective: 'x', warnings: 0 }; salaryReview(m, 1); assert.equal(weeklySalary(m), b);
  const a = g('director'), c = structuredClone(a); salaryReview(a, 5); salaryReview(c, 5); assert.equal(weeklySalary(a), weeklySalary(c));
});
test('board caps dividend when bank is low; investor mood reacts', () => {
  const s = g('owner'); s.investor = { stakes: 20, raised: 0 }; wallet(s); s.ledger.prev = { season: 1, income: 9000, costs: 1000 }; s.budget = 100;
  const c = wallet(s).cash; dividendSeason(s); assert.equal(wallet(s).cash, c); assert.match(wallet(s).log[0].reason, /blocked/); assert.ok(wallet(s).investorMood < 50);
  const h = setPolicy(g('owner'), 'high'); h.investor = { stakes: 20, raised: 0 }; h.ledger.prev = { season: 1, income: 5000, costs: 3000 }; h.budget = 1e6; dividendSeason(h); assert.equal(wallet(h).investorMood, 60);
});
test('equity injection: club bank up, new shares at valuation dilute investors', () => {
  const s = g('owner'); s.investor = { stakes: 40, raised: 0 }; wallet(s).cash = 1e6; const v = valuation(s), b = s.budget;
  const e = injectCash(s, v, 'equity'); assert.equal(e.budget, b + v); assert.equal(e.investor.stakes, 20); assert.equal(myStake(e), 80);
});
