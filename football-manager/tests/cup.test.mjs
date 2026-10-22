import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, takeJob } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const play = (s) => { if (s.sacked) s = takeJob(s, s.offers[0]); s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };

test('the cup runs four knockout rounds and crowns a winner each season', () => {
  let s = newGame(31);
  assert.equal(s.cup.alive.length, 16);
  assert.ok(s.cup.alive.includes(s.clubId));
  for (let i = 0; i < 17; i++) s = play(s);
  assert.equal(s.cup.round, 4);
  assert.equal(s.cup.alive.length, 1);
  assert.equal(s.cup.winners.length, 1);
  assert.ok(s.cup.log.length >= 1);
  assert.ok(decodeSave(encodeSave(s)));
  s = play(s);
  assert.equal(s.cup.round, 0);
  assert.equal(s.cup.winners.length, 1);
});
