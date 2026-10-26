import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, boardWeek } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
test('3.2: a failed no-confidence motion never raises trust and cools down for 6 weeks', () => {
  const s = setMode(newGame(4), 'owner'); s.trust = 3; s.week = 5;
  const motions = () => s.headlines.filter((h) => /No-confidence/.test(h)).length;
  boardWeek(s); assert.ok(!s.sacked); assert.ok(s.trust <= 3, `trust ${s.trust}`); assert.equal(motions(), 1);
  for (const w of [6, 7, 8, 9, 10]) { s.week = w; s.trust = 3; boardWeek(s); }
  assert.equal(motions(), 1, 'cooldown');
  s.week = 11; s.trust = 3; boardWeek(s); assert.equal(motions(), 2);
});
