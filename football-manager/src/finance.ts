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
