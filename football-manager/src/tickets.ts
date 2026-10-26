// Matchday tickets: price level and pre-season season tickets.
import type { Club, GameState } from './game.ts';
import { club, copy, homeFixture, opponent, standings } from './game.ts';
import { level } from './difficulty.ts';
import { league } from './world.ts';
import { facilities } from './facilities.ts';
import { isDerby } from './derby.ts';

export type Tickets = { price: number; auto?: boolean; st?: { season: number; discount: number; share: number; upfront: number } };
export const TICKET_LEVELS = [
  { id: 1, label: 'Bargain', mult: 0.7, fans: 2 },
  { id: 2, label: 'Cheap', mult: 0.85, fans: 1 },
  { id: 3, label: 'Normal', mult: 1, fans: 0 },
  { id: 4, label: 'Pricey', mult: 1.25, fans: -1 },
  { id: 5, label: 'Premium', mult: 1.5, fans: -2 },
];
export const ST_DISCOUNTS = [0, 10, 20, 30];
const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const tickets = (s: GameState): Tickets => s.tickets ?? { price: 3 };
const lv = (p: number) => TICKET_LEVELS[clampN(Math.round(p), 1, 5) - 1]!;
/** Share of seats filled, 0.3–1: fans and price decide. */
export const attendanceAt = (fans: number, price: number) => clampN(0.55 + fans / 220 - (price - 3) * 0.13, 0.3, 1);
export const attendance = (s: GameState) => attendanceAt(s.fans, tickets(s).price);
/** Gate multiplier vs normal pricing (1 at Normal). */
export const gateFactor = (s: GameState) => {
  const p = tickets(s).price;
  return Math.round(((lv(p).mult * attendanceAt(s.fans, p)) / attendanceAt(s.fans, 3)) * 1000) / 1000;
};
/** Share of each home gate already paid for by season-ticket holders this season. */
export const ticketShare = (s: GameState) => (tickets(s).st?.season === s.season ? tickets(s).st!.share : 0);
/** Home gate for one match (before the stadium bonus). */
export const homeGate = (s: GameState, ctx: MatchCtx = {}) => matchDemand(s, ctx).gate;
export const fanSwing = (s: GameState) => lv(priceThisMatch(s)).fans;
export function setTicketPrice(s: GameState, price: number): GameState {
  if (s.match || !TICKET_LEVELS.some((l) => l.id === price)) return s;
  const b = copy(s);
  b.tickets = { ...tickets(b), price }; delete b.tickets.auto;
  return b;
}
export const HOME_GAMES = 9;
export function seasonTicketQuote(s: GameState, discount: number) {
  const d = clampN(discount, 0, 30) / 100;
  const c = club(s), tier = league(c.division).tier, city = citySize(s, c), price = lv(tickets(s).auto ? 3 : tickets(s).price);
  const reasons = [`Fans ${s.fans}`, cityLabel(city), tier === 1 ? 'Top flight' : `Tier ${tier}`, ...(d ? [`${d * 100}% off`] : []), ...(price.mult > 1 ? ['Dear base price'] : price.mult < 1 ? ['Cheap base price'] : [])];
  const share = Math.round(clampN(0.12 + s.fans / 400 + d * 1.2 + (city - 1) * 0.2 + (tier === 1 ? 0.06 : 0) - (price.mult - 1) * 0.2, 0.1, 0.7) * 100) / 100;
  const cap = capacity(s), perSeat = 13 * price.mult * (tier === 1 ? 1.25 : 1) * level(s).money / 1000;
  return { share, upfront: Math.round(cap * share * perSeat * HOME_GAMES * (1 - d)), fans: Math.round(d * 20), reasons };
}
export const canSellSeasonTickets = (s: GameState) => (s.match ? 'Not during a match' : s.week !== 0 ? 'Season tickets go on sale in pre-season' : tickets(s).st?.season === s.season ? 'Already on sale this season' : null);
export function sellSeasonTickets(s: GameState, discount: number): GameState {
  if (canSellSeasonTickets(s) || !ST_DISCOUNTS.includes(discount)) return s;
  const b = copy(s), q = seasonTicketQuote(b, discount);
  b.tickets = { ...tickets(b), st: { season: b.season, discount, share: q.share, upfront: q.upfront } };
  b.budget += q.upfront;
  b.fans = Math.max(0, Math.min(100, b.fans + q.fans));
  b.headlines = [`🎟️ Season tickets sold: ${Math.round(q.share * 100)}% of seats, £${q.upfront}k up front.`, ...b.headlines].slice(0, 6);
  return b;
}
export const validTickets = (t: unknown) => t === undefined || (!!t && typeof t === 'object' && ((t as Tickets).auto === undefined || typeof (t as Tickets).auto === 'boolean') && TICKET_LEVELS.some((l) => l.id === (t as Tickets).price) &&
  ((t as Tickets).st === undefined || [(t as Tickets).st!.season, (t as Tickets).st!.discount, (t as Tickets).st!.share, (t as Tickets).st!.upfront].every(Number.isFinite)));

