import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { hireScout, moveScout, trueXg, REGIONS, MAX_SCOUTS } from '../src/scouts.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('regional scouts file xG reports that sharpen over time', () => {
  let s = newGame(41);
  for (let i = 0; i < 4; i++) s = hireScout(s, 'Spain');
  assert.equal(s.scouts.length, MAX_SCOUTS);
  s = moveScout(s, s.scouts[0].id, 'Italy');
  assert.ok(REGIONS.includes('Saudi Arabia'));
  for (let w = 0; w < 6; w++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(s.scoutReports.length >= 6);
  for (const r of s.scoutReports) {
    assert.ok(r.xg90 >= 0 && r.xg90 < 2 && r.est[0] <= r.est[1]);
    const p = s.rivals.find((x) => x.id === r.playerId);
    if (p && r.knowledge === 100) assert.equal(r.xg90, trueXg(p).xg);
  }
  const fw = s.rivals.find((p) => p.position === 'FW'), df = s.rivals.find((p) => p.position === 'DF');
  assert.ok(trueXg(fw).xg > trueXg(df).xg * 0.5);
  assert.deepEqual(decodeSave(encodeSave(s)).scouts, s.scouts);
});
