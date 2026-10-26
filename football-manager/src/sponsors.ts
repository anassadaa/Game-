// Sponsor deals: pick one of three offers each season — steady money, a target bonus, or a trophy bonus.
import type { GameState } from './game.ts';
import { club, copy } from './game.ts';
import { level } from './difficulty.ts';
import { league } from './world.ts';
import { book } from './finance.ts';

export type SponsorKind = 'fixed' | 'target' | 'trophy';
export type Sponsor = { id: string; name: string; kind: SponsorKind; weekly: number; bonus: number; season: number; years?: number; clauses?: Clauses };
const BRANDS = ['Northwind Air', 'Kestrel Bank', 'Bluefin Mobile', 'Orchard Cola', 'Meridian Motors', 'Harbour Energy', 'Copperline Tech', 'Summit Insurance', 'Lantern Bet-Free Games', 'Riverstone Foods', 'Atlas Freight', 'Nimbus Cloud'];
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
export type Factor = { id: string; label: string; mult: number; note: string };
const clampN = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/**
 * What the shirt is worth this week. Real-world scale (2025/26): PL front-of-shirt deals run ~£3.5m–£67.5m,
 * Championship ~£0.25m–£2m, tier 2 is kept at ~40% of tier 1 here so lower-league careers stay playable. Europe, results, star power
 * and the fan base move valuations (The Sponsor fair-market values; Deloitte commercial revenue).
 */
