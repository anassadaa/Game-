import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, negotiate, acceptBid, renewContract, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { agentFee, releaseClause, ffpSeason, ffpLimit } from '../src/finance.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('release clause forces a sale, agent fee and sell-on applied, FFP tracked', () => {
  let s = newGame(7);
  s.budget = 1e6;
  const t = s.rivals.find((p) => p.rating >= 60);
  const clause = releaseClause(t);
  const [a, msg] = negotiate(s, t.id, { fee: clause, wage: t.wage * 2, years: 3, sellOn: 20 });
  assert.match(msg, /Release clause triggered/);
  const me = a.players.find((p) => p.id === t.id);
  assert.equal(me.sellOn.pct, 20);
  assert.equal(a.budget, s.budget - clause - agentFee(t, clause));
  assert.equal(a.ffp.spend, clause + agentFee(t, clause));
  a.bids = [{ id: 'x', playerId: t.id, clubId: a.clubs.find((c) => c.id !== a.clubId).id, fee: 1000 }];
  const [b] = acceptBid(a, 'x');
  assert.equal(b.budget, a.budget + 800);
  assert.equal(b.ffp.income, 800);
  const r = renewContract(b, b.players.find((p) => p.clubId === b.clubId).id, 3, 500);
  assert.ok(r.players.some((p) => p.clause));
  assert.ok(decodeSave(encodeSave(r)));
  const c = structuredClone(r); c.ffp.spend = ffpLimit(c) + 1e5;
  ffpSeason(c);
  assert.equal(c.embargo, true);
  assert.match(negotiate(c, c.rivals[0].id, { fee: 1, wage: 1, years: 1 })[1], /embargo/);
});
test('season runs with finance hooks', () => {
  let s = newGame(9);
  for (let w = 0; w < 20; w++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(s.ffp && typeof s.embargo === 'boolean');
});
