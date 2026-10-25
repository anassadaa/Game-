import type { Club, GameState, Player, Instalment } from './game.ts';
import { clamp, copy } from './game.ts';
import { wallet, myStake } from './wallet.ts';
import type { Policy } from './wallet.ts';
import { earnedIncome, earnedCosts, sync, book, sellOnReceipt } from './finance.ts';
import type { Ledger, InKind, OutKind } from './finance.ts';
import { league } from './world.ts';
import type { HiredManager } from './managers.ts';
import type { Facilities } from './facilities.ts';
import { validFacilities } from './facilities.ts';
import type { Tickets } from './tickets.ts';
import { validTickets } from './tickets.ts';

export type Strategy = 'balanced' | 'growth' | 'youth' | 'stability';
export type Delegation = 'auto' | 'approval' | 'hands-on';
export type PricePoint = { season: number; week: number; value: number };
export type InvestmentEntry = { season: number; week: number; clubId: string; kind: string; amount: number; message: string };
export type Business = {
  cash: number; debt: number; ledger: Ledger; fans: number; academy: number; scouting: number; stadium: number;
  manager: HiredManager | null; strategy: Strategy; delegation: Delegation; wageLimit: number; transferBudget: number;
  ticket: number; sponsor: 'fixed' | 'performance' | 'youth'; policy: Policy; saleLimit: number; liquidity: number;
  quality: number; value: number; history: PricePoint[]; reasons: string[]; cost: number; realized: number; dividends: number;
  revision: number; lastDividend: number; lastDivision: number; baselineManager: number;
  facilities: Facilities; tickets: Tickets; instalments: Instalment[];
  project?: { type: 'academy' | 'scouting' | 'stadium'; weeks: number };
  request?: { type: 'transfer' | 'funding' | 'sale'; playerId?: string; buyerId?: string; cost: number; message: string; season: number; week: number };
  /** 2.6: a board role you hold here alongside your main job (needs 51%+). Deals at or above approveOver come to you. */
  role?: RemoteRole; approveOver?: number;
};
export type RemoteRole = 'director' | 'chairman' | 'owner';
export const ROLE_LABEL: Record<RemoteRole, string> = { director: 'Director of Football', chairman: 'Chairman', owner: 'Owner-Director' };
export type InvestmentState = { version: 1; clubs: Record<string, Business>; lastTick: string; log: InvestmentEntry[]; watch: string[] };
export type TradeQuote = { ok: boolean; reason: string; clubId: string; side: 'buy' | 'sell'; pct: number; price: number; fee: number; premium: number; total: number; before: number; after: number; losesControl: boolean; stamp: string };
export type ClubView = Business & { id: string; name: string; division: number; color: string; stake: number; investors: number; loan: number; profit: number; available: number; controlled: boolean; status: string };
const cap = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const hash = (str: string) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const emptyLedger = (season: number, cash: number): Ledger => ({ season, inc: { gate: 0, tv: 0, sponsor: 0, prize: 0, sales: 0, other: 0, funding: 0 }, out: { wages: 0, running: 0, signings: 0, capital: 0 }, last: cash, weeks: [] });
const owned = (s: GameState, id: string) => id === s.clubId ? myStake(s) : s.wallet?.holdings?.[id]?.stake ?? 0;
const claim = (s: GameState, id: string) => id === s.clubId ? s.wallet?.loan ?? 0 : s.wallet?.holdings?.[id]?.loan ?? 0;
const investors = (s: GameState, id: string) => id === s.clubId ? s.investor?.stakes ?? 0 : s.wallet?.holdings?.[id]?.investorStakes ?? 0;
const profit = (b: Business) => earnedIncome(b.ledger) - earnedCosts(b.ledger);
const getClub = (s: GameState, id: string) => s.clubs.find(c => c.id === id);

function initialBusiness(s: GameState, c: Club, ps: Player[]): Business {
  const h = hash(`${c.id}|owners`), active = c.id === s.clubId;
  const cash = active ? s.budget : Math.round(1000 + c.rating * 35 + h % 1800);
  const wage = ps.reduce((n, p) => n + p.wage, 0);
  const b: Business = { cash, debt: active ? 0 : h % 4 === 0 ? Math.round(c.rating * 15) : 0,
    ledger: active && s.ledger ? structuredClone(s.ledger) : emptyLedger(s.season, cash), fans: active ? s.fans : clamp(c.rating),
    academy: active ? s.academy : 1, scouting: active ? s.scouting : 1, stadium: active ? s.facilities?.stadium ?? 1 : 1,
    manager: active ? s.hiredManager ?? null : { id: `incumbent-${c.id}`, name: ['Alex Mercer', 'Omar Silva', 'Marco Vogel', 'Theo Laurent'][h % 4]!, rating: 2 + h % 3, wage: 8 + h % 12, since: s.season, style: c.style, formation: '4-4-2' },
    instalments: active ? structuredClone(s.instalments ?? []) : [], baselineManager: active ? s.hiredManager?.rating ?? 3 : 2 + h % 3, facilities: structuredClone(active ? s.facilities ?? { training: 1, medical: 1, stadium: 1 } : { training: 1, medical: 1, stadium: 1 }), tickets: structuredClone(active ? s.tickets ?? { price: 3 } : { price: 3 }),
    strategy: 'balanced', delegation: 'approval', wageLimit: Math.max(50, Math.round(wage * 1.15)), transferBudget: Math.round(cash * 0.3), ticket: active ? s.tickets?.price ?? 3 : 3, sponsor: 'fixed', policy: 'low',
    saleLimit: [20, 49, 75, 100, 0][h % 5]!, liquidity: Math.round(cash * 1.5), quality: ps.length ? ps.reduce((n, p) => n + p.rating, 0) / ps.length : c.rating,
    value: 1, history: [], reasons: ['Opening valuation'], cost: 0, realized: 0, dividends: 0, revision: 0, lastDividend: s.season - 1, lastDivision: c.division };
  return b;
}

