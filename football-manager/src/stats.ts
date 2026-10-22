import { repTrophy } from './jobs.ts';
import type { GameState, Player } from './game.ts';
import { avgRating } from './highlights.ts';
import { leagueName } from './world.ts';

export type Trophy = { season: number; name: string; club: string };
export type Award = { season: number; award: string; player: string; detail: string };

export function addTrophy(s: GameState, name: string) {
  const c = s.clubs.find((x) => x.id === s.clubId)!;
  (s.trophies ??= []).unshift({ season: s.season, name, club: c.name });
  s.trophies = s.trophies.slice(0, 60);
  repTrophy(s);
}
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
export function leaders(s: GameState) {
  const sq = own(s);
  const by = (f: (p: Player) => number, min = 0) => sq.filter((p) => (p.apps ?? 0) >= min).sort((a, b) => f(b) - f(a))[0];
  return {
    scorer: by((p) => p.goals),
    assists: by((p) => p.assists),
    rating: by((p) => avgRating(p), 3),
    motm: by((p) => p.motm ?? 0),
    young: sq.filter((p) => p.age <= 21 && (p.apps ?? 0) >= 3).sort((a, b) => avgRating(b) - avgRating(a))[0],
  };
}
/** End-of-season awards and league trophies; then per-season stats reset. */
export function seasonAwards(s: GameState, outcome: string, division: number) {
  if (outcome === 'Champions') addTrophy(s, `${leagueName(division)} title`);
  if (outcome === 'Promoted') addTrophy(s, `Promotion from ${leagueName(division)}`);
  const l = leaders(s), out: Award[] = [];
  if (l.rating) out.push({ season: s.season, award: 'Player of the Season', player: l.rating.name, detail: `avg ${avgRating(l.rating).toFixed(2)}` });
  if (l.scorer?.goals) out.push({ season: s.season, award: 'Golden Boot', player: l.scorer.name, detail: `${l.scorer.goals} goals` });
  if (l.assists?.assists) out.push({ season: s.season, award: 'Playmaker', player: l.assists.name, detail: `${l.assists.assists} assists` });
  if (l.young) out.push({ season: s.season, award: 'Young Player', player: l.young.name, detail: `avg ${avgRating(l.young).toFixed(2)}` });
  s.awards = [...out, ...(s.awards ?? [])].slice(0, 80);
  for (const p of s.players) {
    p.careerGoals = (p.careerGoals ?? 0) + p.goals;
    p.careerApps = (p.careerApps ?? 0) + (p.apps ?? 0);
    p.apps = 0;
    p.ratingSum = 0;
    p.motm = 0;
  }
  if (out.length) s.headlines = [`🏅 Awards: ${out.map((a) => `${a.award} — ${a.player}`).join(' · ')}`, ...s.headlines].slice(0, 6);
}
export const validTrophies = (s: GameState) =>
  (s.trophies === undefined || (Array.isArray(s.trophies) && s.trophies.every((t) => t && Number.isInteger(t.season) && typeof t.name === 'string'))) &&
  (s.awards === undefined || (Array.isArray(s.awards) && s.awards.every((a) => a && Number.isInteger(a.season) && typeof a.player === 'string')));
