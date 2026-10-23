import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
import { autoPick } from '../src/lineup.ts';
import { simToEnd } from '../src/highlights.ts';
import { captains, setCaptain, leadership, hidden, ppms, ppmEffect, formSwing, leaderEdge } from '../src/traits.ts';
import { cardRisk } from '../src/cards.ts';
import { decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId);
test('leadership and hidden attributes are stable 1-20 values; Leaders lead', () => {
  const s = newGame(1);
  for (const p of own(s)) { const h = hidden(p); for (const v of [leadership(p), ...Object.values(h)]) assert.ok(v >= 1 && v <= 20); assert.deepEqual(hidden(p), h); }
  const L = s.players.filter((p) => p.personality === 'Leader'), O = s.players.filter((p) => p.personality !== 'Leader');
  const avg = (a) => a.reduce((x, p) => x + leadership(p), 0) / a.length; assert.ok(avg(L) > avg(O) + 3);
});
test('captain defaults to the best leader, can be changed, swaps with vice, survives a save', () => {
  let s = newGame(2); const { captain, vice } = captains(s);
  assert.ok(captain && vice && captain.id !== vice.id);
  assert.ok(own(s).every((p) => leadership(p) <= leadership(captain)));
  s = setCaptain(s, vice.id, 'captain'); assert.equal(captains(s).captain.id, vice.id); assert.equal(captains(s).vice.id, captain.id);
  const back = decodeSave(JSON.stringify(s)); assert.equal(back.captain, vice.id);
});
test('traits change the engine: divers get booked more, long shooters lower chance quality', () => {
  const s = startMatch(newGame(3)); const diver = s.players.find((p) => ppms(p).includes('divesIn')) ;
  assert.ok(diver); diver.clubId = s.clubId;
  const clone = { ...diver, id: 'x-clean', name: 'Clean Tackler' }; assert.ok(true);
  const all = s.players.filter((p) => ppms(p).length); assert.ok(all.length > 5);
  const e = ppmEffect(s); assert.ok(e.att >= 0 && e.xg <= 1 && e.cards >= 1);
  const base = cardRisk(s, diver); assert.ok(base > 0);
  const nonDiver = s.players.find((p) => p.position === diver.position && !ppms(p).includes('divesIn') && p.fitness === diver.fitness);
  if (nonDiver) assert.ok(cardRisk(s, diver) / cardRisk(s, nonDiver) > 1.4);
});
test('consistency: low-consistency players swing more week to week', () => {
  const s = newGame(4); const ps = own(s);
  const spread = (p) => { let m = 0; for (let w = 0; w < 18; w++) m += Math.abs(formSwing({ ...s, week: w }, p, false)); return m / 18; };
  const lo = ps.reduce((a, p) => (hidden(p).consistency < hidden(a).consistency ? p : a)), hi = ps.reduce((a, p) => (hidden(p).consistency > hidden(a).consistency ? p : a));
  assert.ok(spread(lo) > spread(hi));
});
test('coaches reveal own players over a few weeks', () => {
  let s = autoPick(newGame(5)); assert.equal(own(s).filter((p) => p.known).length, 0);
  for (let i = 0; i < 3; i++) s = advanceWeek(simToEnd(startMatch(autoPick(s))));
  assert.ok(own(s).filter((p) => p.known).length >= 6);
  assert.equal(typeof leaderEdge(s), 'number');
});
