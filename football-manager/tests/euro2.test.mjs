import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, takeJob, CUP_WEEKS, EURO_WEEKS, LCUP_WEEKS, EURO_PRIZE, LCUP_PRIZE, EURO2_WEEKS, EURO2_PRIZE, newEuro2, standings } from '../src/game.ts';
import { calendar } from '../src/calendar.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { EURO_QUOTA, PYRAMID } from '../src/world.ts';
const play = (s) => { if (s.sacked) s = takeJob(s, s.offers[0]); s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };

test('continental trophy: own weeks, mid-size prizes', () => {
  for (const w of EURO2_WEEKS) assert.ok(![...CUP_WEEKS, ...EURO_WEEKS, ...LCUP_WEEKS].includes(w) && w >= 1 && w <= 17);
  EURO2_PRIZE.forEach((p, i) => assert.ok(p > LCUP_PRIZE[i] && p < EURO_PRIZE[i]));
});

test('entrants: next-best finishers, no Champions Cup clubs, 16 teams', () => {
  const s = newGame(81);
  assert.equal(s.euro2.alive.length, 16);
  assert.equal(new Set(s.euro2.alive).size, 16);
  assert.ok(s.euro2.alive.every((id) => !s.euro.alive.includes(id)));
  const t = standings(s);
  const e = newEuro2(s, false, s.euro.alive);
  const eng = t.filter((c) => c.division === 1);
  const n = Math.ceil(EURO_QUOTA[1] / 2);
  const firstNonEuro = eng.filter((c) => !s.euro.alive.includes(c.id)).slice(0, n);
  for (const c of firstNonEuro) assert.ok(e.alive.includes(c.id), `${c.name} should qualify`);
  const champ2 = t.find((c) => c.division === PYRAMID[0].second);
  assert.ok(e.alive.includes(champ2.id), 'second-tier champions get a place');
  assert.equal(e.season, s.season + 1);
});

test('continental trophy runs, shows in calendar if entered, rolls over', () => {
  let s = newGame(82);
  if (!s.euro2.alive.includes(s.clubId)) s.euro2.alive[0] = s.clubId;
  assert.ok(calendar(s).some((e) => e.week === EURO2_WEEKS[0] && /Continental Trophy R16/.test(e.label)));
  const p0 = s.ledger.inc.prize;
  while (s.week < EURO2_WEEKS[0]) s = play(s);
  assert.equal(s.euro2.round, 1);
  assert.ok(s.headlines.some((h) => h.includes('Continental Trophy')) || s.news.some((h) => h.includes('Continental Trophy')));
  if (s.euro2.alive.includes(s.clubId)) assert.ok(s.ledger.inc.prize >= p0 + EURO2_PRIZE[0]);
  while (s.week > 0) s = play(s);
  assert.equal(s.euro2.winners.length, 1);
  assert.ok(s.news.some((n) => /win the Continental Trophy/.test(n)));
  assert.equal(s.euro2.round, 0);
  assert.equal(s.euro2.alive.length, 16);
  assert.ok(s.euro2.alive.every((id) => !s.euro.alive.includes(id)));
});

test('saves: round-trip, old saves get one, corrupt rebuilt', () => {
  const s = newGame(83);
  assert.deepEqual(decodeSave(encodeSave(s)).euro2, s.euro2);
  const old = JSON.parse(encodeSave(s)); delete old.euro2;
  assert.equal(decodeSave(JSON.stringify(old)).euro2.alive.length, 16);
  assert.equal(decodeSave(JSON.stringify({ ...s, euro2: 7 })).euro2.alive.length, 16);
  assert.equal(decodeSave(JSON.stringify({ ...s, euro2: { ...s.euro2, alive: ['ghost'] } })).euro2.alive.length, 16);
});