export function sponsorValue(s: GameState): { weekly: number; factors: Factor[] } {
  const me = club(s), lg = league(me.division), div = s.clubs.filter((c) => c.division === me.division);
  const avg = div.reduce((a, c) => a + c.rating, 0) / Math.max(1, div.length);
  const f: Factor[] = [];
  const add = (id: string, label: string, mult: number, note: string) => f.push({ id, label, mult: Math.round(mult * 100) / 100, note });
  add('league', 'League', (lg.tier === 1 ? 1 : 0.4) * clampN(0.75 + (avg - 60) / 60, 0.8, 1.2), `${lg.name} · tier ${lg.tier}`);
  const table = [...div].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const now = me.played ? table.findIndex((c) => c.id === me.id) + 1 : 0;
  const last = s.history?.[0];
  const lastPos = last && last.division === me.division ? last.position : last ? (league(last.division).tier < lg.tier ? 1 : div.length) : 0;
  const pos = now && lastPos ? (now * Math.min(me.played, 19) + lastPos * (19 - Math.min(me.played, 19))) / 19 : now || lastPos || Math.ceil(div.length / 2);
  add('position', 'League position', 1.25 - 0.4 * ((pos - 1) / Math.max(1, div.length - 1)), `${now ? `${ord(now)} now` : 'no games yet'}${last ? ` · ${ord(last.position)} last season` : ''}`);
  const form = me.form.slice(-5), fs = form.reduce((a, r) => a + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0);
  add('form', 'Form', 1 + fs * 0.016, form.length ? form.join('') : '—');
  const tro = (s.trophies ?? []).filter((t) => t.club === me.name && t.season >= s.season - 2).length;
  add('trophies', 'Trophies (3 seasons)', 1 + Math.min(4, tro) * 0.06, `${tro}`);
  const rep = s.reputation ?? 50;
  add('reputation', 'Reputation', 0.8 + rep / 250, `${Math.round(rep)}/100`);
  add('fans', 'Fan base', 0.85 + s.fans / 333, `${s.fans}/100`);
  const st = s.facilities?.stadium ?? 1;
  add('stadium', 'Stadium', 1 + (st - 1) * 0.04, `level ${st}`);
  const stars = s.players.filter((p) => p.clubId === s.clubId && p.rating >= Math.max(80, avg + 12)).length;
  add('stars', 'Star players', 1 + Math.min(5, stars) * 0.04, `${stars}`);
  const eu = s.euro?.alive?.includes(s.clubId) ? 1.2 : s.euro2?.alive?.includes(s.clubId) ? 1.1 : 1;
  add('europe', 'European football', eu, eu > 1.15 ? 'Champions Cup' : eu > 1 ? 'Euro Trophy' : 'none');
  const m = f.reduce((a, x) => a * x.mult, 1);
  return { weekly: Math.max(3, Math.round(50 * level(s).money * m)), factors: f };
}
const ord = (n: number) => `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;
/** Weekly commercial income outside the shirt deal (merchandise, partners): fans × a share of the shirt value. */
export function commercialWeekly(s: GameState) {
  const v = sponsorValue(s).weekly / (50 * level(s).money);
  return Math.round(s.fans * 0.2 * level(s).money * clampN(0.75 + 0.5 * v, 0.6, 2));
}
const base = (s: GameState) => sponsorValue(s).weekly;
export type Clauses = { position: number; promotion: number; europe: number; relegationCut: number };
const KIND_F: Record<SponsorKind, number> = { fixed: 1, target: 0.45, trophy: 0.3 };
const g = (y: number) => 1 + 0.04 * (y - 1), u = (y: number) => 1.3 - 0.15 * (y - 1);
/** Offers for a deal of `years` seasons (1–5): longer = a bit more guaranteed each week, smaller bonuses, softer relegation cut. */
export function sponsorOffers(s: GameState, years = 1): Sponsor[] {
  const y = Math.max(1, Math.min(5, Math.round(years))), h = hash(`${s.seed}|${s.season}|${s.clubId}`), b = base(s);
  const name = (i: number) => BRANDS[(h + i * 5) % BRANDS.length]!;
  const clauses: Clauses = { position: Math.round(b * 4 * u(y)), promotion: Math.round(b * 10 * u(y)), europe: Math.round(b * 8 * u(y)), relegationCut: Math.round((0.5 - 0.075 * (y - 1)) * 100) / 100 };
  const mk = (i: number, kind: SponsorKind, bonus: number): Sponsor => ({ id: `sp${s.season}${y}${'abc'[i]}`, name: name(i), kind, weekly: Math.round(b * KIND_F[kind] * g(y)), bonus: Math.round(bonus * u(y)), season: s.season, years: y, clauses: { ...clauses } });
  return [mk(0, 'fixed', 0), mk(1, 'target', b * 18), mk(2, 'trophy', b * 32)];
}
export const SPONSOR_TERMS: Record<SponsorKind, string> = { fixed: 'Steady money every week', target: 'Bonus if you meet the board target', trophy: 'Big bonus if you win any trophy' };
export const sponsorDeal = (s: GameState) => { const d = s.sponsor; return d && s.season >= d.season && s.season < d.season + (d.years ?? 1) ? d : undefined; };
export const yearsLeft = (s: GameState) => { const d = sponsorDeal(s); return d ? d.season + (d.years ?? 1) - s.season : 0; };
const news = (s: GameState, t: string) => { s.headlines = [t, ...s.headlines].slice(0, 6); };
export function signSponsor(s: GameState, id: string, years = 1): GameState {
  if (s.match || sponsorDeal(s)) return s;
  const o = sponsorOffers(s, years).find((x) => x.id === id);
  if (!o) return s;
  const b = copy(s);
  b.sponsor = o;
  news(b, `🤝 ${o.name} sign as shirt sponsor for ${o.years} season${o.years === 1 ? '' : 's'}: £${o.weekly}k a week${o.bonus ? ` + £${o.bonus}k bonus` : ''}.`);
  return b;
}
/** Club buys its way out: 10 weeks of fees per season left. */
export const exitFee = (s: GameState) => { const d = sponsorDeal(s); return d ? Math.round(d.weekly * 10 * yearsLeft(s)) : 0; };
export function terminateSponsor(s: GameState): GameState {
  const d = sponsorDeal(s);
  if (s.match || !d) return s;
  const b = copy(s), fee = exitFee(s);
  b.budget -= fee; book(b, 'running', fee); delete b.sponsor;
  news(b, `✂️ Shirt deal with ${d.name} ended early: £${fee}k paid.`);
  return b;
}
const fair = (s: GameState, d: Sponsor) => Math.round(base(s) * KIND_F[d.kind] * g(d.years ?? 1));
/** The club has outgrown the deal when its market rate is 40%+ above what the sponsor pays. */
export const canRenegotiate = (s: GameState) => { const d = sponsorDeal(s); return !!d && fair(s, d) >= d.weekly * 1.4; };
export function renegotiateSponsor(s: GameState): GameState {
  if (s.match || !canRenegotiate(s)) return s;
  const b = copy(s), d = b.sponsor!, w = fair(b, d), left = yearsLeft(b);
  news(b, `📈 ${d.name} agree a new shirt fee: £${d.weekly}k → £${w}k a week (${left} season${left === 1 ? '' : 's'} left).`);
  d.weekly = w; d.season = b.season; d.years = left;
  return b;
}
/** Season end, after promotion/relegation: performance clauses, relegation cut or walk-out, promotion uplift. */
export function sponsorSeasonTurn(s: GameState, pos: number, outcome: string) {
  const d = sponsorDeal(s);
  if (!d?.clauses) return;
  const pay = (k: number, why: string) => { if (k > 0) { s.budget += k; book(s, 'sponsor', k); news(s, `💰 ${d.name}: £${k}k ${why} bonus.`); } };
  if (pos <= (s.board?.target ?? 0)) pay(d.clauses.position, 'league-position');
  if (outcome === 'Promoted') pay(d.clauses.promotion, 'promotion');
  if (s.euro?.alive?.includes(s.clubId) || s.euro2?.alive?.includes(s.clubId)) pay(d.clauses.europe, 'European');
  if (yearsLeft(s) <= 1) return;
  if (outcome === 'Relegated') {
    if (d.weekly > sponsorValue(s).weekly * 3) {
      const comp = Math.round(d.weekly * 6);
      s.budget += comp; book(s, 'sponsor', comp); delete s.sponsor;
      news(s, `🚪 ${d.name} use their relegation exit and pay £${comp}k compensation. Find a new shirt sponsor.`);
    } else {
      const w = Math.round(d.weekly * (1 - d.clauses.relegationCut));
      news(s, `📉 Relegation clause: ${d.name} cut the shirt fee £${d.weekly}k → £${w}k a week.`);
      d.weekly = w;
    }
  } else if (outcome === 'Promoted') {
    const w = Math.round(fair(s, d) * 0.9);
    if (w > d.weekly) { news(s, `📈 Promotion: ${d.name} renegotiate up, £${d.weekly}k → £${w}k a week.`); d.weekly = w; }
  }
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
export const validSponsor = (v: unknown) => v === undefined || (!!v && typeof v === 'object' && typeof (v as Sponsor).id === 'string' && typeof (v as Sponsor).name === 'string' && ['fixed', 'target', 'trophy'].includes((v as Sponsor).kind) && [(v as Sponsor).weekly, (v as Sponsor).bonus, (v as Sponsor).season].every(Number.isFinite) && ((v as Sponsor).years === undefined || [1, 2, 3, 4, 5].includes((v as Sponsor).years!)) && ((v as Sponsor).clauses === undefined || (!!(v as Sponsor).clauses && Object.values((v as Sponsor).clauses!).every(Number.isFinite))));
