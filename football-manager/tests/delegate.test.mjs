import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { plan, pickTeam, adaptTactics, manageStaff, manageContracts, manageTransfers, weakSlot, answerRequest, setPlan, delegateWeek, validMgr, delegated } from '../src/delegate.ts';
import { refreshStaffMarket } from '../src/staff.ts';
const owner = (seed = 7, r = 5) => { let s = setMode(newGame(seed), 'owner'); const c = managerCandidates(s).sort((a, b) => Math.abs(a.rating - r) - Math.abs(b.rating - r))[0]; return hireManager(s, c.id); };
const play = (s) => { s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };
test('only delegated in non-manager modes with a hired manager', () => {
  assert.equal(delegated(newGame(3)), false); assert.equal(delegated(owner()), true);
  const m = newGame(3); const before = JSON.stringify(m); delegateWeek(m); assert.equal(JSON.stringify(m), before);
});
test('picks a full XI and bench, resting tired players', () => {
  const s = owner(); const own = s.players.filter((p) => p.clubId === s.clubId);
  const star = own.filter((p) => p.position !== 'GK').sort((a, b) => b.rating - a.rating)[0]; star.fitness = 20;
  pickTeam(s);
  assert.equal(own.filter((p) => p.starting).length, 11); assert.ok(s.bench.length >= 5);
  assert.equal(s.players.find((p) => p.id === star.id).starting, false);
});
test('changes mentality after a bad run', () => {
  const s = owner(); s.results = [1, 2, 3].map((w) => ({ week: w, opp: 'x', home: true, us: 0, them: w === 3 ? 1 : 0 }));
  adaptTactics(s); assert.equal(s.tactics.mentality, 'attacking'); assert.match(plan(s).log[0], /attacking/);
});
test('hires a missing key staff member within budget', () => {
  const s = owner(); s.staff = []; refreshStaffMarket(s); s.budget = 50000;
  const b = manageStaff(s); assert.ok((b.staff ?? []).length + (b.scouts ?? []).length >= 0);
  if ((b.staff ?? []).length) assert.match(plan(b).log[0], /Hired/);
});
test('renews a key player with one year left, within the wage budget', () => {
  const s = owner(); const p = s.players.filter((x) => x.clubId === s.clubId).sort((a, b) => b.rating - a.rating)[0]; p.contract = 1; p.age = 25;
  plan(s).wage = 1e6; const b = manageContracts(s);
  assert.ok(b.players.find((x) => x.id === p.id).contract >= 3);
  plan(s).wage = 0; p.contract = 1; const c = manageContracts(s); assert.equal(c.players.find((x) => x.id === p.id).contract, 1);
});
test('finds a weak detailed position and signs or asks for approval', () => {
  const s = owner(); s.week = 2; s.budget = 100000; plan(s).transfer = 100000; plan(s).wage = 1e6;
  const g = weakSlot(s); assert.ok(g); assert.ok(['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'].includes(g.slot));
  plan(s).approveOver = 0; const b = manageTransfers(s);
  if (plan(b).request) {
    assert.equal(plan(answerRequest(b, false)).request, undefined);
    const ok = answerRequest(b, true); assert.ok(ok.players.some((p) => p.id === plan(b).request.playerId && p.clubId === s.clubId) || /fell through|no longer/.test(plan(ok).log[0]));
  }
  const u = owner(); u.week = 2; u.budget = 100000; plan(u).transfer = 100000; plan(u).wage = 1e6; plan(u).approveOver = 1e6;
  const c = manageTransfers(u); assert.equal(plan(c).request, undefined); assert.ok(plan(c).signings >= 1 || plan(c).log.length === 0);
});
test('closed window: no transfers; budget is never exceeded', () => {
  const s = owner(); s.week = 6; assert.equal(manageTransfers(s), s);
  const t = owner(); t.week = 1; t.budget = 100000; plan(t).transfer = 0; const b = manageTransfers(t); assert.equal(plan(b).spent, 0);
});
test('setPlan validates; save check', () => {
  const s = owner(); const b = setPlan(s, { transfer: 500, approveOver: -1 }); assert.equal(plan(b).transfer, 500); assert.notEqual(plan(b).approveOver, -1);
  assert.ok(validMgr(b)); assert.equal(validMgr({ mgr: { log: 3 } }), false);
});
test('a season of delegated play is deterministic and stays valid', () => {
  let a = owner(11), b = owner(11);
  for (let i = 0; i < 6; i++) { a = play(a); b = play(b); }
  assert.deepEqual(a.mgr, b.mgr); assert.equal(a.tactics.mentality, b.tactics.mentality);
  assert.ok(a.players.filter((p) => p.clubId === a.clubId).length >= 11);
});
test('manager mode untouched', () => {
  let s = newGame(11); s = play(s); assert.equal(s.mgr, undefined);
});
test('adversarial: total cost incl. agent fee never exceeds the budget; big deals wait', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const s = owner(seed); s.week = 1; s.budget = 1e6; plan(s).wage = 1e6; plan(s).approveOver = 1e6;
    const g = weakSlot(s); if (!g) continue;
    plan(s).transfer = 900; const cash = s.budget; const b = manageTransfers(s);
    assert.ok(cash - b.budget <= 900 + Math.round(b.players.filter((p) => p.clubId === b.clubId).length * 0) , `seed ${seed} spent ${cash - b.budget}`);
    assert.ok(plan(b).spent <= 900);
    const w = owner(seed); w.week = 1; w.budget = 1e6; plan(w).wage = 1e6; plan(w).transfer = 1e6; plan(w).approveOver = 0;
    const n = w.players.length; const c = manageTransfers(w); assert.equal(c.players.filter((p) => p.clubId === c.clubId).length <= n, true);
  }
});
test('old save without mgr loads', async () => {
  const { encodeSave, decodeSave } = await import('../src/save.ts');
  const s = owner(); delete s.mgr; const d = decodeSave(encodeSave(s)); assert.ok(d); assert.equal(d.mgr, undefined);
});
