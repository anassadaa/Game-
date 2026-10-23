import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/game.ts';
import { slotOf, footOf, ext, LINE_OF, slotProfile } from '../src/positions.ts';
import { decodeSave } from '../src/save.ts';
test('every player has a slot on his line, a foot and extended attributes; left-sided players lean left-footed', () => {
  const all = [11, 12, 13, 14, 15, 16, 17, 18].flatMap((i) => { const s = newGame(i); return s.players.concat(s.market, s.rivals ?? []); });
  for (const p of all) { assert.equal(LINE_OF[slotOf(p)], p.position); assert.ok(['L', 'R', 'B'].includes(footOf(p))); const e = ext(p); assert.ok(e.heading >= 1 && e.composure <= 99); }
  const lefts = all.filter((p) => ['LB', 'LW'].includes(slotOf(p))), others = all.filter((p) => !['LB', 'LW'].includes(slotOf(p)));
  const share = (xs) => xs.filter((p) => footOf(p) === 'L').length / Math.max(1, xs.length);
  assert.ok(share(lefts) > share(others) + 0.2, `${share(lefts)} vs ${share(others)}`);
  const cbs = all.filter((p) => slotOf(p) === 'CB'), ams = all.filter((p) => slotOf(p) === 'AM');
  const a = (xs, k) => xs.reduce((t, p) => t + ext(p)[k] - p.rating, 0) / xs.length;
  assert.ok(a(cbs, 'heading') > a(ams, 'heading') + 8); assert.ok(a(ams, 'vision') > a(cbs, 'vision') + 8);
});
test('a lopsided XI (no natural right side) is punished; saves migrate and validate slots', () => {
  const s = newGame(12);
  const base = slotProfile(s);
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting && p.position === 'DF');
  for (const p of xi) p.slot = 'LB';
  const bad = slotProfile(s);
  assert.ok(bad.def < base.def, `${bad.def} vs ${base.def}`); assert.ok(bad.notes.some((n) => /natural/.test(n)));
  const old = JSON.parse(JSON.stringify(newGame(13))); for (const p of old.players) { delete p.slot; delete p.foot; }
  const m = migrate(decodeSave(JSON.stringify(old))); assert.ok(m.players.every((p) => LINE_OF[slotOf(p)] === p.position && footOf(p)));
  m.players[0].slot = 'XX'; m.players[1].foot = 'Z'; const r = decodeSave(JSON.stringify(m)); assert.ok(r === null || (LINE_OF[slotOf(r.players[0])] === r.players[0].position && footOf(r.players[1]) !== 'Z'), 'corrupt slot rejected or repaired');
});
