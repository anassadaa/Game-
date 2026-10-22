import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { youthIntake, promoteYouth, releaseYouth } from '../src/youth.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('youth intake produces prospects and wonderkids that can be promoted', () => {
  let wonder = 0;
  for (let seed = 1; seed < 40; seed++) {
    const s = newGame(seed);
    s.academy = 5;
    youthIntake(s);
    assert.ok(s.youth.length >= 5 && s.youth.length <= 6);
    assert.ok(s.youth.every((p) => p.age >= 15 && p.age <= 17));
    wonder += s.youth.filter((p) => p.wonderkid && p.potential >= 86).length;
  }
  assert.ok(wonder > 0);
  const s = newGame(3);
  youthIntake(s);
  const [a, b] = s.youth;
  let t = promoteYouth(s, a.id);
  assert.ok(t.players.some((p) => p.id === a.id));
  t = releaseYouth(t, b.id);
  assert.equal(t.youth.length, s.youth.length - 2);
  const back = decodeSave(encodeSave(t));
  assert.equal(back.youth.length, t.youth.length);
  const old = JSON.parse(encodeSave(t)); delete old.youth;
  assert.deepEqual(decodeSave(JSON.stringify(old)).youth, []);
});
