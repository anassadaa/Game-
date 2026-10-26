import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { plan, manageContracts, answerAsk, validMgr } from '../src/delegate.ts';
import { isProtected } from '../src/protect.ts';
const owner = (seed = 7) => { const s = setMode(newGame(seed), 'owner'); return hireManager(s, managerCandidates(s)[0].id); };
const kid = (s) => { const p = s.players.filter((x) => x.clubId === s.clubId && !x.starting).sort((a, b) => a.rating - b.rating)[0]; p.age = 18; p.potential = Math.min(95, p.rating + 20); p.contract = 1; return p; };
test('protected = wonderkid or young high-potential', () => {
  assert.equal(isProtected({ age: 30, rating: 50, potential: 90, wonderkid: true }), true);
  assert.equal(isProtected({ age: 19, rating: 46, potential: 64 }), false);
  assert.equal(isProtected({ age: 21, rating: 58, potential: 75 }), true);
  assert.equal(isProtected({ age: 23, rating: 50, potential: 80 }), false);
});
test('manager always renews a protected prospect, even when weak right now', () => {
  const s = owner(); const p = kid(s); plan(s).wage = 1e6;
  const b = manageContracts(s); assert.ok(b.players.find((x) => x.id === p.id).contract >= 3);
});
test('over the wage budget he asks you instead of letting the prospect go', () => {
  const s = owner(); const p = kid(s); plan(s).wage = 0;
  const b = manageContracts(s); assert.equal(b.players.find((x) => x.id === p.id).contract, 1);
  const a = plan(b).asks.find((x) => x.playerId === p.id); assert.equal(a.kind, 'renew'); assert.ok(validMgr(b));
  assert.equal(plan(manageContracts(b)).asks.filter((x) => x.playerId === p.id).length, 1, 'one ask per player');
  const yes = answerAsk(b, p.id, 'renew', true); assert.equal(yes.players.find((x) => x.id === p.id).contract, 3); assert.equal(plan(yes).asks.length, 0);
  const no = answerAsk(b, p.id, 'renew', false); assert.equal(no.players.find((x) => x.id === p.id).contract, 1); assert.match(plan(no).log[0], /refused/);
});
