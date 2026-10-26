// Club enterprise value by revenue multiple (Football Benchmark / KPMG method: EV ≈ 2–5x operating revenue
// for established clubs, adjusted for popularity, profitability, squad value, league/broadcast strength and stadium).
// Equity = EV + cash − debt − shareholder loans (EV = equity + debt − cash).
import type { Club, GameState } from './game.ts';
import { standings } from './game.ts';
import { earnedCosts, earnedIncome } from './finance.ts';
import type { Ledger } from './finance.ts';
import { league } from './world.ts';

export type Driver = { label: string; value: number };
type Biz = { ledger: Ledger; fans: number; stadium: number; academy: number; scouting: number; quality: number; facilities?: { training: number; medical: number; stadium: number } };
const cap = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

export function clubEV(s: GameState, c: Club, b: Biz): { ev: number; multiple: number; revenue: number; drivers: Driver[] } {
  const lg = league(c.division), tier = lg.tier;
  const revenue = Math.max(800, b.ledger.prev?.income ?? (tier === 1 ? 200 : 140) * 18 + c.rating * 12);
  const div = s.clubs.filter((x) => x.division === c.division);
  const avg = div.reduce((a, x) => a + x.rating, 0) / Math.max(1, div.length);
  const parts: { label: string; m: number }[] = [];
  const add = (label: string, m: number) => parts.push({ label, m: r2(m) });
  add(`${lg.name} (tier ${tier}) base multiple`, (tier === 1 ? 2.6 : 1.4) * cap(0.85 + (avg - 60) / 80, 0.75, 1.3));
  const table = standings(s).filter((x) => x.division === c.division), size = table.length;
  const played = c.played ?? 0, w = cap(played / 6, 0, 1);
  const pos = table.findIndex((x) => x.id === c.id) + 1;
  const ratingPos = [...div].sort((a, b) => b.rating - a.rating).findIndex((x) => x.id === c.id) + 1;
  const eff = w * pos + (1 - w) * ratingPos;
  add(`League position (${played ? `${pos}${['th', 'st', 'nd', 'rd'][pos % 10 < 4 && (pos % 100 < 11 || pos % 100 > 13) ? pos % 10 : 0]}` : 'expected ' + ratingPos})`, 0.5 * (0.5 - (eff - 1) / Math.max(1, size - 1)));
  if (eff > size - 3) add('Relegation risk', -0.35 * Math.max(w, 0.3));
  else if (tier > 1 && eff <= 2) add('Promotion chance', 0.3 * Math.max(w, 0.3));
  const sq = new Map<string, number>();
  for (const p of [...s.players, ...(s.rivals ?? [])]) if (p.clubId) sq.set(p.clubId, (sq.get(p.clubId) ?? 0) + (p.price || 0));
  const mv = sq.get(c.id) ?? 0, avgMv = div.reduce((a, x) => a + (sq.get(x.id) ?? 0), 0) / Math.max(1, div.length);
  add(`Squad market value £${mv >= 1000 ? `${(mv / 1000).toFixed(1)}m` : `${mv}k`}`, cap(Math.log2(Math.max(0.1, mv / Math.max(1, avgMv))) * 0.45, -0.6, 0.9));
  const fans = b.fans;
  add(`Fans & brand (${fans}/100)`, (fans - 50) / 100);
  const tro = (s.trophies ?? []).filter((t) => t.club === c.name && t.season >= s.season - 2).length;
  if (tro) add(`Trophies (${tro} in 3 seasons)`, Math.min(4, tro) * 0.12);
  const eu = s.euro?.alive?.includes(c.id) ? 0.35 : s.euro2?.alive?.includes(c.id) ? 0.18 : 0;
  if (eu) add(eu > 0.3 ? 'Champions Cup football' : 'Euro Trophy football', eu);
  const fac = b.facilities ?? { training: 1, medical: 1, stadium: b.stadium };
  add(`Stadium & facilities (lvl ${fac.stadium}/${fac.training}/${fac.medical})`, (fac.stadium - 1) * 0.08 + (fac.training + fac.medical + b.academy - 3) * 0.03);
  const f = (c.form ?? []).slice(-5), fs = f.reduce((a, r) => a + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0);
  add(`Form ${f.join('') || '—'}`, fs * 0.03);
  const profit = earnedIncome(b.ledger) - earnedCosts(b.ledger);
  add(profit >= 0 ? 'Profitable this season' : 'Loss-making this season', cap(profit / revenue * 0.8, -0.4, 0.3));
  const raw = r2(parts.reduce((a, p) => a + p.m, 0)), multiple = r2(cap(raw, tier === 1 ? 1.2 : 0.8, 6));
  if (multiple !== raw) add(multiple > raw ? 'Market floor for a league club' : 'Market ceiling', multiple - raw);
  const drivers = parts.map((p) => ({ label: p.label, value: Math.round(p.m * revenue) }));
  return { ev: Math.round(revenue * multiple), multiple, revenue: Math.round(revenue), drivers };
}
/** Weekly smoothing: a quarter of the gap closes each week (no single result swings the price). */
export const smoothEV = (old: number | undefined, target: number) => (old && old > 0 ? Math.round(old + (target - old) * 0.25) : target);
