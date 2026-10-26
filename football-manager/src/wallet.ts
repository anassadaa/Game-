// Personal finances: wallet, salary, dividends, shares and cash injections. Pure arithmetic, no randomness.
import { clubEV } from './valuation.ts';
import type { GameState } from './game.ts';
import { clamp, club, copy, standings } from './game.ts';
import { wageBill } from './budget.ts';
import { league } from './world.ts';
import { book, earnedIncome, earnedCosts } from './finance.ts';
import { level } from './difficulty.ts';
import { marketClubs, quoteTrade, executeTrade, fundClub, repayClubLoan, clubDecision } from './investments.ts';

export type Policy = 'none' | 'low' | 'high';
export type WalletEntry = { season: number; week: number; kind: 'salary' | 'bonus' | 'dividend'; amount: number; reason: string };
export type ClubHolding = { stake: number; loan: number; investorStakes: number; investorRaised: number };
export type Wallet = { cash: number; stake: number; salary: number; dividends: number; loan: number; policy: Policy; base?: number; owed?: number; investorMood?: number; payV?: number; log?: WalletEntry[]; holdings?: Record<string, ClubHolding> };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const note = (s: GameState, e: Omit<WalletEntry, 'season' | 'week'>) => { const w = wallet(s); w.log = [{ season: s.season, week: s.week, ...e }, ...(w.log ?? [])].slice(0, 12); };
const mode = (s: GameState) => s.mode ?? 'manager';
const owns = (s: GameState) => mode(s) === 'chairman' || mode(s) === 'owner';
export const PAYOUT: Record<Policy, number> = { none: 0, low: 0.2, high: 0.5 };

export function wallet(s: GameState): Wallet {
  if (s.wallet) return s.wallet;
  const r = club(s).rating, m = mode(s);
  const cash = Math.round((m === 'manager' ? 1 : m === 'director' ? 4 : 20) * r * level(s).money);
  return (s.wallet = { cash, stake: owns(s) ? 100 - (s.investor?.stakes ?? 0) : 0, salary: 0, dividends: 0, loan: 0, policy: 'low', payV: 1 });
}
/** Owners hold whatever investors don't; directors/managers hold what they bought. */
export function myStake(s: GameState) { const w = wallet(s); return owns(s) ? Math.max(0, 100 - (s.investor?.stakes ?? 0)) : w.stake; }
/**
 * 3.8: executive pay, researched against real club accounts (2024/25): the top director takes ~0.4–1.1% of revenue
 * and 1–3% of the wage bill at big clubs (Levy £5.8m at Spurs), a larger share of the wage bill at small clubs.
 * Our target: a revenue share + a wage-bill share + club and squad value terms, scaled by role, league tier/strength,
 * team quality, league position vs target, form and profit. £k per week.
 */
