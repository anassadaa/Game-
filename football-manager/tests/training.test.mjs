import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { toggleDrill, setFocus, retrain, weeklyTraining } from '../src/training.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('drills, focus, retraining and sharpness evolve weekly', () => {
  let s = newGame(5);
  s = toggleDrill(s, 'finishing'); s = toggleDrill(s, 'rondo'); s = toggleDrill(s, 'video'); s = toggleDrill(s, 'sprints');
  assert.deepEqual(s.drills, ['finishing', 'rondo', 'video']);
  const p = s.players.find((x) => x.position === 'MF' && x.clubId === s.clubId);
  s = setFocus(s, p.id, 'shooting');
  s = retrain(s, p.id, 'FW');
  for (let w = 0; w < 10; w++) weeklyTraining(s, new Set());
  const after = s.players.find((x) => x.id === p.id);
  assert.equal(after.position, 'FW');
  assert.ok(s.trainingReport.lines.length > 0);
  assert.ok(after.sharp >= 20);
  const idle = newGame(6); weeklyTraining(idle, new Set()); assert.ok(idle.players.every((x) => x.sharp === 64));
  s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(s.players.filter((x) => x.starting).every((x) => x.sharp > 20));
  const back = decodeSave(encodeSave(s));
  assert.ok(back);
  assert.deepEqual(back.drills, s.drills);
});
