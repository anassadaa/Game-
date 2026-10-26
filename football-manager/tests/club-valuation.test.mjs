import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, standings } from '../src/game.ts';
import { clubEV } from '../src/valuation.ts';
import { prepareInvestments, marketClubs, investmentWeek } from '../src/investments.ts';
import { valuation } from '../src/wallet.ts';
const base = () => prepareInvestments(newGame(9));
const ev = (s, id, b = s.investments.clubs[id]) => clubEV(s, s.clubs.find((c) => c.id === id), b);
test('revenue multiple in the researched 1–6x band with explained drivers', () => {
  const s = base();
  for (const c of s.clubs) { const r = ev(s, c.id); assert.ok(r.multiple >= 0.8 && r.multiple <= 6, `${c.id} ${r.multiple}`); assert.ok(r.drivers.length >= 6); }
  const top = s.clubs.filter((c) => c.division === 1).sort((a, b) => b.rating - a.rating)[0], low = s.clubs.filter((c) => c.division === 2).sort((a, b) => a.rating - b.rating)[0];
  assert.ok(ev(s, top.id).ev > ev(s, low.id).ev * 3);
});
test('drivers move value: position, squad value, fans, Europe, trophies, profit, relegation risk', () => {
  const s = base(), id = s.clubId, c = s.clubs.find((x) => x.id === id), b = s.investments.clubs[id];
  const v0 = ev(s, id).ev;
  b.fans = 95; assert.ok(ev(s, id).ev > v0); b.fans = s.fans;
  s.players.filter((p) => p.clubId === id).forEach((p) => (p.price *= 3)); assert.ok(ev(s, id).ev > v0); s.players.filter((p) => p.clubId === id).forEach((p) => (p.price /= 3));
  s.trophies = [{ season: s.season, club: c.name, name: 'League' }]; assert.ok(ev(s, id).ev > v0); s.trophies = [];
  const div = standings(s).filter((x) => x.division === c.division); div.forEach((x, i) => { x.points = 60 - i; x.played = 10; });
  c.points = 100; const high = ev(s, id).ev; c.points = -5; const low = ev(s, id); assert.ok(high > low.ev);
  assert.ok(low.drivers.some((d) => /relegation/i.test(d.label) && d.value < 0));
});
test('equity = smoothed EV + cash − debt − loans; moves gradually week to week', () => {
  let s = base(); const id = s.clubId, before = marketClubs(s).find((c) => c.id === id);
  const b = s.investments.clubs[id]; assert.equal(before.value, Math.max(100, Math.round(b.ev + b.cash - b.debt - (s.wallet?.loan ?? 0))));
  const target = ev(s, id).ev * 2; s.players.filter((p) => p.clubId === id).forEach((p) => (p.price *= 6));
  const old = b.ev; s.week++; investmentWeek(s); const nb = s.investments.clubs[id];
  assert.ok(nb.ev > old && nb.ev < ev(s, id).ev, `${old} → ${nb.ev} (target ${ev(s, id).ev})`);
  assert.ok(nb.history.length >= 2); assert.ok(nb.drivers.length >= 6);
  assert.equal(valuation(s), marketClubs(s).find((c) => c.id === id).value);
});
