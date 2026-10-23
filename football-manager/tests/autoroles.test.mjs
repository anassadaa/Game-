import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { ROLES, INSTRUCTIONS, roleFit } from '../src/tactics.ts';
import { bestRole, autoAssign } from '../src/autoroles.ts';
import { decodeSave } from '../src/save.ts';
test('bestRole picks a valid role with a reason and sensible instruction', () => {
  const s = newGame(301);
  for (const p of s.players.filter((x) => x.clubId === s.clubId)) {
    const b = bestRole(p);
    assert.ok(ROLES[p.position][b.role], p.position + ' ' + b.role);
    assert.ok(INSTRUCTIONS.includes(b.instr));
    assert.ok(b.why.length > 0);
    const best = Math.max(...Object.keys(ROLES[p.position]).map((k) => roleFit(p, k)));
    assert.ok(roleFit(p, b.role) >= best - 8, 'never picks a clearly worse role');
    if (p.position === 'GK') assert.equal(b.instr, 'none');
  }
});
test('slot and traits steer the choice', () => {
  const s = newGame(302); const d = s.players.find((x) => x.clubId === s.clubId && x.position === 'DF');
  const flat = { ...d, attrs: { ...d.attrs, pace: 0, stamina: 0, defending: 0, passing: 0, mental: 0 } };
  assert.equal(bestRole({ ...flat, slot: 'LB' }).role, 'wingback');
  assert.notEqual(bestRole({ ...flat, slot: 'CB' }).role, 'wingback');
  assert.equal(bestRole({ ...flat, slot: 'LB' }).instr, 'get forward');
});
test('autoAssign sets every XI player in one go and is deterministic', () => {
  const s = newGame(303); const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const a = autoAssign(s), b = autoAssign(s);
  assert.notEqual(a, s);
  for (const p of xi) { assert.ok(a.tactics.roles[p.id]); assert.ok(a.tactics.instr[p.id]); }
  assert.deepEqual(a.tactics.roles, b.tactics.roles);
  assert.equal(s.tactics.roles?.[xi[0].id], undefined === s.tactics.roles ? undefined : s.tactics.roles[xi[0].id]);
  assert.ok(decodeSave(JSON.stringify(a)));
  assert.equal(autoAssign({ ...s, match: { complete: true } }).tactics, s.tactics);
});
