import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { boardRescue, plan, answerAsk, validMgr } from '../src/delegate.ts';
const club = (seed = 12) => { const s = setMode(newGame(seed), 'chairman'); return structuredClone(hireManager(s, managerCandidates(s).find(m => m.rating >= 4).id, 3)); };
const mine = (s) => s.players.filter(p => p.clubId === s.clubId);
function asked() { for (const seed of [12,13,14,15,16,17,18,19]) { const s = club(seed); s.week = 9; s.budget = -500; plan(s).approveOver = 0; const b = boardRescue(s); const a = plan(b).asks?.find(x => x.kind === 'sell'); if (a) return [s, b, a]; } assert.fail('no ask'); }
test('3.3: a forced sale over your approval line becomes a request, not a sale', () => {
  const [s, b, a] = asked(); assert.equal(mine(b).length, mine(s).length); assert.ok(a.fee > 0 && a.buyer); assert.ok(validMgr(b)); assert.match(b.headlines[0], /approve/);
});
test('3.3: approve sells at the asked fee; block keeps him and he is not asked again this season', () => {
  const [, b, a] = asked();
  const y = answerAsk(b, a.playerId, 'sell', true); assert.ok(!mine(y).some(p => p.id === a.playerId)); assert.ok(y.budget > b.budget); assert.match(plan(y).log[0], /sold for £/i);
  const n = answerAsk(b, a.playerId, 'sell', false); assert.ok(mine(n).some(p => p.id === a.playerId));
  const again = boardRescue(n); assert.ok(!(plan(again).asks ?? []).some(x => x.playerId === a.playerId && x.kind === 'sell'));
});
test('3.3: pick another player blocks this one and moves on to the next candidate', () => {
  const [, b, a] = asked(); const o = answerAsk(b, a.playerId, 'sell', 'other');
  assert.ok(mine(o).some(p => p.id === a.playerId)); const next = plan(o).asks?.find(x => x.kind === 'sell');
  assert.ok(next && next.playerId !== a.playerId || mine(o).length < mine(b).length || (o.loansOut ?? []).length > (b.loansOut ?? []).length);
});
