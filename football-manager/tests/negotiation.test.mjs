import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, negotiate, askingPrice } from '../src/game.ts';
import { sellerStance, buyerStance, termsStance, loanStance, towards } from '../src/negotiation.ts';

const setup = () => {
  const s = newGame(5); s.week = 2; s.budget = 1e7;
  const t = s.rivals.filter((p) => !p.listed).sort((a, b) => b.price - a.price)[3];
  return { s, t, base: askingPrice(t, s) };
};

test('3.9: towards() only moves toward agreement', () => {
  assert.equal(towards(100, 120, 'down'), 100); assert.equal(towards(100, 90, 'down'), 90);
  assert.equal(towards(50, 40, 'up'), 50); assert.equal(towards(undefined, 7, 'up'), 7);
});

test('3.9: buying — lowball re-offers never drag the seller counter down, and it never rises', () => {
  const { s, t, base } = setup(); let st = s, prev = Infinity, msg;
  [st, msg] = negotiate(st, t.id, { fee: Math.round(base * 0.8), wage: t.wage * 3, years: 3 });
  const c1 = st.deals[`buy:${t.id}`]?.counter; assert.ok(c1 && c1 <= base, msg);
  prev = c1;
  [st, msg] = negotiate(st, t.id, { fee: 1, wage: t.wage * 3, years: 3 });
  const c2 = st.deals[`buy:${t.id}`]?.counter;
  if (c2 !== undefined) assert.ok(c2 >= prev - 0 && c2 <= prev, `lowball kept ${prev} -> ${c2}`);
});

test('3.9: buying — limited rounds, then the seller walks away for weeks', () => {
  const { s, t, base } = setup(); let st = s, msg = '';
  for (let i = 0; i < 6 && !/end talks|walked away/.test(msg); i++) [st, msg] = negotiate(st, t.id, { fee: Math.round(base * 0.7), wage: t.wage * 3, years: 3 });
  assert.match(msg, /end talks|walked away/);
  const [, again] = negotiate(st, t.id, { fee: Math.round(base * 0.9), wage: t.wage * 3, years: 3 });
  assert.match(again, /walked away|weeks/);
});

test('3.9: buying — meeting the stored counter signs the fee; personal terms then negotiate separately', () => {
  const { s, t, base } = setup(); let st = s, msg;
  [st, msg] = negotiate(st, t.id, { fee: Math.round(base * 0.9), wage: 1, years: 3 });
  const c = st.deals[`buy:${t.id}`]?.counter ?? Math.round(base * 0.9);
  [st, msg] = negotiate(st, t.id, { fee: c, wage: 1, years: 3 });
  assert.match(msg, /Fee agreed/);
  const w = st.deals[`terms:${t.id}`]?.counter; assert.ok(w > 1);
  [st, msg] = negotiate(st, t.id, { fee: c, wage: w, years: 3 });
  assert.match(msg, /signed/, msg);
});

test('3.9: each deal type has its own stance and reasons', () => {
  const { s, t, base } = setup(); const c = s.clubs.find((x) => x.id === t.clubId);
  const sell = sellerStance(s, t, c, base, false), buy = buyerStance(s, t, c, Math.round(t.price * 0.8), false);
  const terms = termsStance(s, t, s.clubs.find((x) => x.id === s.clubId), c, true), loan = loanStance(s, t, s.clubs.find((x) => x.id === s.clubId));
  for (const x of [sell, buy, terms, loan]) assert.ok(x.reasons.length >= 1);
  assert.ok(sell.rounds >= 2 && sell.rounds <= 4 && buy.rounds >= 2 && buy.rounds <= 3 && terms.rounds >= 2 && terms.rounds <= 4);
  const short = { ...t, contract: 1 }, long = { ...t, contract: 5 };
  assert.ok(sellerStance(s, short, c, base, false).floor < sellerStance(s, long, c, base, false).floor, 'contract running down weakens the seller');
});

import { counterBid, loanOffer } from '../src/game.ts';
test('3.9: selling — the buyer’s bid only rises, limited rounds, then it pulls out', () => {
  const s = newGame(5); s.week = 2; const p = s.players.find((x) => x.clubId === s.clubId);
  s.bids = [{ id: 'b1', playerId: p.id, clubId: s.clubs.find((c) => c.id !== s.clubId).id, fee: Math.round(p.price * 0.7) }];
  let st = s, msg = '', last = s.bids[0].fee;
  for (let i = 0; i < 5 && st.bids.length; i++) { [st, msg] = counterBid(st, 'b1', Math.round(p.price * 1.9)); if (st.bids[0]) { assert.ok(st.bids[0].fee >= last); last = st.bids[0].fee; } }
  assert.equal(st.bids.length, 0, msg); assert.match(msg, /pull out/);
});
test('3.9: loans — parent club wants a wage share and role; its demand eases but never rises', () => {
  const s = newGame(5); s.week = 2; s.budget = 1e6; const p = s.market[0];
  let [st, msg] = loanOffer(s, p.id, { wageShare: 0.3, role: 'starter' });
  const c1 = st.deals?.[`loan:${p.id}`]?.counter; assert.ok(c1, msg);
  [st, msg] = loanOffer(st, p.id, { wageShare: 0, role: 'starter' });
  const c2 = st.deals?.[`loan:${p.id}`]?.counter; if (c2 !== undefined) assert.ok(c2 <= c1);
  const [done, m2] = loanOffer(s, p.id, { wageShare: 1, role: 'starter' });
  assert.ok(done.players.some((x) => x.id === p.id && x.loan), m2);
});
