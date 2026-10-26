import { renewalPlan, renewYears } from './contracts.ts';
// 2.9: the hired manager runs the football (Director / Owner-Director / Chairman careers).
// Everything is deterministic (hash-based), scaled by his rating and style.
import type { GameState, Player } from './game.ts';
import { askingPrice, club, copy, findBuyer, minSaleFee, negotiate, renewContract, sellPlayer, standings, windowOpen } from './game.ts';
import { BENCH } from './lineup.ts';
import { agentFee } from './finance.ts';
import { wageLimit, weeksUntilBroke } from './budget.ts';
import { loansOut } from './loans.ts';
import { dofDiscount } from './staff.ts';
import { suitability, slotsFor } from './lineup.ts';
import { FORMATION_SLOTS, slotPeek, type Slot } from './positions.ts';
import { isProtected } from './protect.ts';
import { canHire as canHireStaff, hireStaff, renewStaff, staffTerms, sackStaff, staff, staffBudget, staffWages, roleLabel, type StaffRole } from './staff.ts';

export type MgrRequest = { playerId: string; name: string; slot: Slot; fee: number; week: number; season: number };
export type MgrAsk = { kind: 'renew' | 'sell'; playerId: string; name: string; wage?: number; fee?: number; buyer?: string; by?: 'board' | 'manager'; week: number; season: number };
export type MgrPlan = { asks?: MgrAsk[]; keep?: string[]; transfer: number; wage: number; approveOver: number; spent: number; season: number; log: string[]; request?: MgrRequest; signings: number; sales: number; mod?: number; auto?: { transfer: number; wage: number; at: string }; frozen?: boolean; staffAt?: string };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const roll = (s: GameState, tag: string) => hash(`${s.seed}|${s.clubId}|${s.season}|${s.week}|${s.hiredManager?.id}|${tag}`);
const ours = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
const bill = (s: GameState) => ours(s).reduce((a, p) => a + (p.wage || 0), 0);
export const delegated = (s: GameState) => (s.mode ?? 'manager') !== 'manager' && !!s.hiredManager;
const money = (k: number) => (k >= 1000 ? `£${(k / 1000).toFixed(1)}m` : `£${k}k`);

