import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, advanceWeek, startMatch } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { wageBill, wageLimit } from '../src/budget.ts';
test('opening season: the inherited wage bill never shows as over budget', () => {
  let s = newGame(1);
  for (let i = 0; i < 17; i++) { s = advanceWeek(simToEnd(startMatch(s))); assert.ok(wageLimit(s) >= wageBill(s), `week ${s.week}: ${wageBill(s)} > ${wageLimit(s)}`); }
});
test('first week: the board explains the wage budget', () => {
  const s = newGame(3);
  assert.ok(s.headlines.some((h) => /wage budget/i.test(h) && /£\d+k/.test(h)), s.headlines.join('|'));
});
import { takeJob } from '../src/game.ts';
test('a new job starts with a fresh board wage budget covering the inherited bill', () => {
  const s = newGame(5); s.offers = [s.clubs.find((c) => c.id !== s.clubId).id];
  const b = takeJob(s, s.offers[0]);
  assert.ok(wageLimit(b) >= wageBill(b));
  assert.equal(b.wageBudget.graceSeason, b.season);
});
