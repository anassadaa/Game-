// Hall of Fame (club legends), manager legacy score and season highlights.
import type { GameState } from './game.ts';
import { ACHIEVEMENTS } from './records.ts';

export type Legend = { id: string; name: string; position: string; apps: number; goals: number; season: number };
export function induct(s: GameState) {
  const have = new Set((s.hof ?? []).map((h) => h.id));
  const got: Legend[] = s.players
    .filter((p) => p.clubId === s.clubId && !have.has(p.id) && ((p.careerApps ?? 0) >= 80 || ((p.careerGoals ?? 0) >= 40 && (p.careerApps ?? 0) >= 40)))
    .map((p) => ({ id: p.id, name: p.name, position: p.position, apps: p.careerApps ?? 0, goals: p.careerGoals ?? 0, season: s.season }));
  if (got.length) {
    s.hof = [...got, ...(s.hof ?? [])].slice(0, 40);
    s.headlines = [`🏛️ Hall of Fame: ${got.map((g) => g.name).join(', ')} inducted.`, ...s.headlines].slice(0, 6);
  }
  return got;
}
const TIERS: [number, string][] = [[600, 'Icon of the game'], [300, 'Club legend'], [150, 'Respected'], [50, 'Making a name'], [0, 'Unknown']];
export function legacy(s: GameState) {
  const t = s.trophies?.length ?? 0, a = s.achievements?.length ?? 0;
  const score = s.careerWins * 2 + t * 40 + a * 8 + (s.hof?.length ?? 0) * 10 + Math.max(0, s.season - 1) * 5;
  const i = TIERS.findIndex(([m]) => score >= m);
  return { score, tier: TIERS[i]![1], next: i > 0 ? TIERS[i - 1]![0] : undefined };
}
export function seasonHighlights(s: GameState, season: number) {
  return {
    trophies: (s.trophies ?? []).filter((t) => t.season === season).map((t) => t.name),
    awards: (s.awards ?? []).filter((a) => a.season === season),
    achievements: (s.achievements ?? []).filter((a) => a.season === season).map((u) => ACHIEVEMENTS.find((x) => x.id === u.id)).filter((x) => !!x),
    legends: (s.hof ?? []).filter((h) => h.season === season).map((h) => h.name),
  };
}
export const validHof = (s: Pick<GameState, 'hof'>) =>
  s.hof === undefined || (Array.isArray(s.hof) && s.hof.every((h) => h && typeof h.id === 'string' && typeof h.name === 'string' && Number.isFinite(h.apps)));