/** The manager's budget: defaults from the club's books, editable by you. Resets spending each season. */
export const MOD_MIN = -50, MOD_MAX = 100;
const phase = (s: GameState) => `${s.season}:${s.week >= 9 ? 2 : 1}`;
/** Automatic budgets for the current window: bank, income, board wage limit, expectations and recent results. */
export function autoBudget(s: GameState) {
  const r = (s.results ?? []).slice(-6), pts = r.reduce((n, x) => n + (x.us > x.them ? 3 : x.us === x.them ? 1 : 0), 0);
  const form = r.length ? 0.8 + 0.4 * (pts / (r.length * 3)) : 1; // 0.8 (all lost) … 1.2 (all won)
  const div = s.clubs.filter((c) => c.division === club(s).division).length || 1;
  const ambition = 1.1 - 0.2 * ((expectedPos(s) - 1) / Math.max(1, div - 1)); // favourites get more
  const income = s.ledger?.prev?.income ?? 0;
  const jitter = 0.95 + 0.1 * hash(`${s.seed}|${s.clubId}|auto|${phase(s)}`);
  // 3.1: real cash only. Money already committed to wages the club can't cover from income this season is not spendable.
  const incWk = s.ledger?.prev ? income / 18 : wageLimit(s) * 1.4, /* no history yet: the wage limit is set from income */ left = Math.max(0, 18 - s.week);
  // Real weekly burn this season (staff, upkeep, salaries, instalments): TV/prize money only lands at season end.
  const nets = (s.ledger?.season === s.season ? s.ledger.weeks : []).filter((w) => w.w > 0 && w.w < 18).slice(-6).map((w) => w.net);
  const burn = nets.length ? Math.max(0, -nets.reduce((a, b) => a + b, 0) / nets.length) : 0;
  const shortfall = Math.max(burn, bill(s) - incWk, 0) * left;
  const free = Math.max(0, s.budget - shortfall);
  const transfer = Math.max(0, Math.round((free * 0.35 + Math.min(free, income * 0.08)) * form * ambition * jitter));
  // Never above the board's wage limit, whatever the current bill is.
  // 3.1 review: the manager's own salary and the staff are paid from the same income, so player wages must leave room for them.
  const others = (s.hiredManager?.wage ?? 0) + (s.staff ?? []).reduce((a, x) => a + (x.wage || 0), 0);
  const wage = Math.max(1, Math.min(Math.round(wageLimit(s) * (0.94 + 0.06 * form) * jitter), Math.round(incWk - others)));
  return { transfer, wage, free: Math.round(free) };
}
function applyAuto(s: GameState, p: MgrPlan) {
  const a = autoBudget(s), k = 1 + (p.mod ?? 0) / 100;
  p.auto = { ...a, at: phase(s) }; p.transfer = Math.min(Math.round(a.transfer * k), a.free); p.wage = Math.min(wageLimit(s), Math.round(a.wage * k));
}
/** The manager's budget: set automatically each window (and season), times your % modifier. Spending resets each season. */
export function plan(s: GameState): MgrPlan {
  if (!s.mgr || s.mgr.season !== s.season) {
    const prev = s.mgr;
    s.mgr = { transfer: 0, wage: 0, approveOver: prev?.approveOver ?? 1000, spent: 0, season: s.season, log: prev?.log ?? [], signings: 0, sales: 0, mod: prev?.mod ?? 0, ...(prev?.asks?.length ? { asks: prev.asks } : {}) };
  }
  if (s.mgr.auto?.at !== phase(s)) applyAuto(s, s.mgr);
  return s.mgr;
}
/** Your +/- % on top of the automatic budgets; persists between windows. */
export function setBudgetMod(s: GameState, pct: number): GameState {
  if (s.match || !Number.isInteger(pct) || pct < MOD_MIN || pct > MOD_MAX) return s;
  const b = copy(s), p = plan(b); p.mod = pct; applyAuto(b, p); return b;
}
export const budgetLeft = (s: GameState) => { const p = plan(s); return inRed(s) ? 0 : Math.max(0, Math.min(p.transfer - p.spent, s.budget)); };
/** Wage room for his deals: his plan and the board limit, whichever is tighter. */
export const wageSpace = (s: GameState) => Math.min(plan(s).wage, wageLimit(s)) - bill(s);
/** In the red: bank below zero or wages over the board limit. Signings freeze and the board forces sales. */
/** In the red: overdrawn, player wages over the limit, or (counting staff, manager and upkeep too) under 4 weeks from broke. */
export const inRed = (s: GameState) => s.budget < 0 || bill(s) > wageLimit(s) || weeksUntilBroke(s) < 4;
function note(s: GameState, line: string) {
  const p = plan(s);
  p.log = [`S${s.season} W${s.week}: ${line}`, ...p.log].slice(0, 30);
}

