import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, takeJob } from '../src/game.ts';
const gks = (list, id) => list.filter((p) => p.clubId === id && p.position === 'GK').length;
test('every AI club keeps at least two goalkeepers across seasons', () => {
  let s = newGame(1001);
  for (let w = 0; w < 18 * 3; w++) { if (s.sacked) s = takeJob(s, s.offers[0]); s = startMatch(s); for (let k = 0; k < 6; k++) s = advanceMatch(s); s = advanceWeek(s); }
  const bad = s.clubs.filter((c) => c.id !== s.clubId && gks(s.rivals, c.id) < 2).map((c) => c.id);
  assert.deepEqual(bad, []);
});
test('taking a job leaves the new squad with two goalkeepers', () => {
  const s = newGame(5); const c = s.clubs.find((x) => x.id !== s.clubId);
  s.rivals = s.rivals.filter((p) => !(p.clubId === c.id && p.position === 'GK'));
  s.offers = [c.id];
  const b = takeJob(s, c.id);
  assert.ok(gks(b.players, c.id) >= 2);
});
