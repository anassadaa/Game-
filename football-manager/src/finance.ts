import type { GameState, Player } from './game.ts';
import { club } from './game.ts';

export type Ffp = { spend: number; income: number; fines: number };
export type SellOn = { playerId: string; name: string; pct: number };
/** Release clause for any player: explicit, or a default 2.2x value for rival-owned players. */
export const releaseClause = (p: Player) => p.clause ?? (p.clubId !== 'market' && p.position ? Math.round(p.price * 2.2) : undefined);
export const agentFee = (p: Player, fee: number) => Math.round(fee * 0.08 + p.wage * (p.clubId === 'market' ? 4 : 2));
export const ffpLimit = (s: GameState) => 300 + club(s).rating * 8;
export const ffpNet = (s: GameState) => (s.ffp?.spend ?? 0) - (s.ffp?.income ?? 0);
export function ffpSpend(s: GameState, n: number) { s.ffp ??= { spend: 0, income: 0, fines: 0 }; s.ffp.spend += Math.max(0, Math.round(n)); }
/** Record a sale: pays any sell-on owed to the previous club, records FFP income. Returns net to us. */
export function saleIncome(s: GameState, p: Player, fee: number) {
  s.ffp ??= { spend: 0, income: 0, fines: 0 };
  const owed = p.sellOn ? Math.round(fee * p.sellOn.pct / 100) : 0;
  if (owed) s.headlines = [`🧾 £${owed}k sell-on paid to ${s.clubs.find((c) => c.id === p.sellOn!.clubId)?.short ?? 'former club'}.`, ...s.headlines].slice(0, 6);
  delete p.sellOn;
  s.ffp.income += fee - owed;
  return fee - owed;
}
/** Our cut when a player we sold moves on between AI clubs. */
export function sellOnReceipt(s: GameState, p: Player, fee: number) {
  const so = s.sellOns?.find((x) => x.playerId === p.id);
  if (!so) return 0;
  const cut = Math.round(fee * so.pct / 100);
  s.budget += cut;
  s.ffp ??= { spend: 0, income: 0, fines: 0 };
  s.ffp.income += cut;
  s.sellOns = s.sellOns!.filter((x) => x !== so);
  s.headlines = [`💷 Sell-on clause: £${cut}k from ${p.name}'s move.`, ...s.headlines].slice(0, 6);
  return cut;
}
/** End of season FFP check: fine, board warning and a transfer embargo on breach. */
export function ffpSeason(s: GameState) {
  const net = ffpNet(s), limit = ffpLimit(s);
  const fines = s.ffp?.fines ?? 0;
  if (net > limit) {
    const fine = Math.round((net - limit) * 0.2);
    s.budget -= fine;
    s.embargo = true;
    if (s.board) s.board.warnings += 1;
    s.ffp = { spend: 0, income: 0, fines: fines + fine };
    return `⚖️ FFP breach: £${net}k net spend vs £${limit}k allowed. Fined £${fine}k and a one-season embargo on club signings.`;
  }
  s.embargo = false;
  s.ffp = { spend: 0, income: 0, fines };
  return `⚖️ FFP compliant: £${net}k net spend within the £${limit}k limit.`;
}
export const validFinance = (s: GameState) =>
  (s.ffp === undefined || (Number.isFinite(s.ffp.spend) && Number.isFinite(s.ffp.income) && Number.isFinite(s.ffp.fines))) &&
  (s.sellOns === undefined || (Array.isArray(s.sellOns) && s.sellOns.every((x) => x && typeof x.playerId === 'string' && x.pct > 0 && x.pct <= 50))) &&
  s.players.every((p) => (p.clause === undefined || Number.isFinite(p.clause)) && (p.sellOn === undefined || (typeof p.sellOn.clubId === 'string' && p.sellOn.pct > 0 && p.sellOn.pct <= 50)));

