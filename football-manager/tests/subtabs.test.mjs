import test from 'node:test'; import assert from 'node:assert/strict';
import { SUBTABS, pickSub } from '../src/subtabs.ts';
test('squad, tactics and transfers are split into short sub-pages', () => {
  for (const t of ['squad', 'tactics', 'transfers', 'club']) assert.ok(SUBTABS[t].length >= 3, t);
});
test('remembered sub-tab is used only when valid', () => {
  assert.equal(pickSub('squad', 'medical'), 'medical');
  assert.equal(pickSub('squad', 'nope'), SUBTABS.squad[0].id);
  assert.equal(pickSub('home', 'x'), null);
});
test('club tab splits into Board / Investments / Career / Cups / Fixtures', () => {
  assert.deepEqual(SUBTABS.club.map((x) => x.label), ['Board', 'Investments', 'Career', 'Cups', 'Fixtures', 'Stats']);
});
