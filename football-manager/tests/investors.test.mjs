import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { investorWeek, acceptInvestment, declineInvestment, validInvestor } from '../src/investors.ts';
const withOffer = (mode) => { for (let seed = 1; seed < 200; seed++) { const s = setMode(newGame(seed), mode); s.week = 10; const t = structuredClone(s); investorWeek(t); assert.deepEqual(t.investor, (investorWeek(s), s.investor)); if (s.investor?.offer) return s; } };
test('chairman gets a stake offer at week 10 (hash-based, deterministic)', () => {
  const s = withOffer('chairman'); assert.ok(s); const o = s.investor.offer;
  assert.ok(o.cash > 0 && o.stake >= 10 && o.stake <= 25);
});
test('accepting adds financing cash and stake; dividends wait for season profit', () => {
  const s = withOffer('chairman'); const o = s.investor.offer; const c = s.budget;
  const a = acceptInvestment(s); assert.equal(a.budget, c + o.cash); assert.equal(a.investor.stakes, o.stake); assert.equal(a.investor.offer, undefined);
  a.week = 11; const before = a.budget; investorWeek(a); assert.equal(a.budget, before); assert.equal(a.ledger.inc.funding, o.cash);
  const d = declineInvestment(withOffer('chairman')); assert.equal(d.investor.offer, undefined);
});
test('manager mode: no stake offers', () => { for (let seed = 1; seed < 40; seed++) { const s = newGame(seed); s.week = 10; investorWeek(s); assert.equal(s.investor?.offer, undefined); } });
test('takeover event in manager mode is once per career', () => {
  let hit = 0; for (let seed = 1; seed < 100; seed++) { const s = newGame(seed); s.week = 20; investorWeek(s); if (s.investor?.takeover) { hit++; const b = s.budget; investorWeek(s); assert.equal(s.budget, b); } }
  assert.ok(hit > 0 && hit < 100);
});
test('validation', () => { assert.ok(validInvestor({})); assert.equal(validInvestor({ investor: { stakes: 'x' } }), false); });
