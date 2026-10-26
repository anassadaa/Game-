import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { matchDemand, capacity, setAutoTickets, setTicketPrice, autoPrice, seasonTicketQuote, weatherFor } from '../src/tickets.ts';
import { derbyRival } from '../src/derby.ts';

test('3.9 demand: derby and big opponents draw more; reasons are shown', () => {
  const s = newGame(3), me = s.clubs.find((c) => c.id === s.clubId), rival = derbyRival(s);
  const others = s.clubs.filter((c) => c.division === me.division && c.id !== me.id && c.id !== rival.id).sort((a, b) => a.rating - b.rating);
  const derby = matchDemand(s, { oppId: rival.id }), weak = matchDemand(s, { oppId: others[0].id }), strong = matchDemand(s, { oppId: others.at(-1).id });
  assert.ok(derby.reasons.some((r) => /Derby/.test(r.label)));
  assert.ok(strong.crowd >= weak.crowd, `${strong.crowd} ${weak.crowd}`);
  assert.ok(derby.crowd <= derby.capacity && weak.reasons.length >= 3);
});
test('3.9 demand: sell-outs cap at capacity; bigger stadium holds more; cup/midweek cut crowds', () => {
  const s = newGame(3); s.fans = 100; s.tickets = { price: 1 };
  const d = matchDemand(s); assert.ok(d.fill <= 1 && d.crowd <= d.capacity);
  const big = structuredClone(s); big.facilities = { ...(big.facilities ?? {}), stadium: 4 };
  assert.ok(capacity(big) > capacity(s));
  const t = newGame(3); assert.ok(matchDemand(t, { cup: true }).crowd < matchDemand(t).crowd || matchDemand(t).soldOut);
});
test('3.9 demand: dearer seats sell fewer but inelastic demand earns more; weather is hash-based', () => {
  const s = newGame(5), lo = matchDemand(setTicketPrice(s, 1)), hi = matchDemand(setTicketPrice(s, 5));
  assert.ok(lo.crowd >= hi.crowd); assert.ok(hi.gate > lo.gate);
  assert.deepEqual(weatherFor(s, 7), weatherFor(s, 7));
});
test('3.9 auto pricing: board/manager pick per match; furious fans get cheaper seats; season tickets adapt', () => {
  const s = setAutoTickets(newGame(5), true); assert.equal(matchDemand(s).auto, true); assert.match(matchDemand(s).by, /board/i);
  const happy = structuredClone(s); happy.fans = 90; const angry = structuredClone(s); angry.fans = 10;
  assert.ok(autoPrice(angry) <= autoPrice(happy));
  const a = structuredClone(s); a.fans = 20; const b = structuredClone(s); b.fans = 90;
  assert.ok(seasonTicketQuote(b, 10).share > seasonTicketQuote(a, 10).share);
  assert.ok(seasonTicketQuote(b, 10).reasons.length >= 3);
  assert.equal(setTicketPrice(s, 3).tickets.auto, undefined);
});