// ---- Club ledger: where the money comes from and goes, per season ----
export type InKind = 'gate' | 'tv' | 'sponsor' | 'prize' | 'sales' | 'other' | 'funding';
export type OutKind = 'wages' | 'running' | 'signings' | 'capital';
export type Ledger = { season: number; inc: Record<Exclude<InKind, 'funding'>, number> & { funding?: number }; out: Record<Exclude<OutKind, 'capital'>, number> & { capital?: number }; last: number; weeks: { w: number; net: number }[]; prev?: { season: number; income: number; costs: number; transferNet?: number; funding?: number; capital?: number } };
const zeroIn = (): Ledger['inc'] => ({ gate: 0, tv: 0, sponsor: 0, prize: 0, sales: 0, other: 0, funding: 0 });
const zeroOut = (): Ledger['out'] => ({ wages: 0, running: 0, signings: 0, capital: 0 });
export function ledger(s: GameState): Ledger {
  return (s.ledger ??= { season: s.season, inc: zeroIn(), out: zeroOut(), last: s.budget, weeks: [] });
}
export function book(s: GameState, kind: InKind | OutKind, amount: number) {
  const l = ledger(s), a = Math.round(amount);
  const incoming = ['gate', 'tv', 'sponsor', 'prize', 'sales', 'other', 'funding'].includes(kind);
  if (incoming) l.inc[kind as InKind] = (l.inc[kind as InKind] ?? 0) + a;
  else l.out[kind as OutKind] = (l.out[kind as OutKind] ?? 0) + a;
  l.last += incoming ? a : -a;
}
/** Anything not booked explicitly since the last sync: user deals (signings/sales) or weekly running costs. */
export function sync(s: GameState, how: 'deals' | 'running') {
  const l = ledger(s), d = Math.round(s.budget - l.last);
  if (d > 0) l.inc[how === 'deals' ? 'sales' : 'other'] += d;
  else if (d < 0) l.out[how === 'deals' ? 'signings' : 'running'] += -d;
  l.last = s.budget;
}
export const totalIn = (l: Ledger) => Object.values(l.inc).reduce((a, b) => a + b, 0);
export const totalOut = (l: Ledger) => Object.values(l.out).reduce((a, b) => a + b, 0);
/** Financing and distributions change the bank, not the club's earnings. */
export const earnedIncome = (l: Ledger) => totalIn(l) - (l.inc.funding ?? 0);
export const earnedCosts = (l: Ledger) => totalOut(l) - (l.out.capital ?? 0);
export function weekNet(s: GameState, before: number) {
  const l = ledger(s);
  l.weeks = [...l.weeks, { w: s.week, net: Math.round(s.budget - before) }].slice(-18);
}
export function closeLedger(s: GameState) {
  const l = ledger(s);
  sync(s, 'running');
  s.ledger = { season: s.season + 1, inc: zeroIn(), out: zeroOut(), last: s.budget, weeks: [], prev: { season: l.season, income: earnedIncome(l), costs: earnedCosts(l), transferNet: l.inc.sales - l.out.signings, funding: l.inc.funding ?? 0, capital: l.out.capital ?? 0 } };
}
/** Season-end central payment: TV share by tier plus merit money by league position, and a promotion bonus. */
export function seasonPayout(tier: number, pos: number, size: number, promoted: boolean) {
  const tv = tier === 1 ? 900 : 600, merit = (Math.max(0, size - pos)) * (tier === 1 ? 70 : 45);
  return { tv, prize: merit + (promoted ? 300 : 0) };
}
export function validLedger(s: GameState) {
  const l = s.ledger;
  if (l === undefined) return true;
  const nums = (o: unknown) => !!o && typeof o === 'object' && Object.values(o as object).every((v) => Number.isFinite(v));
  return Number.isInteger(l.season) && nums(l.inc) && nums(l.out) && Number.isFinite(l.last) && Array.isArray(l.weeks) && l.weeks.length <= 18;
}
