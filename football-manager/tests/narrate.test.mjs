import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch } from '../src/game.ts';
import { decodeSave } from '../src/save.ts';
const play = (seed, t = {}) => { let s = newGame(seed); s.tactics = { ...s.tactics, ...t }; s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return s; };
test('match stats are consistent with the scoreline and save cleanly', () => {
  for (let i = 0; i < 20; i++) {
    const s = play(900 + i), m = s.match, st = m.stats;
    assert.ok(st, 'stats');
    assert.ok(st.shots[0] >= st.on[0] && st.on[0] >= m.us, `us shots ${st.shots} on ${st.on} goals ${m.us}`);
    assert.ok(st.shots[1] >= st.on[1] && st.on[1] >= m.them);
    assert.ok(st.poss >= 25 && st.poss <= 75, `poss ${st.poss}`);
    assert.ok(st.fouls[0] + st.fouls[1] > 0);
    assert.ok(decodeSave(JSON.stringify(s)));
  }
});
test('every attacking passage says where the ball was and who shot', () => {
  const zones = /left|right|middle|edge of the box|six-yard|far post|near post|cut-back|counter/i;
  const s = play(950);
  const ev = s.match.timeline.filter((e) => (e.kind === 'goal' || e.kind === 'chance'));
  assert.ok(ev.length > 0);
  for (const e of ev) assert.match(e.text, zones, e.text);
});
test('tactics are explained and shift possession', () => {
  let why = 0, pa = 0, pc = 0;
  for (let i = 0; i < 25; i++) {
    const a = play(1000 + i, { mentality: 'attacking', press: 'high' }), c = play(1000 + i, { mentality: 'cautious', press: 'low' });
    pa += a.match.stats.poss; pc += c.match.stats.poss;
    why += a.match.timeline.filter((e) => /press|attacking|tempo|shape|formation|counter|shout|captain/i.test(e.text) && e.side === 'us').length;
  }
  assert.ok(pa > pc + 50, `poss ${pa} vs ${pc}`); assert.ok(why > 25, `why ${why}`);
});
