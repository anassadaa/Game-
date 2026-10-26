import { targetValue } from './value.ts';
import type { GameState, Player } from './game.ts';
import { club, clamp, int, makePlayer, next, pick } from './game.ts';
import { league } from './world.ts';
import { spawnPotential, weeklyGrowth, reviewCeiling } from './potential.ts';
import { hidden } from './traits.ts';

export type Retiree = { name: string; position: Player['position']; peak: number; age: number; season: number; club: string; regenId?: string; ours?: boolean };
/** Players retire between 33 and 38; better and fitter players last longer. */
export function retires(s: GameState, p: Player) {
  if (p.age < 33) return false;
  const limit = 34 + (p.rating >= 75 ? 2 : p.rating >= 65 ? 1 : 0) + (p.position === 'GK' ? 2 : 0);
  return p.age > limit || next(s) < (p.age - 32) * 0.12;
}
/** A retiring player spawns a 16-17 year-old regen of the same position at a club in the same country. */
export function spawnRegen(s: GameState, p: Player, ours = false) {
  const fromClub = s.clubs.find((c) => c.id === p.clubId);
  const country = fromClub ? league(fromClub.division).country : league(club(s).division).country;
  const pool = s.clubs.filter((c) => c.id !== s.clubId && league(c.division).country === country);
  const home = pool.length ? pick(s, pool) : pick(s, s.clubs.filter((c) => c.id !== s.clubId));
  const peak = Math.max(p.rating, p.peak ?? 0);
  const r = makePlayer(s, home.id, 900 + (s.rivals?.length ?? 0), p.position, 46, true);
  r.id = `regen-${s.season}-${s.seed}-${(s.retired?.length ?? 0)}`;
  r.age = 16 + int(s, 0, 1);
  r.rating = Math.max(38, Math.min(62, 42 + int(s, 0, 14)));
  const homeRating = home.rating ?? 70;
  const leagueLevel = clamp(Math.round((88 - homeRating) / 8) + 1, 1, 5);
  r.potential = spawnPotential({ id: r.id, rating: r.rating, age: r.age, position: r.position, academy: 0, leagueLevel, regenPeak: peak });
  r.personality = p.personality;
  r.starting = false;
  r.listed = false;
  r.regenOf = p.name;
  r.price = targetValue(s, r);
  (s.rivals ??= []).push(r);
  s.retired = [{ name: p.name, position: p.position, peak, age: p.age, season: s.season, club: fromClub?.short ?? '—', regenId: r.id, ...(ours ? { ours: true } : {}) }, ...(s.retired ?? [])].slice(0, 40);
  return r;
}
/** Rivals develop unevenly: late bloomers, early peaks and declines. */
export function developRival(s: GameState, p: Player) {
  p.peak = Math.max(p.peak ?? 0, p.rating);
  const clubRating = s.clubs.find((c) => c.id === p.clubId)?.rating ?? 70;
  const leagueLevel = clamp(Math.round((88 - clubRating) / 8) + 1, 1, 5);
  const minutes = p.rating >= clubRating ? 0.8 : 0.4;
  for (let i = 0; i < 38; i++) {
    const ctx = {
      minutes,
      coaching: 8,
      facilities: 2,
      professionalism: hidden(p).professionalism,
      leagueLevel,
      salt: `${p.id}|${s.season}|${i}`,
    };
    const d = weeklyGrowth(p, ctx);
    p.rating = clamp(p.rating + d, 30, 99);
  }
  for (let i = 0; i < 4; i++) {
    const ctx = {
      minutes,
      coaching: 8,
      facilities: 2,
      professionalism: hidden(p).professionalism,
      leagueLevel,
      salt: `${p.id}|${s.season}|review:${i}`,
    };
    const rev = reviewCeiling(p, ctx);
    p.potential = rev.potential;
    p.potTrend = rev.trend;
  }
  p.peak = Math.max(p.peak ?? 0, p.rating);
}
export const regens = (s: GameState) => (s.rivals ?? []).filter((p) => p.regenOf);
export const validRegens = (s: GameState) =>
  s.retired === undefined || (Array.isArray(s.retired) && s.retired.length <= 40 && s.retired.every((r) => r && typeof r.name === 'string' && Number.isFinite(r.peak)));
