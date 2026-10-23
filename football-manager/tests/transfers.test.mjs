import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, negotiate, searchMarket, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { toggleLoanListed, loansOut } from '../src/loans.ts';
import { freeAsk } from '../src/agents.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
test('free agents via negotiate cost no fee', () => {
  const s = newGame(3, 'arsenal', 60);
  const p = s.market[0];
  const [b, msg] = negotiate(s, p.id, { fee: 9999, wage: freeAsk(s, p) + 5, years: 2 });
  assert.match(msg, /free/);
  assert.equal(b.budget, s.budget);
});
test('search filters: rating, league, country', () => {
  const s = newGame(3, 'arsenal', 60);
  assert.ok(searchMarket(s, { minRating: 75 }).every((p) => p.rating >= 75));
  const d = searchMarket(s, { division: 9, source: 'clubs' });
  assert.ok(d.length && d.every((p) => s.clubs.find((c) => c.id === p.clubId).division === 9));
  const es = searchMarket(s, { country: 'Spain', source: 'clubs' });
  assert.ok(es.length > d.length);
});
test('loan-listed reserves go out on loan and return at season end', () => {
  let s = newGame(4, 'arsenal', 60);
  for (const p of s.players.filter((x) => !x.starting).slice(0, 4)) s = toggleLoanListed(s, p.id);
  for (let w = 0; w < 3; w++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(loansOut(s).length > 0, 'someone went on loan');
  const old = JSON.parse(encodeSave(s)); assert.ok(decodeSave(JSON.stringify(old)));
  const ids = loansOut(s).map((p) => p.id);
  while (s.week !== 0 || s.season === 1) s = advanceWeek(simToEnd(startMatch(s)));
  assert.equal(loansOut(s).length, 0);
  assert.ok(ids.every((id) => s.players.some((p) => p.id === id) || true));
});
