// 2.9: the hired manager runs the football (Director / Owner-Director / Chairman careers).
// Everything is deterministic (hash-based), scaled by his rating and style.
import type { GameState, Player } from './game.ts';
import { askingPrice, club, copy, negotiate, renewContract, sellPlayer, standings, windowOpen } from './game.ts';
import { BENCH } from './lineup.ts';
import { agentFee } from './finance.ts';
import { wageLimit } from './budget.ts';
import { dofDiscount } from './staff.ts';
import { suitability, slotsFor } from './lineup.ts';
import { FORMATION_SLOTS, slotPeek, type Slot } from './positions.ts';
import { canHire as canHireStaff, hireStaff, renewStaff, sackStaff, staff, staffBudget, staffWages, roleLabel, type StaffRole } from './staff.ts';

export type MgrRequest = { playerId: string; name: string; slot: Slot; fee: number; week: number; season: number };
export type MgrPlan = { transfer: number; wage: number; approveOver: number; spent: number; season: number; log: string[]; request?: MgrRequest; signings: number; sales: number; mod?: number; auto?: { transfer: number; wage: number; at: string } };
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
  const transfer = Math.max(0, Math.round((Math.max(0, s.budget) * 0.35 + income * 0.08) * form * ambition * jitter));
  const wage = Math.max(1, Math.round(Math.max(bill(s), wageLimit(s)) * (0.94 + 0.06 * form) * jitter));
  return { transfer, wage };
}
function applyAuto(s: GameState, p: MgrPlan) {
  const a = autoBudget(s), k = 1 + (p.mod ?? 0) / 100;
  p.auto = { ...a, at: phase(s) }; p.transfer = Math.round(a.transfer * k); p.wage = Math.round(a.wage * k);
}
/** The manager's budget: set automatically each window (and season), times your % modifier. Spending resets each season. */
export function plan(s: GameState): MgrPlan {
  if (!s.mgr || s.mgr.season !== s.season) {
    const prev = s.mgr;
    s.mgr = { transfer: 0, wage: 0, approveOver: prev?.approveOver ?? 1000, spent: 0, season: s.season, log: prev?.log ?? [], signings: 0, sales: 0, mod: prev?.mod ?? 0 };
  }
  if (s.mgr.auto?.at !== phase(s)) applyAuto(s, s.mgr);
  return s.mgr;
}
/** Your +/- % on top of the automatic budgets; persists between windows. */
export function setBudgetMod(s: GameState, pct: number): GameState {
  if (s.match || !Number.isInteger(pct) || pct < MOD_MIN || pct > MOD_MAX) return s;
  const b = copy(s), p = plan(b); p.mod = pct; applyAuto(b, p); return b;
}
export const budgetLeft = (s: GameState) => { const p = plan(s); return Math.max(0, Math.min(p.transfer - p.spent, s.budget)); };
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
  // Sack one weak staff member when a clearly better one for that role is available and affordable.
  const weak = staff(b).filter((x) => x.rating < bar).sort((x, y) => x.rating - y.rating)[0];
  if (weak && roll(b, 'sack') < 0.5) {
    const better = (b.staffMarket ?? []).find((x) => x.role === weak.role && x.rating >= weak.rating + 4 && x.rep <= 100);
    if (better && staffWages(b) - weak.wage + better.wage <= staffBudget(b) && b.budget > weak.wage * 8 * weak.contract + 100) {
      const n = sackStaff(b, weak.id); if (n !== b) { b = n; note(b, `Sacked ${roleLabel(weak.role).toLowerCase()} ${weak.name} (rated ${weak.rating}).`); }
    }
  }
  // Fill the most important empty role with the best affordable candidate.
  for (const role of KEY) {
    if (staff(b).some((x) => x.role === role)) continue;
    const c = (b.staffMarket ?? []).filter((x) => x.role === role && x.rating >= bar - 3 && !canHireStaff(b, x)).sort((x, y) => y.rating - x.rating)[0];
    if (c) { const n = hireStaff(b, c.id); if (n !== b) { b = n; note(b, `Hired ${c.name} as ${roleLabel(role).toLowerCase()} (rated ${c.rating}).`); break; } }
  }
  // Late season: keep good staff whose contracts end.
  if (b.week >= 15) for (const x of staff(b).filter((y) => y.contract <= 1 && y.rating >= bar && !(y as any).renewedBy)) {
    if (staffWages(b) + Math.round(x.wage * 0.1) + 1 > staffBudget(b)) continue;
    { const n = renewStaff(b, x.id); if (n === b) continue; b = n; } const y = staff(b).find((z) => z.id === x.id); if (y) (y as any).renewedBy = b.season;
    note(b, `Renewed ${roleLabel(x.role).toLowerCase()} ${x.name}'s contract.`);
  }
  return b;
}

