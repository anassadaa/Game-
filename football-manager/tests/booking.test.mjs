import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, sellPlayer } from '../src/game.ts';
import { ledger } from '../src/finance.ts';
import { staffWeek, staff } from '../src/staff.ts';
test('3.2: a sale is booked as sales straight away', () => {
  const s = newGame(9); s.week = 2; const p = s.players.find((x) => x.clubId === s.clubId && !x.starting);
  const before = ledger(s).inc.sales; const b = sellPlayer(s, p.id); assert.notEqual(b, s);
  assert.ok(ledger(b).inc.sales > before); assert.equal(ledger(b).last, b.budget);
});
test('3.2: staff wages are booked as wages', () => {
  const s = newGame(9); s.staff = [{ id: 'x1', name: 'Ted Lasco', role: 'fitness', rating: 10, wage: 14, contract: 2, rep: 10 }]; const pay = staff(s).reduce((a, x) => a + x.wage, 0); assert.ok(pay > 0);
  const w0 = ledger(s).out.wages ?? 0, r0 = ledger(s).out.running ?? 0; staffWeek(s);
  assert.equal((ledger(s).out.wages ?? 0) - w0, pay); assert.equal(ledger(s).out.running ?? 0, r0);
});