function equityValue(s: GameState, c: Club, b: Business): number {
  const tier = league(c.division).tier;
  const annualIncome = b.ledger.prev?.income ?? Math.max(1000, (tier === 1 ? 200 : 140) * 18 + c.rating * 12);
  const quality = cap((b.quality + c.rating) / 120, 0.55, 1.8);
  const form = cap(c.form.slice(-5).reduce((n, r) => n + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0) * 0.012, -0.06, 0.06);
  const financial = cap(profit(b) / Math.max(3000, annualIncome) * 0.35, -0.25, 0.18);
  const operations = annualIncome * (tier === 1 ? 1.8 : 1.35) * quality * (1 + form + financial) + (b.stadium + b.academy + b.scouting - 3) * 180;
  // Cash is added once; borrowing and shareholder loans are liabilities, not earnings.
  return Math.max(100, Math.round(operations + b.cash - b.debt - claim(s, c.id)));
}

function ensure(s: GameState) {
  if (s.investments) return;
  wallet(s); sync(s, 'deals');
  const grouped = new Map<string, Player[]>();
  for (const p of [...s.players, ...(s.rivals ?? [])]) { const a = grouped.get(p.clubId) ?? []; a.push(p); grouped.set(p.clubId, a); }
  const clubs: Record<string, Business> = {};
  for (const c of s.clubs) clubs[c.id] = initialBusiness(s, c, grouped.get(c.id) ?? []);
  s.investments = { version: 1, clubs, lastTick: `${s.season}:${s.week}`, log: [], watch: [] };
  for (const c of s.clubs) {
    const b = clubs[c.id]!; b.value = equityValue(s, c, b);
    b.cost = Math.round(b.value * owned(s, c.id) / 100);
    b.history = [{ season: s.season, week: s.week, value: b.value }];
  }
}

/** Explicit migration returns a new state. Read-only views do not modify careers. */
export function prepareInvestments(s: GameState): GameState { const b = copy(s); ensure(b); return b; }
function activeSnapshot(s: GameState, how: 'deals' | 'running' = 'deals') {
  sync(s, how);
  const b = s.investments!.clubs[s.clubId]!;
  b.cash = s.budget; b.fans = s.fans; b.academy = s.academy; b.scouting = s.scouting; b.stadium = s.facilities?.stadium ?? b.stadium;
  if (s.ledger) b.ledger = structuredClone(s.ledger);
  b.facilities = structuredClone(s.facilities ?? b.facilities); b.tickets = structuredClone(s.tickets ?? { price: b.ticket }); b.ticket = b.tickets.price; b.instalments = structuredClone(s.instalments ?? []);
  b.manager = s.hiredManager ?? null;
  b.policy = s.wallet?.policy ?? b.policy;
}
function commitActive(s: GameState, id: string) {
  if (id !== s.clubId) return;
  const b = s.investments!.clubs[id]!;
  s.budget = b.cash; s.ledger = structuredClone(b.ledger); s.fans = b.fans; s.academy = b.academy; s.scouting = b.scouting;
  s.facilities = { ...structuredClone(b.facilities), stadium: b.stadium }; s.tickets = { ...structuredClone(b.tickets), price: b.ticket };
  wallet(s).policy = b.policy;
}
function edit(s: GameState) { const b = copy(s); ensure(b); activeSnapshot(b); return b; }
function post(b: Business, kind: InKind | OutKind, amount: number) {
  const incoming = ['gate', 'tv', 'sponsor', 'prize', 'sales', 'other', 'funding'].includes(kind);
  const ledger = incoming ? b.ledger.inc : b.ledger.out;
  (ledger as Record<string, number>)[kind] = ((ledger as Record<string, number>)[kind] ?? 0) + amount;
  b.cash += incoming ? amount : -amount; b.ledger.last = b.cash;
}
function log(s: GameState, id: string, kind: string, amount: number, message: string) {
  s.investments!.log = [{ season: s.season, week: s.week, clubId: id, kind, amount, message }, ...s.investments!.log].slice(0, 100);
}
function setHolding(s: GameState, id: string, stake: number, loan: number, inv = investors(s, id)) {
  const w = wallet(s);
  if (id === s.clubId) {
    w.stake = stake; w.loan = loan;
    if (s.mode === 'owner' || s.mode === 'chairman') { s.investor ??= { stakes: 0, raised: 0 }; s.investor.stakes = 100 - stake; }
    else if (s.investor) s.investor.stakes = Math.min(inv, 100 - stake);
    if (s.investor) delete s.investor.offer;
  } else {
    w.holdings ??= {};
    w.holdings[id] = { stake, loan, investorStakes: Math.min(inv, 100 - stake), investorRaised: w.holdings[id]?.investorRaised ?? 0 };
  }
}

export function marketClubs(s: GameState): ClubView[] {
  const model = s.investments ? s : prepareInvestments(s);
  return model.clubs.map(c => {
    const stored = model.investments!.clubs[c.id]!;
    const b = c.id === model.clubId ? { ...stored, cash: model.budget, ledger: model.ledger ?? stored.ledger, fans: model.fans } : stored;
    const stake = owned(model, c.id), limit = stake >= 51 ? 100 : b.cash < 500 ? 100 : b.saleLimit;
    return { ...b, id: c.id, name: c.name, color: c.color, division: c.division, stake, investors: ownership(model, c.id).investors, loan: claim(model, c.id),
      value: equityValue(model, c, b), profit: profit(b), available: Math.max(0, Math.min(100 - stake, limit - stake)), controlled: stake >= 51,
      status: stake >= 51 ? 'Controlled' : b.cash < 500 ? 'Seeking funding' : limit === 0 ? 'Not for sale' : limit >= 75 ? 'Takeover available' : 'Minority stake available' };
  });
}

/** Full cap table: you + outside investors + original owners always equals 100%. */
export function ownership(s: GameState, id: string) {
  const mine = cap(Math.round(owned(s, id)), 0, 100), inv = cap(Math.round(investors(s, id)), 0, 100 - mine);
  return { mine, investors: inv, owners: 100 - mine - inv };
}

