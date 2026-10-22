import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setPlayerTactic } from '../src/game.ts';
import { depthChart, heatmap } from '../src/depth.ts';

test('depth chart orders starters first and heatmaps follow instructions', () => {
  const s = newGame(3);
  const chart = depthChart(s);
  assert.equal(chart.reduce((n, l) => n + l.players.length, 0), s.players.filter((p) => p.clubId === s.clubId).length);
  for (const l of chart) { const i = l.players.findIndex((p) => !p.starting); if (i >= 0) assert.ok(l.players.slice(i).every((p) => !p.starting || p.injured)); }
  const df = s.players.find((p) => p.clubId === s.clubId && p.starting && p.position === 'DF');
  const centre = (g) => g.flat().reduce((a, v, i) => a + v * (i % 6), 0) / g.flat().reduce((a, v) => a + v, 0);
  const before = centre(heatmap(s, df));
  const after = centre(heatmap(setPlayerTactic(s, df.id, { instr: 'get forward' }), df));
  assert.ok(after > before);
  const gk = s.players.find((p) => p.position === 'GK' && p.starting);
  assert.ok(centre(heatmap(s, gk)) < before);
});
