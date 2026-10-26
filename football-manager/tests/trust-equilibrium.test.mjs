import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, migrate, standings, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
const playWeek = (s) => { let m = startMatch(s); while (!m.match.complete) m = advanceMatch(m); return advanceWeek(m); };
import { trustEquilibrium, trustWeek } from '../src/trust.ts';
const at = (pos, o = {}) => { const s = newGame(5); s.week = 5; s.board = { target: 17, objective: 'Avoid the drop (17th or better)', warnings: 0 };
  const me = s.clubs.find((c) => c.id === s.clubId); const div = standings(s).filter((c) => c.division === me.division);
  div.forEach((c, i) => (c.points = 100 - i * 2)); me.points = div[pos - 1].points + 1; div[pos - 1].points -= 0; 
  me.form = o.form ?? ['W', 'D', 'W', 'L', 'W']; s.budget = o.bank ?? 1700; s.ledger = { season: s.season, inc: {}, out: {}, last: s.budget, weeks: (o.net ?? [56, 56, 56, 56]).map((net, w) => ({ w, net })) };
  s.trust = o.trust ?? 12; return s; };
test('the reported save (9th vs target 17th, +£1.7m, +£56k/wk) has a high equilibrium and recovers week by week', () => {
  const s = at(9); const e = trustEquilibrium(s);
  assert.ok(e.eq >= 70, `eq ${e.eq}`); assert.ok(e.reasons.some((r) => /target/i.test(r.label) && r.value > 0));
  const before = s.trust; trustWeek(s); assert.ok(s.trust > before + 2, `${before}→${s.trust}`);
  for (let i = 0; i < 15; i++) trustWeek(s); assert.ok(s.trust >= 60, `${s.trust}`);
  assert.ok(s.trustLog?.reasons.length >= 3);
});
test('below target, overdrawn and losing → low equilibrium, but overdraft penalty is capped', () => {
  const bad = at(20, { bank: -5000, net: [-80, -80, -80, -80], form: ['L', 'L', 'L', 'L', 'L'], trust: 50 });
  const huge = at(20, { bank: -500000, net: [-80, -80, -80, -80], form: ['L', 'L', 'L', 'L', 'L'], trust: 50 });
  const e = trustEquilibrium(bad); assert.ok(e.eq < 35, `eq ${e.eq}`);
  const bankTerm = (x) => trustEquilibrium(x).reasons.find((r) => /bank|overdrawn/i.test(r.label)).value;
  assert.ok(bankTerm(huge) >= -12); trustWeek(bad); assert.ok(bad.trust >= 50 - 5);
});
test('clearing debt raises confidence; drift is gradual', () => {
  const s = at(12, { bank: 200, trust: 30 }); s.trustLog = { eq: 40, delta: 0, reasons: [], debt: true }; s.wasOverdrawn = true;
  assert.ok(trustEquilibrium(s).reasons.some((r) => /debt cleared/i.test(r.label)));
  const t = at(9, { trust: 12 }); trustWeek(t); assert.ok(t.trust - 12 <= 8);
});
test('migration lifts a stuck save toward equilibrium once', () => {
  const s = at(9); delete s.trustV; const m = migrate(s); assert.ok(m.trust >= 40, `${m.trust}`); assert.equal(m.trustV, 1);
  const t = m.trust; m.trust = 12; assert.equal(migrate(m).trust, 12);
});
test('a full week with a strong position no longer drains trust while in the black', () => {
  let s = at(9, { trust: 40 }); s = playWeek(s); assert.ok(s.trust >= 37, `${s.trust}`);
});
