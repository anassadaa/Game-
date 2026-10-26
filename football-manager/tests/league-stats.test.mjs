import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek, migrate } from '../src/game.ts';
import { leaderboard, statRow, STAT_CATS, teamBoard, statSeasons } from '../src/leaguestats.ts';
const play = (s) => { s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return advanceWeek(s); };
const weeks = (s, n) => { for (let i = 0; i < n; i++) s = play(s); return s; };
const base = weeks(newGame(31), 4);

test('every AI club in every league gets per-player stats; goals add up to the club total', () => {
  const ours = base.clubId;
  const others = base.clubs.filter((c) => c.id !== ours && c.played > 0);
  assert.ok(new Set(others.map((c) => c.division)).size > 3, 'several leagues played');
  for (const c of others) {
    const ps = (base.rivals ?? []).filter((p) => p.clubId === c.id);
    const goals = ps.reduce((a, p) => a + statRow(base, p).goals, 0);
    assert.ok(goals <= c.gf && goals >= c.gf - 2, `${c.name}: players ${goals} vs club ${c.gf}`); // a scorer may have been sold
    assert.ok(ps.some((p) => statRow(base, p).apps > 0));
  }
});
test('stats are deterministic (hash-based)', () => {
  const again = weeks(newGame(31), 4);
  assert.deepEqual(again.lstats, base.lstats);
});
test('leaderboards rank correctly and respect league, GK and minimum-games filters', () => {
  const div = base.clubs.find((c) => c.id === base.clubId).division;
  const top = leaderboard(base, 'goals', { division: div }, 15);
  assert.ok(top.length > 0 && top.length <= 15);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].value >= top[i].value);
  assert.ok(top.every((r) => base.clubs.find((c) => c.id === r.clubId)?.division === div));
  const all = leaderboard(base, 'goals', {}, 20);
  assert.ok(all[0].value >= top[0].value);
  assert.ok(leaderboard(base, 'cleanSheets', {}, 20).every((r) => r.position === 'GK'));
  const rt = leaderboard(base, 'rating', {}, 20);
  assert.ok(rt.every((r) => r.apps >= 2) && rt[0].value >= rt.at(-1).value);
  const ga = leaderboard(base, 'ga', {}, 5)[0];
  assert.equal(ga.value, statRow(base, ga.player).goals + statRow(base, ga.player).assists);
  for (const k of ['goals', 'assists', 'ga', 'rating', 'motm', 'cleanSheets', 'yellows', 'reds', 'apps']) assert.ok(STAT_CATS.some((c) => c.id === k), k);
  const tb = teamBoard(base, 'gf', { division: div });
  assert.ok(tb[0].value >= tb.at(-1).value);
});
test('our own players appear with their real season numbers', () => {
  const mine = base.players.filter((p) => p.clubId === base.clubId && (p.apps ?? 0) > 0);
  assert.ok(mine.length >= 11);
  for (const p of mine) { const r = statRow(base, p); assert.equal(r.apps, p.apps); assert.equal(r.goals, p.goals); }
});
test('season end archives the leaderboards and starts fresh; old saves migrate', () => {
  let s = newGame(8); while (s.season === 1 || s.week < 2) { s = play(s); if (s.sacked) break; }
  assert.ok(statSeasons(s).includes(s.season - 1));
  const prev = leaderboard(s, 'goals', { season: s.season - 1 }, 10);
  assert.ok(prev.length > 0 && prev[0].value > 3, 'last season top scorer kept');
  const old = structuredClone(base); delete old.lstats;
  const m = migrate(old);
  assert.equal(m.lstats.season, m.season);
});
