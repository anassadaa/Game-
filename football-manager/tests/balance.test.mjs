import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { autoPick } from '../src/lineup.ts';
export function season(id, seeds = [1, 2, 3, 4]) {
  let pts = 0, gf = 0, ga = 0, n = 0;
  for (const seed of seeds) {
    let s = autoPick(newGame(seed, id, 60));
    for (let w = 0; w < 18 && !s.sacked; w++) { const f = simToEnd(startMatch(s)); if (!f.match) break; const { us, them } = f.match; pts += us > them ? 3 : us === them ? 1 : 0; gf += us; ga += them; n++; s = advanceWeek(f); }
  }
  return { ppg: pts / n, goals: (gf + ga) / n };
}
const div = (id) => { const s = newGame(1, id); const d = s.clubs.find((c) => c.id === id).division; return s.clubs.filter((c) => c.division === d).sort((a, b) => b.rating - a.rating); };
test('the gap between clubs matters: favourites win, the side tipped for last struggles', () => {
  const clubs = div('leicester'), top = season(clubs[0].id), bottom = season(clubs.at(-1).id);
  assert.ok(bottom.ppg <= 1.15, `bottom ppg ${bottom.ppg.toFixed(2)}`);
  assert.ok(top.ppg >= 1.8, `top ppg ${top.ppg.toFixed(2)}`);
  assert.ok(top.ppg - bottom.ppg >= 0.8, `gap ${(top.ppg - bottom.ppg).toFixed(2)}`);
});
test('goals per game land around 2.6-2.8 in our matches and across the league', () => {
  const clubs = div('leicester'), mid = season(clubs[9].id, [1, 2, 3, 4, 5, 6]);
  assert.ok(mid.goals >= 2.45 && mid.goals <= 3.0, `our goals/game ${mid.goals.toFixed(2)}`);
  let s = newGame(7, clubs[9].id);
  for (let w = 0; w < 17; w++) { s = simToEnd(startMatch(autoPick(s))); s = advanceWeek(s); if (s.sacked) break; }
  const lg = s.clubs.filter((c) => c.division === clubs[0].division);
  const g = lg.reduce((t, c) => t + c.gf, 0) / (lg.reduce((t, c) => t + c.wins + c.draws + c.losses, 0) / 2);
  assert.ok(g >= 2.45 && g <= 3.0, `league goals/game ${g.toFixed(2)}`);
});
