import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { induct, legacy, seasonHighlights, validHof } from '../src/hof.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
test('long-serving or prolific players are inducted once', () => {
  const s = newGame(4); const sq = s.players.filter((p) => p.clubId === s.clubId);
  sq[0].careerApps = 90; sq[1].careerGoals = 45; sq[1].careerApps = 50; sq[2].careerApps = 10;
  const got = induct(s); assert.equal(got.length, 2);
  assert.ok(s.hof.some((h) => h.id === sq[0].id)); assert.ok(s.headlines[0].includes('Hall of Fame'));
  assert.equal(induct(s).length, 0);
});
test('legacy score grows with wins and trophies', () => {
  const s = newGame(4); const a = legacy(s).score;
  s.careerWins = 30; s.trophies = [{ season: 1, name: 'Cup', club: 'x' }];
  const l = legacy(s); assert.ok(l.score > a + 50); assert.ok(typeof l.tier === 'string');
});
test('season highlights collect trophies, awards and achievements of that season', () => {
  const s = newGame(4); s.trophies = [{ season: s.season, name: 'Cup', club: 'x' }, { season: 0, name: 'Old', club: 'x' }];
  s.achievements = [{ id: 'first_win', season: s.season }];
  const h = seasonHighlights(s, s.season); assert.deepEqual(h.trophies, ['Cup']); assert.equal(h.achievements.length, 1);
});
test('hof survives save', () => {
  const s = newGame(4); s.players.find((p) => p.clubId === s.clubId).careerApps = 99; induct(s);
  assert.deepEqual(decodeSave(encodeSave(s)).hof, s.hof); assert.equal(validHof({ hof: 3 }), false); assert.ok(validHof({}));
});
