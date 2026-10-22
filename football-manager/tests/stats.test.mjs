import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('a season produces awards, a trophy record and resets season stats', () => {
  let s = newGame(31);
  for (let w = 0; w < 18 && !s.sacked; w++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.equal(s.season, 2);
  assert.ok(s.awards.some((a) => a.award === 'Player of the Season'));
  assert.ok(s.players.every((p) => (p.apps ?? 0) === 0));
  assert.ok(s.players.some((p) => (p.careerApps ?? 0) > 0));
  assert.ok(Array.isArray(s.trophies ?? []));
  const back = decodeSave(encodeSave(s));
  assert.deepEqual(back.awards, s.awards);
});