// ---------- 3.9: match-by-match demand (see docs/ticket-research.md) ----------
const hashN = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
/** City size, fixed per club: 0.75 (small town) … 1.35 (big city). */
export const citySize = (s: GameState, c: Club = club(s)) => Math.round((0.75 + hashN(`${s.seed}|city|${c.id}`) * 0.6) * 100) / 100;
export const cityLabel = (x: number) => (x >= 1.2 ? 'Big city' : x >= 0.95 ? 'Mid-sized city' : 'Small town');
/** Seats, from stadium level, tier and city — replaces the flat stadium bonus. */
export function capacity(s: GameState) {
  const c = club(s), tier = league(c.division).tier;
  return Math.round(((tier === 1 ? 22000 : 12000) + (facilities(s).stadium - 1) * 7000) * (0.8 + citySize(s, c) * 0.2) / 100) * 100;
}
export type MatchCtx = { oppId?: string; cup?: boolean; week?: number };
export type Demand = { price: number; label: string; auto: boolean; by?: string; capacity: number; crowd: number; fill: number; soldOut: boolean; gate: number; weather: string; midweek: boolean; reasons: { label: string; pct: number }[] };
const ELASTICITY = 0.6; // research: football demand is price-inelastic (|e| ≈ 0.3–0.9)
/** Hash-based weather for a matchday: rain/cold cuts walk-up crowds, sun lifts them. */
export function weatherFor(s: GameState, week: number) {
  const x = hashN(`${s.seed}|weather|${s.season}|${week}`), winter = week >= 7 && week <= 12;
  if (x < (winter ? 0.35 : 0.2)) return { label: winter ? '🌧️ Cold rain' : '🌧️ Rain', pct: winter ? -9 : -6 };
  if (x > 0.8 && !winter) return { label: '☀️ Sunny', pct: 4 };
  return { label: winter ? '🌥️ Cold' : '⛅ Mild', pct: winter ? -2 : 0 };
}
/** Raw demand as a share of capacity before price, with reasons (each in %). */
function demandAt(s: GameState, ctx: MatchCtx = {}) {
  const me = club(s), week = ctx.week ?? s.week, opp = s.clubs.find((c) => c.id === ctx.oppId) ?? opponent(s);
  const table = standings(s).filter((c) => c.division === me.division), n = table.length, pos = table.findIndex((c) => c.id === me.id) + 1;
  const r: { label: string; pct: number }[] = [], add = (label: string, pct: number) => { if (Math.round(pct)) r.push({ label, pct: Math.round(pct) }); };
  const tier = league(me.division).tier, city = citySize(s, me);
  add(tier === 1 ? 'Top-flight football' : `Tier ${tier}`, tier === 1 ? 8 : -(tier - 2) * 6);
  add(cityLabel(city), (city - 1) * 40);
  add(`Fans ${s.fans >= 60 ? 'buoyant' : s.fans < 35 ? 'fed up' : 'steady'} (${s.fans})`, (s.fans - 50) * 0.5);
  add(`${opp.short} ${opp.rating >= me.rating + 5 ? '— big draw' : opp.rating <= me.rating - 8 ? '— low appeal' : ''}`.trim(), Math.max(-8, Math.min(14, (opp.rating - me.rating) * 0.9)));
  if (isDerby(s, opp.id)) add('Derby day', 25);
  if (week > 4 && pos) {
    if (pos <= 2) add('Title race', 12); else if (pos <= Math.max(3, Math.round(n * 0.3))) add('Chasing promotion/Europe', 6);
    else if (pos > n - 3) add('Relegation fight', week >= 13 ? 6 : -4);
    else add('Mid-table', -3);
  }
  const form = me.form.slice(-5), pts = form.reduce((a, x) => a + (x === 'W' ? 3 : x === 'D' ? 1 : 0), 0);
  if (form.length >= 3) add(`Form ${form.join('')}`, (pts / form.length - 1.4) * 6);
  const stars = s.players.filter((p) => p.clubId === s.clubId && p.rating >= me.rating + 8).length;
  if (stars) add(`${Math.min(3, stars)} star player${stars > 1 ? 's' : ''}`, Math.min(3, stars) * 3);
  const midweek = !!ctx.cup || hashN(`${s.seed}|midweek|${s.season}|${week}`) < 0.15;
  if (ctx.cup) add('Cup tie', -10);
  else if (midweek) add('Midweek kick-off', -7);
  const w = weatherFor(s, week); if (w.pct) add(w.label, w.pct);
  if (week <= 1) add('Opening-day buzz', 6); else if (week >= 16) add('Season run-in', pos && (pos <= 3 || pos > n - 3) ? 5 : -5);
  const base = 0.62 + r.reduce((a, x) => a + x.pct, 0) / 100;
  return { base: Math.max(0.15, base), reasons: r, weather: w.label, midweek };
}
/** Gate at a given price level for one match. Season-ticket holders are already paid for. */
function gateAt(s: GameState, price: number, d: ReturnType<typeof demandAt>) {
  const cap = capacity(s), m = lv(price).mult, want = d.base * Math.pow(m, -ELASTICITY);
  const st = ticketShare(s), fill = Math.min(1, Math.max(0.12, Math.max(st, want)));
  const crowd = Math.round(cap * fill), paying = Math.max(0, crowd - Math.round(cap * st));
  const yieldPer = 13 * m * (league(club(s).division).tier === 1 ? 1.25 : 1);
  return { cap, fill, crowd, gate: Math.round(paying * yieldPer / 1000 * level(s).money), soldOut: want >= 1 };
}
/** Auto pricing: the hired manager (if delegated) or the board picks the level that earns most, protecting
 *  the fans when they're unhappy (cheap seats) and never pricing out a sell-out. */
