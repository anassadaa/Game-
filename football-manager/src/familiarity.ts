// Tactical familiarity: new shapes start rusty and training makes them second nature.
// A counter-attacking plan works at once; a high press needs drilling, fitness and a fitness coach.
import type { GameState } from './game.ts';
import { best } from './staff.ts';

const NEW_SHAPE = 25, NEW_PRESS = 40;
export function familiarity(s: GameState, key: string) {
  const v = s.familiar?.[key];
  if (typeof v === 'number') return v;
  if (key === 'press') return NEW_PRESS;
  return !s.familiar && key === s.tactics.formation ? 100 : NEW_SHAPE;
}
/** Record the old shape as known before switching, so the first change is visible. */
export function rememberShape(s: GameState) {
  s.familiar ??= { [s.tactics.formation]: 100 };
}
const pressing = (s: GameState) => s.tactics.press === 'high' || s.tactics.oopMode === 'press';
export function pressReadiness(s: GameState) {
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const fit = xi.reduce((n, p) => n + p.fitness, 0) / Math.max(1, xi.length);
  const r = (familiarity(s, 'press') / 100) * 0.5 + Math.max(0, Math.min(1, (fit - 60) / 35)) * 0.3 + (best(s, 'fitness') / 20) * 0.2;
  return Math.round(r * 100) / 100;
}
export function familiarityProfile(s: GameState) {
  const fam = familiarity(s, s.tactics.formation);
  const rust = (100 - fam) / 100;
  let att = -0.04 * rust, def = -0.04 * rust;
  const notes: string[] = [];
  if (fam < 70) notes.push(`${s.tactics.formation} is still rusty (${fam}% familiar)`);
  if (s.tactics.press === 'high') {
    const r = pressReadiness(s);
    att += 0.02 * (r - 0.6); def += 0.02 * (r - 0.6);
    if (r < 0.5) notes.push('the high press is unfamiliar and the legs aren\u2019t there');
  }
  return { att, def, notes };
}
const clampF = (n: number) => Math.max(NEW_SHAPE, Math.min(100, Math.round(n)));
/** Weekly: the current shape and pressing drills gain familiarity; unused shapes fade slowly. */
export function familiarityWeek(s: GameState) {
  rememberShape(s);
  const f = s.familiar!, d = s.drills ?? [], cur = s.tactics.formation;
  const gain = 6 + (d.includes('shape') ? 6 : 0) + (d.includes('video') ? 4 : 0);
  for (const k of Object.keys(f)) if (k !== 'press' && k !== cur && k !== s.tactics.oopShape) f[k] = clampF(f[k]! - 1);
  f[cur] = clampF(familiarity(s, cur) + gain);
  if (s.tactics.oopShape && s.tactics.oopShape !== cur) f[s.tactics.oopShape] = clampF(familiarity(s, s.tactics.oopShape) + gain / 2);
  if (pressing(s)) f.press = clampF(familiarity(s, 'press') + 5 + (d.includes('sprints') || d.includes('endurance') ? 4 : 0) + best(s, 'fitness') / 5);
}
export const validFamiliar = (v: unknown) =>
  v === undefined || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every((x) => typeof x === 'number' && x >= 0 && x <= 100));
