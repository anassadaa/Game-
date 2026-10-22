import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { buildFacility, facilityCost } from '../src/facilities.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('facilities take two weeks to build and survive saves', () => {
  let s = newGame(9);
  s.budget = 5000;
  const cost = facilityCost(s, 'stadium');
  s = buildFacility(s, 'stadium');
  assert.equal(s.budget, 5000 - cost);
  assert.equal(buildFacility(s, 'medical'), s, 'one project at a time');
  for (let i = 0; i < 2; i++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.equal(s.facilities.stadium, 2);
  assert.equal(s.facilities.building, undefined);
  assert.deepEqual(decodeSave(encodeSave(s)).facilities, s.facilities);
  const old = JSON.parse(encodeSave(s)); delete old.facilities;
  assert.equal(decodeSave(JSON.stringify(old)).facilities.training, 1);
  const bad = JSON.parse(encodeSave(s)); bad.facilities.medical = 99;
  assert.equal(decodeSave(JSON.stringify(bad)), null);
});
