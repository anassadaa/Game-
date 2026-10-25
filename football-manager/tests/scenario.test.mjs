import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { SCENARIOS, applyScenario, judgeScenario, validScenario } from '../src/scenario.ts';
const mine = (s) => s.players.filter((p) => p.clubId === s.clubId);
test('scenario list includes none + 4 challenges', () => { assert.ok(SCENARIOS.length >= 5); assert.equal(SCENARIOS[0].id, 'none'); });
test('debt crisis slashes budget; no stars removes top 3 players', () => {
  const s = newGame(9); const cash = s.budget; const d = applyScenario(structuredClone(s), 'debt');
  assert.ok(d.budget < cash * 0.3); assert.equal(d.scenario.id, 'debt');
  const n = applyScenario(structuredClone(s), 'nostars'); assert.equal(mine(n).length, mine(s).length - 3);
  const top = mine(s).sort((a, b) => b.rating - a.rating)[0]; assert.ok(!mine(n).some((p) => p.id === top.id));
  assert.equal(applyScenario(structuredClone(s), 'none').scenario, undefined);
});
test('judging: firefight won if not relegated; promotion fails after deadline', () => {
  const s = applyScenario(newGame(9), 'firefight');
  judgeScenario(s, 10, 'Stayed the course'); assert.equal(s.scenario.status, 'won'); assert.ok(s.headlines[0].includes('Challenge'));
  const p = applyScenario(newGame(9), 'promotion');
  judgeScenario(p, 8, 'Stayed the course'); assert.equal(p.scenario.status, 'active');
  p.season++; judgeScenario(p, 8, 'Stayed the course'); assert.equal(p.scenario.status, 'failed');
  const q = applyScenario(newGame(9), 'promotion'); judgeScenario(q, 1, 'Promoted'); assert.equal(q.scenario.status, 'won');
});
test('validation', () => { assert.ok(validScenario({})); assert.equal(validScenario({ scenario: { id: 'zzz' } }), false); });
