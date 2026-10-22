import type { GameState, Player } from './game.ts';
import { askingPrice, clamp, club, copy, int, next, pick } from './game.ts';
import { reputation } from './jobs.ts';

/** An inbox message: an agent touting a client, or a free agent approaching you. */
export type AgentMsg = { id: string; kind: 'agent' | 'free'; playerId: string; wage: number; week: number; season: number };
export type FreeOffer = { wage: number; years: number; bonus: number };

export const agentMsgs = (s: GameState) => s.agentMsgs ?? [];
/** Best player rating that would consider joining, from reputation and club rating. */
export function ceiling(s: GameState) {
  const rep = s.reputation ?? reputation(s);
  return Math.round(Math.max(club(s).rating + 4, 56 + rep * 0.32));
}
const age = (s: GameState, m: AgentMsg) => (s.season - m.season) * 40 + s.week - m.week;
export const findPlayer = (s: GameState, id: string): Player | undefined =>
  s.market.find((p) => p.id === id) ?? s.rivals?.find((p) => p.id === id);

export function agentText(s: GameState, m: AgentMsg) {
  const p = findPlayer(s, m.playerId);
  if (!p) return '';
  const from = s.clubs.find((c) => c.id === p.clubId)?.short;
  return m.kind === 'agent'
    ? `Agent of ${p.name} (${from ?? 'free'}) says he'd join you for £${m.wage}k wages.`
    : `${p.name} is a free agent and wants to join you: £${m.wage}k a week, no fee.`;
}

/** Weekly: expire stale messages, then maybe add agent pitches and free-agent approaches. */
export function agentsWeek(b: GameState) {
  b.agentMsgs = agentMsgs(b).filter((m) => age(b, m) <= 3 && findPlayer(b, m.playerId));
  const cap = ceiling(b), floor = club(b).rating - 8;
  const taken = new Set(b.agentMsgs.map((m) => m.playerId));
  if (b.agentMsgs.length < 5 && next(b) < 0.4) {
    const pool = (b.rivals ?? []).filter(
      (p) => p.clubId !== b.clubId && p.rating >= floor && p.rating <= cap && askingPrice(p) <= Math.max(300, b.budget * 1.2) && !taken.has(p.id),
    );
    if (pool.length) {
      const p = pick(b, pool);
      b.agentMsgs.push({ id: `ag${b.season}-${b.week}-${int(b, 0, 99999)}`, kind: 'agent', playerId: p.id, wage: Math.round(p.wage * (1.05 + next(b) * 0.3)), week: b.week, season: b.season });
    }
  }
  if (b.agentMsgs.length < 5 && next(b) < 0.3) {
    const pool = b.market.filter((p) => p.rating <= cap && !taken.has(p.id));
    if (pool.length) {
      const p = pick(b, pool);
      b.agentMsgs.push({ id: `fa${b.season}-${b.week}-${int(b, 0, 99999)}`, kind: 'free', playerId: p.id, wage: Math.round(p.wage * (0.95 + next(b) * 0.2)), week: b.week, season: b.season });
    }
  }
}
export function declineMsg(s: GameState, id: string): GameState {
  const b = copy(s);
  b.agentMsgs = agentMsgs(b).filter((m) => m.id !== id);
  return b;
}
/** What a free agent wants per week: his message ask, or his wage plus a premium if ambitious. */
export function freeAsk(s: GameState, p: Player) {
  const m = agentMsgs(s).find((x) => x.playerId === p.id);
  return m?.wage ?? Math.round(p.wage * (p.personality === 'Ambitious' ? 1.15 : 1.05));
}
/** Sign a free agent: no fee, only wages and a signing bonus (£k). */
export function signFreeAgent(s: GameState, id: string, o: FreeOffer): [GameState, string] {
  const p = s.market.find((x) => x.id === id);
  if (s.match || !p) return [s, 'That player is no longer available.'];
  if (s.players.filter((x) => x.clubId === s.clubId).length >= 30) return [s, 'Your squad is full (30).'];
  if (o.bonus < 0 || o.wage <= 0 || o.years < 1 || o.years > 5) return [s, 'Invalid offer.'];
  if (o.bonus > s.budget) return [s, 'You cannot afford that signing bonus.'];
  if (p.rating > ceiling(s) + 3) return [s, `${p.name} isn't interested in a club of your stature.`];
  const ask = freeAsk(s, p);
  const worth = o.wage + o.bonus / (o.years * 12) + (o.years >= 3 && p.age >= 30 ? ask * 0.05 : 0);
  if (worth < ask * 0.95) return [s, `${p.name} turns it down. He wants about £${ask}k a week (a signing bonus helps).`];
  const b = copy(s);
  const t = b.market.find((x) => x.id === id)!;
  b.market = b.market.filter((x) => x.id !== id);
  Object.assign(t, { clubId: b.clubId, starting: false, morale: clamp(70 + (o.wage > ask ? 10 : 0)), wage: o.wage, contract: o.years, price: t.price });
  delete t.released;
  b.players.push(t);
  b.budget -= o.bonus;
  b.agentMsgs = agentMsgs(b).filter((m) => m.playerId !== id);
  const msg = `${t.name} signs on a free: £${o.wage}k/wk for ${o.years} year${o.years > 1 ? 's' : ''}${o.bonus ? `, £${o.bonus}k bonus` : ''}.`;
  b.headlines = [msg, ...b.headlines].slice(0, 6);
  return [b, msg];
}
/** Counter an AI bid. Close to the bid: they agree. A stretch: they may meet halfway. Too far: they walk. */
export function counterBid(s: GameState, bidId: string, fee: number): [GameState, string] {
  const bid = s.bids?.find((x) => x.id === bidId);
  if (!bid || s.match) return [s, 'That bid has expired.'];
  const b = copy(s);
  const x = b.bids!.find((y) => y.id === bidId)!;
  const who = b.clubs.find((c) => c.id === x.clubId)?.short ?? 'They';
  const r = fee / x.fee;
  if (r <= 1) return [s, 'Counter higher than their bid, or just accept it.'];
  if (r <= 1.1) { x.fee = Math.round(fee); return [b, `${who} agree to £${x.fee}k. Accept to complete the sale.`]; }
  if (r <= 1.35 && next(b) < (1.35 - r) / 0.25 + 0.2) { x.fee = Math.round((fee + x.fee) / 2); return [b, `${who} meet you halfway: £${x.fee}k.`]; }
  b.bids = b.bids!.filter((y) => y.id !== bidId);
  return [b, `${who} walk away from the deal.`];
}
/** Released players join the free-agent pool (kept across market refreshes). */
export function release(s: GameState, p: Player) {
  const f: Player = { ...p, clubId: 'market', starting: false, listed: false, released: true, contract: 0, goals: 0, assists: 0 };
  delete f.loan; delete f.clause;
  s.market = [...s.market.filter((x) => x.id !== p.id), f].slice(-20);
}
export function validAgents(s: GameState) {
  const m = s.agentMsgs;
  if (m === undefined) return true;
  return Array.isArray(m) && m.length <= 10 && m.every((x) => x && typeof x.id === 'string' && (x.kind === 'agent' || x.kind === 'free') && typeof x.playerId === 'string' && Number.isFinite(x.wage) && x.wage >= 0 && Number.isInteger(x.week) && Number.isInteger(x.season));
}
