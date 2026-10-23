import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, searchMarket } from '../src/game.ts';
import { abilityRange, potentialRange } from '../src/scoutrange.ts';
const pool = (s) => [...s.market, ...(s.rivals ?? [])];
test('min potential filter matches on the upper bound of the scouted range', () => {
  const s = newGame(411);
  for (const m of [60, 70, 80]) {
    const got = new Set(searchMarket(s, { minPotential: m }).map((p) => p.id));
    const want = pool(s).filter((p) => potentialRange(s, p)[1] >= m).map((p) => p.id);
    assert.equal(got.size, want.length); for (const id of want) assert.ok(got.has(id));
  }
});
test('ability filter uses scouted ranges, not true ratings', () => {
  const s = newGame(412); let leaks = 0;
  for (const m of [55, 60, 65, 70, 75]) {
    const got = new Set(searchMarket(s, { minRating: m }).map((p) => p.id));
    for (const p of pool(s)) {
      assert.equal(got.has(p.id), abilityRange(s, p)[1] >= m);
      if (p.rating >= m !== abilityRange(s, p)[1] >= m) leaks++;
    }
  }
  assert.ok(leaks > 0, 'ranges differ from true ratings somewhere, so the test bites');
});
test('rating and potential sorts follow the visible ranges', () => {
  const s = newGame(413), mid = (r) => r[0] + r[1];
  const r = searchMarket(s, { sort: 'rating' });
  for (let i = 1; i < r.length; i++) assert.ok(mid(abilityRange(s, r[i - 1])) >= mid(abilityRange(s, r[i])));
  const q = searchMarket(s, { sort: 'potential' });
  for (let i = 1; i < q.length; i++) assert.ok(mid(potentialRange(s, q[i - 1])) >= mid(potentialRange(s, q[i])));
});
