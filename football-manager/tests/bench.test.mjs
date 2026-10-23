import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch } from '../src/game.ts';
import { bench, BENCH } from '../src/lineup.ts';
test('a new career starts with a full bench including a keeper', () => {
  const s = newGame(11); const b = bench(s);
  assert.equal(b.length, BENCH); assert.ok(b.some((p) => p.position === 'GK'));
});
test('kick-off tops the bench back up with fit players', () => {
  const s = newGame(12); const gone = bench(s).slice(0, 3);
  gone[0].injured = 2; s.bench = s.bench.filter((id) => id !== gone[1].id && id !== gone[2].id);
  const m = startMatch(s); const b = bench(m);
  const avail = m.players.filter((p) => p.clubId === m.clubId && !p.starting && !p.injured).length;
  assert.equal(b.length, Math.min(BENCH, avail)); assert.ok(b.every((p) => !p.injured)); assert.ok(b.length >= 6);
});
