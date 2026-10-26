import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, club } from '../src/game.ts';
import { sponsorOffers, signSponsor, sponsorDeal, yearsLeft, sponsorSeasonTurn, terminateSponsor, exitFee, renegotiateSponsor, canRenegotiate, settleSponsor, validSponsor, sponsorValue } from '../src/sponsors.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
const next = (s) => { s.season += 1; return s; };
test('offers come in 1–5 season lengths: longer = more guaranteed, less upside', () => {
  const s = newGame(6); const o1 = sponsorOffers(s, 1).find((o) => o.kind === 'target'), o5 = sponsorOffers(s, 5).find((o) => o.kind === 'target');
  assert.equal(o1.years, 1); assert.equal(o5.years, 5);
  assert.ok(o5.weekly * 5 > o1.weekly * 1 * 4, 'more guaranteed in total');
  assert.ok(o5.bonus < o1.bonus && o5.clauses.promotion < o1.clauses.promotion && o5.clauses.europe < o1.clauses.europe);
  assert.ok(o5.clauses.relegationCut < o1.clauses.relegationCut);
  assert.deepEqual(sponsorOffers(s, 3), sponsorOffers(structuredClone(s), 3));
});
test('a 3-season deal runs 3 seasons and counts down', () => {
  let s = newGame(6); const o = sponsorOffers(s, 3)[0]; s = signSponsor(s, o.id, 3);
  assert.equal(yearsLeft(s), 3); next(s); assert.equal(sponsorDeal(s).id, o.id); assert.equal(yearsLeft(s), 2);
  next(s); assert.equal(yearsLeft(s), 1); next(s); assert.equal(sponsorDeal(s), undefined);
});
test('performance clauses pay position, promotion and Europe bonuses', () => {
  const s = signSponsor(newGame(6), sponsorOffers(newGame(6), 2)[0].id, 2); const d = sponsorDeal(s), c0 = s.budget;
  s.euro.alive = [s.clubId, ...s.euro.alive.filter((i) => i !== s.clubId)];
  sponsorSeasonTurn(s, 1, 'Promoted');
  assert.equal(s.budget, c0 + d.clauses.position + d.clauses.promotion + d.clauses.europe);
});
test('relegation cuts the weekly fee by the clause', () => {
  const s = signSponsor(newGame(6), sponsorOffers(newGame(6), 4)[0].id, 4); const w = sponsorDeal(s).weekly, cut = sponsorDeal(s).clauses.relegationCut;
  s.euro.alive = s.euro.alive.filter((i) => i !== s.clubId); s.euro2.alive = s.euro2.alive.filter((i) => i !== s.clubId);
  sponsorSeasonTurn(s, 24, 'Relegated');
  assert.equal(sponsorDeal(s).weekly, Math.round(w * (1 - cut)));
});
test('early termination: club pays a fee to walk away', () => {
  const s = signSponsor(newGame(6), sponsorOffers(newGame(6), 5)[0].id, 5); const fee = exitFee(s), c0 = s.budget;
  assert.ok(fee > 0); const t = terminateSponsor(s);
  assert.equal(t.budget, c0 - fee); assert.equal(sponsorDeal(t), undefined); assert.ok(sponsorOffers(t, 1).length === 3);
});
test('sponsor can walk out after relegation if the club is worth far less, paying the club', () => {
  const s = signSponsor(newGame(6), sponsorOffers(newGame(6), 5)[0].id, 5); const d = sponsorDeal(s); d.weekly = sponsorValue(s).weekly * 5;
  s.euro.alive = s.euro.alive.filter((i) => i !== s.clubId); s.euro2.alive = s.euro2.alive.filter((i) => i !== s.clubId);
  const c0 = s.budget; sponsorSeasonTurn(s, 24, 'Relegated');
  assert.equal(sponsorDeal(s), undefined); assert.ok(s.budget > c0);
});
test('outgrown deal can be renegotiated up', () => {
  const s = signSponsor(newGame(6), sponsorOffers(newGame(6), 5)[0].id, 5); assert.equal(canRenegotiate(s), false);
  sponsorDeal(s).weekly = Math.round(sponsorValue(s).weekly * 0.5); assert.ok(canRenegotiate(s));
  const r = renegotiateSponsor(s); assert.ok(sponsorDeal(r).weekly > sponsorDeal(s).weekly); assert.equal(yearsLeft(r), 5); assert.equal(canRenegotiate(r), false);
});
test('old one-season saves stay valid; multi-year deal survives save', () => {
  const s = newGame(6); s.sponsor = { id: 'x', name: 'Old Co', kind: 'fixed', weekly: 20, bonus: 0, season: s.season };
  assert.ok(validSponsor(s.sponsor)); assert.equal(yearsLeft(s), 1); settleSponsor(s, 5, 'Stayed the course');
  const m = signSponsor(newGame(6), sponsorOffers(newGame(6), 3)[1].id, 3); const r = decodeSave(encodeSave(m));
  assert.deepEqual(r.sponsor, m.sponsor);
});
