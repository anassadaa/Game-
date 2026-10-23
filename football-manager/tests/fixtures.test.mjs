import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek, migrate } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { fixtureList, dismissReview } from '../src/fixtures.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const play = (s) => advanceWeek(simToEnd(startMatch(s)));
test('fixtures list the whole season with results as they come in', () => {
  let s = newGame(21);
  assert.equal(fixtureList(s).length, 18);
  s = play(play(s));
  const f = fixtureList(s);
  assert.equal(f.filter((x) => x.result).length, 2);
  assert.ok(f[0].result && ['W', 'D', 'L'].includes(f[0].result.outcome));
  assert.ok(f.every((x) => typeof x.oppName === 'string' && typeof x.home === 'boolean'));
  assert.equal(decodeSave(encodeSave(s)).results.length, 2);
});
test('a season-end review is written, then dismissed', () => {
  let s = newGame(22);
  for (let w = 0; w < 18 && !s.sacked; w++) s = play(s);
  const r = s.review;
  assert.ok(r && r.season === 1 && r.position >= 1 && r.played > 0);
  assert.equal(r.wins + r.draws + r.losses, r.played);
  assert.ok(typeof r.verdict === 'string' && r.verdict.length > 0);
  assert.equal(s.results.length, 0, 'new season starts with a clean fixture list');
  assert.ok(decodeSave(encodeSave(s)).review);
  assert.equal(dismissReview(s).review, undefined);
});
test('old saves gain an empty results list', () => {
  const s = newGame(23); delete s.results; assert.deepEqual(migrate(s).results, []);
});