export function quoteTrade(s: GameState, id: string, side: 'buy' | 'sell', pct: number): TradeQuote {
  const c = marketClubs(s).find(c => c.id === id);
  const q: TradeQuote = { ok: false, reason: '', clubId: id, side, pct, price: 0, fee: 0, premium: 0, total: 0, before: c?.stake ?? 0, after: c?.stake ?? 0, losesControl: false, stamp: '' };
  if (!c || s.match || !['buy', 'sell'].includes(side) || !Number.isInteger(pct) || pct < 1 || pct > 100) { q.reason = 'Choose a whole percentage between 1 and 100 outside a match.'; return q; }
  if ((side === 'buy' && pct > c.available) || (side === 'sell' && pct > c.stake)) { q.reason = side === 'buy' ? 'The owners are not offering that much equity.' : 'You cannot sell more than you own.'; return q; }
  q.after = c.stake + (side === 'buy' ? pct : -pct);
  const urgency = c.cash < 500 ? 0.90 : 1;
  // Distress discounts apply to both sides so a buy-then-sell round trip can never print money.
  q.price = Math.round(c.value * pct / 100 * urgency * (side === 'buy' ? 1.02 : 0.96));
  q.premium = side === 'buy' && c.stake < 51 && q.after >= 51 ? Math.round(c.value * 0.06) : 0;
  q.fee = Math.max(1, Math.round((q.price + q.premium) * 0.01));
  q.total = side === 'buy' ? q.price + q.premium + q.fee : Math.max(0, q.price - q.fee);
  q.losesControl = c.stake >= 51 && q.after < 51;
  q.stamp = `${s.season}:${s.week}:${c.revision}:${c.value}:${c.stake}:${c.cash}:${c.liquidity}:${s.wallet?.cash ?? 0}`;
  if (side === 'buy' && (s.wallet?.cash ?? 0) < q.total) q.reason = 'Your personal wallet cannot cover the price and fees.';
  else if (side === 'sell' && q.total > c.liquidity) q.reason = 'No buyer currently has enough liquidity for this block. Sell a smaller stake or wait.';
  else { q.ok = true; q.reason = side === 'buy' ? 'Payment goes to the selling shareholders, not the club.' : 'Buyer proceeds go to your personal wallet.'; }
  return q;
}

export function executeTrade(s: GameState, quote: TradeQuote): GameState {
  if (!quote?.ok) return s;
  const fresh = quoteTrade(s, quote.clubId, quote.side, quote.pct);
  if (!fresh.ok || fresh.stamp !== quote.stamp || fresh.total !== quote.total || fresh.after !== quote.after || fresh.price !== quote.price || fresh.fee !== quote.fee || fresh.premium !== quote.premium) return s;
  const b = edit(s), rec = b.investments!.clubs[quote.clubId]!, w = wallet(b);
  const before = owned(b, quote.clubId), wasOwner = b.mode === 'owner' || b.mode === 'chairman';
  if (quote.side === 'buy') { w.cash -= quote.total; rec.cost += quote.total; rec.liquidity += quote.price + quote.premium; }
  else { const basis = before ? Math.round(rec.cost * quote.pct / before) : 0; rec.cost -= basis; rec.realized += quote.total - basis; w.cash += quote.total; rec.liquidity -= quote.total + quote.fee; }
  setHolding(b, quote.clubId, quote.after, claim(b, quote.clubId), Math.max(0, investors(b, quote.clubId) - (quote.side === 'buy' ? quote.pct : -quote.pct)));
  if (quote.clubId === b.clubId && wasOwner && quote.after < 51) b.mode = 'director';
  if (quote.clubId === b.clubId && !wasOwner && before < 51 && quote.after >= 51) {
    // Gaining control of your own employer: a director becomes Owner-Director; a manager keeps the dugout but gains owner rights.
    if (b.mode === 'director') b.mode = 'owner';
    b.investor ??= { stakes: 0, raised: 0 }; b.investor.stakes = 100 - quote.after;
    b.headlines = [`🏛️ You now control ${getClub(b, b.clubId)?.name ?? 'the club'} with ${quote.after}%.${b.mode === 'owner' ? ' You are now Owner-Director.' : ' You stay in the dugout with full owner rights.'}`, ...(b.headlines ?? [])].slice(0, 6);
  }
  rec.revision++;
  log(b, quote.clubId, quote.side, quote.side === 'buy' ? -quote.total : quote.total, `${quote.side === 'buy' ? 'Bought' : 'Sold'} ${quote.pct}% for £${quote.total}k${quote.premium ? ` including £${quote.premium}k control premium` : ''}.${quote.losesControl ? ' Majority control lost.' : ''}`);
  return b;
}

export function fundClub(s: GameState, id: string, amount: number, kind: 'loan' | 'equity'): GameState {
  if (!getClub(s, id) || s.match || !Number.isSafeInteger(amount) || amount <= 0 || !['loan', 'equity'].includes(kind) || (s.wallet?.cash ?? 0) < amount) return s;
  const b = edit(s), rec = b.investments!.clubs[id]!, own = owned(b, id), loan = claim(b, id), val = equityValue(b, getClub(b, id)!, rec);
  // New investors need a willing issuer; existing shareholders may support their club.
  if (kind === 'equity' && !own && rec.saleLimit === 0 && rec.cash >= 500) return s;
  wallet(b).cash -= amount;
  const next = kind === 'equity' ? Math.round((own * val + amount * 100) / (val + amount)) : own;
  if (kind === 'equity' && own < 51 && rec.cash >= 500 && next > Math.max(own, rec.saleLimit)) return s;
  const inv = kind === 'equity' ? Math.min(100 - next, Math.round(investors(b, id) * val / (val + amount))) : investors(b, id);
  setHolding(b, id, next, kind === 'loan' ? loan + amount : loan, inv);
  post(rec, 'funding', amount); if (kind === 'equity') rec.cost += amount;
  rec.revision++; commitActive(b, id);
  log(b, id, kind, -amount, `£${amount}k ${kind === 'loan' ? 'shareholder loan (repayable)' : `new equity; ownership ${own}% → ${next}%`}. Money credited to the club.`);
  return b;
}
export function repayClubLoan(s: GameState, id: string): GameState {
  const loan = claim(s, id), c = marketClubs(s).find(c => c.id === id);
  if (!c || s.match || loan <= 0 || c.cash < loan + 200) return s;
  const b = edit(s), rec = b.investments!.clubs[id]!;
  post(rec, 'capital', loan); wallet(b).cash += loan; setHolding(b, id, owned(b, id), 0); rec.revision++; commitActive(b, id);
  log(b, id, 'repayment', loan, `£${loan}k loan principal repaid by ${c.name}.`); return b;
}

