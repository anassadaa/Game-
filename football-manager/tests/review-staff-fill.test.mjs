import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { manageStaff } from '../src/delegate.ts';
import { staff } from '../src/staff.ts';
test('empty staff roles are refilled within the window (fills are not "churn")', () => {
  for (const seed of [7, 12, 40]) {
    let s = setMode(newGame(seed), 'chairman'); s = structuredClone(hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3));
    s.staff = []; s.week = 1;
    for (let w = 1; w <= 3; w++) { s.week = w; s = manageStaff(s); }
    assert.ok(staff(s).length >= 2, `seed ${seed}: only ${staff(s).length} staff after the window`);
    assert.ok(s.budget >= 0);
  }
});
