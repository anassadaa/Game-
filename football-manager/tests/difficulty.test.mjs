import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, migrate, askingPrice, club } from '../src/game.ts';
import { DIFFICULTIES, diff, adaptive, setDifficulty } from '../src/difficulty.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
test('new game stores chosen difficulty; old saves default to medium', () => {
  assert.equal(newGame(1, undefined, null, 'hard').difficulty, 'hard');
  const s = newGame(1); delete s.difficulty;
  assert.equal(migrate(s).difficulty, 'medium');
  assert.equal(DIFFICULTIES.length, 4);
});
test('harder modes mean stronger AI, less money, dearer fees, less patience', () => {
  const e = diff('easy'), m = diff('medium'), h = diff('hard'), mh = diff('mediumHard');
  for (const k of ['ai', 'fee']) assert.ok(e[k] < m[k] && m[k] < mh[k] && mh[k] < h[k], k);
  for (const k of ['money', 'patience']) assert.ok(e[k] > m[k] && m[k] > mh[k] && mh[k] > h[k], k);
  assert.ok(newGame(1, undefined, null, 'easy').budget > newGame(1, undefined, null, 'hard').budget);
});
test('fees scale with difficulty', () => {
  const s = newGame(2, undefined, null, 'hard'); const p = s.rivals[0];
  const hard = askingPrice(p, s); setDifficulty(s, 'easy');
  assert.ok(askingPrice(p, s) < hard);
});
test('adaptive layer is gentle: harder when dominating, easier on a losing streak', () => {
  const s = newGame(3); const c = club(s);
  c.form = ['W', 'W', 'W', 'W', 'W']; const up = adaptive(s);
  c.form = ['L', 'L', 'L', 'L', 'L']; const down = adaptive(s);
  c.form = ['W', 'D', 'L']; assert.equal(adaptive(s), 0);
  assert.ok(up > 0 && up <= 1.5 && down < 0 && down >= -1.5);
});
test('difficulty survives save validation and changes in settings', () => {
  const s = newGame(4); setDifficulty(s, 'mediumHard');
  assert.equal(s.difficulty, 'mediumHard');
  assert.equal(decodeSave(encodeSave(s)).difficulty, 'mediumHard');
  s.difficulty = 'insane'; assert.equal(decodeSave(encodeSave(s))?.difficulty, 'medium');
});