// ---------- 1. Selection and tactics ----------
/** Pick XI + bench by suitability (position, form, fitness); good managers rotate tired players. */
export function pickTeam(s: GameState) {
  const m = s.hiredManager!; const slots = slotsFor(s.tactics.formation);
  const pool = ours(s).filter((p) => !p.suspended);
  const tiredLine = 50 + m.rating * 5; // 55–75 fitness: better managers rest players sooner
  const score = (p: Player, pos: Player['position']) => suitability(p, pos) - (p.fitness < tiredLine ? (tiredLine - p.fitness) * 0.12 * m.rating : 0);
  const taken = new Set<string>(); const xi: (Player | undefined)[] = slots.map(() => undefined);
  slots.forEach((sl, i) => { const best = pool.filter((p) => !taken.has(p.id)).sort((x, y) => score(y, sl.pos) - score(x, sl.pos) || x.id.localeCompare(y.id))[0]; if (best) { xi[i] = best; taken.add(best.id); } });
  const ids = new Set(xi.filter(Boolean).map((p) => p!.id));
  ours(s).forEach((p) => (p.starting = ids.has(p.id)));
  s.lineup = xi.map((p) => p?.id ?? '');
  const left = pool.filter((p) => !ids.has(p.id) && !p.injured).sort((x, y) => y.rating - x.rating || x.id.localeCompare(y.id));
  const gk = left.find((p) => p.position === 'GK');
  s.bench = [...(gk ? [gk] : []), ...left.filter((p) => p !== gk)].slice(0, BENCH).map((p) => p.id);
}
/** Change mentality after bad runs; drift back to his natural style when things settle. */
export function adaptTactics(s: GameState) {
  const m = s.hiredManager!, last = (s.results ?? []).slice(-3);
  const pts = last.reduce((a, r) => a + (r.us > r.them ? 3 : r.us === r.them ? 1 : 0), 0);
  const conceded = last.reduce((a, r) => a + r.them, 0), scored = last.reduce((a, r) => a + r.us, 0);
  const cur = s.tactics.mentality;
  let want = m.style;
  if (last.length === 3 && pts <= 3) want = conceded > scored + 2 ? 'cautious' : scored <= 2 ? 'attacking' : (cur === 'attacking' ? 'balanced' : 'attacking');
  if (want !== cur) { s.tactics = { ...s.tactics, mentality: want }; note(s, `Switched to ${want === 'attacking' ? 'an' : 'a'} ${want} approach after ${pts} points from the last ${last.length} games.`); }
}

// ---------- 2. Staff ----------
const KEY: StaffRole[] = ['assistant', 'fitness', 'physio', 'attack', 'defence', 'gk', 'youth'];
export function manageStaff(s: GameState): GameState {
  const m = s.hiredManager!; let b = s;
  const bar = 4 + m.rating * 2; // standards: 6–14
  // 3.1: no churn. At most one staff change per window, never while in the red, and a sack only when
  // the payoff is a small share of the bank and the clearly better replacement is signed in the same move.
  const p = plan(b), win = phase(b);
  changes: if (p.staffAt !== win && !inRed(b) && windowOpen(b)) {
  const weak = staff(b).filter((x) => x.rating < bar).sort((x, y) => x.rating - y.rating)[0];
  if (weak && roll(b, 'sack') < 0.5) {
    const better = (b.staffMarket ?? []).filter((x) => x.role === weak.role && x.rating >= weak.rating + 4 && x.rep <= 100).sort((x, y) => y.rating - x.rating)[0];
    const pay = weak.wage * 8 * weak.contract;
    if (better && pay <= Math.max(0, b.budget) * 0.1 && staffWages(b) - weak.wage + better.wage <= staffBudget(b)) {
      const n = sackStaff(b, weak.id), h = n !== b ? hireStaff(n, better.id) : n;
      if (n !== b && h !== n && staff(h).some((x) => x.id === better.id) && h.budget >= 0) {
        b = h; plan(b).staffAt = win;
        note(b, `Replaced ${roleLabel(weak.role).toLowerCase()} ${weak.name} (rated ${weak.rating}, £${pay}k payoff) with ${better.name} (rated ${better.rating}).`);
        break changes;
      }
    }
  }
  }
  // Fill one empty role per week with the best affordable candidate. Filling a vacancy pays no payoff, so it
  // is not churn and does not use up the window's one change.
  if (!inRed(b)) for (const role of KEY) {
    if (staff(b).some((x) => x.role === role)) continue;
    const c = (b.staffMarket ?? []).filter((x) => x.role === role && x.rating >= Math.min(bar - 3, 6) && !canHireStaff(b, x)).sort((x, y) => y.rating - x.rating)[0];
    if (c) { const n = hireStaff(b, c.id); if (n !== b && n.budget >= 0) { b = n; note(b, `Hired ${c.name} as ${roleLabel(role).toLowerCase()} (rated ${c.rating}).`); break; } }
  }
  // Late season: keep good staff whose contracts end.
  if (b.week >= 15) for (const x of staff(b).filter((y) => y.contract <= 1 && y.rating >= bar && !(y as any).renewedBy)) {
    const tm = staffTerms(b, x); if (staffWages(b) + tm.wage - x.wage > staffBudget(b)) continue;
    { const n = renewStaff(b, x.id); if (n === b) continue; b = n; } const y = staff(b).find((z) => z.id === x.id); if (y) (y as any).renewedBy = b.season;
    note(b, `Renewed ${roleLabel(x.role).toLowerCase()} ${x.name} at £${tm.wage}k/wk (was £${x.wage}k; ${tm.reasons.filter((r) => r.pct).map((r) => `${r.label} ${r.pct > 0 ? '+' : ''}${r.pct}%`).join(', ')}).`);
  }
  return b;
}

