import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, club } from '../src/game.ts';
import { fanTarget, fanEffects, fanWeek, fanNote } from '../src/fans.ts';
test('mood is not stuck: it drifts toward a target set by form', () => {
  const s = newGame(3); s.fans = 44; club(s).form = ['W', 'W', 'W', 'W', 'W'];
  const t = fanTarget(s); assert.ok(t.target > 44, `target ${t.target}`); assert.ok(t.reasons.some((r) => r.label.startsWith('Form')));
  fanWeek(s); assert.ok(s.fans > 44);
  club(s).form = ['L', 'L', 'L', 'L', 'L']; const before = s.fans; s.week += 1; fanWeek(s); assert.ok(s.fans < before);
});
test('derby results and star sales leave a fading memory', () => {
  const s = newGame(3), base = fanTarget(s).target;
  fanNote(s, 'Derby win', 8); assert.ok(fanTarget(s).target >= base + 7);
  const note = (x) => fanTarget(x).reasons.find((r) => r.label === 'Derby win')?.pct ?? 0;
  s.week += 4; assert.equal(note(s), 4);
  s.week += 5; assert.equal(note(s), 0);
  fanNote(s, 'Sold fan favourite X', -10); assert.ok(fanTarget(s).reasons.some((r) => r.pct === -10));
});
test('expensive tickets anger, cheap ones please', () => {
  const s = newGame(3); s.tickets = { price: 5 }; const hi = fanTarget(s).target; s.tickets = { price: 1 }; assert.ok(fanTarget(s).target > hi);
});
test('protest fatigue: repeated protests make more rarer and lift the target', () => {
  const s = newGame(3); s.fans = 26; const p0 = fanEffects(s).protest, t0 = fanTarget(s).target;
  s.fanLog = { protests: 3, season: { s: s.season, protests: 3 } };
  assert.ok(fanEffects(s).protest < p0); assert.ok(fanTarget(s).target > t0);
});
test('effects scale with mood', () => {
  const lo = fanEffects({ fans: 20 }), hi = fanEffects({ fans: 85 });
  for (const k of ['demand', 'merch', 'sponsor', 'homeEdge', 'valuation', 'morale']) assert.ok(hi[k] > lo[k], k);
  assert.ok(lo.protest > hi.protest); assert.ok(hi.appeal && lo.appeal);
});
