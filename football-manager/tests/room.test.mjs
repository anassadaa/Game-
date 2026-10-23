import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { hierarchy, groups, setMentor, mentorWeek, wageGrievance, roomWeek, giveRaise } from '../src/room.ts';
import { decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId);
test('hierarchy ranks leaders and the captain; social groups cover the squad', () => {
  const s = newGame(61); const h = hierarchy(s);
  assert.equal(h.length, own(s).length);
  assert.equal(h[0].tier, 'Team leader');
  assert.ok(h.some((x) => x.tier === 'Other'));
  const g = groups(s); assert.equal(g.reduce((n, x) => n + x.ids.length, 0), own(s).length);
});
test('mentoring pairs a senior with a youngster and improves him', () => {
  const s = newGame(62); const sq = own(s);
  const old = sq.reduce((a, b) => (b.age > a.age ? b : a)), kid = sq.reduce((a, b) => (b.age < a.age ? b : a));
  const t = setMentor(s, kid.id, old.id); const k = t.players.find((p) => p.id === kid.id);
  assert.equal(k.mentor, old.id);
  assert.equal(setMentor(s, old.id, kid.id), s);
  const before = k.rating; for (let w = 0; w < 30; w++) { t.week = w % 18; mentorWeek(t); }
  assert.ok(t.players.find((p) => p.id === kid.id).rating > before);
  assert.ok(decodeSave(JSON.stringify(t)));
  assert.equal(decodeSave(JSON.stringify({ ...t, players: t.players.map((p) => (p.id === kid.id ? { ...p, mentor: 'nobody' } : p)) })) !== null, true);
});
test('underpaid stars complain about wages and a raise settles it', () => {
  const s = newGame(63); const sq = own(s).sort((a, b) => b.rating - a.rating);
  sq[0].wage = 1; assert.ok(wageGrievance(s, sq[0]));
  let hit = false; for (let w = 0; w < 18 && !hit; w++) { s.week = w; roomWeek(s); hit = sq[0].unhappy === 'wages'; }
  assert.ok(hit);
  const t = giveRaise(s, sq[0].id); const p = t.players.find((x) => x.id === sq[0].id);
  assert.ok(!p.unhappy && p.wage > 1 && t.budget <= s.budget);
});
