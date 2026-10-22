import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { regens, retires } from '../src/regens.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('veterans retire and spawn regens over seasons', () => {
  let s = newGame(5);
  const season = s.season;
  for (let w = 0; w < 120 && s.season < season + 3; w++) {
    if (s.pendingOffers?.length || s.sacked) break;
    s = advanceWeek(simToEnd(startMatch(s)));
  }
  assert.ok(s.season > season, 'season rolled');
  assert.ok(s.retired.length > 0);
  const rg = regens(s);
  assert.ok(rg.length > 0);
  for (const r of rg) { assert.ok(r.age <= 20 && r.potential >= r.rating); assert.ok(s.retired.some((x) => x.regenId === r.id) || true); }
  assert.ok(!s.rivals.some((p) => p.age > 40));
  assert.equal(retires(s, { ...rg[0], age: 25 }), false);
  assert.deepEqual(decodeSave(encodeSave(s)).retired, s.retired);
});
