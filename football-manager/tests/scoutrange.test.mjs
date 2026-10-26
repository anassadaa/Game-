import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { abilityRange, potentialRange, recruitAsk, askWeek } from '../src/scoutrange.ts';
import { decodeSave } from '../src/save.ts';
test('true ability hides until scouted; wonderkids stay uncertain', () => {
  const s = newGame(81); const p = s.rivals.find((x) => x.age > 24);
  const [lo, hi] = abilityRange(s, p);
  assert.ok(lo <= p.rating && p.rating <= hi && hi - lo >= 10, `${lo}-${hi} ${p.rating}`);
  s.scoutReports = [{ playerId: p.id, name: p.name, clubId: p.clubId, region: 'x', week: 0, season: s.season, knowledge: 100, xg90: 0, xa90: 0, est: [p.rating, p.rating], verdict: '' }];
  const [a, b] = abilityRange(s, p); assert.ok(b - a <= 1);
  const kid = s.rivals.find((x) => x.age <= 20) ?? p; kid.wonderkid = true; kid.potential = 88;
  s.scoutReports.push({ ...s.scoutReports[0], playerId: kid.id, knowledge: 100 });
  const [pl, ph] = potentialRange(s, kid);
  // potentialRange never reads true potential by spec; at high knowledge it guarantees uncertainty, not the seeded true value.
  assert.ok(ph - pl >= 6, `${pl}-${ph}`);
  const ranges = s.rivals.slice(0, 40).map((x) => { const [l, h] = abilityRange(s, x); return (x.rating - l) / (h - l); });
  assert.ok(new Set(ranges.map((r) => r.toFixed(2))).size > 5, 'true value must not always sit in the middle');
});
test('board recruitment ask: rewarded when you sign the profile they want', () => {
  const s = newGame(82); s.week = 1; askWeek(s); const ask = recruitAsk(s);
  assert.ok(ask && ask.text);
  const t0 = s.trust; const p = s.rivals.find((x) => (ask.maxAge ? x.age <= ask.maxAge : true) && (ask.pos ? x.position === ask.pos : true) && x.rating >= (ask.minRating ?? 0)) ?? s.rivals[0];
  p.age = Math.min(p.age, ask.maxAge ?? 99); if (ask.pos) p.position = ask.pos; p.rating = Math.max(p.rating, ask.minRating ?? 0);
  p.clubId = s.clubId; s.rivals = s.rivals.filter((x) => x !== p); s.players.push(p); s.week = 2; askWeek(s);
  assert.ok(recruitAsk(s).done && s.trust > t0);
  assert.ok(decodeSave(JSON.stringify(s)));
  assert.equal(decodeSave(JSON.stringify({ ...s, boardAsk: { text: 5 } })), null);
});
