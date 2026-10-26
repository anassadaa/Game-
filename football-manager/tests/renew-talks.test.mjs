import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, renewContract } from '../src/game.ts';
import { wageDemand, offerRenewal, talksOf } from '../src/contracts.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const setup = () => { const s = newGame(5); const p = s.players.filter((x) => x.clubId === s.clubId).sort((a, b) => b.rating - a.rating)[0]; p.contract = 1; p.personality = 'Professional'; return { s, p, d: wageDemand(s, p, 3) }; };
const w = (st, p) => st.players.find((x) => x.id === p.id);
test('3.9: a counter is fixed for the session; offering it (or more) is accepted', () => {
  const { s, p, d } = setup(); const r = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.8));
  assert.equal(r.result, 'countered'); assert.equal(talksOf(r.state, p.id).counter, r.counter);
  const ok = offerRenewal(r.state, p.id, 3, r.counter); assert.equal(ok.result, 'accepted'); assert.equal(w(ok.state, p).wage, r.counter);
  assert.equal(talksOf(ok.state, p.id), undefined, 'session cleared on signing');
});
test('3.9: re-offering never raises the counter (the old creep exploit)', () => {
  const { s, p, d } = setup(); let st = s, prev = Infinity, offer = Math.round(d.ask * 0.8);
  for (let i = 0; i < 2; i++) { const r = offerRenewal(st, p.id, 3, offer); if (r.result !== 'countered') break; assert.ok(r.counter <= prev, `${r.counter} > ${prev}`); prev = r.counter; st = r.state; offer = r.counter - 1; }
  assert.ok(prev < Infinity);
});
test('3.9: three failed rounds and he walks out; talks locked for weeks, morale hit', () => {
  const { s, p, d } = setup(); let st = s, last;
  for (let i = 0; i < 5 && !last?.walkedOut; i++) { last = offerRenewal(st, p.id, 3, Math.round(d.ask * 0.8)); st = last.state; }
  assert.ok(last.walkedOut); assert.match(last.message, /walk/i); assert.ok(w(st, p).morale < p.morale);
  const t = talksOf(st, p.id); assert.ok(t.lockUntil > st.season * 18 + st.week);
  const again = offerRenewal(st, p.id, 3, d.ask * 0.95); assert.equal(again.result, 'refused'); assert.match(again.message, /talk/i);
  assert.equal(w(again.state, p).contract, 1);
  assert.ok(decodeSave(encodeSave(st)), 'save with talks state still loads');
});
test('3.9: lowballing first gives no cheaper counter than a fair first offer', () => {
  const { s, p, d } = setup();
  const fair = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.8));
  const lo = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.3)); assert.equal(lo.result, 'refused');
  const after = offerRenewal(lo.state, p.id, 3, Math.round(d.ask * 0.8));
  if (after.result === 'countered') assert.ok(after.counter >= fair.counter);
});
test('3.9: early renewals allowed; more years left means a smaller ask', () => {
  const { s, p } = setup();
  const long = { ...p, contract: 4 }, short = { ...p, contract: 1 };
  assert.ok(wageDemand(s, long, 3).ask < wageDemand(s, short, 3).ask);
  s.players.find((x) => x.id === p.id).contract = 3;
  const r = renewContract(s, p.id, 5); assert.equal(w(r, p).contract, 5);
});
import { temperament } from '../src/contracts.ts';
test('3.9: patience and softening depend on personality, age, role, rivals, morale and agent — with reasons', () => {
  const { s, p } = setup();
  const loyal = temperament(s, { ...p, personality: 'Loyal', morale: 85 }), amb = temperament(s, { ...p, personality: 'Ambitious', morale: 40 });
  const hot = temperament(s, { ...p, personality: 'Temperamental' });
  assert.ok(loyal.rounds > amb.rounds); assert.ok(loyal.soften > amb.soften); assert.ok(hot.rounds <= 2);
  assert.ok(loyal.reasons.length >= 4); assert.ok(temperament(s, { ...p, age: 33 }).soften >= temperament(s, { ...p, age: 24 }).soften);
});
test('3.9: loyal players soften their counter, ambitious ones hold firm; insults shorten patience', () => {
  const mk = (pers) => { const { s, p, d } = setup(); s.players.find((x) => x.id === p.id).personality = pers; s.players.find((x) => x.id === p.id).morale = 80; s.players.find((x) => x.id === p.id).wage = 60; return { s, p, d: wageDemand(s, s.players.find((x) => x.id === p.id), 3) }; };
  const run = (pers) => { const { s, p, d } = mk(pers); const a = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.82)); const b = offerRenewal(a.state, p.id, 3, Math.round(d.ask * 0.82)); return [a, b]; };
  const [la, lb] = run('Loyal'); assert.equal(la.result, 'countered'); assert.ok(lb.counter < la.counter, `loyal ${la.counter}->${lb.counter}`);
  const [aa, ab] = run('Ambitious'); if (aa.result === 'countered' && ab.result === 'countered') assert.equal(ab.counter, aa.counter);
  assert.ok(la.why.length > 0);
  const { s, p, d } = mk('Temperamental'); const x = offerRenewal(s, p.id, 3, Math.round(d.ask * 0.3)); const y = offerRenewal(x.state, p.id, 3, Math.round(d.ask * 0.3));
  assert.equal(y.result, 'refused'); assert.ok(x.walkedOut || y.walkedOut, 'temperamental walks out after repeated lowballs');
});
