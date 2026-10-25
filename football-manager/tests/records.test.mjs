import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { noteMatch, checkAchievements, ACHIEVEMENTS, seasonRecords, validRecords } from '../src/records.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
test('match records: biggest win, heaviest defeat, runs', () => {
  const s = newGame(2);
  noteMatch(s, { week: 0, opp: 'x', home: true, us: 4, them: 0 });
  noteMatch(s, { week: 1, opp: 'y', home: false, us: 2, them: 1 });
  noteMatch(s, { week: 2, opp: 'z', home: true, us: 1, them: 1 });
  noteMatch(s, { week: 3, opp: 'w', home: true, us: 0, them: 3 });
  const r = s.records;
  assert.equal(r.bigWin.us, 4); assert.equal(r.bigLoss.them, 3);
  assert.equal(r.bestWinRun, 2); assert.equal(r.bestUnbeaten, 3); assert.equal(r.winRun, 0); assert.equal(r.unbeaten, 0);
  noteMatch(s, { week: 4, opp: 'v', home: true, us: 2, them: 0 });
  assert.equal(s.records.bigWin.us, 4);
});
test('achievements unlock once with a headline', () => {
  const s = newGame(2); s.careerWins = 1;
  const got = checkAchievements(s); assert.ok(got.some((a) => a.id === 'first_win'));
  assert.ok(s.headlines[0].includes('Achievement'));
  assert.equal(checkAchievements(s).length, 0);
  assert.ok(ACHIEVEMENTS.length >= 12);
});
test('season records: best finish and most points', () => {
  const s = newGame(2); s.clubs.find((c) => c.id === s.clubId).points = 30;
  seasonRecords(s, 3, 0); assert.equal(s.records.bestFinish.pos, 3); assert.equal(s.records.mostPoints.pts, 30);
  s.clubs.find((c) => c.id === s.clubId).points = 20; seasonRecords(s, 5, 0);
  assert.equal(s.records.bestFinish.pos, 3); assert.equal(s.records.mostPoints.pts, 30);
});
test('records survive save; junk dropped', () => {
  const s = newGame(2); noteMatch(s, { week: 0, opp: 'x', home: true, us: 3, them: 0 }); checkAchievements(s);
  const d = decodeSave(encodeSave(s)); assert.deepEqual(d.records, s.records);
  assert.ok(validRecords({ ...s, records: undefined }));
  const bad = { ...s, records: 5, achievements: 'x' }; assert.equal(validRecords(bad), false);
});
