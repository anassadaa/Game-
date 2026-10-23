// FM-style injuries: named types, risk model, in-match knocks, recovery, rush-backs and news.
import type { GameState, Player } from './game.ts';
import { attributes, clamp, copy, int, next } from './game.ts';
import { facilities } from './facilities.ts';
import { injuryFactor } from './staff.ts';

export type InjuryType = { id: string; name: string; min: number; max: number; weight: number };
export const INJURIES: InjuryType[] = [
  { id: 'knock', name: 'Knock', min: 0, max: 1, weight: 40 },
  { id: 'hamstring', name: 'Hamstring strain', min: 2, max: 4, weight: 22 },
  { id: 'ankle', name: 'Ankle sprain', min: 3, max: 6, weight: 16 },
  { id: 'groin', name: 'Groin strain', min: 2, max: 5, weight: 12 },
  { id: 'broken', name: 'Broken bone', min: 6, max: 12, weight: 7 },
  { id: 'acl', name: 'ACL rupture', min: 26, max: 40, weight: 3 },
];
export type Injury = { type: string; total: number; week?: number; fresh?: boolean };
export type MedNews = { week: number; text: string };
export const PRONE_AT = 3, RUSH_WEEKS = 6;
export const injuryName = (id?: string) => INJURIES.find((i) => i.id === id)?.name ?? 'Injury';
export const injuryProne = (p: Player) => (p.injuries ?? 0) >= PRONE_AT;
export const injuryNews = (s: GameState) => s.medNews ?? [];
function news(s: GameState, text: string) {
  s.medNews = [{ week: s.week, text }, ...(s.medNews ?? [])].slice(0, 20);
}
export type RiskCtx = { heavy?: boolean; tackle?: 'low' | 'normal' | 'high' };
/** Chance of an injury in one risky spell (a 15-minute match segment or a hard training week). */
export function injuryRisk(s: GameState, p: Player, ctx: RiskCtx = {}): number {
  const stamina = attributes(p).stamina;
  let r = 0.004;
  r *= 1 + Math.max(0, 85 - p.fitness) / 25;              // tired legs
  r *= p.age >= 32 ? 1.6 : p.age >= 29 ? 1.25 : p.age <= 20 ? 0.85 : 1;
  r *= 1 + (70 - stamina) / 90;                            // natural fitness
  if (ctx.heavy) r *= 1.35;                                // fixture congestion
  r *= ctx.tackle === 'high' ? 1.4 : ctx.tackle === 'low' ? 0.8 : 1;
  if (injuryProne(p)) r *= 1.6;
  if (p.rushed) r *= 2.2;
  return Math.max(0, r * injuryFactor(s));
}
/** Physio and medical centre shorten recovery. */
export function recoveryWeeks(s: GameState, weeks: number) {
  const med = facilities(s).medical;
  return Math.max(0, Math.round(weeks * injuryFactor(s) * (1 - (med - 1) * 0.07)));
}
function rollType(s: GameState): InjuryType {
  const tot = INJURIES.reduce((a, i) => a + i.weight, 0);
  let x = next(s) * tot;
  for (const i of INJURIES) if ((x -= i.weight) < 0) return i;
  return INJURIES[0]!;
}
export function injure(s: GameState, p: Player, type?: string) {
  const t = INJURIES.find((i) => i.id === type) ?? rollType(s);
  const weeks = Math.max(1, recoveryWeeks(s, int(s, t.min, t.max)));
  p.injured = Math.max(p.injured ?? 0, weeks);
  p.injury = { type: t.id, total: p.injured, week: s.week, ...(s.match ? { fresh: true } : {}) };
  p.injuries = (p.injuries ?? 0) + 1;
  p.rushed = undefined;
  if (p.clubId === s.clubId) news(s, `🚑 ${p.name}: ${t.name.toLowerCase()} — out for ${p.injured} week${p.injured > 1 ? 's' : ''}${injuryProne(p) ? ' (injury prone)' : ''}.`);
  return t;
}
/** In-match: the player goes down; he must be subbed or the team plays on a man light. */
export function matchInjury(s: GameState, p: Player) {
  const t = injure(s, p);
  const m = s.match;
  if (m) {
    m.down = [...new Set([...(m.down ?? []), p.id])];
    m.timeline.push({ minute: Math.min(90, m.minute + 1), text: `🚑 ${p.name} goes down — ${t.name.toLowerCase()}. He can't continue.`, side: 'us', kind: 'note', playerId: p.id });
  }
}
/** Each segment: roll injuries for our starters; then anyone still down leaves the pitch (no sub = 10 men). */
export function matchInjuries(b: GameState) {
  const m = b.match!;
  for (const id of m.down ?? []) {
    const p = b.players.find((x) => x.id === id);
    if (p?.starting) {
      p.starting = false;
      if (b.lineup) b.lineup = b.lineup.map((x) => (x === id ? '' : x));
      m.timeline.push({ minute: m.minute, text: `${p.name} is helped off — no change made, playing on with ${b.players.filter((x) => x.clubId === b.clubId && x.starting).length}.`, side: 'us', kind: 'note' });
    }
  }
  m.down = [];
  const ctx: RiskCtx = { tackle: b.tactics.press as RiskCtx['tackle'], heavy: heavy(b) };
  for (const p of b.players.filter((x) => x.clubId === b.clubId && x.starting && !x.injured))
    if (next(b) < injuryRisk(b, p, ctx)) { matchInjury(b, p); break; }
}
/** Cup or European fixture this week on top of the league. */
const heavy = (s: GameState) => [4, 8, 12, 16, 6, 10, 14, 17].includes(s.week);
/** Weekly: heal, return news (with low sharpness), rush-back countdown, training knocks. */
export function injuryWeek(s: GameState) {
  for (const p of s.players.filter((x) => x.clubId === s.clubId)) {
    if (p.rushed) p.rushed = p.rushed > 1 ? p.rushed - 1 : undefined;
    if (p.injured && p.injury?.week === s.week && p.injury.fresh) delete p.injury.fresh; // picked up this week: misses the next match
    else if (p.injured) {
      p.injured = p.injured > 1 ? p.injured - 1 : undefined;
      if (!p.injured) returns(s, p, `✅ ${p.name} is back in training after his ${injuryName(p.injury?.type).toLowerCase()}. Sharpness is low.`);
    } else if (p.starting && p.fitness < 45 && next(s) < injuryRisk(s, p, { heavy: heavy(s) }) * 6) injure(s, p, next(s) < 0.7 ? 'knock' : 'hamstring');
  }
}
function returns(s: GameState, p: Player, text: string) {
  p.injured = undefined;
  delete p.injury;
  p.sharp = Math.min(p.sharp ?? 70, 35);
  news(s, text);
}
/** Bring a player back early (past halfway): risky — more likely to break down again. */
export function rushBack(s: GameState, id: string): [GameState, string] {
  const p0 = s.players.find((x) => x.id === id && x.clubId === s.clubId);
  if (s.match || !p0?.injured || !p0.injury || p0.injured > Math.ceil(p0.injury.total / 2)) return [s, 'Too early — the physio says no.'];
  const b = copy(s), p = b.players.find((x) => x.id === id)!;
  const name = injuryName(p.injury?.type).toLowerCase();
  returns(b, p, `⚠️ ${p.name} rushed back from his ${name}. Re-injury risk is high for ${RUSH_WEEKS} weeks.`);
  p.rushed = RUSH_WEEKS;
  p.fitness = clamp(Math.min(p.fitness, 75));
  return [b, `${p.name} is available — handle with care.`];
}
/** Old saves: give plain injury counts a type matching the length. */
export function migrateInjuries(s: GameState) {
  for (const p of s.players) if (p.injured && !p.injury) {
    const t = [...INJURIES].reverse().find((i) => p.injured! >= i.min) ?? INJURIES[0]!;
    p.injury = { type: t.id, total: p.injured };
  }
}
export function validInjuries(s: GameState) {
  const ok = s.players.every((p) => (p.injury === undefined || (typeof p.injury.type === 'string' && Number.isInteger(p.injury.total) && (p.injury.fresh === undefined || typeof p.injury.fresh === 'boolean'))) &&
    (p.injuries === undefined || Number.isInteger(p.injuries)) && (p.rushed === undefined || Number.isInteger(p.rushed)));
  const n = s.medNews;
  return ok && (n === undefined || (Array.isArray(n) && n.length <= 20 && n.every((x) => x && typeof x.text === 'string' && Number.isInteger(x.week))));
}
