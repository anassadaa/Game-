import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { teamTalk, answerPress, pressQuestion, dressingWeek, handleUnhappy, harmony } from '../src/dressing.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('team talks, press and unhappy players', () => {
  let s = startMatch(newGame(21));
  s = teamTalk(s, 'encourage');
  assert.deepEqual(s.match.talks, [0]);
  assert.equal(teamTalk(s, 'demand'), s, 'one talk per break');
  s = advanceMatch(advanceMatch(advanceMatch(s)));
  assert.equal(s.match.minute, 45);
  s = teamTalk(s, 'calm');
  s = simToEnd(s);
  assert.ok(pressQuestion(s));
  s = answerPress(s, 0);
  assert.equal(pressQuestion(s), null);
  s = advanceWeek(s);
  const star = s.players.find((p) => !p.starting);
  star.rating = 80; star.personality = 'Ambitious';
  for (let i = 0; i < 30 && !star.unhappy; i++) dressingWeek(s, new Set());
  assert.ok(star.unhappy);
  s = handleUnhappy(s, star.id, 'promise');
  assert.ok(s.players.find((p) => p.id === star.id).promise);
  assert.ok(harmony(s) >= 0 && harmony(s) <= 100);
  assert.ok(decodeSave(encodeSave(s)));
});
