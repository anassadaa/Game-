import type { GameState } from './game.ts';
import { earnedIncome, ledger } from './finance.ts';

export type TrendPoint = { season: number; week: number; inc: number; wages: number };
const CAP = 18;

/** Weekly snapshot for the charts: cumulative season income, weekly wage bill, squad values. */
export function recordTrend(s: GameState) {
  const l = ledger(s), squad = s.players.filter((p) => p.clubId === s.clubId);
  const wages = squad.reduce((a, p) => a + (p.wage || 0), 0);
  const t = (s.trend ??= []);
  t.push({ season: s.season, week: s.week, inc: earnedIncome(l), wages });
  if (t.length > CAP + 1) t.splice(0, t.length - CAP - 1);
  const v = (s.valueHist ??= {}), keep = new Set(squad.map((p) => p.id));
  for (const id of Object.keys(v)) if (!keep.has(id)) delete v[id];
  for (const p of squad) { const h = (v[p.id] ??= []); h.push(p.price); if (h.length > CAP) h.splice(0, h.length - CAP); }
}

/** Weekly income vs wages (income = difference of cumulative season income). */
export function wagesVsIncome(s: GameState) {
  const t = s.trend ?? [], out: { label: string; income: number; wages: number }[] = [];
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1]!, b = t[i]!;
    const inc = a.season === b.season ? b.inc - a.inc : b.inc;
    out.push({ label: `S${b.season} W${b.week}`, income: Math.max(0, Math.round(inc)), wages: b.wages });
  }
  return out;
}
export const valueTrend = (s: GameState, id: string) => s.valueHist?.[id] ?? [];