// ---------- 3. Contracts ----------
const avg = (s: GameState) => { const o = ours(s); return o.reduce((a, p) => a + p.rating, 0) / Math.max(1, o.length); };
export function manageContracts(s: GameState): GameState {
  const p0 = plan(s); let b = s; const mean = avg(b), m = b.hiredManager!;
  for (const p of ours(b).filter((x) => (x.contract ?? 9) <= 1 && !(x as any).loan).sort((x, y) => y.rating - x.rating)) {
    const prot = isProtected(p);
    const rp = renewalPlan(b, p, prot);
    const key = prot || (rp.renew && p.rating >= mean - 1 + (3 - m.rating) * 0.5);
    if (!key) {
      if (b.week === 16 && !(p as any).letGo) { (p as any).letGo = b.season; note(b, `Will let ${p.name} (${slotPeek(p)}, ${p.age}) leave when his contract ends: ${rp.renew ? 'not good enough for the squad' : rp.why}.`); }
      continue;
    }
    const rise = rp.ask - p.wage;
    if (prot && bill(b) + rise > Math.min(p0.wage, wageLimit(b))) { ask(b, { kind: 'renew', playerId: p.id, name: p.name, wage: rp.ask }); continue; }
    if (bill(b) + rise > Math.min(p0.wage, wageLimit(b))) { if (!(p as any).letGo) { (p as any).letGo = b.season; note(b, `Couldn't fit ${p.name}'s new deal (£${rp.ask}k/wk) in the £${p0.wage}k/wk wage budget.`); } continue; }
    { const n = renewContract(b, p.id, rp.years); if (n === b) continue; b = n; } note(b, `Renewed ${p.name} (${slotPeek(p)}) for ${rp.years} year${rp.years > 1 ? 's' : ''} at £${rp.ask}k/wk (was £${p.wage}k): ${rp.why}.`);
  }
  return b;
}