export type PayPart = { label: string; value: number };
export function execPay(s: GameState, pos?: number): { target: number; parts: PayPart[] } {
  const m = mode(s), c = club(s), lg = league(c.division), parts: PayPart[] = [];
  const legacy = Math.max(1, Math.round((m === 'director' ? c.rating * 0.15 : m === 'manager' ? c.rating * 0.12 : c.rating * 0.06) * level(s).money));
  if (m === 'manager') return { target: legacy, parts: [{ label: 'Stature of the club', value: legacy }] };
  const l = s.ledger, seasonInc = l?.prev?.income ?? (l && s.week > 2 ? earnedIncome(l) / s.week * 18 : c.rating * 35 * 18 / 10);
  const revWk = Math.max(0, seasonInc / 18), wages = wageBill(s);
  let val = 0; try { val = valuation(s); } catch { val = 0; }
  const mv = s.players.filter((p) => p.clubId === s.clubId).reduce((a, p) => a + (p.price || 0), 0);
  const add = (label: string, v: number) => parts.push({ label, value: Math.round(v * 10) / 10 });
  add(`Revenue share (£${Math.round(revWk)}k/wk revenue)`, revWk * 0.02);
  add(`Wage bill share (£${Math.round(wages)}k/wk)`, wages * 0.03);
  add(`Club value £${(val / 1000).toFixed(1)}m`, val * 0.0002);
  add(`Squad value £${(mv / 1000).toFixed(1)}m`, mv * 0.0006);
  const core = parts.reduce((a, p) => a + p.value, 0);
  const div = s.clubs.filter((x) => x.division === c.division), avg = div.reduce((a, x) => a + x.rating, 0) / Math.max(1, div.length);
  const table = standings(s).filter((x) => x.division === c.division);
  const here = pos ?? (table.findIndex((x) => x.id === c.id) + 1 || Math.ceil(div.length / 2)), tgt = s.board?.target ?? here;
  const f = c.form.slice(-5), fs = f.reduce((a, r) => a + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0);
  const profit = l ? (l.prev ? l.prev.income - l.prev.costs : earnedIncome(l) - earnedCosts(l)) : 0;
  const mults: [string, number][] = [
    [m === 'owner' ? 'Role: owner & executive chair' : m === 'chairman' ? 'Role: chairman' : 'Role: director', m === 'owner' ? 1 : m === 'chairman' ? 0.9 : 0.8],
    [`League: ${lg.name} (tier ${lg.tier}), strength ${Math.round(avg)}`, (lg.tier === 1 ? 1 : 0.8) * Math.max(0.8, Math.min(1.25, 0.85 + (avg - 60) / 80))],
    [`Team quality ${c.rating} vs league ${Math.round(avg)}`, Math.max(0.85, Math.min(1.2, 1 + (c.rating - avg) / 100))],
    [`League position ${here} vs target ${tgt}`, 1 + 0.04 * Math.max(-5, Math.min(5, tgt - here))],
    [`Form ${f.join('') || '—'}`, 1 + fs * 0.02],
    [profit >= 0 ? 'Club profit' : 'Club losses', profit > 0 ? 1.1 : profit < 0 ? 0.9 : 1],
  ];
  let t = core;
  for (const [label, k] of mults) { const before = t; t *= k; add(label, t - before); }
  return { target: Math.max(1, Math.round(t * level(s).money)), parts };
}
/** Pay target for the role (kept under its old name for callers). */
export function statureSalary(s: GameState) { return execPay(s).target; }
/** 3.8 save migration: owner/chairman/director pay is recalculated once from the new model. */
export function migratePay(s: GameState) {
  if (mode(s) === 'manager' || !s.wallet || s.wallet.payV === 1) return;
  const w = s.wallet, old = weeklySalary(s), t = execPay(s).target;
  w.payV = 1;
  if (t > old) { w.base = t; note(s, { kind: 'salary', amount: t - old, reason: `Pay recalculated for 3.8: £${old}k → £${t}k/wk (revenue, wages, club & squad value, league, role, position)` }); }
}
export function weeklySalary(s: GameState) { return s.wallet?.base ?? statureSalary(s); }
/**
 * Board salary review (every 4 weeks, and at season end with the outcome). Adaptive like FM:
 * league position vs target, profit/loss, net transfer value, fan mood, difficulty; season bonuses and cuts.
 */
