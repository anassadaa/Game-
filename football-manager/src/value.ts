// 3.4: dynamic market value, recalculated every week.
// Built on how real valuations work (see docs/market-value.md): a multiplicative (log-linear) model
// like CIES's — ability, an inverted-U age curve that peaks later for defenders/keepers, potential for
// young players, contract length, position, club/league level, usage and output, reputation,
// injuries, homegrown/wonderkid premiums and demand. Weekly moves are smoothed (≤8%).
import type { GameState, Player } from './game.ts';
import { slotPeek } from './positions.ts';
import { hidden } from './traits.ts';
import { isProtected } from './protect.ts';

const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function h01(str: string) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h / 4294967296; }
type Grp = 'GK' | 'DF' | 'MF' | 'FW';
const grp = (p: Player): Grp => {
  const sl = slotPeek(p);
  return sl === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(sl) ? 'DF' : ['ST', 'LW', 'RW'].includes(sl) ? 'FW' : 'MF';
};
// Peak age and decline per year after it (forwards peak ~25 and fall fastest; keepers ~29 and slowest).
const AGE: Record<Grp, { peak: number; fall: number }> = { FW: { peak: 26, fall: 0.13 }, MF: { peak: 27, fall: 0.11 }, DF: { peak: 28, fall: 0.09 }, GK: { peak: 30, fall: 0.07 } };
// Attackers command the highest fees, keepers the lowest.
const POS: Record<string, number> = { ST: 1.15, LW: 1.1, RW: 1.1, AM: 1.12, CM: 1.0, DM: 0.97, CB: 0.97, LB: 0.93, RB: 0.93, GK: 0.8 };

/** Each part of the value, for tests and the profile tooltip. */
export function valueParts(s: GameState, p: Player) {
  const g = grp(p), a = AGE[g], age = p.age;
  // Young players are bought for what they will become: blend in potential, fading out by the mid-20s.
  const gap = Math.max(0, (p.potential ?? p.rating) - p.rating), youth = clampN((25 - age) / 7, 0, 1);
  const eff = p.rating + gap * 0.55 * youth;
  const ability = 80 * Math.exp(0.09 * (eff - 55)); // ~£125k at 60, ~£310k at 70, ~£760k at 80, ~£1.9m at 90
  // Inverted U: a little cheaper while raw, flat across the prime, falling faster each year after the peak.
  const ageF = age < 21 ? 0.9 + (age - 17) * 0.025 : age <= a.peak ? 1 : Math.pow(1 - a.fall, age - a.peak) * (age >= 33 ? 0.85 : 1);
  // Contract: the fee is compensation for the years left. Free agents are cheaper.
  const yrs = p.clubId === 'market' ? -1 : p.contract ?? 3;
  const contract = yrs < 0 ? 0.85 : yrs <= 0 ? 0.55 : yrs === 1 ? 0.72 : yrs === 2 ? 0.9 : yrs === 3 ? 1 : yrs === 4 ? 1.06 : 1.1;
  const pos = POS[slotPeek(p)] ?? 1;
  // Club/league level: players at stronger clubs in stronger leagues are valued higher.
  const club = s.clubs.find((c) => c.id === (p.clubId === 'market' ? s.clubId : p.clubId));
  const level = clampN(Math.exp(0.035 * ((club?.rating ?? 62) - 70)), 0.5, 1.8);
  // Recent form: match ratings and output, with more weight once he has played a few games.
  const apps = p.apps ?? 0, avg = apps ? (p.ratingSum ?? 0) / apps : 0, w = clampN(apps / 8, 0, 1);
  const out = apps ? ((p.goals ?? 0) + 0.7 * (p.assists ?? 0)) / apps : 0;
  const outW = g === 'FW' ? 0.18 : g === 'MF' ? 0.25 : 0.35; // a goal from a defender stands out more
  const form = 1 + w * (clampN((avg - 6.6) * 0.14, -0.18, 0.2) + clampN(out * outW, 0, 0.2) + clampN(apps / Math.max(6, s.week + 1) * 0.08, 0, 0.08));
  // Reputation: career appearances, man-of-the-match awards and career goals.
  const rep = 1 + clampN((p.motm ?? 0) * 0.01 + (p.careerGoals ?? 0) * 0.002 + (p.careerApps ?? 0) * 0.0004, 0, 0.12);
  // Injuries: currently out and how injury-prone he is.
  const prone = hidden(p).proneness;
  const injury = (1 - clampN((p.injured ?? 0) * 0.03, 0, 0.3)) * (1 - clampN((prone - 11) * 0.015, 0, 0.12));
  const special = (p.wonderkid ? 1.2 : 1) * (isProtected(p) ? 1.06 : 1) * (p.academyGraduate ? 1.08 : 1);
  // Demand: how many clubs want him this month (hash-based), less if he's listed or unhappy.
  const demand = (0.94 + 0.12 * h01(`${s.seed}|demand|${p.id}|${s.season}|${Math.floor(s.week / 4)}`)) * (p.listed ? 0.9 : 1) * (p.unhappy ? 0.95 : 1);
  return { ability, age: ageF, contract, pos, level, form, rep, injury, special, demand };
}
export function targetValue(s: GameState, p: Player) {
  const v = valueParts(s, p);
  return Math.max(10, Math.round(v.ability * v.age * v.contract * v.pos * v.level * v.form * v.rep * v.injury * v.special * v.demand));
}
/** One week's move: 35% of the way to the target, never more than 8% either way. */
export function stepValue(old: number, target: number) {
  if (!(old > 0)) return target;
  return Math.max(10, Math.round(old + clampN((target - old) * 0.35, -old * 0.08, old * 0.08)));
}
/** Weekly: every player in the world drifts toward his current value. */
export function valuesWeek(s: GameState) {
  for (const p of [...s.players, ...(s.rivals ?? []), ...s.market, ...(s.loansOut ?? [])]) p.price = stepValue(p.price, targetValue(s, p));
}
/** New games and old saves: set every value straight to its target once. */
export function initValues(s: GameState) {
  for (const p of [...s.players, ...(s.rivals ?? []), ...s.market, ...(s.loansOut ?? [])]) p.price = targetValue(s, p);
  s.valueModel = 1;
}