/** 3.2: something only you can decide (protected renewals and sales). One open ask per player. */
function ask(s: GameState, a: Omit<MgrAsk, 'week' | 'season'>) {
  const p = plan(s); p.asks ??= [];
  if (p.asks.some((x) => x.playerId === a.playerId && x.kind === a.kind)) return;
  p.asks = [...p.asks, { ...a, week: s.week, season: s.season }].slice(-6);
  const what = a.kind === 'renew' ? `a new deal for ${a.name} (£${a.wage}k/wk, over his wage budget)` : `to sell ${a.name}${a.fee ? ` for ${money(a.fee)}` : ''}`;
  note(s, `Asked you to approve ${what}.`);
  s.headlines = [`📨 ${s.hiredManager?.name ?? 'Your manager'} asks to approve ${what}. Club → Board.`, ...s.headlines].slice(0, 6);
}
/** You approve or refuse one of his asks. */
export function answerAsk(s: GameState, playerId: string, kind: MgrAsk['kind'], approve: boolean | 'other'): GameState {
  const a = s.mgr?.asks?.find((x) => x.playerId === playerId && x.kind === kind); if (!a || s.match) return s;
  let b = copy(s); const p = plan(b); p.asks = (p.asks ?? []).filter((x) => !(x.playerId === playerId && x.kind === kind));
  if (approve !== true) {
    if (kind === 'sell') p.keep = [...new Set([...(p.keep ?? []), playerId])];
    note(b, kind === 'renew' ? `You refused a new deal for ${a.name}.` : `You blocked the sale of ${a.name}${approve === 'other' ? '; pick another player' : ''}.`);
    if (approve === 'other' && kind === 'sell') { const next = saleCandidates(b, a.by ?? 'board')[0]; if (next) b = fairSale(b, next, a.by ?? 'board'); }
    return b;
  }
  if (kind === 'renew') { const px = b.players.find((y) => y.id === playerId), yrs = px ? renewYears(px) : 3; const n = renewContract(b, playerId, yrs); if (n === b) { note(b, `${a.name} is no longer ours to renew.`); return b; } b = n; note(b, `Renewed ${a.name} for ${yrs} year${yrs > 1 ? 's' : ''} at £${b.players.find((y) => y.id === playerId)?.wage}k/wk (you approved).`); return b; }
  const x = b.players.find((y) => y.id === playerId), fee = x ? Math.max(a.fee ?? 0, minSaleFee(x)) : 0;
  const n = x ? sellPlayer(b, playerId, fee) : b; if (n === b) { note(b, `The sale of ${a.name} fell through.`); return b; }
  b = n; plan(b).sales++; const to = b.clubs.find((c) => c.id === a.buyer)?.name;
  note(b, `${a.by === 'board' ? 'Board-forced sale: ' : ''}${a.name} sold for ${money(fee)}${to ? ` to ${to}` : ''} (you approved).`);
  b.headlines = [`🏦 ${a.name} sold for ${money(fee)}${to ? ` to ${to}` : ''}.`, ...b.headlines].slice(0, 6); return b;
}

