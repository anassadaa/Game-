import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek, windowLabel, windowOpen } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { autoPick } from '../src/lineup.ts';
const run = (fn, seeds = 10) => { for (let seed = 1; seed <= seeds; seed++) { let s = autoPick(newGame(seed, undefined, 60)); for (let w = 0; w < 17 && !s.sacked; w++) { const prev = s; s = advanceWeek(simToEnd(startMatch(autoPick(s)))); fn(prev, s, w); } } };
const hurt = (s) => s.players.filter((p) => p.clubId === s.clubId).reduce((a, p) => a + (p.injuries ?? 0), 0);
test('injuries arrive at an even, realistic base rate through the season', () => {
  const thirds = [0, 0, 0], games = [0, 0, 0];
  run((a, b, w) => { const t = Math.min(2, Math.floor(w / 6)); thirds[t] += hurt(b) - hurt(a); games[t]++; });
  const rates = thirds.map((x, i) => x / games[i]), avg = thirds.reduce((a, b) => a + b) / games.reduce((a, b) => a + b);
  assert.ok(avg >= 0.2 && avg <= 0.4, `avg ${avg.toFixed(2)}`);
  assert.ok(Math.max(...rates) / Math.max(0.01, Math.min(...rates)) <= 1.7, rates.map((r) => r.toFixed(2)).join(','));
});
test('the mid-season window is a January window', () => {
  assert.ok(windowOpen({ week: 9 }));
  assert.match(windowLabel({ week: 9 }), /January/);
  assert.match(windowLabel({ week: 6 }), /January/);
});
test('bids are spread across the window instead of piling onto deadline day', () => {
  // New bids only (ids carry the week). Late-window squads attract a little more interest naturally; the old 1.7x deadline multiplier pushed this past 2.5x.
  const sum = { dd: 0, other: 0 }, wk = { dd: 0, other: 0 };
  run((a, b) => { if (!windowOpen(b)) return; const k = b.week === 3 || b.week === 10 ? 'dd' : 'other'; sum[k] += (b.bids ?? []).filter((x) => x.id.includes(`-${a.season}-${a.week}-`) || x.id.includes(`-${b.season}-${b.week}-`)).length; wk[k]++; }, 40);
  const ddRate = sum.dd / wk.dd, otherRate = sum.other / wk.other;
  assert.ok(otherRate > 0);
  assert.ok(ddRate <= otherRate * 1.75, `deadline ${ddRate.toFixed(2)} vs other ${otherRate.toFixed(2)}`);
});
