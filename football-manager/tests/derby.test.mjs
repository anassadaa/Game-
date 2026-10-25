import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { derbyRival, managerName, noteDerby, validDerby } from '../src/derby.ts';
test('a stable derby rival in our league, with a named manager', () => {
  const s = newGame(6); const r = derbyRival(s);
  assert.ok(r && r.id !== s.clubId && r.division === s.clubs.find((c) => c.id === s.clubId).division);
  assert.equal(derbyRival(s).id, r.id);
  assert.equal(managerName(s, r.id), managerName(s, r.id)); assert.ok(managerName(s, r.id).includes(' '));
});
test('derby results swing fans harder and are logged', () => {
  const s = newGame(6); const r = derbyRival(s); s.fans = 50;
  assert.equal(noteDerby(s, r.id, 2, 0), true); assert.equal(s.fans, 54); assert.equal(s.derby.w, 1);
  noteDerby(s, r.id, 0, 1); assert.equal(s.fans, 50); assert.equal(s.derby.l, 1);
  const other = s.clubs.find((c) => c.id !== s.clubId && c.id !== r.id);
  assert.equal(noteDerby(s, other.id, 3, 0), false); assert.equal(s.fans, 50);
});
test('validation', () => { assert.ok(validDerby({})); assert.equal(validDerby({ derby: { w: 'a' } }), false); });