export function salaryReview(s: GameState, pos: number, end?: { outcome: string; trophies: number }) {
  if (mode(s) === 'manager') return;
  const w = wallet(s), base = weeklySalary(s), stat = execPay(s, pos).target, why: string[] = [];
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
  // 3.8: close a third of the gap to the researched target each review, then apply the performance swing.
  const drift = base + (stat - base) * 0.35;
  if (Math.abs(stat - base) >= 1) why.unshift(`${stat > base ? 'toward' : 'back toward'} £${stat}k target (${execPay(s, pos).parts.slice(0, 2).map((p) => p.label.split(' (')[0].toLowerCase()).join(' + ')})`);
  const next = Math.max(Math.max(1, Math.round(stat * 0.5)), Math.min(Math.round(stat * 1.6), Math.round(drift * (1 + pct / 100))));
  w.base = next;
  const reason = why.join(', ') || 'steady';
  if (next !== base) note(s, { kind: 'salary', amount: next - base, reason: `${end ? 'Season review' : 'Board review'}: £${base}k → £${next}k/wk (${reason})` });
  if (bonus > 0) { if (payMe(s, bonus)) note(s, { kind: 'bonus', amount: bonus, reason: `Bonus: ${reason}` }); else note(s, { kind: 'bonus', amount: 0, reason: `Bonus of £${bonus}k deferred: the club is in the red` }); }
}
/** 3.2: you never draw pay from an overdrawn club. If paying would take the bank negative it is deferred (owed) instead. */
function payMe(s: GameState, amount: number) {
  const w = wallet(s); if (amount <= 0) return true;
  if (s.budget - amount < 0) { w.owed = (w.owed ?? 0) + amount; return false; }
  w.cash += amount; w.salary += amount; s.budget -= amount; book(s, 'wages', amount); return true;
}
export function walletWeek(s: GameState) {
  const w = wallet(s), pay = weeklySalary(s);
  if (!payMe(s, pay)) return;
  // Back pay once the club has recovered: at most half the cash in the bank each week.
  if (w.owed && s.budget > 0) { const back = Math.min(w.owed, Math.floor(s.budget / 2)); if (back > 0) { w.owed -= back; w.cash += back; w.salary += back; s.budget -= back; book(s, 'wages', back); if (!w.owed) { delete w.owed; note(s, { kind: 'salary', amount: back, reason: 'Deferred pay cleared: the club is back in the black' }); } } }
}
/** Club value: ~1.5x last season's income (or a stature estimate) plus a stature premium; top tier is worth more. */
export function valuation(s: GameState) {
  if (s.investments) return marketClubs(s).find(c => c.id === s.clubId)!.value;
  const c = club(s);
  if (s.ledger) { const f = s.facilities ?? { training: 1, medical: 1, stadium: 1 }; return Math.max(100, Math.round((clubEV(s, c, { ledger: s.ledger, fans: s.fans, stadium: f.stadium, academy: 1, scouting: 1, quality: 50, facilities: f }).ev + s.budget) * level(s).money)); }
  const inc = c.rating * 35;
  return Math.round((inc * 1.5 + c.rating * 40) * (c.division === 1 ? 1.4 : 1) * level(s).money);
}
export const sharePrice = (s: GameState) => Math.max(1, Math.round(valuation(s) / 100));
export function available(s: GameState) {
  if (s.investments) return marketClubs(s).find(c => c.id === s.clubId)!.available;
  const inv = s.investor?.stakes ?? 0;
  if (owns(s)) return inv;
  if (mode(s) === 'director') return Math.max(0, Math.min(25 - wallet(s).stake, 100 - inv - wallet(s).stake));
  return 0;
}
export function buyShares(s: GameState, pct: number): GameState {
  if (s.investments) return executeTrade(s, quoteTrade(s, s.clubId, 'buy', pct));
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
  if (s.investments) return executeTrade(s, quoteTrade(s, s.clubId, 'sell', pct));
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
  if (s.investments) return fundClub(s, s.clubId, amount, kind);
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
  if (s.investments) return repayClubLoan(s, s.clubId);
  const w = wallet(s); if (s.match || !w.loan || s.budget < w.loan) return s;
  const b = copy(s), bw = wallet(b), amt = bw.loan;
  b.budget -= amt; book(b, 'capital', amt); bw.cash += amt; bw.loan = 0;
  return b;
}
export function setPolicy(s: GameState, policy: Policy): GameState {
  if (s.investments) return clubDecision(s, s.clubId, 'dividend', policy);
  if (s.match || !['none', 'low', 'high'].includes(policy)) return s;
  const b = copy(s); wallet(b).policy = policy; return b;
}
/** Season end (after closeLedger): pay a share of last season's profit to all shareholders, pro rata. */
export function dividendSeason(s: GameState) {
  if (mode(s) === 'manager' && myStake(s) === 0) return;
  const w = wallet(s), prev = s.ledger?.prev; if (!prev) return;
  const business = s.investments?.clubs[s.clubId];
  if (business && business.lastDividend >= prev.season) return;
  if (business) business.lastDividend = prev.season;
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
    w.cash += mine; w.dividends += mine; if (business) business.dividends += mine;
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
  if (w.payV !== undefined && w.payV !== 1) return false;
  if (w.owed !== undefined && (!Number.isFinite(w.owed) || w.owed < 0)) return false;
  if (w.log !== undefined && (!Array.isArray(w.log) || w.log.length > 12 || !w.log.every(e => e && Number.isInteger(e.season) && e.season >= 1 && e.season <= 1000 && Number.isInteger(e.week) && e.week >= 0 && e.week <= 18 && ['salary', 'bonus', 'dividend'].includes(e.kind) && Number.isFinite(e.amount) && Math.abs(e.amount) <= 1e9 && typeof e.reason === 'string' && e.reason.length <= 500))) return false;
  if (w.holdings !== undefined && (!w.holdings || typeof w.holdings !== 'object' || Array.isArray(w.holdings) || Object.keys(w.holdings).length > 300 || !Object.entries(w.holdings).every(([id, h]) => id.length > 0 && id.length < 100 && !['__proto__', 'constructor', 'prototype'].includes(id) && h && pct(h.stake) && money(h.loan) && pct(h.investorStakes) && h.stake + h.investorStakes <= 100 && money(h.investorRaised)))) return false;
  return true;
}
