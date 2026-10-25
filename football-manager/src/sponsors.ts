// Sponsor deals: pick one of three offers each season — steady money, a target bonus, or a trophy bonus.
import type { GameState } from './game.ts';
import { club, copy } from './game.ts';
import { level } from './difficulty.ts';
import { league } from './world.ts';
import { book } from './finance.ts';

export type SponsorKind = 'fixed' | 'target' | 'trophy';
export type Sponsor = { id: string; name: string; kind: SponsorKind; weekly: number; bonus: number; season: number };
const BRANDS = ['Northwind Air', 'Kestrel Bank', 'Bluefin Mobile', 'Orchard Cola', 'Meridian Motors', 'Harbour Energy', 'Copperline Tech', 'Summit Insurance', 'Lantern Bet-Free Games', 'Riverstone Foods', 'Atlas Freight', 'Nimbus Cloud'];
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const base = (s: GameState) => Math.round((league(club(s).division).tier === 1 ? 28 : 18) * level(s).money + s.fans * 0.2);
export function sponsorOffers(s: GameState): Sponsor[] {
  const h = hash(`${s.seed}|${s.season}|${s.clubId}`), b = base(s);
  const name = (i: number) => BRANDS[(h + i * 5) % BRANDS.length]!;
  return [
    { id: `sp${s.season}a`, name: name(0), kind: 'fixed', weekly: b, bonus: 0, season: s.season },
    { id: `sp${s.season}b`, name: name(1), kind: 'target', weekly: Math.round(b * 0.45), bonus: Math.round(b * 18), season: s.season },
    { id: `sp${s.season}c`, name: name(2), kind: 'trophy', weekly: Math.round(b * 0.3), bonus: Math.round(b * 32), season: s.season },
  ];
}
export const SPONSOR_TERMS: Record<SponsorKind, string> = { fixed: 'Steady money every week', target: 'Bonus if you meet the board target', trophy: 'Big bonus if you win any trophy' };
export const sponsorDeal = (s: GameState) => (s.sponsor?.season === s.season ? s.sponsor : undefined);
export function signSponsor(s: GameState, id: string): GameState {
  if (s.match || sponsorDeal(s)) return s;
  const o = sponsorOffers(s).find((x) => x.id === id);
  if (!o) return s;
  const b = copy(s);
  b.sponsor = o;
  b.headlines = [`🤝 ${o.name} sign as shirt sponsor: £${o.weekly}k a week${o.bonus ? ` + £${o.bonus}k bonus` : ''}.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Weekly payment (call once per matchweek). */
export function paySponsor(s: GameState) {
  const d = sponsorDeal(s);
  if (!d) return 0;
  s.budget += d.weekly;
  book(s, 'sponsor', d.weekly);
  return d.weekly;
}
/** Season end: pay the bonus if earned. */
export function settleSponsor(s: GameState, pos: number, outcome: string) {
  const d = sponsorDeal(s);
  if (!d || !d.bonus) return;
  const won = d.kind === 'target' ? pos <= (s.board?.target ?? pos) || outcome === 'Promoted' || outcome === 'Champions'
    : (s.trophies ?? []).some((t) => t.season === s.season);
  if (!won) { s.headlines = [`📉 ${d.name} bonus missed.`, ...s.headlines].slice(0, 6); return; }
  s.budget += d.bonus;
  book(s, 'sponsor', d.bonus);
  s.headlines = [`💰 ${d.name} pay a £${d.bonus}k bonus!`, ...s.headlines].slice(0, 6);
}
export const validSponsor = (v: unknown) => v === undefined || (!!v && typeof v === 'object' && typeof (v as Sponsor).id === 'string' && typeof (v as Sponsor).name === 'string' && ['fixed', 'target', 'trophy'].includes((v as Sponsor).kind) && [(v as Sponsor).weekly, (v as Sponsor).bonus, (v as Sponsor).season].every(Number.isFinite));
