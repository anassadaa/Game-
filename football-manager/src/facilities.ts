import type { GameState } from './game.ts';
import { clamp, copy, next } from './game.ts';

export type FacilityKey = 'training' | 'medical' | 'stadium';
export type Facilities = Record<FacilityKey, number> & { building?: { type: FacilityKey; weeks: number } };
export const FACILITIES: { id: FacilityKey; name: string; blurb: string; base: number; step: number }[] = [
  { id: 'training', name: 'Training ground', blurb: 'Drills and individual work stick more often.', base: 300, step: 220 },
  { id: 'medical', name: 'Medical centre', blurb: 'Fewer lingering injuries and quicker recovery.', base: 260, step: 180 },
  { id: 'stadium', name: 'Stadium expansion', blurb: 'More seats — bigger home gate receipts.', base: 500, step: 350 },
];
export const BUILD_WEEKS = 2;
export const facilities = (s: GameState): Facilities => (s.facilities ??= { training: 1, medical: 1, stadium: 1 });
export const facilityCost = (s: GameState, k: FacilityKey) => {
  const f = FACILITIES.find((x) => x.id === k)!;
  return f.base + (facilities(s)[k] - 1) * f.step;
};
export const maintenance = (s: GameState) => {
  const f = facilities(s);
  return (f.training + f.medical + f.stadium - 3) * 4;
};
export function buildFacility(s: GameState, k: FacilityKey): GameState {
  if (s.match || !FACILITIES.some((x) => x.id === k)) return s;
  const f = facilities(s);
  if (f.building || f[k] >= 5 || s.budget < facilityCost(s, k)) return s;
  const b = copy(s), bf = facilities(b);
  b.budget -= facilityCost(s, k);
  bf.building = { type: k, weeks: BUILD_WEEKS };
  b.headlines = [`🏗️ Work begins on the ${FACILITIES.find((x) => x.id === k)!.name.toLowerCase()}.`, ...b.headlines].slice(0, 6);
  return b;
}
export const trainingBoost = (s: GameState) => 1 + (facilities(s).training - 1) * 0.15;
export const stadiumBonus = (s: GameState, home: boolean) => (home ? (facilities(s).stadium - 1) * 30 : 0);

/** Weekly: construction progress, medical care and upkeep. */
export function facilitiesWeek(s: GameState) {
  const f = facilities(s);
  if (f.building && --f.building.weeks <= 0) {
    f[f.building.type] = Math.min(5, f[f.building.type] + 1);
    s.headlines = [`✅ New ${FACILITIES.find((x) => x.id === f.building!.type)!.name.toLowerCase()} opens (level ${f[f.building.type]}).`, ...s.headlines].slice(0, 6);
    s.trust = clamp(s.trust + 2);
    delete f.building;
  }
  for (const p of s.players.filter((x) => x.clubId === s.clubId)) {
    p.fitness = clamp(p.fitness + (f.medical - 1));
    if (p.injured && next(s) < (f.medical - 1) * 0.12) p.injured = p.injured > 1 ? p.injured - 1 : undefined;
  }
  s.budget -= maintenance(s);
}
export function validFacilities(x: unknown): boolean {
  const f = x as Facilities;
  return !!f && (['training', 'medical', 'stadium'] as const).every((k) => Number.isInteger(f[k]) && f[k] >= 1 && f[k] <= 5) &&
    (f.building === undefined || (['training', 'medical', 'stadium'].includes(f.building.type) && Number.isInteger(f.building.weeks)));
}
