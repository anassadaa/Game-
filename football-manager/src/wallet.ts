// Personal finances: wallet, salary, dividends, shares and cash injections. Pure arithmetic, no randomness.
import type { GameState } from './game.ts';
import { clamp, club, copy } from './game.ts';
import { book, earnedIncome, earnedCosts } from './finance.ts';
import { level } from './difficulty.ts';

export type Policy = 'none' | 'low' | 'high';
export type WalletEntry = { season: number; week: number; kind: 'salary' | 'bonus' | 'dividend'; amount: number; reason: string };
export type ClubHolding = { stake: number; loan: number; investorStakes: number; investorRaised: number };
export type Wallet = { cash: number; stake: number; salary: number; dividends: number; loan: number; policy: Policy; base?: number; investorMood?: number; log?: WalletEntry[]; holdings?: Record<string, ClubHolding> };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const note = (s: GameState, e: Omit<WalletEntry, 'season' | 'week'>) => { const w = wallet(s); w.log = [{ season: s.season, week: s.week, ...e }, ...(w.log ?? [])].slice(0, 12); };
const mode = (s: GameState) => s.mode ?? 'manager';
const owns = (s: GameState) => mode(s) === 'chairman' || mode(s) === 'owner';
export const PAYOUT: Record<Policy, number> = { none: 0, low: 0.2, high: 0.5 };

export function wallet(s: GameState): Wallet {
  if (s.wallet) return s.wallet;
  const r = club(s).rating, m = mode(s);
  const cash = Math.round((m === 'manager' ? 1 : m === 'director' ? 4 : 20) * r * level(s).money);
  return (s.wallet = { cash, stake: owns(s) ? 100 - (s.investor?.stakes ?? 0) : 0, salary: 0, dividends: 0, loan: 0, policy: 'low' });
}
/** Owners hold whatever investors don't; directors/managers hold what they bought. */
export function myStake(s: GameState) { const w = wallet(s); return owns(s) ? Math.max(0, 100 - (s.investor?.stakes ?? 0)) : w.stake; }
/** Stature base: what the role is worth at this club before any board review. */
export function statureSalary(s: GameState) {
  const r = club(s).rating, m = mode(s);
  return Math.max(1, Math.round((m === 'director' ? r * 0.15 : m === 'manager' ? r * 0.12 : r * 0.06) * level(s).money));
}
export function weeklySalary(s: GameState) { return s.wallet?.base ?? statureSalary(s); }
/**
 * Board salary review (every 4 weeks, and at season end with the outcome). Adaptive like FM:
 * league position vs target, profit/loss, net transfer value, fan mood, difficulty; season bonuses and cuts.
 */
