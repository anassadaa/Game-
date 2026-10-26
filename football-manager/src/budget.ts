import type { GameState, Player } from './game.ts';
import { club, windowOpen } from './game.ts';
import { agentFee, ledger, seasonPayout, earnedIncome, earnedCosts } from './finance.ts';
import { level } from './difficulty.ts';
import { dofDiscount, staffWages } from './staff.ts';
import { maintenance } from './facilities.ts';
import { weeklySalary } from './wallet.ts';
import { investmentTransferBlock } from './investments.ts';
import { league } from './world.ts';

const ours = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
/** Total weekly wages of everyone registered to us (incl. loanees we pay). */
export const wageBill = (s: GameState) => ours(s).reduce((a, p) => a + (p.wage || 0), 0);
/** Stored board decision so the budget is smoothed instead of jumping. */
export type WageBudget = { limit: number; season: number; week: number; grace?: number; graceSeason?: number };
const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const SEASON_WEEKS = 18;
/** Projected weekly income with no history yet: TV + average gate + sponsors + share of the season payout. */
function projectedIncome(s: GameState) {
  const tier = league(club(s).division).tier, mult = level(s).money, fans = s.fans ?? 0;
  const tv = (tier === 1 ? 130 : 90) * mult;
  const gate = ((90 + fans * 0.5 + 35) / 2) * mult, sponsor = fans * 0.2 * mult;
  const pay = seasonPayout(tier, 10, 20, false);
  return tv + gate + sponsor + (pay.tv + pay.prize) / SEASON_WEEKS;
}
/** How the board derives the weekly wage budget from the club's books (FM-style). */
export function wageBreakdown(s: GameState) {
  const l = ledger({ ...s } as GameState); // never mutate state while reading
  const n = Math.min(SEASON_WEEKS, l.weeks.length);
  const prevInc = l.prev ? l.prev.income / SEASON_WEEKS : null, prevCost = l.prev ? l.prev.costs / SEASON_WEEKS : null;
  const baseInc = prevInc ?? projectedIncome(s), baseCost = prevCost ?? wageBill(s);
  // season-to-date figures take over as the season goes on
  // the central TV/prize payment lands at season end, so in-season income counts its expected weekly share
  const tier = league(club(s).division).tier, pay = seasonPayout(tier, 10, 20, false);
  const curInc = n ? earnedIncome(l) / n + (pay.tv + pay.prize) / SEASON_WEEKS : baseInc, curCost = n ? earnedCosts(l) / n : baseCost;
  const w = n >= 4 ? n / SEASON_WEEKS : 0;
  const incomeWk = Math.round(curInc * w + baseInc * (1 - w)), costsWk = Math.round(curCost * w + baseCost * (1 - w));
  const pnlWk = incomeWk - costsWk;
  const margin = incomeWk > 0 ? pnlWk / incomeWk : -1;
  const share = Math.round(clampN(0.62 + margin * 0.4, 0.55, 0.70) * 100) / 100;
  const cash = s.budget;
  const balance = Math.round((cash < 0 ? clampN(1 + (cash / Math.max(1, incomeWk * 10)) * 0.15, 0.85, 1) : clampN(1 + cash / Math.max(1, incomeWk * 52), 1, 1.2)) * 100) / 100;
  const difficulty = Math.round((0.85 + 0.15 * level(s).money) * 100) / 100;
  const target = Math.max(1, Math.round(incomeWk * share * balance * difficulty));
  return { incomeWk, costsWk, pnlWk, share, balance, difficulty, target, fromHistory: prevInc !== null || n >= 4, weeks: n };
}
export const wageTarget = (s: GameState) => wageBreakdown(s).target;
/** Board review (season start, every 4 weeks): move 40% toward target, max ±15% per review. */
export function refreshWageBudget(s: GameState, weight = 0.4) {
  const t = wageTarget(s), old = s.wageBudget?.limit;
  let limit = old === undefined ? Math.max(t, Math.round(wageBill(s) * 1.12))
    : Math.round(clampN(old + (t - old) * weight, old * 0.85, old * 1.15));
  // opening season: the board honours the wage bill you inherited
  const prev = s.wageBudget, grace = old === undefined ? limit : prev?.graceSeason === s.season ? prev.grace : undefined;
  if (grace !== undefined) limit = Math.max(limit, grace);
  s.wageBudget = { limit, season: s.season, week: s.week, ...(grace !== undefined ? { grace, graceSeason: s.season } : {}) };
  return s;
}
/** Board weekly wage limit: shown on screen and enforced for new signings by investmentTransferBlock. */
export const wageLimit = (s: GameState) => s.wageBudget?.limit ?? Math.max(wageTarget(s), Math.round(wageBill(s) * 1.05));
export const validWageBudget = (w: unknown) => w === undefined || (!!w && typeof w === 'object' && Number.isFinite((w as WageBudget).limit) && (w as WageBudget).limit > 0 && Number.isFinite((w as WageBudget).season) && Number.isFinite((w as WageBudget).week));
export const wageRoom = (s: GameState) => wageLimit(s) - wageBill(s);
export const salaryList = (s: GameState) =>
  ours(s).map((p) => ({ id: p.id, name: p.name, position: p.position, wage: p.wage || 0, years: p.contract ?? 0 })).sort((a, b) => b.wage - a.wage);
/** Why an offer for p at this fee can't be submitted, or null if it can. */
export function offerBlock(s: GameState, p: Player, fee: number, instalments = false): string | null {
  if (s.match) return 'Not during a match';
  const rival = p.clubId !== 'market';
  if (ours(s).length >= 25) return 'Squad full (25)';
  const ownerLimit = investmentTransferBlock(s, s.clubId, rival ? fee : 0, p.wage); if (ownerLimit) return ownerLimit;
  if (!rival) return null;
  if (s.embargo) return 'FFP embargo this season';
  if (!windowOpen(s)) return 'Window closed';
  const upfront = (instalments ? Math.round(fee * 0.4) : fee) + Math.round(agentFee(p, fee) * dofDiscount(s));
  if (s.budget < upfront) return `Over budget by £${upfront - s.budget}k`;
  return null;
}

/** 3.2: everything the club pays each week: players, staff and scouts, the hired manager, upkeep and your own salary. */
export function weeklyCosts(s: GameState) {
  const players = wageBill(s), staff = staffWages(s), manager = s.hiredManager?.wage ?? 0, upkeep = maintenance(s), owner = (s.mode ?? 'manager') === 'manager' ? 0 : weeklySalary(s);
  return { players, staff, manager, upkeep, owner, total: players + staff + manager + upkeep + owner };
}
/** Weeks of cash left at the current burn (income minus all weekly costs). Infinity when the club isn't losing money; 0 when already overdrawn. */
export function weeksUntilBroke(s: GameState) {
  if (s.budget < 0) return 0;
  const burn = weeklyCosts(s).total - wageBreakdown(s).incomeWk;
  return burn <= 0 ? Infinity : Math.floor(s.budget / burn);
}
/** Cash that clears any overdraft and buys 4 more weeks at the current burn (min £100k), rounded up to £50k. */
export function rescueNeed(s: GameState) {
  const burn = Math.max(0, weeklyCosts(s).total - wageBreakdown(s).incomeWk);
  return Math.ceil(Math.max(100, Math.max(0, -s.budget) + burn * 4) / 50) * 50;
}
