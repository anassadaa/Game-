import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch } from '../src/game.ts';
import { preQuestion, answerPre } from '../src/prepress.ts';
import { derbyRival } from '../src/derby.ts';
test('one stable pre-match question a week, three answers', () => {
  const s = newGame(8); const q = preQuestion(s);
  assert.ok(q && q.a.length === 3); assert.deepEqual(preQuestion(s), q);
});
test('answering applies effects once and logs a headline', () => {
  const s = newGame(8); const f = s.fans;
  const b = answerPre(s, 1); assert.notEqual(b, s); assert.ok(b.headlines[0].includes('🎙️'));
  assert.equal(preQuestion(b), null); assert.equal(answerPre(b, 0), b);
  assert.ok(b.fans !== f || b.trust !== s.trust || b.harmony !== s.harmony || b.players.some((p, i) => p.morale !== s.players[i].morale));
});
test('no pre-match press during a match', () => {
  const s = startMatch(newGame(8)); assert.equal(preQuestion(s), null);
});
test('derby week asks a derby question', () => {
  const s = newGame(8); const r = derbyRival(s);
  let found = false;
  for (let w = 0; w < 18 && !found; w++) { s.week = w; const q = preQuestion(s); if (q?.derby) found = true; }
  assert.ok(found);
});
