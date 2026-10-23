import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { aiXI, squadDelta, aiInjuriesWeek } from '../src/aisquads.ts';
import { decodeSave } from '../src/save.ts';
test('AI clubs are weakened by injuries to their best players and by selling them', () => {
  const s = newGame(41); const c = s.clubs.find((x) => x.id !== s.clubId);
  assert.equal(squadDelta(s, c), 0);
  const xi = aiXI(s, c.id); assert.equal(xi.length, 11);
  xi.slice(1, 5).forEach((p) => (p.injured = 3));
  const hurt = squadDelta(s, c); assert.ok(hurt < 0, `${hurt}`);
  xi.slice(1, 5).forEach((p) => delete p.injured);
  s.rivals = s.rivals.filter((p) => p !== xi[1]); assert.ok(squadDelta(s, c) < 0);
  assert.ok(decodeSave(JSON.stringify(s)));
});
test('AI players get injured and recover across a season', () => {
  const s = newGame(42); let peak = 0;
  for (let w = 1; w <= 18; w++) { s.week = w; aiInjuriesWeek(s); peak = Math.max(peak, s.rivals.filter((p) => p.injured).length); }
  assert.ok(peak > 0 && peak < s.rivals.length * 0.15, `${peak}`);
});
