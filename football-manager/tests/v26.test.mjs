import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet } from '../src/wallet.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade } from '../src/investments.ts';

const fixture = newGame(73);
const setup = (mode = 'owner') => { const s = setMode(structuredClone(fixture), mode); wallet(s).cash = 100000; return prepareInvestments(s); };
const buy = (s, id, pct) => executeTrade(s, quoteTrade(s, id, 'buy', pct));
const sell = (s, id, pct) => executeTrade(s, quoteTrade(s, id, 'sell', pct));

test('2.6: buying and immediately selling a distressed club never makes money', () => {
  let s = setup();
  const id = marketClubs(s).find(c => c.id !== s.clubId).id;
  s.investments.clubs[id].cash = 300;
  const start = wallet(s).cash;
  for (let i = 0; i < 10; i++) { s = buy(s, id, 40); s = sell(s, id, 40); }
  assert.ok(wallet(s).cash < start, `wallet grew ${start} -> ${wallet(s).cash}`);
});

import { ownership, clubDecision } from '../src/investments.ts';
test('2.6: cap table always sums to 100% through buys, outside capital and sells', () => {
  let s = setup();
  const id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id;
  const check = () => { const o = ownership(s, id); assert.equal(o.mine + o.investors + o.owners, 100); assert.ok(o.owners >= 0 && o.investors >= 0); };
  s = buy(s, id, 60); check();
  const liq = marketClubs(s).find(c => c.id === id).liquidity;
  s = clubDecision(s, id, 'outside-capital', Math.min(liq, 2000)); check();
  assert.ok(ownership(s, id).investors > 0);
  s = sell(s, id, 5); check();
  const own = ownership(s, s.clubId); assert.equal(own.mine + own.investors + own.owners, 100);
});

import { clubCandidates, hireClubManager } from '../src/investments.ts';
test('2.6: chairman keeps chairman mode when hiring a manager via investments', () => {
  const s = setup('chairman');
  const cand = clubCandidates(s, s.clubId)[0];
  const t = hireClubManager(s, s.clubId, cand.id);
  assert.notEqual(t, s); assert.equal(t.mode, 'chairman');
});
test('2.6: director buying a majority of own club becomes Owner-Director; manager keeps dugout', () => {
  for (const [mode, want] of [['director', 'owner'], ['manager', undefined]]) {
    let s = setup(mode);
    const me = marketClubs(s).find(c => c.id === s.clubId);
    assert.ok(me.available >= 51, `available ${me.available}`);
    s = buy(s, s.clubId, 51);
    assert.equal(marketClubs(s).find(c => c.id === s.clubId).stake, 51);
    assert.equal(s.mode, want);
    assert.match(s.headlines[0], /control/);
    assert.equal(clubDecision(s, s.clubId, 'ticket', 2) !== s, true);
  }
});

import { stakeBoost, jobChance, appointSelf, canAppointSelf } from '../src/jobs.ts';
import { myStake } from '../src/wallet.ts';
test('2.6: stake boosts job odds: 30-50% large and rising, under 30% small', () => {
  assert.equal(stakeBoost(0), 0); assert.ok(stakeBoost(10) > 0 && stakeBoost(29) <= 15);
  assert.ok(stakeBoost(30) >= 20 && stakeBoost(50) > stakeBoost(40) && stakeBoost(40) > stakeBoost(30));
  let s = setup('manager');
  const id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75 && jobChance(s, c.id).chance < 60).id;
  const base = jobChance(s, id).chance;
  s = buy(s, id, 40);
  const j = jobChance(s, id);
  assert.ok(j.chance > base); assert.ok(j.factors.some(f => /40% shareholding/.test(f.label)));
});
test('2.6: 51%+ lets you appoint yourself in any board role; holdings carry over', () => {
  for (const role of ['director', 'chairman', 'owner']) {
    let s = setup('manager');
    const old = s.clubId, id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id;
    assert.ok(canAppointSelf(s, id));
    assert.equal(appointSelf(s, id, role), s);
    s = buy(s, id, 60); const cash = wallet(s).cash;
    assert.equal(canAppointSelf(s, id), null);
    const t = appointSelf(s, id, role);
    assert.equal(t.clubId, id); assert.equal(t.mode, role); assert.equal(myStake(t), 60);
    assert.equal(wallet(t).cash, cash);
    assert.equal(marketClubs(t).find(c => c.id === id).stake, 60);
    assert.ok(t.clubs.some(c => c.id === old));
  }
});

