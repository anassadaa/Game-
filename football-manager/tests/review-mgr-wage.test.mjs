import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { autoBudget, setBudgetMod } from '../src/delegate.ts';
test('wage budget leaves room for the manager and staff salaries (no structural deficit)', () => {
  let s = setMode(newGame(3), 'chairman'); s = hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3); s = setBudgetMod(s, 0);
  const start = s.season;
  let worst = 0;
  while (s.season < start + 3) { s = advanceWeek(simToEnd(startMatch(s))); worst = Math.min(worst, s.budget); }
  assert.ok(worst > -3000, `bank fell to ${worst} with a hired manager at default budget`);
  const staffW = (s.staff ?? []).reduce((a, x) => a + (x.wage || 0), 0), inc = s.ledger.prev.income / 18;
  assert.ok(autoBudget(structuredClone(s)).wage <= Math.max(1, Math.round(inc - (s.hiredManager?.wage ?? 0) - staffW)), 'player wage plan fits income after manager+staff wages');
});