export function clubCandidates(s: GameState, id: string): HiredManager[] {
  return [0, 1, 2, 3].map(i => { const h = hash(`${id}|candidate|${s.season}|${i}`), rating = 2 + h % 4; return { id: `${id}-${s.season}-${i}`, name: ['Rafael Costa', 'Karim Bennett', 'Luca Weiss', 'Daniel Moreau'][i]!, rating, wage: 6 + rating * rating * 2, since: s.season, style: (['balanced', 'attacking', 'cautious'] as const)[h % 3]!, formation: (['4-4-2', '4-3-3', '4-2-3-1'] as const)[h % 3]! }; });
}
export function hireClubManager(s: GameState, id: string, candidateId: string): GameState {
  if (s.match || owned(s, id) < 51) return s;
  const candidate = clubCandidates(s, id).find(c => c.id === candidateId); if (!candidate) return s;
  const b = edit(s), rec = b.investments!.clubs[id]!, cost = (rec.manager?.wage ?? 0) * 6;
  if (rec.manager?.id === candidateId || rec.cash < cost + candidate.wage * 4) return s;
  post(rec, 'wages', cost); rec.manager = candidate; rec.revision++;
  if (id === b.clubId) { const stake = owned(b, id); wallet(b).stake = stake; b.hiredManager = candidate; b.tactics = { ...b.tactics, formation: candidate.formation, mentality: candidate.style }; if (b.mode !== 'chairman') b.mode = 'owner'; b.investor ??= { stakes: 100 - stake, raised: 0 }; b.investor.stakes = 100 - stake; }
  commitActive(b, id); log(b, id, 'manager', -cost, `${candidate.name} appointed. Compensation £${cost}k; wage £${candidate.wage}k/week.`); return b;
}

export type ClubAction = 'strategy' | 'dividend' | 'delegation' | 'wages' | 'transfers' | 'ticket' | 'sponsor' | 'academy' | 'stadium' | 'scouting' | 'dismiss' | 'approve' | 'decline' | 'watch' | 'proposal' | 'outside-capital' | 'borrow' | 'repay-bank' | 'take-charge' | 'role' | 'threshold';
export function clubDecision(s: GameState, id: string, action: ClubAction, value?: string | number): GameState {
  if (!getClub(s, id) || s.match) return s;
  if (action !== 'watch' && action !== 'proposal' && owned(s, id) < 51) return s;
  const b = edit(s), rec = b.investments!.clubs[id]!;
  if (action === 'watch') { const list = b.investments!.watch; b.investments!.watch = list.includes(id) ? list.filter(x => x !== id) : [...list, id].slice(-50); return b; }
  if (action === 'proposal') {
    if (owned(b, id) < 25 || owned(b, id) > 50 || !['stability', 'youth'].includes(String(value))) return s;
    const accepted = value === 'stability' ? rec.cash < 1500 || profit(rec) < 0 : rec.cash >= 1000 && profit(rec) >= 0;
    if (accepted) rec.strategy = value as Strategy;
    rec.revision++; log(b, id, 'proposal', 0, `Other shareholders ${accepted ? 'approved' : 'rejected'} your ${value} proposal based on the club’s finances.`); return b;
  }
  if (action === 'strategy' && ['balanced', 'growth', 'youth', 'stability'].includes(String(value))) { rec.strategy = value as Strategy; if (id === b.clubId && b.mode !== 'manager') b.tactics.mentality = value === 'growth' ? 'attacking' : value === 'stability' ? 'cautious' : rec.manager?.style ?? 'balanced'; }
  else if (action === 'dividend' && ['none', 'low', 'high'].includes(String(value))) rec.policy = value as Policy;
  else if (action === 'delegation' && ['auto', 'approval', 'hands-on'].includes(String(value))) rec.delegation = value as Delegation;
  else if ((action === 'wages' || action === 'transfers') && typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100000) { if (action === 'wages') rec.wageLimit = value; else rec.transferBudget = value; }
  else if (action === 'ticket' && typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) { rec.ticket = value; if (id === b.clubId) { b.tickets ??= { price: 3 }; b.tickets.price = value; } }
  else if (action === 'sponsor' && ['fixed', 'performance', 'youth'].includes(String(value))) rec.sponsor = value as Business['sponsor'];
  else if (action === 'outside-capital' && typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= rec.liquidity) {
    const own = owned(b, id), val = equityValue(b, getClub(b, id)!, rec), next = Math.round(own * val / (val + value));
    setHolding(b, id, next, claim(b, id), Math.min(100 - next, Math.round((investors(b, id) * val + value * 100) / (val + value))));
    if (id === b.clubId && next < 51 && (b.mode === 'owner' || b.mode === 'chairman')) b.mode = 'director';
    post(rec, 'funding', value); rec.liquidity -= value;
    log(b, id, 'dilution', value, `Outside investors fund £${value}k. Your stake ${own}% → ${next}%.${next < 51 ? ' Majority control lost.' : ''}`);
  }
  else if (action === 'borrow' && typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && rec.debt + value <= Math.max(1000, (rec.ledger.prev?.income ?? getClub(b, id)!.rating * 60) * 1.5)) { rec.debt += value; post(rec, 'funding', value); }
  else if (action === 'repay-bank' && typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= rec.debt && rec.cash >= value + 500) { rec.debt -= value; post(rec, 'capital', value); }
  else if (['academy', 'scouting', 'stadium'].includes(action)) {
    const type = action as 'academy' | 'scouting' | 'stadium', cost = (type === 'stadium' ? 650 : 400) + (rec[type] - 1) * 250;
    if (rec.project || rec[type] >= 5 || rec.cash < cost + 200 || (id === b.clubId && b.facilities?.building)) return s;
    post(rec, 'signings', cost); rec.project = { type, weeks: 2 };
  } else if (action === 'dismiss') {
    if (!rec.manager || rec.cash < rec.manager.wage * 6) return s;
    post(rec, 'wages', rec.manager.wage * 6); rec.manager = null; if (id === b.clubId) delete b.hiredManager;
  } else if (action === 'take-charge') {
    if (id !== b.clubId || b.mode === 'manager') return s;
    const cost = (rec.manager?.wage ?? 0) * 6; if (rec.cash < cost + 200) return s;
    const stake = owned(b, id); post(rec, 'wages', cost); wallet(b).stake = stake; b.mode = 'manager'; delete b.hiredManager; rec.manager = null;
  } else if (action === 'approve' && rec.request?.type === 'transfer') {
    if (!makeTransfer(b, id, rec.request.playerId!, rec.request.cost)) return s;
    delete rec.request;
  } else if (action === 'approve' && rec.request?.type === 'sale') {
    if (!rec.request.buyerId || !makeTransfer(b, rec.request.buyerId, rec.request.playerId!, rec.request.cost)) return s;
    log(b, id, 'sale', rec.request.cost, `You approved the sale: ${rec.request.message}`); delete rec.request;
  } else if (action === 'role') {
    if (id === b.clubId) return s;
    if (value === 'none') { if (!rec.role) return s; log(b, id, 'role', 0, `You stepped down as ${ROLE_LABEL[rec.role]} of ${getClub(b, id)!.name}.`); delete rec.role; }
    else if (['director', 'chairman', 'owner'].includes(String(value))) { rec.role = value as RemoteRole; rec.approveOver ??= 500; if (rec.delegation === 'hands-on') rec.delegation = 'approval'; log(b, id, 'role', 0, `You are now ${ROLE_LABEL[rec.role]} of ${getClub(b, id)!.name} as well as your main job. Staff run deals; big ones need your approval.`); }
    else return s;
  } else if (action === 'threshold' && typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100000) rec.approveOver = value;
  else if (action === 'decline') { if (!rec.request) return s; if (rec.request.type === 'sale') log(b, id, 'sale', 0, `You blocked the sale: ${rec.request.message}`); delete rec.request; }
  else return s;
  rec.revision++; commitActive(b, id); log(b, id, 'decision', 0, `${action}${value !== undefined ? `: ${value}` : ''}`); return b;
}

