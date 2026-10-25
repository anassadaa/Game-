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