// ---------- 3. Contracts ----------
const avg = (s: GameState) => { const o = ours(s); return o.reduce((a, p) => a + p.rating, 0) / Math.max(1, o.length); };
export function manageContracts(s: GameState): GameState {
  const p0 = plan(s); let b = s; const mean = avg(b), m = b.hiredManager!;
  for (const p of ours(b).filter((x) => (x.contract ?? 9) <= 1 && !(x as any).loan).sort((x, y) => y.rating - x.rating)) {
    const key = p.rating >= mean - 1 + (3 - m.rating) * 0.5 && p.age <= 31 + (p.rating >= mean + 5 ? 2 : 0);
    if (!key) {
      if (b.week === 16 && !(p as any).letGo) { (p as any).letGo = b.season; note(b, `Will let ${p.name} (${slotPeek(p)}, ${p.age}) leave when his contract ends.`); }
      continue;
    }
    const rise = Math.round(p.wage * 0.15) + 1;
    if (bill(b) + rise > p0.wage) { if (!(p as any).letGo) { (p as any).letGo = b.season; note(b, `Couldn't fit ${p.name}'s new deal in the £${p0.wage}k/wk wage budget.`); } continue; }
    { const n = renewContract(b, p.id, 3); if (n === b) continue; b = n; } note(b, `Renewed ${p.name} (${slotPeek(p)}) for 3 years.`);
  }
  return b;
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
  const mine = ours(b), mean = avg(b);
  if (mine.length > 20) {
    const out = mine.filter((p) => !p.starting && !(p as any).loan && (p.age >= 31 || p.rating < mean - 6 + m.rating * 0.4)).sort((x, y) => x.rating - y.rating)[0];
    if (out && roll(b, 'sell') < 0.4 + m.rating * 0.08) {
      const fee = Math.round(out.price * 0.68), n = sellPlayer(b, out.id);
      if (n !== b) { b = n; plan(b).sales++; note(b, `Sold ${out.name} (${slotPeek(out)}, ${out.age}) for ${money(fee)}.`); }
    }
  }
  if (plan(b).request || ours(b).length >= 25 || b.embargo) return b;
  const left = budgetLeft(b), wageRoom = p0.wage - bill(b), eye = 1 + m.rating; // better managers find better value
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
  if (dealCost(s, p) > budgetLeft(s)) return s;
  const fee = p.clubId === 'market' ? 0 : askingPrice(p, s);
  const [n] = negotiate(s, id, { fee, wage: wageAsk(p), years: 3 });
  if (!n.players.some((x) => x.id === id && x.clubId === s.clubId)) return s;
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
  if (b.week % 4 === 0 && b.week >= 4) {
    const diff = expectedPos(b) - leaguePosition(b); // + = beating expectations
    const d = Math.max(-3, Math.min(3, Math.round(diff / 2)));
    if (d) { b.trust = Math.max(0, Math.min(100, b.trust + d)); b.fans = Math.max(0, Math.min(100, b.fans + d)); note(b, `${diff >= 0 ? 'Ahead of' : 'Behind'} expectations: ${leaguePosition(b)}th vs ${expectedPos(b)}th expected (board and fans ${d > 0 ? '+' : ''}${d}).`); }
  }
  return b;
}
/** Before each match: he picks the side. */
export function delegateSelect(s: GameState) { if (delegated(s)) pickTeam(s); }
export const validMgr = (s: GameState) => s.mgr === undefined || (!!s.mgr && [s.mgr.transfer, s.mgr.wage, s.mgr.approveOver, s.mgr.spent, s.mgr.season].every(Number.isFinite) && Array.isArray(s.mgr.log) && s.mgr.log.every((x) => typeof x === 'string') && (s.mgr.mod === undefined || (Number.isInteger(s.mgr.mod) && s.mgr.mod >= MOD_MIN && s.mgr.mod <= MOD_MAX)) && (s.mgr.auto === undefined || (!!s.mgr.auto && Number.isFinite(s.mgr.auto.transfer) && Number.isFinite(s.mgr.auto.wage) && typeof s.mgr.auto.at === 'string')));
