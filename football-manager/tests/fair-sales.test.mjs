import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, minSaleFee, findBuyer } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { boardRescue, plan, manageTransfers } from '../src/delegate.ts';
const club = (seed = 12) => { const s = setMode(newGame(seed), 'chairman'); return structuredClone(hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3)); };
const mine = (s) => s.players.filter(p => p.clubId === s.clubId);
test('3.3: minimum sale fee is full value or what we paid, whichever is higher', () => {
  const p = { price: 1000 }; assert.equal(minSaleFee(p), 1000);
  assert.equal(minSaleFee({ price: 1000, boughtAt: { s: 1, w: 1, paid: 1500 } }), 1500);
});
test('3.3: board-forced sale books at least full value; otherwise a loan', () => {
  for (const seed of [12, 13, 14, 15, 16, 17]) {
    const s = club(seed); s.week = 9; s.budget = -500; plan(s).approveOver = 1e9; const before = s.budget;
    const b = boardRescue(s); const gone = mine(s).find(p => !mine(b).some(q => q.id === p.id)); assert.ok(gone);
    const loaned = (b.loansOut ?? []).some(x => x.id === gone.id);
    if (!loaned) assert.ok(b.budget - before >= minSaleFee(gone) * 0.7, `seed ${seed}: got ${b.budget - before} for value ${gone.price}`); // agent cut aside
    assert.match(plan(b).log[0], loaned ? /loan/i : /sold for £/);
  }
});
test('3.3: no buyer at full value -> he goes on loan, wages paid by the taker', () => {
  const s = club(); s.week = 9; s.budget = -500; plan(s).approveOver = 1e9;
  for (const p of mine(s)) p.boughtAt = { s: 1, w: 1, paid: p.price * 50 }; // nobody pays 50x
  const b = boardRescue(s); assert.equal(mine(b).length, mine(s).length - 1); assert.ok(b.loansOut.length >= 1);
  assert.ok(findBuyer(b, b.loansOut.at(-1), minSaleFee(b.loansOut.at(-1))) === null);
});
test('3.3: the headline and log name the fee', () => {
  for (const seed of [12, 13, 14, 15]) { const s = club(seed); s.week = 9; s.budget = -500; plan(s).approveOver = 1e9; const b = boardRescue(s);
    if (/sold/.test(plan(b).log[0])) { assert.match(b.headlines[0], /Board-forced sale: .+ sold for £[\d.]+[mk]/); assert.match(plan(b).log[0], /Board-forced sale: .+ sold for £/); return; } }
  assert.fail('no sale in 4 seeds');
});