export function makeTransfer(s: GameState, id: string, playerId: string, fee: number, approved = true): boolean {
  const rec = s.investments!.clubs[id]!, p = s.rivals?.find(p => p.id === playerId);
  if (!p || (!approved && ((owned(s, id) >= 51 && rec.delegation !== 'auto') || (owned(s, p.clubId) >= 51 && s.investments!.clubs[p.clubId]!.delegation !== 'auto'))) || p.clubId === id || p.clubId === s.clubId || id === s.clubId || rec.cash < fee + 250 || fee > rec.transferBudget || !Number.isInteger(fee) || fee <= 0) return false;
  const squad = (s.rivals ?? []).filter(p => p.clubId === id), old = (s.rivals ?? []).filter(x => x.clubId === p.clubId);
  if (squad.length >= 25 || old.length <= 14 || (p.position === 'GK' && old.filter(x => x.position === 'GK').length <= 2) || squad.reduce((n, x) => n + x.wage, 0) + p.wage > rec.wageLimit) return false;
  const seller = s.investments!.clubs[p.clubId]; if (!seller) return false;
  post(rec, 'signings', fee); post(seller, 'sales', fee); rec.transferBudget -= fee;
  const contractual = p.sellOn ? Math.round(fee * p.sellOn.pct / 100) : 0;
  const former = p.sellOn?.clubId; delete p.sellOn;
  if (contractual && former && s.investments!.clubs[former]) { post(seller, 'sales', -contractual); if (former === s.clubId) { sync(s, 'running'); s.budget += contractual; book(s, 'sales', contractual); } else post(s.investments!.clubs[former]!, 'sales', contractual); }
  sync(s, 'running'); const commission = sellOnReceipt(s, p, fee);
  if (commission) { post(seller, 'sales', -commission); book(s, 'sales', commission); }
  if (commission || (contractual && former === s.clubId)) activeSnapshot(s, 'running');
  p.clubId = id; p.starting = false; p.listed = false; rec.revision++; seller.revision++;
  return true;
}

function revalue(s: GameState, c: Club, b: Business) {
  const next = equityValue(s, c, b), old = b.value;
  b.reasons = [profit(b) < 0 ? 'Operating losses' : profit(b) > 0 ? 'Positive operating earnings' : 'Stable operating outlook', b.debt > b.cash ? 'Debt pressure' : 'Cash reserves', c.form.slice(-3).filter(x => x === 'W').length >= 2 ? 'Improving results' : 'Squad and league outlook'];
  if (c.division !== b.lastDivision) b.reasons.unshift('League status changed');
  b.value = next; b.lastDivision = c.division; b.revision++;
  b.history = [...b.history, { season: s.season, week: s.week, value: next }].slice(-24);
  if (owned(s, c.id) > 0 && Math.abs(next - old) > Math.max(100, old * 0.1)) log(s, c.id, 'valuation', next - old, `${c.name} valuation ${next >= old ? 'rose' : 'fell'}: ${b.reasons.slice(0, 2).join(', ')}.`);
}

