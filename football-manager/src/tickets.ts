// Matchday tickets: price level and pre-season season tickets.
import type { GameState } from './game.ts';
import { copy } from './game.ts';
import { level } from './difficulty.ts';

export type Tickets = { price: number; st?: { season: number; discount: number; share: number; upfront: number } };
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
export const homeGate = (s: GameState) => Math.round((90 + Math.round(s.fans * 0.5)) * level(s).money * gateFactor(s) * (1 - ticketShare(s)));
export const fanSwing = (s: GameState) => lv(tickets(s).price).fans;
export function setTicketPrice(s: GameState, price: number): GameState {
  if (s.match || !TICKET_LEVELS.some((l) => l.id === price)) return s;
  const b = copy(s);
  b.tickets = { ...tickets(b), price };
  return b;
}
export const HOME_GAMES = 9;
export function seasonTicketQuote(s: GameState, discount: number) {
  const d = clampN(discount, 0, 30) / 100;
  const share = Math.round(clampN(0.15 + s.fans / 400 + d * 1.2, 0.1, 0.7) * 100) / 100;
  const perGame = (90 + Math.round(s.fans * 0.5)) * level(s).money * gateFactor(s);
  return { share, upfront: Math.round(perGame * share * HOME_GAMES * (1 - d)), fans: Math.round(d * 20) };
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
export const validTickets = (t: unknown) => t === undefined || (!!t && typeof t === 'object' && TICKET_LEVELS.some((l) => l.id === (t as Tickets).price) &&
  ((t as Tickets).st === undefined || [(t as Tickets).st!.season, (t as Tickets).st!.discount, (t as Tickets).st!.share, (t as Tickets).st!.upfront].every(Number.isFinite)));
