import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/game.ts';
import { decodeSave } from '../src/save.ts';

const finishMatch = (s) => {
  s = g.startMatch(s);
  while (!s.match.complete) s = g.advanceMatch(s);
  return s;
};

test('v1 saves migrate to the current version', () => {
  const s = g.newGame(77);
  const loaded = decodeSave(JSON.stringify({ ...s, version: 1 }));
  assert.ok(loaded);
  assert.equal(loaded.version, 2);
});

test('player names are unique across squad and market', () => {
  const s = g.newGame(5);
  const names = [...s.players, ...s.market].map((p) => p.name);
  assert.equal(new Set(names).size, names.length);
});

test('full-time produces ratings and a man of the match', () => {
  const s = finishMatch(g.newGame(9));
  assert.equal(Object.keys(s.match.ratings).length, 11);
  assert.ok(s.match.motm);
});

test('players have attributes, personality and potential stars', () => {
  const s = g.newGame(11);
  const p = s.players[0];
  const a = g.attributes(p);
  assert.equal(Object.keys(a).length, 7);
  assert.ok(g.PERSONALITIES.includes(p.personality));
  const st = g.potentialStars(p);
  assert.ok(st >= 0.5 && st <= 5);
  const old = structuredClone(s);
  old.version = 1;
  old.players.forEach((x) => { delete x.attrs; delete x.personality; });
  const m = decodeSave(JSON.stringify(old));
  assert.ok(m.players.every((x) => x.attrs && x.personality));
});

test('negotiation counters low bids and accepts fair ones', () => {
  let s = g.newGame(12);
  s.budget = 99999;
  const t = s.market[0];
  let [a, msg] = g.negotiate(s, t.id, { fee: Math.round(t.price * 0.8), wage: t.wage * 2, years: 3 });
  assert.match(msg, /Counter/);
  [a, msg] = g.negotiate(a, t.id, { fee: t.price * 2, wage: t.wage * 2, years: 3, instalments: true });
  assert.ok(a.players.some((p) => p.id === t.id));
  assert.equal(a.instalments.length, 1);
  assert.ok(decodeSave(JSON.stringify(a)));
});

test('loans and renewals work', () => {
  let s = g.newGame(13);
  s.budget = 99999;
  s = g.loanIn(s, s.market[0].id);
  assert.ok(s.players.some((p) => p.loan));
  const own = s.players.find((p) => !p.loan);
  s = g.renewContract(s, own.id, 4);
  assert.equal(s.players.find((p) => p.id === own.id).contract, 4);
});
