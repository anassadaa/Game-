import type { Cup, GameState } from './game.ts';
import { CUP_WEEKS, EURO_WEEKS, copy } from './game.ts';
import { fixtureList, SEASON_WEEKS } from './fixtures.ts';

/** Season calendar: the double round-robin league plus midweek cup ties, and the load they put on the squad. */
export type CalEntry = { week: number; kind: 'league' | 'cup'; opp?: string; label: string; home?: boolean };
const cups = (): ['cup' | 'euro', number[], string][] => [['cup', CUP_WEEKS, 'Cup'], ['euro', EURO_WEEKS, 'Champions Cup']];
const ROUND = ['R16', 'QF', 'SF', 'Final'];
const inCup = (s: GameState, c: Cup | undefined) => !!c && c.alive.includes(s.clubId);

export function calendar(s: GameState): CalEntry[] {
  const out: CalEntry[] = fixtureList(s).map((f) => ({ week: f.week, kind: 'league' as const, opp: f.oppId, home: f.home, label: `${f.home ? 'vs' : '@'} ${f.oppShort}` }));
  for (const [key, weeks, name] of cups()) {
    const c = s[key] as Cup | undefined;
    if (!c) continue;
    weeks.forEach((w, i) => {
      if (i < c.round || (i >= c.round && inCup(s, c))) out.push({ week: w, kind: 'cup', label: `${name} ${ROUND[i]}${i < c.round ? ' ✓' : ''}` });
    });
  }
  return out.sort((a, b) => a.week - b.week || (a.kind === 'cup' ? -1 : 1));
}

/** Matches in the next stretch: this matchday, the midweek tie, and the following matchday. */
export function congestion(s: GameState) {
  let games = s.week < SEASON_WEEKS ? 1 : 0;
  if (s.week + 1 < SEASON_WEEKS) games++;
  for (const [key, weeks] of cups()) {
    const c = s[key] as Cup | undefined;
    if (c && c.round < 4 && inCup(s, c) && weeks[c.round] === s.week + 1) games++;
  }
  return { games, label: games >= 3 ? 'Congested' : games === 2 ? 'Normal' : 'Light' };
}

export function setCupRotation(s: GameState, on: boolean): GameState {
  const b = copy(s);
  b.cupRotate = on;
  return b;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
/** Applies a midweek tie's load to our squad; returns the strength change for the tie (rotation fields a weaker XI). */
export function midweekLoad(s: GameState): number {
  const ours = s.players.filter((p) => p.clubId === s.clubId);
  if (s.cupRotate) {
    for (const p of ours.filter((x) => !x.starting && !x.injured)) {
      p.sharp = clamp((p.sharp ?? 70) + 10, 20, 100);
      p.fitness = clamp(p.fitness - 4, 1);
    }
    return -3;
  }
  for (const p of ours.filter((x) => x.starting)) {
    p.fitness = clamp(p.fitness - 10, 1);
    p.sharp = clamp((p.sharp ?? 70) + 3, 20, 100);
  }
  return 0;
}
export const validRotate = (v: unknown) => v === undefined || typeof v === 'boolean';
