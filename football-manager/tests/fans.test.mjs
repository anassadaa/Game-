import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { fanMood, fanWeek, validFanLog } from '../src/fans.ts';
test('mood labels by level', () => {
  const s = newGame(1); s.fans = 10; assert.equal(fanMood(s).label, 'Furious');
  s.fans = 90; assert.equal(fanMood(s).label, 'Ecstatic'); s.fans = 50; assert.equal(fanMood(s).label, 'Content');
});
test('furious fans protest, hitting board trust, with a cooldown', () => {
  const s = newGame(1); s.fans = 15; const t = s.trust;
  assert.equal(fanWeek(s), 'protest'); assert.ok(s.trust < t); assert.ok(s.headlines[0].includes('protest'));
  s.week += 1; assert.equal(fanWeek(s), undefined);
  s.week += 4; s.fans = 15; assert.equal(fanWeek(s), 'protest');
});
test('ecstatic fans chant, small trust boost', () => {
  const s = newGame(1); s.fans = 92; s.trust = 50; assert.equal(fanWeek(s), 'chant'); assert.ok(s.trust > 50);
});
test('fan log validation', () => { assert.ok(validFanLog({})); assert.equal(validFanLog({ fanLog: 'x' }), false); });
