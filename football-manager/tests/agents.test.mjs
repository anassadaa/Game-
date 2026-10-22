import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { signFreeAgent, counterBid, declineMsg, freeAsk, ceiling, release, agentText } from '../src/agents.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const week = (s) => advanceWeek(simToEnd(startMatch(s)));
test('free agents sign with no fee; offers below ask are refused', () => {
  const s = newGame(5, 'arsenal', 60);
  const p = s.market.find((x) => x.rating <= ceiling(s));
  const before = s.budget, ask = freeAsk(s, p);
  const [same, no] = signFreeAgent(s, p.id, { wage: Math.round(ask * 0.6), years: 2, bonus: 0 });
  assert.equal(same, s); assert.match(no, /turns it down/);
  const [b, ok] = signFreeAgent(s, p.id, { wage: ask, years: 3, bonus: 50 });
  assert.match(ok, /free/);
  assert.equal(b.budget, before - 50);
  assert.ok(b.players.some((x) => x.id === p.id && x.clubId === 'arsenal' && x.contract === 3));
  assert.ok(decodeSave(encodeSave(b)));
});
test('released players survive market refresh; counter bids; agent inbox over a season', () => {
  let s = newGame(9, 'wrexham', 25);
  const p = { ...s.players.at(-1), id: 'rel1' };
  release(s, p);
  assert.ok(s.market.find((x) => x.id === 'rel1' && x.released));
  s.bids = [{ id: 'b1', playerId: s.players[0].id, clubId: s.clubs[1].id, fee: 100 }];
  const [c, m] = counterBid(s, 'b1', 105); assert.equal(c.bids[0].fee, 105); assert.match(m, /agree/);
  const [w] = counterBid(s, 'b1', 1000); assert.equal(w.bids.length, 0);
  let seen = 0;
  for (let i = 0; i < 12; i++) {
    s = week(s);
    seen += (s.agentMsgs ?? []).length;
    for (const x of s.agentMsgs ?? []) assert.ok(agentText(s, x));
    if (s.agentMsgs?.length) s = declineMsg(s, s.agentMsgs[0].id);
  }
  assert.ok(s.market.find((x) => x.id === 'rel1'));
  assert.ok(seen > 0);
  assert.ok(decodeSave(encodeSave(s)));
  const old = JSON.parse(encodeSave(s)); delete old.agentMsgs;
  assert.ok(decodeSave(JSON.stringify(old)));
});
