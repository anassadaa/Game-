import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, renewContract } from '../src/game.ts';
import { wageDemand, offerRenewal } from '../src/contracts.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId && !p.loan);
const pick = (s, f) => { const p = own(s).sort((a, b) => b.rating - a.rating)[0]; f?.(p); return p; };
test('3.8: wage demand lists reasons for every factor', () => {
  const s = newGame(5), p = pick(s), d = wageDemand(s, p, 3);
  assert.ok(d.ask >= 1 && Number.isInteger(d.ask));
  for (const k of [/value/i, /age/i, /form|rating/i, /status|apps|minutes/i, /position/i, /personality/i, /contract left/i, /length/i, /structure|league/i, /interest/i, /agent/i, /morale/i]) assert.ok(d.reasons.some((r) => k.test(r.label)), String(k));
});
test('3.8: veterans and decliners can ask for less; young talents ask for more', () => {
  const s = newGame(5), p = pick(s);
  const old = { ...p, age: 34, rating: p.rating - 6, potential: p.rating - 6, wage: p.wage * 2, morale: 70 };
  assert.ok(wageDemand(s, old, 1).ask < old.wage, `old ask ${wageDemand(s, old, 1).ask} vs ${old.wage}`);
  const kid = { ...p, age: 20, potential: p.rating + 15, wage: Math.max(1, Math.round(p.wage / 2)) };
  assert.ok(wageDemand(s, kid, 3).ask > kid.wage);
});
test('3.8: longer deals cost more per week for the young, less for the old', () => {
  const s = newGame(5), p = pick(s), y = { ...p, age: 21 }, o = { ...p, age: 32 };
  assert.ok(wageDemand(s, y, 5).ask > wageDemand(s, y, 1).ask);
  assert.ok(wageDemand(s, o, 3).ask < wageDemand(s, o, 1).ask);
});
test('3.8: rival interest, contract leverage, form and ambition raise the ask', () => {
  const s = newGame(5), p = pick(s);
  assert.ok(wageDemand(s, { ...p, contract: 0 }, 3).ask >= wageDemand(s, { ...p, contract: 3 }, 3).ask);
  assert.ok(wageDemand(s, { ...p, apps: 15, ratingSum: 15 * 7.8 }, 3).ask > wageDemand(s, { ...p, apps: 15, ratingSum: 15 * 6.2 }, 3).ask);
  assert.ok(wageDemand(s, { ...p, personality: 'Ambitious' }, 3).ask > wageDemand(s, { ...p, personality: 'Loyal' }, 3).ask);
  assert.ok(wageDemand(s, { ...p, morale: 95 }, 3).ask <= wageDemand(s, { ...p, morale: 20 }, 3).ask);
});
test('3.8: negotiation — accept at ask, counter on a small gap, refuse a lowball', () => {
  const s = newGame(5), p = pick(s, (x) => { x.contract = 1; }), d = wageDemand(s, p, 3);
  const ok = offerRenewal(s, p.id, 3, d.ask);
  assert.equal(ok.result, 'accepted'); assert.equal(ok.state.players.find((x) => x.id === p.id).wage, d.ask);
  assert.equal(ok.state.players.find((x) => x.id === p.id).contract, 3);
  const mid = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.85));
  assert.ok(['countered', 'accepted'].includes(mid.result));
  if (mid.result === 'countered') { assert.ok(mid.counter < d.ask && mid.counter > d.ask * 0.85); assert.equal(mid.state.players.find((x) => x.id === p.id).wage, p.wage); }
  const low = offerRenewal(s, p.id, 3, Math.max(1, Math.round(d.ask * 0.4)));
  assert.equal(low.result, 'refused'); assert.ok(low.state.players.find((x) => x.id === p.id).morale < p.morale);
  assert.ok(low.message.length > 5);
  const over = offerRenewal(s, p.id, 3, d.ask * 2); assert.equal(over.result, 'accepted');
  assert.ok(over.state.players.find((x) => x.id === p.id).wage <= d.ask * 2);
});
test('3.8: renewContract (used by the delegated manager) pays the dynamic ask, not a flat +15%', () => {
  const s = newGame(5), p = pick(s), d = wageDemand(s, p, 3);
  const r = renewContract(s, p.id, 3); assert.equal(r.players.find((x) => x.id === p.id).wage, d.ask);
  const old = newGame(5), q = pick(old, (x) => { x.age = 35; x.wage *= 3; });
  const rr = renewContract(old, q.id, 1); assert.ok(rr.players.find((x) => x.id === q.id).wage < q.wage);
});
import { renewalPlan, renewYears } from '../src/contracts.ts';
test('3.8: auto-renewal plan — length by age, lets declining veterans go, always keeps protected talent', () => {
  assert.equal(renewYears({ age: 20 }), 5); assert.equal(renewYears({ age: 34 }), 1);
  const s = newGame(5), p = pick(s);
  const vet = { ...p, age: 35, rating: p.rating - 8 }; const v = renewalPlan(s, vet);
  assert.equal(v.renew, false); assert.match(v.why, /declin|below/);
  const star = renewalPlan(s, p); assert.equal(star.renew, true); assert.equal(star.ask, wageDemand(s, p, star.years).ask); assert.match(star.why, /%/);
  assert.equal(renewalPlan(s, { ...vet, wonderkid: true }, true).renew, true);
});
