import test from 'node:test'; import assert from 'node:assert';
import { newGame, migrate } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { LEAGUES, WORLD, PYRAMID } from '../src/world.ts';
test('six new second divisions with squads', () => {
  for (const d of [9, 10, 11, 12, 13, 14]) assert.equal(LEAGUES.find((l) => l.division === d).tier, 2);
  const s = newGame(7, 'leganes');
  assert.equal(s.clubs.length, WORLD.length);
  for (const p of PYRAMID) {
    const top = Math.min(...WORLD.filter((w) => w.division === p.top).map((w) => w.rating));
    const sec = WORLD.filter((w) => w.division === p.second);
    assert.ok(sec.length >= 18);
    assert.ok(sec.reduce((a, w) => a + w.rating, 0) / sec.length < top + 2);
  }
  const size = encodeSave(s).length;
  assert.ok(size < 4_500_000, `save ${size}`);
});
test('old save without new divisions gains them', () => {
  const s = newGame(3, 'arsenal');
  const old = JSON.parse(encodeSave(s));
  const keep = new Set(WORLD.filter((w) => w.division <= 8).map((w) => w.id));
  old.clubs = old.clubs.filter((c) => keep.has(c.id));
  old.rivals = old.rivals.filter((p) => keep.has(p.clubId));
  const d = decodeSave(JSON.stringify(old));
  assert.ok(d);
  assert.equal(d.clubs.length, WORLD.length);
  assert.ok(d.rivals.some((p) => p.clubId === 'schalke'));
});
