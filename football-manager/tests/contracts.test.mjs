import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { managerCandidates, hireManager, fireManager, managerWeek, contractWage, minYears, compensation, weeksLeft, renewManager, renewalTerms, leaveChance, setMode } from '../src/managers.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const owner = (seed = 12) => { const s = setMode(newGame(seed), 'chairman'); return s; };
test('hire with 1-5 years, longer = slightly cheaper, contractEnd stored', () => {
  const s = owner(); const c = managerCandidates(s).find(m => m.rating < 5) ?? managerCandidates(s)[0];
  const a = hireManager(s, c.id, 1), b = hireManager(s, c.id, 5);
  assert.equal(a.hiredManager.contractEnd, s.season); assert.equal(b.hiredManager.contractEnd, s.season + 4);
  assert.ok(b.hiredManager.wage < a.hiredManager.wage && b.hiredManager.wage >= a.hiredManager.wage * 0.85);
  assert.equal(contractWage(c, 1), c.wage);
  assert.equal(hireManager(s, c.id, 0), s); assert.equal(hireManager(s, c.id, 6), s); assert.equal(hireManager(s, c.id, 2.5), s);
});
test('5-star managers insist on 2+ years', () => {
  const m = { rating: 5 }; assert.equal(minYears(m), 2); assert.equal(minYears({ rating: 3 }), 1);
  for (let seed = 1; seed < 80; seed++) { const s = owner(seed); const top = managerCandidates(s).find(x => x.rating === 5); if (top) { assert.equal(hireManager(s, top.id, 1), s); assert.ok(hireManager(s, top.id, 2).hiredManager); return; } }
  assert.fail('no 5-star found');
});
test('sacking pays remaining contract wages, not 6 weeks', () => {
  const s = owner(); const c = managerCandidates(s)[0]; const a = hireManager(s, c.id, 3);
  const m = a.hiredManager; const due = weeksLeft(a, m) * m.wage; assert.ok(due > m.wage * 6);
  assert.equal(compensation(a, m), due); const f = fireManager(a); assert.equal(f.budget, a.budget - due);
});
test('contract expiry: alert, then leaves free', () => {
  let s = hireManager(owner(), managerCandidates(owner())[0].id, 1); s = structuredClone(s);
  s.week = 1; managerWeek(s); assert.ok(s.headlines.some(h => /contract/i.test(h))); assert.ok(s.hiredManager.alerted);
  s.week = 18; managerWeek(s); assert.equal(s.hiredManager, undefined); assert.ok(s.headlines[0].match(/free|expired/i));
});
test('renewal: 1-5 years, raise when overperforming, only in final season', () => {
  const s = hireManager(owner(), managerCandidates(owner())[0].id, 3);
  assert.equal(renewManager(s, 2), s); // not final season yet
  const f = structuredClone(s); f.season = s.hiredManager.contractEnd;
  const t = renewalTerms(f, 2, 3); assert.ok(t.wage > renewalTerms(f, 2, 0).wage); assert.ok(t.wage <= renewalTerms(f, 2, 0).wage * 1.31);
  const r = renewManager(f, 2); assert.equal(r.hiredManager.contractEnd, f.season + 2); assert.equal(renewManager(f, 9), f);
});
test('early exit: hash-based, likelier when overperforming or trust low; pays a penalty', () => {
  const s = owner(); assert.ok(leaveChance(s, { rating: 4 }, 4) > leaveChance(s, { rating: 4 }, 0));
  const lo = { ...s, trust: 20 }; assert.ok(leaveChance(lo, { rating: 3 }, 0) > leaveChance({ ...s, trust: 60 }, { rating: 3 }, 0));
  let left = 0, deterministic = true;
  for (let seed = 1; seed < 400 && !left; seed++) {
    let g = hireManager(owner(seed), managerCandidates(owner(seed))[0].id, 5); g = structuredClone(g); g.trust = 5; g.season += 1;
    for (const w of [6, 12, 18]) { if (!g.hiredManager) break; g.week = w; const twin = structuredClone(g); const cash = g.budget; managerWeek(g); managerWeek(twin);
      deterministic &&= (g.hiredManager === undefined) === (twin.hiredManager === undefined);
      if (!g.hiredManager) { left++; assert.ok(g.budget > cash, 'penalty received'); assert.ok(g.headlines[0].match(/penalty|release fee/i)); } }
  }
  assert.ok(left && deterministic);
});
test('old saves migrate to a 1-year contract', () => {
  const s = hireManager(owner(), managerCandidates(owner())[0].id, 3); const raw = structuredClone(s); delete raw.hiredManager.contractEnd;
  const l = decodeSave(encodeSave(raw));
  assert.equal(l.hiredManager.contractEnd, s.season + 1);
});
