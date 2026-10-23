import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch } from '../src/game.ts';
import { shout, activeShout, shoutEffect } from '../src/shouts.ts';
import { cardRisk } from '../src/cards.ts';
import { decodeSave } from '../src/save.ts';
const goals = (id, n = 60) => { let us = 0, them = 0; for (let i = 0; i < n; i++) { let m = startMatch(newGame(700 + i)); if (id) m = shout(m, id); while (!m.match.complete) { m = advanceMatch(m); if (id && m.match.minute % 30 === 0 && !m.match.complete) m = shout(m, id); } const c = (side) => m.match.timeline.filter((x) => x.side === side && (x.kind === 'goal' || x.kind === 'chance')).length; us += c('us'); them += c('them'); } return { us, them }; };
test('a shout lasts 30 minutes and is logged', () => {
  let m = shout(startMatch(newGame(1)), 'focus');
  assert.equal(activeShout(m).id, 'focus'); assert.ok(m.match.timeline.some((t) => t.text.includes('Concentrate')));
  m = advanceMatch(advanceMatch(m)); assert.equal(activeShout(m), undefined);
  assert.ok(decodeSave(JSON.stringify(shout(m, 'calm'))));
});
test('demand more creates more chances; concentrate concedes fewer', () => {
  const base = goals(), d = goals('demand'), f = goals('focus');
  assert.ok(d.us > base.us, `demand ${d.us} vs ${base.us}`); assert.ok(f.them < base.them, `focus ${f.them} vs ${base.them}`);
});
test('get stuck in raises card risk, calm lowers it; encourage does nothing when winning', () => {
  const s = startMatch(newGame(2)); const p = s.players.find((x) => x.clubId === s.clubId && x.starting && x.position === 'DF');
  const r0 = cardRisk(s, p); assert.ok(cardRisk(shout(s, 'stuckin'), p) > r0); assert.ok(cardRisk(shout(s, 'calm'), p) < r0);
  const w = shout(s, 'encourage'); w.match.us = 2; assert.equal(shoutEffect(w).att, 0);
});
