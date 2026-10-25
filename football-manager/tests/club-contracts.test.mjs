import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode, compensation, weeksLeft } from '../src/managers.ts';
import { wallet } from '../src/wallet.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade, clubDecision, clubCandidates, hireClubManager, investmentWeek, validInvestments } from '../src/investments.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const fixture = newGame(73);
const setup = () => { const s = setMode(structuredClone(fixture), 'owner'); wallet(s).cash = 100000; return prepareInvestments(s); };
const own = () => { let s = setup(); const id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id; s = executeTrade(s, quoteTrade(s, id, 'buy', 60)); s.investments.clubs[id].cash = 50000; return [s, id]; };
test('boardroom hire: contract length, cheaper when longer, contractEnd set', () => {
  const [s, id] = own(); const c = clubCandidates(s, id).find(m => m.rating < 5);
  const a = hireClubManager(s, id, c.id, 1), b = hireClubManager(s, id, c.id, 4);
  assert.equal(a.investments.clubs[id].manager.contractEnd, s.season); assert.equal(b.investments.clubs[id].manager.contractEnd, s.season + 3);
  assert.ok(b.investments.clubs[id].manager.wage < a.investments.clubs[id].manager.wage);
  assert.equal(hireClubManager(s, id, c.id, 7), s);
});
test('boardroom dismissal pays remaining contract', () => {
  const [s0, id] = own(); const c = clubCandidates(s0, id)[0]; const s = hireClubManager(s0, id, c.id, 3);
  const m = s.investments.clubs[id].manager, cash = s.investments.clubs[id].cash, due = compensation(s, m);
  assert.ok(due > m.wage * 6); const d = clubDecision(s, id, 'dismiss');
  assert.equal(d.investments.clubs[id].manager, null); assert.equal(d.investments.clubs[id].cash, cash - due);
});
test('boardroom renewal only in final season; expiry leaves the club with a caretaker', () => {
  const [s0, id] = own(); const c = clubCandidates(s0, id)[0]; let s = hireClubManager(s0, id, c.id, 2);
  assert.equal(clubDecision(s, id, 'renew', 2), s);
  s = structuredClone(s); s.season = s.investments.clubs[id].manager.contractEnd; s.week = 3;
  const r = clubDecision(s, id, 'renew', 3); assert.equal(r.investments.clubs[id].manager.contractEnd, s.season + 3);
  const e = structuredClone(s); e.week = 18; investmentWeek(e); assert.equal(e.investments.clubs[id].manager, null);
  assert.ok(e.investments.log.some(l => /expired/.test(l.message)));
});
test('boardroom early exit pays a penalty into the club bank (hash-based, deterministic)', () => {
  let found = false;
  for (let k = 0; k < 40 && !found; k++) {
    const [s0, id] = own(); const c = clubCandidates(s0, id)[0]; let s = hireClubManager(s0, id, c.id, 5); s = structuredClone(s); s.seed = 1000 + k;
    s.clubs.find(x => x.id === id).form = ['L', 'L', 'L', 'L', 'L'];
    for (let w = 4; w <= 16 && !found; w += 4) { s.week = w; const t = structuredClone(s); investmentWeek(s); investmentWeek(t);
      assert.equal(s.investments.clubs[id].manager === null, t.investments.clubs[id].manager === null);
      if (s.investments.clubs[id].manager === null) { found = true; assert.ok(s.investments.log.some(l => /penalty/i.test(l.message) && l.amount > 0)); } }
  }
  assert.ok(found);
});
test('old boardroom saves migrate managers to 1 year', () => {
  const [s0, id] = own(); const s = hireClubManager(s0, id, clubCandidates(s0, id)[0].id, 3); delete s.investments.clubs[id].manager.contractEnd;
  const d = decodeSave(encodeSave(s)); assert.equal(d.investments.clubs[id].manager.contractEnd, s.season + 1); assert.ok(validInvestments(d));
});
