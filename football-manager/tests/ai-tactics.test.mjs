import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, opponent } from '../src/game.ts';
import { planMatch, adjustPlan, clubPlan, philosophyOf, LMRM_SHAPES } from '../src/aitactics.ts';
import { managerCandidates, hireManager, setMode } from '../src/managers.ts';
const ctx = (o = {}) => ({ seed: 'x', strength: 70, oppStrength: 70, oppStyle: 'balanced', home: true, squad: [], injured: 0, fatigue: 90, rank: 10, size: 20, week: 5, personality: 'balanced', philosophy: 'pragmatic', ...o });
test('plan is deterministic and explains itself', () => {
  const a = planMatch(ctx()), b = planMatch(ctx());
  assert.deepEqual(a, b); assert.ok(a.reasons.length >= 2);
  for (const k of ['formation', 'mentality', 'press', 'tempo', 'width', 'line', 'passing']) assert.ok(a[k], k);
});
test('underdog away sits deep and counters; favourite at home attacks', () => {
  const u = planMatch(ctx({ strength: 62, oppStrength: 78, home: false }));
  assert.equal(u.mentality, 'cautious'); assert.equal(u.line, 'deep'); assert.equal(u.counter, true); assert.notEqual(u.press, 'high');
  const f = planMatch(ctx({ strength: 80, oppStrength: 64, home: true }));
  assert.equal(f.mentality, 'attacking'); assert.notEqual(f.line, 'deep');
});
test('against a deep block: patience and width', () => {
  const p = planMatch(ctx({ oppStyle: 'cautious', strength: 74, oppStrength: 68 }));
  assert.equal(p.width, 'wide'); assert.equal(p.tempo, 'patient');
});
test('philosophy and personality change the plan', () => {
  const plans = ['possession', 'counter', 'pressing', 'direct', 'pragmatic'].map((philosophy) => JSON.stringify(planMatch(ctx({ philosophy }))));
  assert.ok(new Set(plans).size >= 4);
  assert.equal(planMatch(ctx({ philosophy: 'pressing' })).press, 'high');
  assert.equal(planMatch(ctx({ philosophy: 'pressing', fatigue: 60 })).press === 'high', false);
});
test('in-match: chase when losing late, shut up shop when winning late', () => {
  const base = planMatch(ctx({ strength: 70, oppStrength: 72 }));
  const l = adjustPlan(base, { us: 0, them: 1, minute: 75, fatigue: 80 });
  assert.equal(l.plan.mentality, 'attacking'); assert.equal(l.plan.tempo, 'quick'); assert.ok(l.note);
  const w = adjustPlan(base, { us: 1, them: 0, minute: 75, fatigue: 80 });
  assert.equal(w.plan.mentality, 'cautious'); assert.equal(w.plan.line, 'deep'); assert.ok(w.note);
  assert.equal(adjustPlan(base, { us: 0, them: 0, minute: 15, fatigue: 90 }).note, undefined);
});
test('AI clubs vary formations across the league, using both LM/RM and LW/RW shapes', () => {
  const s = newGame(7); const forms = new Set();
  for (const c of s.clubs.filter((c) => c.division === 1)) for (const o of s.clubs.filter((c) => c.division === 1).slice(0, 4)) if (o.id !== c.id) forms.add(clubPlan(s, c.id, o.id, true).formation);
  assert.ok(forms.size >= 4, [...forms].join());
  assert.ok([...forms].some((f) => LMRM_SHAPES.includes(f))); assert.ok([...forms].some((f) => ['4-3-3', '4-2-3-1'].includes(f)));
  assert.ok(['possession', 'counter', 'pressing', 'direct', 'pragmatic'].includes(philosophyOf('abc')));
});
test('match stores the opponent plan with reasons, and a hired manager picks ours', () => {
  let s = startMatch(newGame(11));
  assert.ok(s.match.oppPlan?.reasons.length); assert.ok(s.match.timeline.some((e) => /set up in|line up in/.test(e.text)));
  for (let i = 0; i < 6; i++) s = advanceMatch(s);
  assert.ok(s.match.complete);
  let o = setMode(newGame(12), 'chairman'); const c = managerCandidates(o)[0]; o = hireManager(o, c.id, 2);
  const m = startMatch(o);
  assert.ok(m.match.ourPlan?.reasons.length); assert.equal(m.tactics.formation, m.match.ourPlan.formation);
  assert.equal(m.tactics.mentality, m.match.ourPlan.mentality);
});
