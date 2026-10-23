import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, migrate } from '../src/game.ts';
import { decodeSave } from '../src/save.ts';
const play = (s) => { let m = startMatch(s); while (!m.match.complete) m = advanceMatch(m); return m; };
test('bookings average a realistic rate and reds are rare', () => {
  let y = 0, r = 0, n = 25;
  for (let i = 0; i < n; i++) { const m = play(newGame(500 + i)); for (const c of m.match.cards ?? []) { y += c.y; if (c.red) r++; } }
  assert.ok(y / n > 1 && y / n < 3, `yellows ${y / n}`); assert.ok(r / n < 0.25, `reds ${r / n}`);
});
test('a sent-off player is suspended, then dropped and serves it', () => {
  const s = newGame(4); const p = s.players.find((x) => x.clubId === s.clubId && x.starting && x.position !== 'GK');
  let m = startMatch(s); m.match.cards = [{ id: p.id, y: 0, red: true }]; m.match.minute = 75; m = advanceMatch(m);
  assert.ok(m.players.find((x) => x.id === p.id).suspended >= 2);
  const k = startMatch({ ...m, match: undefined });
  assert.equal(k.players.find((x) => x.id === p.id).starting, false); assert.ok(!(k.bench ?? []).includes(p.id));
  assert.equal(k.players.filter((x) => x.clubId === k.clubId && x.starting).length, 11);
});
test('five bookings bring a one-match ban; saves validate', () => {
  const s = newGame(3); const p = s.players.find((x) => x.clubId === s.clubId && x.starting); p.yellows = 4;
  let m = startMatch(s); m.match.cards = [{ id: p.id, y: 1 }]; m.match.minute = 75; m = advanceMatch(m);
  const q = m.players.find((x) => x.id === p.id);
  if (!(m.match.cards.find((x) => x.id === p.id)?.red)) { assert.equal(q.suspended, 1); assert.equal(q.yellows, 0); }
  assert.ok(decodeSave(JSON.stringify(m)));
});