/** World businesses advance only once per football week; read-only screens never advance time. */
export function investmentWeek(s: GameState) {
  if (!s.investments) { ensure(s); s.investments!.lastTick = ''; }
  const state = s.investments!, stamp = `${s.season}:${s.week}`;
  if (state.lastTick === stamp) return;
  activeSnapshot(s, 'running');
  const groups = new Map<string, Player[]>();
  for (const p of [...s.players, ...(s.rivals ?? [])]) { const a = groups.get(p.clubId) ?? []; a.push(p); groups.set(p.clubId, a); }
  for (const c of s.clubs) {
    const b = state.clubs[c.id]!, ps = groups.get(c.id) ?? [];
    b.quality = ps.length ? ps.reduce((n, p) => n + p.rating, 0) / ps.length : c.rating;
    if (b.project && --b.project.weeks <= 0) { b[b.project.type] = Math.min(5, b[b.project.type] + 1); log(s, c.id, 'project', 0, `${b.project.type} project completed (level ${b[b.project.type]}).`); delete b.project; if (c.id === s.clubId) commitActive(s, c.id); }
    if (c.id !== s.clubId) {
      if (b.role && owned(s, c.id) < 51) { log(s, c.id, 'role', 0, `You lost control of ${c.name}, so your ${ROLE_LABEL[b.role]} role there ended.`); delete b.role; if (b.request?.type === 'sale') delete b.request; }
      if (b.facilities.building && --b.facilities.building.weeks <= 0) { const type = b.facilities.building.type; b.facilities[type] = Math.min(5, b.facilities[type] + 1); b.stadium = b.facilities.stadium; delete b.facilities.building; }
      for (const i of b.instalments) { const payment = Math.min(i.amount, i.remaining ?? i.amount); post(b, 'signings', payment); if (i.clubId && state.clubs[i.clubId]) { if (i.clubId === s.clubId) { s.budget += payment; s.ledger!.inc.sales += payment; s.ledger!.last += payment; state.clubs[s.clubId]!.cash += payment; state.clubs[s.clubId]!.ledger.inc.sales += payment; state.clubs[s.clubId]!.ledger.last += payment; } else post(state.clubs[i.clubId]!, 'sales', payment); } if (i.remaining !== undefined) i.remaining -= payment; i.weeks--; }
      b.instalments = b.instalments.filter(i => i.weeks > 0);
      const before = b.cash, last = c.form.at(-1), tier = league(c.division).tier;
      const gate = Math.round((60 + b.fans + (b.stadium - 1) * 25) * (0.7 + b.ticket * 0.1) * (1 - Math.max(0, b.ticket - 3) * 0.1) * (s.week % 2 ? 1 : 0.35));
      post(b, 'gate', gate); post(b, 'tv', tier === 1 ? 130 : 90);
      post(b, 'sponsor', Math.round(15 + c.rating * 0.3 + (b.sponsor === 'performance' && last === 'W' ? 35 : b.sponsor === 'youth' ? b.academy * 5 : 10)));
      post(b, 'wages', Math.round(ps.reduce((n, p) => n + p.wage, 0) + (b.manager?.wage ?? 5)));
      post(b, 'running', Math.round(12 + (b.academy + b.scouting + b.stadium + b.facilities.training + b.facilities.medical - 5) * 4 + b.debt * 0.003 + Math.max(0, -b.cash) * 0.01));
      if (b.strategy === 'stability' && b.debt > 0 && b.cash > 1500) { const principal = Math.min(b.debt, 50); b.debt -= principal; post(b, 'capital', principal); }
      b.fans = clamp(b.fans + (last === 'W' ? 2 : last === 'L' ? -2 : 0) + (b.ticket <= 2 ? 1 : b.ticket === 5 ? -1 : 0));
      b.ledger.weeks = [...b.ledger.weeks, { w: s.week, net: b.cash - before }].slice(-18);
      b.liquidity = Math.max(0, Math.round(b.liquidity * 0.98 + Math.max(0, profit(b)) * 0.02 + 30));
      if (s.week % 4 === 0) {
        if (b.strategy === 'youth') for (const p of ps) if (p.age < 23 && p.rating < p.potential && hash(`${p.id}|develop|${s.season}|${s.week}`) % 100 < b.academy * 12) p.rating++;
        if (b.request && (b.request.season !== s.season || s.week - b.request.week > 4)) delete b.request;
        if (b.cash < 500) b.request = { type: 'funding', cost: Math.max(500, 1000 - b.cash), message: 'Cash reserves are low. Consider a shareholder loan or equity funding.', season: s.season, week: s.week };
        else if (!b.request && b.role) roleWeek(s, c, b, ps);
        else if (!b.request && b.strategy !== 'stability') {
          const candidate = (s.rivals ?? []).find(p => p.clubId !== c.id && p.clubId !== s.clubId && p.rating >= b.quality + 2 && p.price <= b.transferBudget && p.price < b.cash - 500 && p.wage < b.wageLimit * 0.15);
          if (candidate) {
            if (b.delegation === 'auto' && owned(s, c.id) >= 51) makeTransfer(s, c.id, candidate.id, candidate.price);
            else if (owned(s, c.id) >= 51) b.request = { type: 'transfer', playerId: candidate.id, cost: candidate.price, message: `${b.manager?.name ?? 'Caretaker'} requests ${candidate.name} (${candidate.rating} rating), £${candidate.price}k plus £${candidate.wage}k/week.`, season: s.season, week: s.week };
          }
        }
      }
      if (s.week === 18 && b.lastDividend < s.season) {
        const income = earnedIncome(b.ledger), costs = earnedCosts(b.ledger);
        const distribution = Math.max(0, Math.min(Math.round(Math.max(0, income - costs) * (b.policy === 'high' ? 0.5 : b.policy === 'low' ? 0.2 : 0)), Math.floor(b.cash - Math.max(500, b.debt * 0.1))));
        if (distribution) {
          const mine = Math.round(distribution * owned(s, c.id) / 100); post(b, 'capital', distribution); b.liquidity += distribution - mine;
          if (mine) { wallet(s).cash += mine; wallet(s).dividends += mine; b.dividends += mine; log(s, c.id, 'dividend', mine, `${c.name} paid you £${mine}k from £${income - costs}k earned profit.`); }
        }
        b.lastDividend = s.season;
        b.ledger = { ...emptyLedger(s.season + 1, b.cash), prev: { season: s.season, income, costs, transferNet: b.ledger.inc.sales - b.ledger.out.signings } };
      }
    } else {
      const commercial = b.sponsor === 'performance' ? (c.form.at(-1) === 'W' ? 25 : -10) : b.sponsor === 'youth' ? b.academy * 5 - 10 : 0;
      if (commercial > 0) post(b, 'sponsor', commercial); else if (commercial < 0) post(b, 'running', -commercial);
      if (b.debt > 0) post(b, 'running', Math.max(1, Math.round(b.debt * 0.003)));
      commitActive(s, c.id);
    }
    revalue(s, c, b);
  }
  state.lastTick = stamp;
}

