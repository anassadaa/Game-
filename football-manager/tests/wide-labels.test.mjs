import test from 'node:test'; import assert from 'node:assert/strict';
import { slotsFor } from '../src/lineup.ts';
const wide = (f) => slotsFor(f).filter((s) => s.pos === 'MF' || s.pos === 'FW').map((s) => s.label).filter((l) => /^(LM|RM|LW|RW)$/.test(l));
test('wide labels follow the formation: LM/RM in flat midfields, LW/RW in 4-3-3 and 4-2-3-1', () => {
  assert.deepEqual(wide('4-4-2'), ['LM', 'RM']); assert.deepEqual(wide('3-5-2'), ['LM', 'RM']);
  assert.deepEqual(wide('4-1-4-1'), ['LM', 'RM']); assert.deepEqual(wide('3-4-3'), ['LM', 'RM', 'LW', 'RW']);
  assert.deepEqual(wide('4-3-3'), ['LW', 'RW']); assert.deepEqual(wide('4-2-3-1'), ['LW', 'RW']);
  for (const f of ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3']) assert.equal(slotsFor(f).length, 11);
});
