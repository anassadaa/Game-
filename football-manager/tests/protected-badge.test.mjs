import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { playerProfile } from '../src/profile.ts';
import { PROTECTED_BADGE } from '../src/protect.ts';
test('3.3: protected players carry the 🛡️ Protected badge in their profile; others do not', () => {
  const s = newGame(9); const mine = s.players.filter(p => p.clubId === s.clubId);
  const kid = mine[0]; kid.age = 19; kid.potential = kid.rating + 20; delete kid.wonderkid;
  const vet = mine[1]; vet.age = 30; vet.wonderkid = false;
  assert.equal(PROTECTED_BADGE, '🛡️ Protected');
  const a = playerProfile(s, kid.id); assert.equal(a.protected, true); assert.ok(a.status.includes(PROTECTED_BADGE));
  const b = playerProfile(s, vet.id); assert.equal(b.protected, false); assert.ok(!b.status.includes(PROTECTED_BADGE));
});
