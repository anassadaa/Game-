// Season fixture list with results, and the end-of-season review.
import type { GameState } from './game.ts';
import { club, copy, roundPairs } from './game.ts';
import { leaders } from './stats.ts';

export type Result = { week: number; opp: string; home: boolean; us: number; them: number };
export type SeasonReview = {
  season: number; division: number; position: number; size: number; outcome: string;
  played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number;
  best?: string; worst?: string; scorer?: string; verdict: string;
};
export const SEASON_WEEKS = 18;
const outcomeOf = (r: Result) => (r.us > r.them ? 'W' : r.us < r.them ? 'L' : 'D');

export function recordResult(s: GameState, r: Result) {
  s.results = [...(s.results ?? []).filter((x) => x.week !== r.week), r].slice(-SEASON_WEEKS);
}
export function fixtureList(s: GameState) {
  const me = club(s);
  const ids = s.clubs.filter((c) => c.division === me.division).map((c) => c.id);
  const out = [];
  for (let week = 0; week < SEASON_WEEKS; week++) {
    const pair = roundPairs(ids, week).find((p) => p.includes(s.clubId));
    if (!pair) continue;
    const oppId = pair[0] === s.clubId ? pair[1] : pair[0];
    const opp = s.clubs.find((c) => c.id === oppId)!;
    const r = (s.results ?? []).find((x) => x.week === week);
    out.push({
      week, oppId, oppName: opp.name, oppShort: opp.short, home: pair[0] === s.clubId,
      result: r ? { us: r.us, them: r.them, outcome: outcomeOf(r) } : undefined,
      current: week === s.week,
    });
  }
  return out;
}
export function buildReview(s: GameState, position: number, outcome: string, division: number, target?: number): SeasonReview {
  const me = club(s), size = s.clubs.filter((c) => c.division === division).length;
  const res = s.results ?? [];
  const name = (r: Result) => `${r.us}–${r.them} ${r.home ? 'vs' : 'at'} ${s.clubs.find((c) => c.id === r.opp)?.name ?? r.opp}`;
  const best = [...res].sort((a, b) => b.us - b.them - (a.us - a.them) || b.us - a.us)[0];
  const worst = [...res].sort((a, b) => a.us - a.them - (b.us - b.them))[0];
  const top = leaders(s).scorer;
  const t = target ?? position;
  const verdict =
    outcome === 'Champions' ? 'Champions! The board is delighted.'
    : outcome === 'Promoted' ? 'Promotion secured. The board is thrilled.'
    : outcome === 'Relegated' ? 'Relegation. The board expects an immediate response.'
    : position <= t - 2 ? 'Well above expectations. The board is impressed.'
    : position <= t ? 'Target met. The board is satisfied.'
    : position <= t + 3 ? 'Slightly below target. The board wants progress.'
    : 'Well short of target. The board is losing patience.';
  return {
    season: s.season, division, position, size, outcome,
    played: me.played, wins: me.wins, draws: me.draws, losses: me.losses, gf: me.gf, ga: me.ga, points: me.points,
    ...(best && best.us > best.them ? { best: name(best) } : {}),
    ...(worst && worst.us < worst.them ? { worst: name(worst) } : {}),
    ...(top?.goals ? { scorer: `${top.name} (${top.goals})` } : {}),
    verdict,
  };
}
export function dismissReview(s: GameState): GameState {
  const b = copy(s);
  delete b.review;
  return b;
}
export function validResults(s: GameState) {
  const okR = (r: Result) => r && Number.isInteger(r.week) && typeof r.opp === 'string' && typeof r.home === 'boolean' && Number.isInteger(r.us) && Number.isInteger(r.them);
  return Array.isArray(s.results) && s.results.length <= SEASON_WEEKS && s.results.every(okR) &&
    (s.review === undefined || (typeof s.review === 'object' && Number.isInteger(s.review.position) && typeof s.review.verdict === 'string'));
}
