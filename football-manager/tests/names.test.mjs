import test from 'node:test'; import assert from 'node:assert/strict';
import { genName, REGIONS, poolSize, fixNames } from '../src/names.ts';
import { newGame, migrate } from '../src/game.ts';

test('20,000 generated names: unique, no digits, deterministic', () => {
  const used = new Set(), a = [];
  for (let i = 0; i < 20000; i++) { const n = genName(7, `k${i}`, REGIONS[i % REGIONS.length], used); assert.ok(!/\d/.test(n), n); assert.ok(!used.has(n)); used.add(n); a.push(n); }
  const used2 = new Set(); for (let i = 0; i < 50; i++) { const n = genName(7, `k${i}`, REGIONS[i % REGIONS.length], used2); used2.add(n); assert.equal(n, a[i]); }
});
test('pools reach millions of combinations per region', () => {
  for (const r of REGIONS) { const { first, last } = poolSize(r); assert.ok(first >= 130 && last >= 190, r); assert.ok(first * last * last >= 5e6, r); }
  const plain = REGIONS.reduce((t, r) => t + poolSize(r).first * poolSize(r).last, 0); assert.ok(plain >= 3.5e5, String(plain));
});
test('new game: every player has a unique, digit-free name', () => {
  const s = newGame(3); const ps = [...s.players, ...s.market, ...(s.rivals ?? [])];
  assert.ok(ps.length > 1000); assert.equal(ps.filter((p) => /\d/.test(p.name)).length, 0);
  assert.equal(new Set(ps.map((p) => p.name)).size, ps.length);
});
test('old saves: numeric-suffix names are renamed, ids and stats kept', () => {
  const s = newGame(4); const p = s.players[0], q = s.rivals[5];
  p.name = 'Theo Kerr 6'; p.goals = 3; q.name = 'Samir Dawson 9';
  const id = p.id; const m = migrate(s);
  const p2 = m.players.find((x) => x.id === id); assert.ok(!/\d/.test(p2.name)); assert.equal(p2.goals, 3);
  assert.ok(!/\d/.test(m.rivals.find((x) => x.id === q.id).name));
  assert.equal(fixNames(m), 0);
});
