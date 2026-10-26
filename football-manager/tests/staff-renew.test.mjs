import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { staffTerms, renewStaff } from '../src/staff.ts';
import { renewalTerms } from '../src/managers.ts';
const st = (o) => ({ id: 'x1', name: 'Coach', role: 'attack', rating: 10, wage: 14, contract: 1, rep: 40, ...o });
test('3.8: staff renewal wage follows rating vs market, results and demand, with reasons', () => {
  const s = newGame(5);
  const good = staffTerms(s, st({ rating: 18 })), weak = staffTerms(s, st({ rating: 5 }));
  assert.ok(good.wage > 14 && weak.wage < 14, `${good.wage} ${weak.wage}`); assert.ok(good.reasons.length >= 3);
  const hot = staffTerms(s, st({ rep: 99 })), cold = staffTerms(s, st({ rep: 0 })); assert.ok(hot.wage >= cold.wage);
  s.staff = [st({ rating: 18 })]; const r = renewStaff(s, 'x1'); assert.equal(r.staff[0].wage, good.wage); assert.equal(r.staff[0].contract, 3);
});
test('3.8: manager renewal weighs rating, results and demand; can be a pay cut', () => {
  const s = newGame(5), m = { id: 'm', name: 'M', style: 'Balanced', formation: '4-4-2', rating: 5, wage: 20, since: 1 };
  const star = renewalTerms(s, 2, 4, m), flop = renewalTerms(s, 2, -4, { ...m, rating: 1 });
  assert.ok(star.wage > flop.wage); assert.ok(flop.raise < 0); assert.ok(star.reasons.length >= 3);
});
