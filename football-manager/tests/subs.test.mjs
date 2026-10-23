import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { autoPick, layout } from '../src/lineup.ts';
import { makeSub, subsBench, canSub } from '../src/subs.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId);
const begin = (seed) => startMatch(autoPick(newGame(seed, 'arsenal', 60)));
test('sub swaps players, logs event, rates both, restores XI after', () => {
  let s = advanceMatch(advanceMatch(begin(11)));
  const xi0 = own(s).filter((p) => p.starting).map((p) => p.id).sort();
  const off = layout(s)[5], on = subsBench(s)[0];
  const [b, msg] = makeSub(s, off.id, on.id);
  assert.match(msg, /replaces/);
  assert.ok(own(b).find((p) => p.id === on.id).starting);
  assert.ok(!own(b).find((p) => p.id === off.id).starting);
  assert.equal(own(b).filter((p) => p.starting).length, 11);
  assert.ok(b.match.timeline.some((e) => /replaces/.test(e.text)));
  const d = decodeSave(encodeSave(b)); assert.ok(d && d.match.subs.length === 1);
  const f = simToEnd(b);
  assert.ok(f.match.ratings[on.id] !== undefined && f.match.ratings[off.id] !== undefined);
  const w = advanceWeek(f);
  const after = own(w).filter((p) => p.starting).map((p) => p.id).sort();
  assert.deepEqual(after.filter((id) => xi0.includes(id)).length >= 9, true);
});
test('max 5 subs and 3 windows (half-time free)', () => {
  let s = advanceMatch(begin(12)); // 15'
  const go = () => { const off = layout(s).find((p) => p && p.position !== 'GK'); const on = subsBench(s)[0]; const [b] = makeSub(s, off.id, on.id); const ok = b !== s; s = b; return ok; };
  assert.ok(go()); s = advanceMatch(s); // 30
  assert.ok(go()); s = advanceMatch(s); // 45 half-time free
  assert.ok(go()); s = advanceMatch(s); // 60
  assert.ok(go()); s = advanceMatch(s); // 75 -> 4th window
  assert.match(canSub(s), /windows/);
  assert.ok(!go());
});
test('AI subs and auto subs in sim', () => {
  let s = begin(13); s.autoSubs = true;
  s.players.filter((p) => p.starting && p.clubId === s.clubId).slice(1, 4).forEach((p) => (p.fitness = 40));
  const f = simToEnd(s);
  assert.ok(f.match.timeline.some((e) => e.side === 'them' && /fresh legs/.test(e.text)));
  assert.ok(f.match.timeline.some((e) => /assistant/.test(e.text)));
  assert.ok((f.match.subs ?? []).length <= 5);
});
