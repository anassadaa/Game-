import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, windowOpen } from '../src/game.ts';
import { wageBill, wageLimit, wageRoom, offerBlock, salaryList } from '../src/budget.ts';
const rival = (s) => s.rivals.find((p) => p.clubId !== s.clubId);
test('wage bill sums our weekly wages and limit leaves headroom', () => {
  const s = newGame(7);
  const bill = s.players.filter((p) => p.clubId === s.clubId).reduce((a, p) => a + p.wage, 0);
  assert.equal(wageBill(s), bill);
  assert.ok(wageLimit(s) > bill);
  assert.equal(wageRoom(s), wageLimit(s) - bill);
  const list = salaryList(s);
  assert.equal(list.length, s.players.filter((p) => p.clubId === s.clubId).length);
  assert.ok(list[0].wage >= list.at(-1).wage);
});
test('offerBlock explains why a bid cannot be submitted', () => {
  const s = newGame(7); const p = rival(s);
  assert.ok(windowOpen(s));
  assert.equal(offerBlock(s, p, 100), null);
  assert.match(offerBlock({ ...s, week: 5 }, p, 100), /Window closed/);
  assert.match(offerBlock({ ...s, match: {} }, p, 100), /match/i);
  assert.match(offerBlock({ ...s, embargo: true }, p, 100), /embargo/i);
  assert.match(offerBlock({ ...s, budget: 50 }, p, 100), /^Over budget by £\d+k/);
  // free agents ignore the window and fees
  const fa = s.market.find((x) => x.clubId === 'market');
  assert.equal(offerBlock({ ...s, week: 5 }, fa, 0), null);
});
import { readFileSync } from 'node:fs';
test('toasts never intercept taps and dialogs never get long-press hijacked', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.toast\s*\{\s*pointer-events:\s*none/);
  const pm = readFileSync(new URL('../src/PlayerModal.tsx', import.meta.url), 'utf8');
  assert.match(pm, /NO_LONG = '[^']*\[role="dialog"\]/);
});
