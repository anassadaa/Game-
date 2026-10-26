import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, club } from '../src/game.ts';
import { league } from '../src/world.ts';
import { sponsorValue, sponsorOffers, commercialWeekly } from '../src/sponsors.ts';
const mine = (s) => club(s);
test('sponsor value is deterministic and lists its factors', () => {
  const s = newGame(4); const a = sponsorValue(s), b = sponsorValue(structuredClone(s));
  assert.deepEqual(a, b); assert.ok(a.weekly > 0);
  const names = a.factors.map((f) => f.id);
  for (const k of ['league', 'position', 'form', 'trophies', 'reputation', 'fans', 'stadium', 'stars', 'europe']) assert.ok(names.includes(k), k);
});
test('top flight is worth far more than the second tier (PL vs Championship)', () => {
  const s = newGame(4); const top = structuredClone(s), low = structuredClone(s);
  const t1 = top.clubs.find((c) => league(c.division).tier === 1 && c.division === mine(top).division) ? mine(top) : null;
  const d2 = s.clubs.find((c) => league(c.division).tier === 2).division, d1 = s.clubs.find((c) => league(c.division).tier === 1).division;
  mine(top).division = d1; mine(low).division = d2;
  assert.ok(sponsorValue(top).weekly > sponsorValue(low).weekly * 2.5);
});
test('success raises value: position, form, trophies, Europe, fans, reputation, stadium, stars', () => {
  const s = newGame(4); const base = sponsorValue(s).weekly;
  const up = (f) => { const x = structuredClone(s); f(x); return sponsorValue(x).weekly; };
  assert.ok(up((x) => { mine(x).form = ['W', 'W', 'W', 'W', 'W']; }) > up((x) => { mine(x).form = ['L', 'L', 'L', 'L', 'L']; }));
  assert.ok(up((x) => { x.trophies = [{ season: x.season, name: 'League', club: mine(x).name }]; }) > base);
  assert.ok(up((x) => { x.euro.alive = [x.clubId, ...x.euro.alive]; }) > up((x) => { x.euro.alive = x.euro.alive.filter((i) => i !== x.clubId); x.euro2.alive = x.euro2.alive.filter((i) => i !== x.clubId); }));
  assert.ok(up((x) => { x.fans = 95; }) > up((x) => { x.fans = 20; }));
  assert.ok(up((x) => { x.reputation = 95; }) > up((x) => { x.reputation = 10; }));
  assert.ok(up((x) => { x.facilities = { training: 1, medical: 1, stadium: 5 }; }) > up((x) => { x.facilities = { training: 1, medical: 1, stadium: 1 }; }));
  assert.ok(up((x) => { x.players.filter((p) => p.clubId === x.clubId).slice(0, 3).forEach((p) => (p.rating = 90)); }) > up((x) => { x.players.filter((p) => p.clubId === x.clubId).forEach((p) => (p.rating = Math.min(p.rating, 60))); }));
  assert.ok(up((x) => { x.history = [{ season: x.season - 1, division: mine(x).division, position: 1, points: 90, outcome: 'Champions' }]; }) > up((x) => { x.history = [{ season: x.season - 1, division: mine(x).division, position: 18, points: 30, outcome: 'Stayed the course' }]; }));
});
test('offers and weekly commercial income follow the value', () => {
  const s = newGame(4); const hi = structuredClone(s); hi.fans = 99; hi.reputation = 99; mine(hi).form = ['W', 'W', 'W', 'W', 'W'];
  assert.ok(sponsorOffers(hi)[0].weekly > sponsorOffers(s)[0].weekly);
  assert.ok(commercialWeekly(hi) > commercialWeekly(s));
  assert.equal(commercialWeekly(s), commercialWeekly(structuredClone(s)));
});