// ---------- 4. Transfers ----------
/** Detailed positions for his formation, weakest first (gap between the player there and the squad level). */
export function weakSlots(s: GameState): { slot: Slot; best: number }[] {
  const shape = FORMATION_SLOTS[s.tactics.formation] ?? FORMATION_SLOTS['4-4-2']!;
  const want = [...new Set(['GK' as Slot, ...shape])];
  const mine = ours(s).filter((p) => !(p as any).loan), mean = avg(s);
  return want.map((sl) => {
    const need = shape.filter((x) => x === sl).length || 1;
    const there = mine.filter((p) => slotPeek(p) === sl).sort((a, b) => b.rating - a.rating);
    const best = there[need - 1]?.rating ?? 0;
    return { slot: sl, best, gap: mean - best };
  }).filter((x) => x.gap > -3).sort((a, b) => b.gap - a.gap || a.slot.localeCompare(b.slot)).map(({ slot, best }) => ({ slot, best }));
}
export const weakSlot = (s: GameState) => weakSlots(s)[0] ?? null;
/** Everything a deal costs up front: fee plus the agent's cut. Free agents cost nothing up front. */
export const dealCost = (s: GameState, p: Player) => { if (p.clubId === 'market') return 0; const f = askingPrice(p, s); return f + Math.round(agentFee(p, f) * dofDiscount(s)); };
const wageAsk = (p: Player) => Math.round(p.wage * (p.personality === 'Ambitious' ? 1.15 : 1)) + 1;
export function manageTransfers(s: GameState): GameState {
  if (!windowOpen(s)) return s;
  const p0 = plan(s), m = s.hiredManager!; let b = s;
  // Sell: one surplus, older or weak non-starter per week when the squad is big.
  const mine = ours(b);
  if (mine.length > 20) {
    const out = saleCandidates(b, 'manager')[0];
    if (out && roll(b, 'sell') < 0.4 + m.rating * 0.08) {
      b = fairSale(b, out, 'manager');
    }
  }
  if (inRed(b)) return b; // board freeze: no signings while in the red
  if (plan(b).request || ours(b).length >= 25 || b.embargo) return b;
  const left = budgetLeft(b), wageRoom = wageSpace(b), eye = 1 + m.rating; // better managers find better value
  for (const gap of weakSlots(b).slice(0, 3)) {
    const target = [...b.market, ...(b.rivals ?? [])].filter((p) => slotPeek(p) === gap.slot && p.rating >= gap.best + 2 && dealCost(b, p) <= left && wageAsk(p) <= wageRoom && p.age <= 33)
      .sort((x, y) => (y.rating * eye - askingPrice(y, b) / 100) - (x.rating * eye - askingPrice(x, b) / 100) || x.id.localeCompare(y.id))[0];
    if (!target) continue;
    const fee = dealCost(b, target);
    if (fee > p0.approveOver) {
      plan(b).request = { playerId: target.id, name: target.name, slot: gap.slot, fee, week: b.week, season: b.season };
      note(b, `Asked you to approve ${target.name} (${gap.slot}) for ${money(fee)}.`);
      b.headlines = [`📨 ${b.hiredManager!.name} wants ${target.name} (${gap.slot}) for ${money(fee)}. Approve or block in Club → Board.`, ...b.headlines].slice(0, 6);
      return b;
    }
    const n = buy(b, target.id, gap.slot);
    if (n !== b) return n;
  }
  return b;
}
function buy(s: GameState, id: string, slot: Slot): GameState {
  const p = s.market.find((x) => x.id === id) ?? s.rivals?.find((x) => x.id === id); if (!p) return s;
  if (dealCost(s, p) > budgetLeft(s) || wageAsk(p) > wageSpace(s)) return s;
  const fee = p.clubId === 'market' ? 0 : askingPrice(p, s);
  const [n] = negotiate(s, id, { fee, wage: wageAsk(p), years: 3 });
  if (!n.players.some((x) => x.id === id && x.clubId === s.clubId) || n.budget < 0 || bill(n) > wageLimit(s)) return s;
  const cost = dealCost(s, p);
  plan(n).spent += cost; plan(n).signings++;
  note(n, `Signed ${p.name} (${slot}) ${cost ? `for ${money(cost)}` : 'on a free'}.`);
  return n;
}
/** You approve or block his pending request. */
export function answerRequest(s: GameState, approve: boolean): GameState {
  const r = s.mgr?.request; if (!r || s.match) return s;
  let b = copy(s); delete plan(b).request;
  if (!approve) { note(b, `You blocked the move for ${r.name}.`); return b; }
  const p = b.market.find((x) => x.id === r.playerId) ?? b.rivals?.find((x) => x.id === r.playerId);
  if (!p || !windowOpen(b)) { note(b, `${r.name} is no longer available.`); return b; }
  const n = buy(b, p.id, r.slot);
  if (n === b) note(b, `The deal for ${r.name} fell through (window, budget or squad size).`);
  return n === b ? b : n;
}