export function autoPrice(s: GameState, d = demandAt(s)) {
  const fanWeight = s.fans < 35 ? 18 : s.fans < 55 ? 8 : 3;
  let best = 3, bestV = -Infinity;
  for (const l of TICKET_LEVELS) { const g = gateAt(s, l.id, d), v = g.gate + l.fans * fanWeight; if (v > bestV) { bestV = v; best = l.id; } }
  return best;
}
const autoBy = (s: GameState) => ((s.mode ?? 'manager') !== 'manager' && s.hiredManager ? s.hiredManager.name : 'The board');
/** Expected crowd, fill and gate for the next home match (or a given one), with reasons. */
export function matchDemand(s: GameState, ctx: MatchCtx = {}): Demand {
  const d = demandAt(s, ctx), t = tickets(s), price = t.auto ? autoPrice(s, d) : t.price, g = gateAt(s, price, d);
  return { price, label: lv(price).label, auto: !!t.auto, by: t.auto ? autoBy(s) : undefined, capacity: g.cap, crowd: g.crowd, fill: Math.round(g.fill * 100) / 100, soldOut: g.soldOut, gate: g.gate, weather: d.weather, midweek: d.midweek, reasons: d.reasons };
}
export const priceThisMatch = (s: GameState) => (tickets(s).auto ? autoPrice(s) : tickets(s).price);
export function setAutoTickets(s: GameState, on: boolean): GameState {
  if (s.match) return s;
  const b = copy(s); b.tickets = { ...tickets(b), auto: on || undefined }; if (!on) delete b.tickets.auto;
  return b;
}
/** Is this week a home league match? */
export const homeThisWeek = (s: GameState) => homeFixture(s);
