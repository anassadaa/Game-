import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, takeJob } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const play = (s) => { s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };

test('board sets an objective and sacks on collapse; job offers move you to a new club', () => {
  let s = newGame(21);
  assert.ok(s.board.objective.length > 5 && s.board.target >= 1);
  s.trust = 5; s.week = 5;
  s = play(s);
  assert.equal(s.sacked, true);
  assert.ok(s.offers.length > 0);
  assert.equal(startMatch(s), s);
  assert.ok(decodeSave(encodeSave(s)));
  const target = s.offers[0];
  const b = takeJob(s, target);
  assert.equal(b.clubId, target);
  assert.equal(b.sacked, false);
  const own = b.players.filter((p) => p.clubId === target);
  assert.equal(own.length, b.players.length);
  assert.ok(own.length >= 14 && own.length <= 25);
  assert.equal(own.filter((p) => p.starting).length, 11);
  assert.equal(own.filter((p) => p.starting && p.position === 'GK').length, 1);
  assert.ok(!b.rivals.some((p) => p.clubId === target));
  assert.ok(decodeSave(encodeSave(b)));
  assert.ok(play(b).week > b.week);
});
