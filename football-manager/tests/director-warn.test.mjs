import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager, managerWeek, jobAtRisk } from '../src/managers.ts';
test('3.2: Director mode warns when the hired manager\'s results threaten your job', () => {
  let s = setMode(newGame(6), 'director'); s = hireManager(s, managerCandidates(s)[0].id);
  s.week = 6; s.trust = 20; s.budget = 1e6; assert.ok(jobAtRisk(s)); managerWeek(s);
  assert.ok(s.headlines.some((h) => /putting your job at risk/.test(h)));
  const t = setMode(newGame(6), 'director'); const u = hireManager(t, managerCandidates(t)[0].id); u.week = 6; u.trust = 70; managerWeek(u);
  assert.ok(!u.headlines.some((h) => /job at risk/.test(h)));
});
