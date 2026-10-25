// Investors (stake offers for Chairman/Director) and takeovers (Manager careers). Hash-based, never the shared RNG.
import type { GameState } from './game.ts';
import { clamp, copy } from './game.ts';
import { book } from './finance.ts';

export type InvestorOffer = { name: string; cash: number; stake: number; season: number };
export type Investor = { stakes: number; raised: number; offer?: InvestorOffer; takeover?: number };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const NAMES = ['Gulf Horizon Capital', 'Northstar Sports Group', 'Redwood Partners', 'Atlas Holdings', 'Meridian Ventures', 'Crescent Fund'];
const OWNERS = ['a US sports consortium', 'a Gulf investment fund', 'a local tech billionaire', 'a private equity group'];

export function investorWeek(s: GameState) {
  const mode = s.mode ?? 'manager';
  const inv = (s.investor ??= { stakes: 0, raised: 0 });
  if (inv.raised > 0 && s.week !== 10) { const div = Math.max(1, Math.round(inv.raised * 0.004)); s.budget -= div; book(s, 'running', div); }
  const h = hash(`${s.seed}|inv|${s.season}|${s.week}`);
  if (mode !== 'manager' && s.week === 10 && inv.stakes < 49 && !inv.offer && h % 2 === 0) {
    const stake = 10 + (h >>> 3) % 16;
    const cash = Math.round(Math.max(800, Math.abs(s.budget) * 0.25) * (stake / 15));
    inv.offer = { name: NAMES[(h >>> 8) % NAMES.length]!, cash, stake: Math.min(stake, 49 - inv.stakes), season: s.season };
    s.headlines = [`💼 ${inv.offer.name} offer £${cash}k for a ${inv.offer.stake}% stake.`, ...s.headlines].slice(0, 6);
  }
  if (inv.offer && inv.offer.season !== s.season) delete inv.offer;
  if (mode === 'manager' && s.week === 20 && inv.takeover === undefined && h % 5 === 0) {
    const cash = Math.round(Math.max(1500, Math.abs(s.budget) * 0.5));
    inv.takeover = s.season;
    s.budget += cash; book(s, 'other', cash);
    s.trust = clamp(s.trust - 5);
    if (s.board) s.board.target = Math.max(1, s.board.target - 1);
    s.headlines = [`🏦 Takeover! The club is bought by ${OWNERS[(h >>> 6) % OWNERS.length]}: £${cash}k to spend, but they expect a higher finish.`, ...s.headlines].slice(0, 6);
  }
}
export function acceptInvestment(s: GameState): GameState {
  const o = s.investor?.offer; if (!o) return s;
  const b = copy(s), inv = b.investor!;
  inv.stakes += o.stake; inv.raised += o.cash; delete inv.offer;
  b.budget += o.cash; book(b, 'other', o.cash);
  b.trust = clamp(b.trust + 3);
  b.headlines = [`🤝 ${o.name} buy ${o.stake}%: £${o.cash}k in, dividends out each week.`, ...b.headlines].slice(0, 6);
  return b;
}
export function declineInvestment(s: GameState): GameState {
  if (!s.investor?.offer) return s;
  const b = copy(s); delete b.investor!.offer; return b;
}
export const validInvestor = (s: Pick<GameState, 'investor'>) =>
  s.investor === undefined || (!!s.investor && Number.isFinite(s.investor.stakes) && Number.isFinite(s.investor.raised));
