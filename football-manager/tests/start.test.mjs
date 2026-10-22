import test from 'node:test'; import assert from 'node:assert';
import { locked, repNeeded } from '../src/start.ts';
import { newGame } from '../src/game.ts';
import { WORLD } from '../src/world.ts';
test('big clubs locked for low reputation, sandbox unlocked', () => {
  const big = [...WORLD].sort((a,b)=>b.rating-a.rating)[0];
  assert.ok(locked(big, 10)); assert.ok(!locked(big, null)); assert.ok(repNeeded(big) > 10);
  assert.ok(WORLD.some((w)=>!locked(w,10)));
  assert.equal(newGame(1, WORLD[0].id, 25).reputation, 25);
});
