import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, negotiate, sellPlayer, loanIn } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const bench = (s, id) => { s.players.find(x => x.id === id).starting = false; return s; };
test('no money printing: signing free agents and flipping them straight away does not make a profit', () => {
  let s = newGame(7); const b0 = s.budget;
  for (const p of s.market.filter(p => p.clubId === 'market').sort((a, b) => b.price - a.price).slice(0, 6)) {
    const [n] = negotiate(s, p.id, { fee: 0, wage: Math.round(p.wage * 1.2) + 1, years: 1 }); if (n === s || !n.players.some(x => x.id === p.id && x.clubId === n.clubId)) continue;
    s = sellPlayer(bench(decodeSave(encodeSave(n)), p.id), p.id);
  }
  assert.ok(s.budget <= b0, `flipping made £${s.budget - b0}k`);
});
test('loanees cannot be sold', () => {
  const s = newGame(7); const p = s.market.filter(p => p.clubId === 'market').sort((a, b) => b.price - a.price)[0];
  const n = bench(loanIn(s, p.id), p.id); assert.ok(n.players.some(x => x.id === p.id));
  const m = sellPlayer(n, p.id); assert.equal(m, n);
});