// ---------- 5. Your controls and his performance ----------
export function setPlan(s: GameState, patch: Partial<Pick<MgrPlan, 'transfer' | 'wage' | 'approveOver'>>): GameState {
  if (s.match) return s;
  const b = copy(s), p = plan(b);
  for (const k of ['transfer', 'wage', 'approveOver'] as const) { const v = patch[k]; if (v !== undefined && Number.isSafeInteger(v) && v >= 0 && v <= 1_000_000) p[k] = v; }
  return b;
}
export function expectedPos(s: GameState) {
  const c = club(s); return s.clubs.filter((x) => x.division === c.division).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).findIndex((x) => x.id === s.clubId) + 1;
}
export const leaguePosition = (s: GameState) => standings(s).filter((c) => c.division === club(s).division).findIndex((c) => c.id === s.clubId) + 1;
export function record(s: GameState) {
  const r = s.results ?? [];
  return { w: r.filter((x) => x.us > x.them).length, d: r.filter((x) => x.us === x.them).length, l: r.filter((x) => x.us < x.them).length };
}
/** Weekly hook (after the match is settled). */
export function delegateWeek(s: GameState): GameState {
  if (!delegated(s)) return s;
  const pl = plan(s);
  if (pl.request && (!windowOpen(s) || s.week - pl.request.week > 2)) { note(s, `Gave up on ${pl.request.name}: you didn't answer in time.`); delete pl.request; }
  let b = s;
  adaptTactics(b);
  b = manageStaff(b);
  b = manageContracts(b);
  b = manageTransfers(b);
  b = boardRescue(b);
  if (b.week % 4 === 0 && b.week >= 4) {
    const diff = expectedPos(b) - leaguePosition(b); // + = beating expectations
    const d = Math.max(-3, Math.min(3, Math.round(diff / 2)));
    if (d) { b.trust = Math.max(0, Math.min(100, b.trust + d)); b.fans = Math.max(0, Math.min(100, b.fans + d)); note(b, `${diff >= 0 ? 'Ahead of' : 'Behind'} expectations: ${leaguePosition(b)}th vs ${expectedPos(b)}th expected (board and fans ${d > 0 ? '+' : ''}${d}).`); }
  }
  return b;
}
/** Board rescue: while the club is in the red, freeze signings and (in a window) force one sale a week, highest wage among non-essentials first. */
export function boardRescue(s: GameState): GameState {
  if (!inRed(s)) { if (s.mgr?.frozen) { delete s.mgr.frozen; note(s, 'Back in the black: the board lifts the signing freeze.'); } return s; }
  let b = s; const p = plan(b);
  if (!p.frozen) { p.frozen = true; note(b, `Board freeze: no signings while ${b.budget < 0 ? `the bank is overspent by £${-b.budget}k` : `wages are £${bill(b) - wageLimit(b)}k/wk over the limit`}.`); b.headlines = [`🧊 The board freezes signings: ${b.budget < 0 ? `overspent £${-b.budget}k` : 'wages over the limit'}. Sales will be forced until the books balance.`, ...b.headlines].slice(0, 6); }
  if (!windowOpen(b)) return s.budget < 0 ? emergencyLoan(b) : b;
  if (ours(b).length <= 16) return b;
  if ((plan(b).asks ?? []).some((a) => a.kind === 'sell' && a.by === 'board')) return b; // waiting for your answer
  const out = saleCandidates(b, 'board')[0];
  if (!out) return b;
  return fairSale(b, out, 'board');
}
/** 3.3: sell at full value (or what we paid) to a club that will pay it; nobody will -> loan him out (the taker pays his wages). */
/** Who the board (highest wage off the XI) or the manager (old or weak non-starters) would move on, never protected or kept by you. */
function saleCandidates(b: GameState, by: 'board' | 'manager'): Player[] {
  const keep = new Set(plan(b).keep ?? []), mean = avg(b), r = b.hiredManager?.rating ?? 0;
  const ok = ours(b).filter((x) => !x.starting && !(x as any).loan && !isProtected(x) && !keep.has(x.id));
  return by === 'board' ? ok.sort((x, y) => y.wage - x.wage || x.id.localeCompare(y.id))
    : ok.filter((p) => p.age >= 31 || p.rating < mean - 6 + r * 0.4).sort((x, y) => x.rating - y.rating || x.id.localeCompare(y.id));
}
function fairSale(b: GameState, out: Player, by: 'board' | 'manager'): GameState {
  const fee = minSaleFee(out), buyer = findBuyer(b, out, fee);
  if (!buyer) { const n = loanAway(b, out, by === 'board' ? 'Board' : 'No buyer at his value'); return n; }
  if (fee > plan(b).approveOver) { const n = copy(b); ask(n, { kind: 'sell', playerId: out.id, name: out.name, fee, buyer: buyer.id, by }); return n; }
  const n = sellPlayer(b, out.id, fee); if (n === b) return b;
  plan(n).sales++;
  const what = `${out.name} sold for ${money(fee)} to ${buyer.name}`;
  note(n, by === 'board' ? `Board-forced sale: ${what}.` : `Sold ${out.name} (${slotPeek(out)}, ${out.age}) for ${money(fee)} to ${buyer.name}.`);
  if (by === 'board') n.headlines = [`🏦 Board-forced sale: ${what}.`, ...n.headlines].slice(0, 6);
  return n;
}
/** Send him on loan to a hash-picked club until season end; they pay his wages. */
function loanAway(b: GameState, out: Player, why: string): GameState {
  if (loansOut(b).length >= 10) return b;
  const takers = b.clubs.filter((c) => c.id !== b.clubId).sort((x, y) => hash(`${b.seed}|eloan|${out.id}|${x.id}`) - hash(`${b.seed}|eloan|${out.id}|${y.id}`));
  const to = takers[0]; if (!to) return b;
  const n = copy(b);
  n.players = n.players.filter((x) => x.id !== out.id);
  n.loansOut = [...loansOut(n), { ...out, starting: false, loanListed: false, loanClub: to.id }];
  note(n, `${why}: ${out.name} (£${out.wage}k/wk) loaned to ${to.name} until season end; they pay his wages.`);
  n.headlines = [`🏦 ${why}: ${out.name} goes on loan to ${to.name}, saving £${out.wage}k/wk.`, ...n.headlines].slice(0, 6);
  return n;
}
/** 3.2: overdrawn outside a window: send the top unprotected earner off the first team on loan (the taker pays his wages). */
function emergencyLoan(b: GameState): GameState {
  if (ours(b).length <= 16 || loansOut(b).length >= 10) return b;
  const xi = new Set(ours(b).filter((x) => x.starting).map((x) => x.id)), top = [...ours(b)].sort((x, y) => y.wage - x.wage).slice(0, 6).map((x) => x.id);
  const out = ours(b).filter((x) => top.includes(x.id) && !xi.has(x.id) && !(x as any).loan && !isProtected(x)).sort((x, y) => y.wage - x.wage || x.id.localeCompare(y.id))[0];
  if (!out) return b;
  return loanAway(b, out, 'Board emergency');
}
/** Before each match: he picks the side. */
export function delegateSelect(s: GameState) { if (delegated(s)) pickTeam(s); }
export const validMgr = (s: GameState) => s.mgr === undefined || (!!s.mgr && [s.mgr.transfer, s.mgr.wage, s.mgr.approveOver, s.mgr.spent, s.mgr.season].every(Number.isFinite) && Array.isArray(s.mgr.log) && s.mgr.log.every((x) => typeof x === 'string') && (s.mgr.mod === undefined || (Number.isInteger(s.mgr.mod) && s.mgr.mod >= MOD_MIN && s.mgr.mod <= MOD_MAX)) && (s.mgr.auto === undefined || (!!s.mgr.auto && Number.isFinite(s.mgr.auto.transfer) && Number.isFinite(s.mgr.auto.wage) && typeof s.mgr.auto.at === 'string')) && (s.mgr.asks === undefined || (Array.isArray(s.mgr.asks) && s.mgr.asks.length <= 6 && s.mgr.asks.every((a) => a && ['renew', 'sell'].includes(a.kind) && typeof a.playerId === 'string' && typeof a.name === 'string'))) && (s.mgr.keep === undefined || (Array.isArray(s.mgr.keep) && s.mgr.keep.every((x) => typeof x === 'string'))));
