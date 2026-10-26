import test from 'node:test'; import assert from 'node:assert/strict';
import { slotsFor } from '../src/lineup.ts';
import { SHAPES } from '../src/tactics.ts';
test('no formation uses LM or RM slots', () => {
  for (const f of Object.keys(SHAPES)) { const l = slotsFor(f).map((x) => x.label); assert.equal(l.length, 11, f); assert.ok(!l.includes('LM') && !l.includes('RM'), `${f}: ${l}`); }
  assert.deepEqual(slotsFor('4-2-3-1').slice(7).map((x) => x.label), ['LW', 'AM', 'RW', 'ST']);
});
