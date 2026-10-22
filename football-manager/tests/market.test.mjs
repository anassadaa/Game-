import test from 'node:test';
import assert from 'node:assert/strict';
import { takeJob, newGame, startMatch, advanceMatch, advanceWeek, negotiate, toggleListed, acceptBid, searchMarket, askingPrice, windowOpen, migrate } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';

const play = (s) => { if (s.sacked) s = takeJob(s, s.offers[0]); s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };

test('rival clubs have real squads and the market can be searched', () => {
  const s = newGame(11);
  assert.ok(s.rivals.length >= 265 * 14 && s.rivals.length <= 265 * 22);
  assert.ok(searchMarket(s, { position: 'GK' }).every((p) => p.position === 'GK'));
  assert.ok(searchMarket(s, { maxAge: 21 }).every((p) => p.age <= 21));
  assert.ok(searchMarket(s, { source: 'clubs', maxPrice: 400 }).every((p) => askingPrice(p) <= 400 && p.clubId !== 'market'));
  assert.ok(decodeSave(encodeSave(s)));
});

test('buy from a rival club during the window', () => {
  let s = newGame(12);
  s.budget = 99999;
  const t = s.rivals[0];
  const [b] = negotiate(s, t.id, { fee: askingPrice(t), wage: t.wage * 2, years: 3 });
  assert.ok(b.players.some((p) => p.id === t.id && p.clubId === s.clubId));
  assert.ok(!b.rivals.some((p) => p.id === t.id));
  assert.ok(b.news.length >= 1);
  assert.ok(decodeSave(encodeSave(b)));
  s.week = 5;
  assert.equal(windowOpen(s), false);
  assert.match(negotiate(s, t.id, { fee: 9999, wage: 99, years: 3 })[1], /closed/);
});

test('listed players attract bids which can be accepted; seasons keep rivals full', () => {
  let s = newGame(13);
  const roster = s.players.filter((p) => p.clubId === s.clubId);
  for (const p of roster) s = toggleListed(s, p.id);
  s = play(s);
  assert.ok(s.bids.length > 0);
  const before = s.budget, bid = s.bids[0];
  const [b] = acceptBid(s, bid.id);
  assert.equal(b.budget, before + bid.fee);
  assert.ok(b.rivals.some((p) => p.id === bid.playerId && p.clubId === bid.clubId));
  assert.equal(b.players.filter((p) => p.starting).length, 11);
  assert.ok(decodeSave(encodeSave(b)));
  let c = b;
  for (let i = 0; i < 20; i++) c = play(c);
  assert.ok(c.clubs.filter((x) => x.id !== c.clubId).every((x) => c.rivals.filter((p) => p.clubId === x.id).length >= 13));
  assert.ok(decodeSave(encodeSave(c)));
});

test('older saves without rivals are migrated', () => {
  const s = newGame(14);
  delete s.rivals; delete s.bids; delete s.news;
  const d = decodeSave(JSON.stringify(s));
  assert.ok(d && d.rivals.length > 200);
});
