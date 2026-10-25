import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { setBudgetMod, budgetLeft } from '../src/delegate.ts';
import { staff } from '../src/staff.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
test('3.1 review: 3 seasons with a hired manager (max budget, save/load weekly) keep bank, budgets and staff sane', () => {
  for (const [seed, mode] of [[12, 'chairman'], [7, 'owner']]) {
    let s = setMode(newGame(seed), mode); s = hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3); s = setBudgetMod(s, 100);
    const start = s.season;
    while (s.season < start + 3) {
      s = decodeSave(encodeSave(advanceWeek(simToEnd(startMatch(s)))));
      assert.ok(s, 'save round-trips');
      assert.ok(s.budget > -1500, `seed ${seed} S${s.season}W${s.week}: bank ${s.budget}`);
      if (s.hiredManager) { const left = budgetLeft(structuredClone(s)); assert.ok(left <= Math.max(0, s.budget), `left ${left} > bank ${s.budget}`); }
      if (s.week >= 4) assert.ok(staff(s).length >= 1, `seed ${seed} S${s.season}W${s.week}: no staff`);
    }
  }
});
