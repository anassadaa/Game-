import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek, signPlayer, club } from '../src/game.ts';
import { autoPick } from '../src/lineup.ts';
import { simToEnd } from '../src/highlights.ts';
import { ledger, totalIn, totalOut, seasonPayout } from '../src/finance.ts';
import { decodeSave } from '../src/save.ts';
const week = (s) => advanceWeek(simToEnd(startMatch(autoPick(s))));
test('the ledger explains every pound: opening cash + income - costs = cash', () => {
  let s = autoPick(newGame(5)); const b0 = s.budget;
  for (let i = 0; i < 6; i++) s = week(s);
  const cheap = s.market.slice().sort((a, b) => a.price - b.price)[0]; s = signPlayer(s, cheap.id); s = week(s);
  const l = ledger(s);
  assert.equal(b0 + totalIn(l) - totalOut(l), s.budget);
  assert.ok(l.inc.gate > 0 && l.inc.tv > 0 && l.inc.sponsor > 0 && l.out.wages > 0 && l.out.signings > 0);
  assert.equal(l.weeks.length, 7); assert.ok(decodeSave(JSON.stringify(s)));
});
test('finishing higher pays more; a promoted side earns a bonus', () => {
  const top = seasonPayout(2, 1, 12, true), mid = seasonPayout(2, 6, 12, false), low = seasonPayout(2, 12, 12, false);
  assert.ok(top.tv + top.prize > mid.tv + mid.prize && mid.tv + mid.prize > low.tv + low.prize);
});
test('a season of normal management grows cash, and the season closes into a summary', () => {
  let s = autoPick(newGame(6)); const b0 = s.budget, s0 = s.season;
  while (s.season === s0 && !s.sacked) s = week(s);
  assert.ok(s.budget > b0, `${b0} -> ${s.budget}`);
  assert.equal(ledger(s).prev.season, s0); assert.ok(ledger(s).prev.income > ledger(s).prev.costs);
});
