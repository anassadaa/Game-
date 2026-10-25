import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, advanceWeek, startMatch } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { sponsorOffers, signSponsor, sponsorDeal, settleSponsor, validSponsor } from '../src/sponsors.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
import { ledger } from '../src/finance.ts';
test('three different, stable sponsor offers each season', () => {
  const s = newGame(3); const a = sponsorOffers(s), b = sponsorOffers(s);
  assert.equal(a.length, 3); assert.deepEqual(a, b);
  assert.deepEqual(new Set(a.map((o) => o.kind)), new Set(['fixed', 'target', 'trophy']));
  const f = a.find((o) => o.kind === 'fixed'), t = a.find((o) => o.kind === 'target');
  assert.ok(f.weekly > t.weekly && t.bonus > 0 && f.bonus === 0);
});
test('signing pays weekly sponsor income; only one deal a season', () => {
  let s = newGame(3); const o = sponsorOffers(s)[0];
  s = signSponsor(s, o.id); assert.equal(sponsorDeal(s).id, o.id);
  assert.equal(signSponsor(s, sponsorOffers(s)[1].id), s);
  const before = ledger(structuredClone(s)).inc.sponsor;
  s = advanceWeek(simToEnd(startMatch(s)));
  assert.ok(ledger(s).inc.sponsor - before >= o.weekly);
});
test('target bonus paid only when the board target is met', () => {
  const s = newGame(3); const t = sponsorOffers(s).find((o) => o.kind === 'target');
  const a = signSponsor(s, t.id); const cash = a.budget;
  settleSponsor(a, a.board.target, 'Stayed the course'); assert.equal(a.budget, cash + t.bonus);
  const b = signSponsor(s, t.id); const c2 = b.budget;
  settleSponsor(b, b.board.target + 1, 'Stayed the course'); assert.equal(b.budget, c2);
});
test('sponsor deal survives save; old saves fine', () => {
  const s = signSponsor(newGame(5), sponsorOffers(newGame(5))[2].id);
  assert.equal(decodeSave(encodeSave(s)).sponsor.id, s.sponsor.id);
  assert.ok(!validSponsor({ id: 1 })); assert.ok(validSponsor(undefined));
});
