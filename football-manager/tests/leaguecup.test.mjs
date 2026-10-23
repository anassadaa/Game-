import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, takeJob, CUP_WEEKS, EURO_WEEKS, CUP_PRIZE, LCUP_WEEKS, LCUP_PRIZE } from '../src/game.ts';
import { calendar, congestion } from '../src/calendar.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { sameCountry } from '../src/world.ts';
const play = (s) => { if (s.sacked) s = takeJob(s, s.offers[0]); s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };

test('league cup: 16 domestic clubs, own midweeks, smaller prizes', () => {
  const s = newGame(71);
  assert.equal(s.lcup.alive.length, 16);
  assert.ok(s.lcup.alive.includes(s.clubId));
  const me = s.clubs.find((c) => c.id === s.clubId);
  assert.ok(s.lcup.alive.every((id) => sameCountry(s.clubs.find((c) => c.id === id).division, me.division)));
  for (const w of LCUP_WEEKS) assert.ok(!CUP_WEEKS.includes(w) && !EURO_WEEKS.includes(w) && w >= 1 && w <= 17);
  LCUP_PRIZE.forEach((p, i) => assert.ok(p < CUP_PRIZE[i]));
});

test('league cup shows in calendar and counts toward congestion', () => {
  const s = newGame(72);
  assert.ok(calendar(s).some((e) => e.kind === 'cup' && e.week === LCUP_WEEKS[0] && /League Cup R16/.test(e.label)));
  const before = congestion({ ...s, lcup: undefined, week: LCUP_WEEKS[0] - 1 }).games;
  s.week = LCUP_WEEKS[0] - 1;
  assert.equal(congestion(s).games, before + 1);
});

test('league cup runs a season, books prizes, writes news, resets', () => {
  let s = newGame(73);
  const p0 = s.ledger.inc.prize;
  while (s.week < LCUP_WEEKS[0]) s = play(s);
  assert.equal(s.lcup.round, 1);
  assert.ok(s.lcup.log[0].startsWith('Round of 16'));
  assert.ok(s.headlines.some((h) => h.includes('League Cup')));
  if (s.lcup.alive.includes(s.clubId)) assert.ok(s.ledger.inc.prize >= p0 + LCUP_PRIZE[0]);
  while (s.week < 18 && s.week > 0) s = play(s);
  assert.ok(s.lcup.winners.length === 1);
  assert.ok(s.news.some((n) => /win the League Cup/.test(n)));
  assert.equal(s.lcup.round, 0);
  assert.equal(s.lcup.alive.length, 16);
});

test('league cup survives saves; a corrupt one is rebuilt', () => {
  const s = newGame(74);
  assert.deepEqual(decodeSave(encodeSave(s)).lcup, s.lcup);
  const old = JSON.parse(encodeSave(s)); delete old.lcup;
  assert.equal(decodeSave(JSON.stringify(old)).lcup.alive.length, 16);
  const bad = decodeSave(JSON.stringify({ ...s, lcup: { round: 'x' } }));
  assert.ok(bad && bad.lcup.alive.length === 16);
});