/** Management and infrastructure feed the existing football engine, not a separate fake result stream. */
export function investmentStrength(s: GameState, id: string): { rating: number; style?: Club['style'] } {
  const b = s.investments?.clubs[id]; if (!b || id === s.clubId) return { rating: 0 };
  return { rating: cap((b.manager ? b.manager.rating - b.baselineManager : -2) * 0.6 + (b.academy + b.scouting - 2) * 0.15 + (b.cash < 0 ? -2 : 0), -5, 4), style: b.strategy === 'growth' ? 'attacking' : b.strategy === 'stability' ? 'cautious' : b.manager?.id.startsWith('incumbent-') ? undefined : b.manager?.style };
}

/** Called before the existing wallet/job migration, while the original club is still active. */
export function leaveInvestmentJob(s: GameState, nextId: string) {
  if (!s.investments) return;
  activeSnapshot(s);
  const next = s.investments.clubs[nextId]!, prev = s.investments.clubs[s.clubId];
  if (prev && s.clubId !== nextId && owned(s, s.clubId) >= 51) { prev.role = 'director'; prev.approveOver ??= 500; }
  if (next.role) { delete next.role; if (next.request?.type === 'sale') delete next.request; }
  s.budget = next.cash; s.ledger = structuredClone(next.ledger); s.fans = next.fans; s.academy = next.academy; s.scouting = next.scouting;
  s.facilities = { ...structuredClone(next.facilities), stadium: next.stadium }; s.tickets = { ...structuredClone(next.tickets), price: next.ticket }; s.instalments = structuredClone(next.instalments);
}

export function joinInvestmentJob(s: GameState) {
  const b = s.investments?.clubs[s.clubId];
  if (!b || (s.mode ?? 'manager') === 'manager') return;
  if (b.manager) s.hiredManager = { ...b.manager };
  wallet(s).policy = b.policy;
}

export function portfolioSummary(s: GameState) {
  const clubs = marketClubs(s), positions = clubs.filter(c => c.stake > 0 || c.loan > 0);
  const cash = s.wallet?.cash ?? 0, equity = positions.reduce((n, c) => n + Math.round(c.value * c.stake / 100), 0), loans = positions.reduce((n, c) => n + c.loan, 0);
  return { cash, equity, loans, netWorth: cash + equity + loans, cost: positions.reduce((n, c) => n + c.cost, 0), realized: clubs.reduce((n, c) => n + c.realized, 0), dividends: s.wallet?.dividends ?? 0, positions };
}

export function validInvestments(s: GameState): boolean {
  const x = s.investments; if (x === undefined) return true;
  const finite = (n: unknown, min = -1e9, max = 1e9) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const integer = (n: unknown, min: number, max: number) => Number.isInteger(n) && finite(n, min, max);
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  if (!x || x.version !== 1 || !text(x.lastTick, 30) || !x.clubs || typeof x.clubs !== 'object' || Array.isArray(x.clubs) || Object.keys(x.clubs).length !== s.clubs.length || !s.clubs.every(c => Object.hasOwn(x.clubs, c.id))) return false;
  if (!Array.isArray(x.watch) || x.watch.length > 50 || !x.watch.every(id => getClub(s, id))) return false;
  if (!Array.isArray(x.log) || x.log.length > 100 || !x.log.every(e => e && getClub(s, e.clubId) && integer(e.season, 1, 1000) && integer(e.week, 0, 18) && text(e.kind, 30) && text(e.message, 500) && finite(e.amount))) return false;
  return Object.values(x.clubs).every(b => {
    if (!b || !Array.isArray(b.instalments) || b.instalments.length > 100 || !b.instalments.every(i => i && text(i.name, 200) && finite(i.amount, 0) && integer(i.weeks, 1, 100) && (i.clubId === undefined || !!getClub(s, i.clubId)) && (i.remaining === undefined || finite(i.remaining, 0))) || !validFacilities(b.facilities) || !validTickets(b.tickets) || !integer(b.baselineManager, 1, 5) || !['cash', 'realized'].every(k => finite(b[k as keyof Business])) || !['debt', 'liquidity', 'value', 'cost', 'dividends', 'wageLimit', 'transferBudget'].every(k => finite(b[k as keyof Business], 0))) return false;
    if (!integer(b.fans, 0, 100) || !integer(b.academy, 1, 5) || !integer(b.scouting, 1, 5) || !integer(b.stadium, 1, 5) || !integer(b.ticket, 1, 5) || !integer(b.saleLimit, 0, 100) || !finite(b.quality, 0, 100) || !integer(b.revision, 0, 1e9) || !integer(b.lastDividend, 0, 1000) || !integer(b.lastDivision, 1, 100)) return false;
    if (!['balanced', 'growth', 'youth', 'stability'].includes(b.strategy) || !['auto', 'approval', 'hands-on'].includes(b.delegation) || !['none', 'low', 'high'].includes(b.policy) || !['fixed', 'performance', 'youth'].includes(b.sponsor)) return false;
    if (b.manager !== null && (!b.manager || !text(b.manager.id, 150) || !text(b.manager.name, 150) || !integer(b.manager.rating, 1, 5) || !finite(b.manager.wage, 0, 100000) || !['balanced', 'attacking', 'cautious'].includes(b.manager.style) || !text(b.manager.formation, 20) || !integer(b.manager.since, 1, 1000))) return false;
    if (!Array.isArray(b.history) || b.history.length > 24 || !b.history.every(h => h && integer(h.season, 1, 1000) && integer(h.week, 0, 18) && finite(h.value, 1))) return false;
    if (!Array.isArray(b.reasons) || b.reasons.length > 6 || !b.reasons.every(r => text(r, 150))) return false;
    if (b.project && (!['academy', 'scouting', 'stadium'].includes(b.project.type) || !integer(b.project.weeks, 1, 2))) return false;
    if (b.role !== undefined && !['director', 'chairman', 'owner'].includes(b.role)) return false;
    if (b.approveOver !== undefined && !finite(b.approveOver, 0, 100000)) return false;
    if (b.request?.type === 'sale' && (!text(b.request.playerId, 200) || !getClub(s, b.request.buyerId ?? ''))) return false;
    if (b.request && (!['transfer', 'funding', 'sale'].includes(b.request.type) || !text(b.request.message, 400) || !finite(b.request.cost, 0) || !integer(b.request.season, 1, 1000) || !integer(b.request.week, 0, 18) || (b.request.type === 'transfer' && !text(b.request.playerId, 200)))) return false;
    const l = b.ledger;
    return !!l && integer(l.season, 1, 1001) && finite(l.last) && !!l.inc && !!l.out && Object.values(l.inc).every(n => finite(n, 0)) && Object.values(l.out).every(n => finite(n, 0)) && ['gate', 'tv', 'sponsor', 'prize', 'sales', 'other'].every(k => finite(l.inc[k as keyof Ledger['inc']], 0)) && ['wages', 'running', 'signings'].every(k => finite(l.out[k as keyof Ledger['out']], 0)) && (l.inc.funding === undefined || finite(l.inc.funding, 0)) && (l.out.capital === undefined || finite(l.out.capital, 0)) && Array.isArray(l.weeks) && l.weeks.length <= 18 && l.weeks.every(w => w && integer(w.w, 0, 18) && finite(w.net)) && (l.prev === undefined || (!!l.prev && integer(l.prev.season, 1, 1000) && finite(l.prev.income, 0) && finite(l.prev.costs, 0) && (l.prev.transferNet === undefined || finite(l.prev.transferNet))));
  });
}

