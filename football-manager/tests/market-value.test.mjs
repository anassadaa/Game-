import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { targetValue, stepValue, valuesWeek } from '../src/value.ts';
const base = (s, over = {}) => { const p = structuredClone(s.players.find(x => x.clubId === s.clubId && x.position === 'MF')); delete p.wonderkid; Object.assign(p, { rating: 70, potential: 72, age: 26, contract: 3, apps: 0, ratingSum: 0, goals: 0, assists: 0, injured: 0, injuries: 0, listed: false }, over); return p; };
test('young high-potential beats an older player of the same overall', () => {
  const s = newGame(5); const kid = base(s, { age: 19, potential: 88 }), vet = base(s, { age: 32, potential: 70 });
  assert.ok(targetValue(s, kid) > targetValue(s, base(s)) && targetValue(s, base(s)) > targetValue(s, vet) * 1.5, `${targetValue(s, kid)} ${targetValue(s, base(s))} ${targetValue(s, vet)}`);
});
test('higher overall is worth more; value peaks mid-20s and declines after 30', () => {
  const s = newGame(5); assert.ok(targetValue(s, base(s, { rating: 80, potential: 82 })) > targetValue(s, base(s)) * 1.8);
  const v = [24, 28, 30, 32, 34].map(age => targetValue(s, base(s, { age })));
  for (let i = 1; i < v.length; i++) assert.ok(v[i] < v[i - 1], v.join(','));
});
test('form, goals and assists raise value; poor form lowers it', () => {
  const s = newGame(5); const flat = targetValue(s, base(s));
  assert.ok(targetValue(s, base(s, { apps: 10, ratingSum: 78, goals: 6, assists: 4 })) > flat * 1.1);
  assert.ok(targetValue(s, base(s, { apps: 10, ratingSum: 58 })) < flat);
});
test('short contract lowers value; injuries lower it', () => {
  const s = newGame(5); const flat = targetValue(s, base(s));
  assert.ok(targetValue(s, base(s, { contract: 1 })) < flat * 0.85); assert.ok(targetValue(s, base(s, { contract: 2 })) < flat);
  assert.ok(targetValue(s, base(s, { injured: 8 })) < flat);
});
test('wonderkids carry a premium; weaker clubs/leagues value players lower', () => {
  const s = newGame(5); assert.ok(targetValue(s, base(s, { wonderkid: true, age: 18, potential: 90 })) > targetValue(s, base(s, { age: 18, potential: 90 })));
  const by = [...s.clubs].sort((a, b) => b.rating - a.rating), top = by[0], low = by.at(-1);
  assert.ok(targetValue(s, base(s, { clubId: top.id })) > targetValue(s, base(s, { clubId: low.id })));
});
test('weekly change is smooth: never more than 8% a week, and moves toward the target', () => {
  assert.equal(stepValue(1000, 5000), 1080); assert.equal(stepValue(1000, 100), 920); assert.equal(stepValue(1000, 1010), 1004);
  let s = newGame(7); const before = new Map([...s.players, ...(s.rivals ?? [])].map(p => [p.id, p.price]));
  for (const p of s.players) { p.apps = 5; p.ratingSum = 40; p.goals = 4; }
  valuesWeek(s);
  for (const p of [...s.players, ...(s.rivals ?? [])]) { const o = before.get(p.id); if (o) assert.ok(Math.abs(p.price - o) <= Math.ceil(o * 0.08) + 1, `${p.name} ${o}->${p.price}`); }
});
test('values are deterministic (hash-based demand, no Math.random)', () => {
  const a = newGame(9), b = newGame(9); valuesWeek(a); valuesWeek(b);
  assert.deepEqual(a.players.map(p => p.price), b.players.map(p => p.price));
});

test('weekly hook moves our own players and old saves migrate onto the model', async () => {
  const g = await import('../src/game.ts');
  const s = g.newGame(11);
  assert.equal(s.valueModel, 1);
  const old = structuredClone(s); delete old.valueModel; for (const p of old.players) p.price = 999999;
  const m = g.migrate(old);
  assert.equal(m.valueModel, 1);
  assert.ok(m.players.every((p) => p.price < 999999));
  const p0 = s.players.find((p) => !p.starting); p0.apps = 10; p0.ratingSum = 85; p0.goals = 8; p0.assists = 5;
  const before = p0.price;
  let m2 = g.startMatch(s); while (!m2.match.complete) m2 = g.advanceMatch(m2);
  const n = g.advanceWeek(m2);
  assert.equal(n.week, s.week + 1);
  const after = n.players.find((p) => p.id === p0.id).price;
  assert.ok(after > before && after <= Math.round(before * 1.08) + 1, `${before} -> ${after}`);
});
