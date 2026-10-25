import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, advanceWeek, startMatch } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { gateFactor, attendance, setTicketPrice, sellSeasonTickets, seasonTicketQuote, ticketShare, TICKET_LEVELS, validTickets } from '../src/tickets.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
test('normal price leaves the gate unchanged; dearer seats earn more per fan but fill fewer', () => {
  const s = newGame(1);
  assert.equal(gateFactor(s), 1);
  s.tickets = { price: 5 }; const hi = gateFactor(s), attHi = attendance(s);
  s.tickets = { price: 1 }; const lo = gateFactor(s), attLo = attendance(s);
  assert.ok(hi > 1 && lo < 1, `${hi} ${lo}`);
  assert.ok(attLo > attHi);
  assert.equal(TICKET_LEVELS.length, 5);
});
test('cheap tickets win fans each home game, dear ones lose them', () => {
  const fansAfter = (price) => { let s = newGame(1); s = setTicketPrice(s, price); for (let i = 0; i < 6; i++) s = advanceWeek(simToEnd(startMatch(s))); return s.fans; };
  assert.ok(fansAfter(1) > fansAfter(3) && fansAfter(3) > fansAfter(5));
});
test('season tickets: pre-season only, once per season, cash up front, home gates shrink by the holders share', () => {
  let s = newGame(2); const cash = s.budget;
  const q = seasonTicketQuote(s, 20);
  assert.ok(q.upfront > 0 && q.share > 0 && q.share < 0.8);
  s = sellSeasonTickets(s, 20);
  assert.equal(s.budget, cash + q.upfront);
  assert.equal(ticketShare(s), q.share);
  assert.equal(sellSeasonTickets(s, 10).budget, s.budget, 'only once');
  const t = newGame(2); t.week = 3; assert.equal(sellSeasonTickets(t, 10).budget, t.budget, 'pre-season only');
  assert.ok(seasonTicketQuote(newGame(2), 30).share > seasonTicketQuote(newGame(2), 0).share, 'discounts sell more');
});
test('ticket settings survive a save; junk is dropped', () => {
  let s = setTicketPrice(newGame(4), 4); s = sellSeasonTickets(s, 10);
  const back = decodeSave(encodeSave(s));
  assert.equal(back.tickets.price, 4); assert.equal(back.tickets.st.discount, 10);
  assert.ok(!validTickets({ price: 9 })); assert.ok(validTickets(undefined));
  const old = newGame(4); delete old.tickets; assert.ok(decodeSave(encodeSave(old)));
});