import { clubDecision as cd2, myRoles, investmentWeek } from '../src/investments.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const ctrl = (s) => marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id;
test('2.6: director at more than one club: role needs control, shows in roles list, survives save', () => {
  let s = setup('manager'); const id = ctrl(s);
  assert.equal(cd2(s, id, 'role', 'director'), s, 'no role without 51%');
  s = buy(s, id, 60); s = cd2(s, id, 'role', 'director');
  assert.equal(s.investments.clubs[id].role, 'director');
  assert.equal(cd2(s, s.clubId, 'role', 'director'), s, 'main club is not a side role');
  const roles = myRoles(s); assert.equal(roles.length, 2); assert.ok(roles[0].main && !roles[1].main && roles[1].role === 'Director of Football');
  s = cd2(s, id, 'transfers', 4000); s = cd2(s, id, 'threshold', 900);
  assert.equal(s.investments.clubs[id].transferBudget, 4000); assert.equal(s.investments.clubs[id].approveOver, 900);
  const back = decodeSave(encodeSave(s)); assert.ok(back); assert.equal(back.investments.clubs[id].role, 'director');
  s = cd2(s, id, 'role', 'none'); assert.equal(s.investments.clubs[id].role, undefined);
});
test('2.6: side-role clubs: big deals wait for approval, block works, small deals done by staff', () => {
  let s = setup('manager'); const id = ctrl(s);
  s = buy(s, id, 60); s = cd2(s, id, 'role', 'chairman'); s = cd2(s, id, 'transfers', 20000);
  s.investments.clubs[id].cash = 50000; s.investments.clubs[id].wageLimit = 5000;
  let req, staff = 0;
  for (let w = 1; w <= 60 && !req; w++) { const t = structuredClone(s); t.week = (w % 4) * 0 + 4 * (1 + w % 4); t.season = s.season + Math.floor(w / 4); t.investments.lastTick = ''; delete t.investments.clubs[id].request; t.investments.clubs[id].approveOver = 1; investmentWeek(t); req = t.investments.clubs[id].request; if (req) s = t; }
  assert.ok(req && ['transfer', 'sale'].includes(req.type), 'big deal raised for approval');
  const blocked = cd2(s, id, 'decline'); assert.equal(blocked.investments.clubs[id].request, undefined);
  const p = req.playerId, ok = cd2(s, id, 'approve');
  if (ok !== s) { assert.equal(ok.investments.clubs[id].request, undefined); const pl = ok.rivals.find(x => x.id === p); assert.equal(pl.clubId, req.type === 'sale' ? req.buyerId : id); }
  for (let w = 1; w <= 60 && !staff; w++) { const t = structuredClone(s); delete t.investments.clubs[id].request; t.week = 4 * (1 + w % 4); t.season = s.season + 1 + Math.floor(w / 4); t.investments.lastTick = ''; t.investments.clubs[id].approveOver = 100000; investmentWeek(t); staff = t.investments.log.filter(e => /Your staff at/.test(e.message)).length; assert.equal(t.investments.clubs[id].request, undefined); }
  assert.ok(staff > 0, 'staff completed a deal on your behalf');
});
test('2.6: losing control ends the side role; moving main club keeps a director role at the old club you control', () => {
  let s = setup('manager'); const id = ctrl(s); s = buy(s, id, 60); s = cd2(s, id, 'role', 'director');
  s.wallet.holdings[id].stake = 40; s.investments.lastTick = ''; investmentWeek(s);
  assert.equal(s.investments.clubs[id].role, undefined);
  let t = setup('director'); const a = ctrl(t), home = t.clubId; t = buy(t, home, 60); t = buy(t, a, 60);
  t = appointSelf(t, a, 'chairman'); assert.equal(t.clubId, a);
  assert.equal(t.investments.clubs[home].role, 'director'); assert.equal(t.investments.clubs[a].role, undefined);
  assert.equal(myRoles(t).length, 2);
});

import { dividendOutlook, maxSellable } from '../src/investments.ts';
test('2.6: dividend outlook explains a zero dividend; max sellable respects buyer liquidity', () => {
  let s = setup('manager'); const id = ctrl(s); s = buy(s, id, 60);
  const rec = s.investments.clubs[id];
  s = cd2(s, id, 'dividend', 'none'); assert.match(dividendOutlook(s, id).reason, /policy retains/);
  s = cd2(s, id, 'dividend', 'high'); s.investments.clubs[id].ledger.out.wages += 99999; assert.match(dividendOutlook(s, id).reason, /loss/);
  s.investments.clubs[id].liquidity = 0; assert.equal(maxSellable(s, id), 0);
  s.investments.clubs[id].liquidity = 1e9; assert.equal(maxSellable(s, id), 60);
  s.investments.clubs[id].liquidity = Math.round(rec.value * 0.2); const m = maxSellable(s, id);
  assert.ok(m > 0 && m < 60 && quoteTrade(s, id, 'sell', m).ok && !quoteTrade(s, id, 'sell', m + 1).ok);
});

import { tvMoney } from '../src/investments.ts';
test('2.6: AI economy: TV money follows league wages and AI clubs roughly break even over two seasons', () => {
  let s = prepareInvestments(structuredClone(fixture));
  const tv = d => tvMoney(s, d); assert.ok(tv(1) > tv(2) && tv(2) > tv(13), 'richer leagues pay more TV');
  const start = Object.fromEntries(s.clubs.map(c => [c.id, s.investments.clubs[c.id].cash]));
  for (let i = 0; i < 36; i++) { s.week = i % 18 + 1; s.season = 1 + Math.floor(i / 18); investmentWeek(s); }
  const ai = s.clubs.filter(c => c.id !== s.clubId), losing = ai.filter(c => s.investments.clubs[c.id].cash < start[c.id]).length;
  assert.ok(losing < ai.length * 0.7, `${losing}/${ai.length} AI clubs lost money`);
  assert.ok(losing > ai.length * 0.1, 'not every club should get rich');
  const c = ai[0], b = s.investments.clubs[c.id]; assert.equal(b.wageLimit, Math.max(50, Math.round(b.ledger.prev.income / 18 * 0.9)), 'wage cap follows income');
});