export function salaryReview(s: GameState, pos: number, end?: { outcome: string; trophies: number }) {
  if (mode(s) === 'manager') return;
  const w = wallet(s), base = weeklySalary(s), stat = statureSalary(s), why: string[] = [];
  const l = end ? s.ledger?.prev : s.ledger && { income: earnedIncome(s.ledger), costs: earnedCosts(s.ledger) };
  const profit = l ? l.income - l.costs : 0;
  const net = end ? (s.ledger?.prev?.transferNet ?? 0) : s.ledger ? s.ledger.inc.sales - s.ledger.out.signings : 0;
  let pct = 0;
  const tgt = s.board?.target ?? pos, d = Math.max(-4, Math.min(4, tgt - pos));
  if (d) { pct += d * 1.5; why.push(d > 0 ? `${pos} vs target ${tgt} ✓` : `${pos} vs target ${tgt} ✗`); }
  if (profit > 0) { pct += 2; why.push('profit'); } else if (profit < 0) { pct -= 2; why.push('losses'); }
  if (net > 0) { pct += 1.5; why.push('transfer profit'); } else if (net < -stat * 20) { pct -= 1; why.push('big net spend'); }
  const f = Math.round((s.fans - 50) / 10); if (f) { pct += f; why.push(f > 0 ? 'happy fans' : 'unhappy fans'); }
  pct += (hash(`${s.seed}|sal|${s.season}|${s.week}|${end ? 1 : 0}`) % 3) - 1;
  let bonus = 0;
  if (end) {
    if (end.outcome === 'Promoted' || end.outcome === 'Champions') { pct += 10; bonus += base * 8; why.push(end.outcome.toLowerCase()); }
    if (end.outcome === 'Relegated') { pct -= 15; why.push('relegated'); }
    if (end.trophies) { bonus += base * 6 * end.trophies; why.push(`${end.trophies} trophy`); }
    if (net > 0 && profit > 0) { bonus += base * 4; why.push('profitable sales'); }
  }
  pct *= pct > 0 ? level(s).money : 2 - level(s).money;
  const next = Math.max(Math.max(1, Math.round(stat * 0.5)), Math.min(Math.round(stat * 3), Math.round(base * (1 + pct / 100))));
  w.base = next;
  const reason = why.join(', ') || 'steady';
  if (next !== base) note(s, { kind: 'salary', amount: next - base, reason: `${end ? 'Season review' : 'Board review'}: £${base}k → £${next}k/wk (${reason})` });
  if (bonus > 0) { s.budget -= bonus; book(s, 'wages', bonus); w.cash += bonus; w.salary += bonus; note(s, { kind: 'bonus', amount: bonus, reason: `Bonus: ${reason}` }); }
}
export function walletWeek(s: GameState) {
  const w = wallet(s), pay = weeklySalary(s);
  w.cash += pay; w.salary += pay; s.budget -= pay; book(s, 'wages', pay);
}
/** Club value: ~1.5x last season's income (or a stature estimate) plus a stature premium; top tier is worth more. */
export function valuation(s: GameState) {
  const c = club(s), inc = s.ledger?.prev?.income ?? c.rating * 35;
  return Math.round((inc * 1.5 + c.rating * 40) * (c.division === 1 ? 1.4 : 1) * level(s).money);
}
export const sharePrice = (s: GameState) => Math.max(1, Math.round(valuation(s) / 100));
export function available(s: GameState) {
  const inv = s.investor?.stakes ?? 0;
  if (owns(s)) return inv;
  if (mode(s) === 'director') return Math.max(0, Math.min(25 - wallet(s).stake, 100 - inv - wallet(s).stake));
  return 0;
}
export function buyShares(s: GameState, pct: number): GameState {
  if (s.match || !Number.isInteger(pct) || pct <= 0 || pct > available(s)) return s;
  const cost = sharePrice(s) * pct; if (wallet(s).cash < cost) return s;
  const b = copy(s), w = wallet(b);
  w.cash -= cost;
  if (owns(b)) b.investor!.stakes -= pct; else w.stake += pct;
  if (b.investor) delete b.investor.offer;
  b.headlines = [`📈 You buy ${pct}% for £${cost}k. You now own ${myStake(b)}%.`, ...b.headlines].slice(0, 6);
  return b;
}
export function sellShares(s: GameState, pct: number): GameState {
  if (s.match || !Number.isInteger(pct) || pct <= 0 || pct > myStake(s) || mode(s) === 'manager') return s;
  const b = copy(s), w = wallet(b), get = Math.round(sharePrice(b) * pct * 0.9);
  w.cash += get;
  if (owns(b)) { b.investor ??= { stakes: 0, raised: 0 }; b.investor.stakes += pct; } else w.stake -= pct;
  if (b.investor) delete b.investor.offer;
  b.headlines = [`📉 You sell ${pct}% for £${get}k. You now own ${myStake(b)}%.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Put personal money into the club: a loan (repayable) or equity (dilutes investors / raises your stake). */
export function injectCash(s: GameState, amount: number, kind: 'loan' | 'equity'): GameState {
  if (s.match || !Number.isSafeInteger(amount) || amount <= 0 || !['loan', 'equity'].includes(kind) || wallet(s).cash < amount || mode(s) === 'manager') return s;
  const b = copy(s), w = wallet(b), val = valuation(b);
  w.cash -= amount; b.budget += amount; book(b, 'funding', amount);
  if (kind === 'loan') w.loan += amount;
  else if (owns(b)) { if (b.investor) b.investor.stakes = Math.round((b.investor.stakes * val) / (val + amount)); }
  else {
    w.stake = Math.round((w.stake * val + amount * 100) / (val + amount));
    if (b.investor) b.investor.stakes = Math.min(100 - w.stake, Math.round(b.investor.stakes * val / (val + amount)));
  }
  if (kind === 'equity' && b.investor) delete b.investor.offer;
  b.headlines = [`💷 You put £${amount}k into the club as ${kind === 'loan' ? 'a loan' : 'equity'}.`, ...b.headlines].slice(0, 6);
  return b;
}
export function repayLoan(s: GameState): GameState {
  const w = wallet(s); if (s.match || !w.loan || s.budget < w.loan) return s;
  const b = copy(s), bw = wallet(b), amt = bw.loan;
  b.budget -= amt; book(b, 'capital', amt); bw.cash += amt; bw.loan = 0;
  return b;
}
export function setPolicy(s: GameState, policy: Policy): GameState {
  if (s.match || !['none', 'low', 'high'].includes(policy)) return s;
  const b = copy(s); wallet(b).policy = policy; return b;
}
/** Season end (after closeLedger): pay a share of last season's profit to all shareholders, pro rata. */
export function dividendSeason(s: GameState) {
  if (mode(s) === 'manager') return;
  const w = wallet(s), prev = s.ledger?.prev; if (!prev) return;
  const profit = prev.income - prev.costs, inv = s.investor?.stakes ?? 0;
  let total = profit > 0 ? Math.round(profit * PAYOUT[w.policy]) : 0, capped = false;
  const floor = Math.round(valuation(s) * 0.03), room = Math.max(0, s.budget - floor);
  if (total > room) { total = room; capped = true; }
  const mood = (w.investorMood ??= 50);
  w.investorMood = clamp(mood + (profit <= 0 ? -3 : capped ? -4 : w.policy === 'high' ? 10 : w.policy === 'low' ? 3 : -8));
  if (profit <= 0) note(s, { kind: 'dividend', amount: 0, reason: `No dividend: club made a £${-profit}k loss` });
  else if (total <= 0) note(s, { kind: 'dividend', amount: 0, reason: capped ? 'Board blocked the dividend: bank too low / in debt' : 'Policy: no dividend' });
  if (total > 0) {
    const mine = Math.round((total * myStake(s)) / 100);
    s.budget -= total; book(s, 'capital', total);
    w.cash += mine; w.dividends += mine;
    note(s, { kind: 'dividend', amount: mine, reason: `£${total}k paid (${PAYOUT[w.policy] * 100}% of £${profit}k profit${capped ? ', capped by board' : ''}), you own ${myStake(s)}%` });
    s.headlines = [`💰 Dividend: £${total}k paid out, £${mine}k to you (${myStake(s)}%).`, ...s.headlines].slice(0, 6);
  }
  if (inv > 0) s.trust = clamp(s.trust + (w.policy === 'high' ? 3 : w.policy === 'none' ? -3 : 0) + (w.investorMood < 30 ? -2 : 0));
}
/** A job appointment never transfers shares or the previous club's liabilities. */
export function moveWallet(s: GameState, nextClubId: string) {
  const w = wallet(s);
  w.holdings ??= {};
  w.holdings[s.clubId] = { stake: myStake(s), loan: w.loan, investorStakes: s.investor?.stakes ?? 0, investorRaised: s.investor?.raised ?? 0 };
  const next = w.holdings[nextClubId];
  w.stake = next?.stake ?? 0; w.loan = next?.loan ?? 0;
  delete w.holdings[nextClubId];
  delete w.base; delete w.investorMood;
  delete s.investor; delete s.hiredManager;
  if (next && (next.investorStakes || next.investorRaised)) s.investor = { stakes: next.investorStakes, raised: next.investorRaised };
  // An owner accepting an employed role has not purchased the destination club.
  if (owns(s)) s.mode = 'director';
}

export function validWallet(s: Pick<GameState, 'wallet'>): boolean {
  const w = s.wallet;
  if (w === undefined) return true;
  const money = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e9;
  const pct = (n: unknown) => money(n) && (n as number) <= 100;
  if (!w || !['cash', 'salary', 'dividends', 'loan'].every(k => money(w[k as keyof Wallet])) || !pct(w.stake) || !['none', 'low', 'high'].includes(w.policy)) return false;
  if (w.base !== undefined && (!money(w.base) || w.base < 1)) return false;
  if (w.investorMood !== undefined && !pct(w.investorMood)) return false;
  if (w.log !== undefined && (!Array.isArray(w.log) || w.log.length > 12 || !w.log.every(e => e && Number.isInteger(e.season) && e.season >= 1 && e.season <= 1000 && Number.isInteger(e.week) && e.week >= 0 && e.week <= 18 && ['salary', 'bonus', 'dividend'].includes(e.kind) && Number.isFinite(e.amount) && Math.abs(e.amount) <= 1e9 && typeof e.reason === 'string' && e.reason.length <= 500))) return false;
  if (w.holdings !== undefined && (!w.holdings || typeof w.holdings !== 'object' || Array.isArray(w.holdings) || Object.keys(w.holdings).length > 300 || !Object.entries(w.holdings).every(([id, h]) => id.length > 0 && id.length < 100 && !['__proto__', 'constructor', 'prototype'].includes(id) && h && pct(h.stake) && money(h.loan) && pct(h.investorStakes) && h.stake + h.investorStakes <= 100 && money(h.investorRaised)))) return false;
  return true;
}