/** Owner caps apply to the full commitment; cash checks elsewhere include agent fees. */
export function investmentTransferBlock(s: GameState, id: string, fee: number, wage: number): string | null {
  const b = s.investments?.clubs[id]; if (!b) return null;
  const squad = id === s.clubId ? s.players.filter(p => p.clubId === id) : (s.rivals ?? []).filter(p => p.clubId === id);
  if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(wage) || wage < 0) return 'Invalid financial commitment.';
  if (fee > b.transferBudget) return 'The owner transfer budget cannot cover this commitment.';
  if (squad.reduce((n, p) => n + p.wage, 0) + wage > b.wageLimit) return 'The owner wage limit would be exceeded.';
  if (id !== s.clubId && (b.cash < fee || squad.length >= 25)) return 'The buying club cannot fund or register this player.';
  return null;
}
export function investmentTransferPayment(s: GameState, id: string | undefined, kind: 'sales' | 'signings', amount: number, commitment = amount) {
  const b = id ? s.investments?.clubs[id] : undefined; if (!b) return;
  if (id !== s.clubId) post(b, kind, amount);
  if (kind === 'signings') b.transferBudget = Math.max(0, b.transferBudget - commitment);
  b.revision++;
}

/** Clubs you hold a board role at other than your main club: staff do small deals, big ones wait for you. */
function roleWeek(s: GameState, c: Club, b: Business, ps: Player[]) {
  const limit = b.approveOver ?? 500, stamp = `${c.id}|role|${s.season}|${s.week}`;
  if (b.strategy !== 'stability') {
    const candidate = (s.rivals ?? []).filter(p => p.clubId !== c.id && p.clubId !== s.clubId && p.rating >= b.quality + 2 && p.price <= b.transferBudget && p.price < b.cash - 500 && p.wage < b.wageLimit * 0.15).sort((x, y) => hash(`${stamp}|${x.id}`) - hash(`${stamp}|${y.id}`))[0];
    if (candidate) {
      if (candidate.price >= limit) { b.request = { type: 'transfer', playerId: candidate.id, cost: candidate.price, message: `${b.manager?.name ?? 'Your staff'} want ${candidate.name} (${candidate.rating} rating), £${candidate.price}k plus £${candidate.wage}k/week.`, season: s.season, week: s.week }; return; }
      if (makeTransfer(s, c.id, candidate.id, candidate.price)) { log(s, c.id, 'signing', candidate.price, `Your staff at ${c.name} signed ${candidate.name} for £${candidate.price}k (under your £${limit}k approval line).`); return; }
    }
  }
  if (hash(`${stamp}|bid`) % 100 >= 45 || ps.length <= 16) return;
  const star = [...ps].sort((x, y) => y.price - x.price)[hash(`${stamp}|who`) % Math.min(3, ps.length)]!;
  const fee = Math.round(star.price * (1.05 + (hash(`${stamp}|fee`) % 20) / 100));
  const buyer = s.clubs.filter(x => x.id !== c.id && x.id !== s.clubId && owned(s, x.id) < 51 && (s.investments!.clubs[x.id]!.cash >= fee + 250)).sort((x, y) => hash(`${stamp}|${x.id}`) - hash(`${stamp}|${y.id}`))[0];
  if (!buyer) return;
  const brec = s.investments!.clubs[buyer.id]!; brec.transferBudget = Math.max(brec.transferBudget, fee);
  if (fee >= limit) b.request = { type: 'sale', playerId: star.id, buyerId: buyer.id, cost: fee, message: `${buyer.name} bid £${fee}k for ${star.name} (${star.rating} rating).`, season: s.season, week: s.week };
  else if (makeTransfer(s, buyer.id, star.id, fee)) log(s, c.id, 'sale', fee, `Your staff at ${c.name} sold ${star.name} to ${buyer.name} for £${fee}k.`);
}

/** Every role you hold: the main club where you work hands-on, plus board roles at clubs you control. */
export function myRoles(s: GameState): { clubId: string; name: string; role: string; main: boolean; stake: number; pending: boolean }[] {
  const main = getClub(s, s.clubId)!, modeLabel = { manager: 'Manager', director: 'Director of Football', chairman: 'Chairman', owner: 'Owner-Director' }[s.mode ?? 'manager'];
  const rows = [{ clubId: main.id, name: main.name, role: modeLabel, main: true, stake: owned(s, main.id), pending: false }];
  for (const [id, b] of Object.entries(s.investments?.clubs ?? {})) if (b.role && id !== s.clubId) rows.push({ clubId: id, name: getClub(s, id)!.name, role: ROLE_LABEL[b.role], main: false, stake: owned(s, id), pending: !!b.request });
  return rows;
}
