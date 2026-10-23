import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch } from '../src/game.ts';
import { slotsFor, layout, setSlot, autoPick, clearXI, bench, toggleBench, fit, warnings } from '../src/lineup.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId);
test('slots match formations', () => {
  for (const f of ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1']) { const sl = slotsFor(f); assert.equal(sl.length, 11); assert.equal(sl[0].pos, 'GK'); }
});
test('autoPick fills 11 natural GK and a bench of 7', () => {
  const s = autoPick(newGame(4, 'arsenal', 60));
  const xi = layout(s);
  assert.equal(xi.filter(Boolean).length, 11);
  assert.equal(xi[0].position, 'GK');
  assert.equal(own(s).filter((p) => p.starting).length, 11);
  assert.equal(bench(s).length, 7);
  assert.ok(bench(s).every((p) => !p.starting));
});
test('setSlot swaps players already in the XI', () => {
  const s = autoPick(newGame(5, 'arsenal', 60));
  const xi = layout(s), a = xi[1], b = xi[2];
  const t = setSlot(s, 1, b.id), x2 = layout(t);
  assert.equal(x2[1].id, b.id); assert.equal(x2[2].id, a.id);
  assert.equal(own(t).filter((p) => p.starting).length, 11);
});
test('setSlot from reserves/bench replaces occupant', () => {
  const s = autoPick(newGame(6, 'arsenal', 60));
  const sub = bench(s)[1], old = layout(s)[5];
  const t = setSlot(s, 5, sub.id);
  assert.equal(layout(t)[5].id, sub.id);
  assert.ok(!own(t).find((p) => p.id === old.id).starting);
  assert.ok(bench(t).some((p) => p.id === old.id));
  assert.equal(own(t).filter((p) => p.starting).length, 11);
});
test('clear then kick-off auto-fills, warnings and fit', () => {
  const s = clearXI(newGame(7, 'arsenal', 60));
  assert.equal(own(s).filter((p) => p.starting).length, 0);
  assert.ok(warnings(s).length >= 11);
  const m = startMatch(s);
  assert.equal(own(m).filter((p) => p.starting).length, 11);
  const gk = own(s).find((p) => p.position === 'GK');
  assert.equal(fit(gk, 'FW'), 'unsuitable'); assert.equal(fit(gk, 'GK'), 'natural');
});
test('bench toggle and save round trip', () => {
  let s = autoPick(newGame(8, 'arsenal', 60));
  const r = own(s).find((p) => !p.starting && !bench(s).includes(p));
  s = toggleBench(s, bench(s)[0].id); assert.equal(bench(s).length, 6);
  if (r) { s = toggleBench(s, r.id); assert.equal(bench(s).length, 7); }
  const d = decodeSave(encodeSave(s));
  assert.deepEqual(d.lineup, s.lineup); assert.deepEqual(d.bench, s.bench);
});
