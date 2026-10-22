import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, LEAGUES, clubOutlook, ordinal } from '../src/world.ts';

test('club outlook labels are relative to the league', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  for (const l of LEAGUES) {
    const cs = WORLD.filter((c) => c.division === l.division);
    const labels = cs.map((c) => clubOutlook(WORLD, c.id).label);
    const top = l.tier === 2 ? 'Promotion favourite' : 'Title contender';
    assert.ok(labels.includes(top), l.name);
    const under = labels.filter((x) => x === 'Underdog story').length;
    assert.ok(under < cs.length * 0.5, `${l.name}: ${under}/${cs.length} underdogs`);
    const best = cs.reduce((a, b) => (b.rating > a.rating ? b : a));
    assert.equal(clubOutlook(WORLD, best.id).expected, 'Expected: 1st');
  }
});
