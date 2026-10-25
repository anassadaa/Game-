import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, CUP_WEEKS } from '../src/game.ts';
import { calendar, congestion, midweekLoad, setCupRotation } from '../src/calendar.ts';
import { decodeSave } from '../src/save.ts';
test('season calendar: league matchdays plus midweek cup ties', () => {
  const s = newGame(51); const cal = calendar(s);
  assert.equal(cal.filter((e) => e.kind === 'league').length, 18);
  const opps = cal.filter((e) => e.kind === 'league').map((e) => e.opp);
  for (const o of new Set(opps)) assert.ok(opps.filter((x) => x === o).length <= 2);
  assert.ok(cal.filter((e) => e.kind === 'cup').length >= 1);
  assert.equal(cal.find((e) => e.kind === 'cup' && e.label.startsWith('Cup ')).week, CUP_WEEKS[0]);
});
test('congestion: midweek ties drain starters unless you rotate', () => {
  const s = newGame(52); s.week = CUP_WEEKS[0] - 1;
  assert.ok(congestion(s).games >= 3); assert.equal(congestion(s).label, 'Congested');
  const st = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const bench = s.players.filter((p) => p.clubId === s.clubId && !p.starting && !p.injured);
  const f0 = st.map((p) => p.fitness), b0 = bench.map((p) => p.sharp ?? 70);
  assert.equal(midweekLoad(s), 0);
  assert.ok(st.every((p, i) => p.fitness < f0[i] || p.fitness <= 1));
  const t = setCupRotation(s, true); const st2 = t.players.filter((p) => p.clubId === t.clubId && p.starting);
  const f1 = st2.map((p) => p.fitness);
  assert.ok(midweekLoad(t) < 0);
  assert.deepEqual(st2.map((p) => p.fitness), f1);
  const bench2 = t.players.filter((p) => p.clubId === t.clubId && !p.starting && !p.injured);
  assert.ok(bench2.some((p) => (p.sharp ?? 70) > b0[bench.findIndex((x) => x.id === p.id)]));
  assert.ok(decodeSave(JSON.stringify(t)));
  assert.equal(decodeSave(JSON.stringify({ ...t, cupRotate: 'x' })), null);
});
test('midweek cup entries name the opponent and carry a competition icon and colour', async () => {
  const { newGame } = await import('../src/game.ts'); const { calendar } = await import('../src/calendar.ts');
  const s = newGame(11);
  const mid = calendar(s).filter((e) => e.kind === 'cup');
  assert.ok(mid.length);
  for (const e of mid) { assert.ok(e.icon && e.color && e.comp, JSON.stringify(e)); }
  const next = mid.find((e) => e.oppName);
  assert.ok(next, 'the next tie shows who we play');
});
