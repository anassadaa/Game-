import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, negotiate, askingPrice } from '../src/game.ts';
import { clubSquad, offerBlocked, WINDOW_MSG } from '../src/clubSquad.ts';
test('3.2: any club\'s squad from the table, keepers first', () => {
  const s = newGame(11); const other = s.clubs.find((c) => c.id !== s.clubId && c.division === s.clubs.find((x) => x.id === s.clubId).division);
  const sq = clubSquad(s, other.id); assert.ok(sq.length >= 14); assert.ok(sq.every((p) => p.clubId === other.id)); assert.equal(sq[0].position, 'GK');
  assert.ok(clubSquad(s, s.clubId).length >= 14);
});
test('3.2: offers only in a window; outside it the reason is the window message', () => {
  const s = newGame(11); const other = s.clubs.find((c) => c.id !== s.clubId); const p = clubSquad(s, other.id)[3];
  s.week = 5; assert.equal(offerBlocked(s, p), WINDOW_MSG);
  s.week = 2; assert.equal(offerBlocked(s, p), null);
  const [b, msg] = negotiate(s, p.id, { fee: askingPrice(p, s) * 2, wage: p.wage * 2, years: 3 }); assert.ok(typeof msg === 'string'); void b;
  assert.equal(offerBlocked(s, clubSquad(s, s.clubId)[0]), 'Already your player.');
});
