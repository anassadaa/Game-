/**
 * 3.9 negotiation helpers. Each deal type (fee when buying, fee when selling, personal terms, loans) has its OWN stance
 * function below with its own factors, patience and reasons — see docs/negotiation-research.md. The only shared pieces
 * are the stored session (rounds, standing counter, lock-out) and `towards`, which makes a counter move only toward agreement.
 */
import type { Club, GameState, Player } from './game.ts';

export type Deal = { rounds: number; counter?: number; lockUntil?: number; insults?: number; feeAgreed?: number };
export type Stance = { ask: number; floor: number; rounds: number; soften: number; reasons: string[] };

const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
export const nowWeek = (s: Pick<GameState, 'season' | 'week'>) => s.season * 18 + s.week;
export const dealOf = (s: GameState, key: string): Deal | undefined => s.deals?.[key];
export const dealLocked = (s: GameState, key: string) => { const d = dealOf(s, key); return d?.lockUntil ? Math.max(0, d.lockUntil - nowWeek(s)) : 0; };
export function setDeal(b: GameState, key: string, d: Deal | undefined) {
  const all = { ...(b.deals ?? {}) };
  if (d) all[key] = d; else delete all[key];
  b.deals = all;
}
/** A standing counter only moves toward the other side: a seller's ask never rises, a buyer's bid never falls. */
export const towards = (prev: number | undefined, fresh: number, dir: 'down' | 'up') =>
  prev === undefined ? fresh : dir === 'down' ? Math.min(prev, fresh) : Math.max(prev, fresh);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const LOCK = 3;
export const LOCK_WEEKS = LOCK;

/** How many other clubs are sniffing around him this week (0–3), hash-based. */
export const otherBidders = (s: GameState, p: Player) => Math.floor(hash(`${s.seed}|bidders|${p.id}|${s.season}|${s.week}`) * (p.rating >= 75 ? 4 : p.rating >= 65 ? 3 : 2));
/** A club's bargaining temperament, fixed per club and season. */
export function clubTemper(s: GameState, clubId: string) {
  const r = hash(`${s.seed}|temper|${clubId}|${s.season}`);
  return r < 0.3 ? { label: 'Hard bargainers', rounds: 2, soften: 0.03 } : r < 0.75 ? { label: 'Pragmatic board', rounds: 3, soften: 0.06 } : { label: 'Willing sellers', rounds: 4, soften: 0.09 };
}

/* ───────────── 1. Transfer fee — WE BUY, the selling club decides ───────────── */
export function sellerStance(s: GameState, p: Player, seller: Club | undefined, base: number, deadline: boolean): Stance {
  const reasons: string[] = []; const t = clubTemper(s, seller?.id ?? 'market');
  let floor = 0.85, ask = base, rounds = t.rounds, soften = t.soften;
  reasons.push(`${t.label}`);
  const left = p.contract ?? 0;
  if (left <= 1) { ask = Math.round(base * 0.85); floor -= 0.12; soften += 0.02; reasons.push(`${left}y left on his deal: sell now or lose him free`); }
  else if (left >= 4) { floor += 0.08; reasons.push(`${left}y left: no pressure to sell`); }
  const cover = s.rivals?.filter((x) => x.clubId === p.clubId && x.id !== p.id && x.position === p.position && x.rating >= p.rating - 3).length ?? 0;
  if (seller && p.rating >= seller.rating + 2 && !cover) { floor += 0.1; soften -= 0.02; reasons.push('Key player with no ready replacement'); }
  else if (cover) { floor -= 0.04; reasons.push('They have cover in his position'); }
  if (p.listed) { floor -= 0.06; soften += 0.02; reasons.push('Transfer-listed: they want him gone'); }
  if (seller && seller.division >= 3) { floor -= 0.05; reasons.push('Lower-league club: needs the money'); }
  else if (seller && seller.division === 1) { floor += 0.04; reasons.push('Top-flight club: no need to cash in'); }
  const bidders = otherBidders(s, p);
  if (bidders) { floor += 0.04 * bidders; rounds -= bidders >= 2 ? 1 : 0; soften -= 0.01 * bidders; reasons.push(`${bidders} other club${bidders > 1 ? 's' : ''} interested`); }
  if (deadline) { if (bidders) { soften -= 0.02; reasons.push('Deadline day with rival bids: holding out'); } else { floor -= 0.05; soften += 0.03; reasons.push('Deadline day, no other bids: keen to deal'); } }
  if (p.age >= 31) { floor -= 0.05; reasons.push(`Age ${p.age}: value is falling`); }
  return { ask, floor: Math.min(ask, Math.round(base * clamp(floor, 0.62, 1))), rounds: clamp(rounds, 2, 4), soften: clamp(soften, 0.01, 0.12), reasons };
}

/* ───────────── 2. Transfer fee — WE SELL, the buying club decides ───────────── */
export function buyerStance(s: GameState, p: Player, buyer: Club, bid: number, deadline: boolean): Stance {
  const reasons: string[] = []; const t = clubTemper(s, buyer.id);
  let max = 1.0, rounds = Math.min(3, t.rounds), soften = 0.3 + t.soften * 2; // soften = share of the gap they close each round
  reasons.push(t.label);
  if (p.rating >= buyer.rating + 3) { max += 0.2; reasons.push('He would walk into their XI: they need him'); }
  else if (p.rating < buyer.rating - 3) { max -= 0.12; soften -= 0.1; reasons.push('Only squad depth for them'); }
  if (buyer.division === 1) { max += 0.1; reasons.push('Top-flight budget'); } else if (buyer.division >= 3) { max -= 0.1; rounds -= 1; reasons.push('Tight budget'); }
  const alts = Math.floor(hash(`${s.seed}|alts|${buyer.id}|${p.position}|${s.season}|${s.week}`) * 3);
  if (alts) { max -= 0.05 * alts; soften -= 0.05; reasons.push(`${alts} alternative target${alts > 1 ? 's' : ''} in his position`); }
  if ((p.contract ?? 0) <= 1) { max -= 0.12; reasons.push(`${p.contract ?? 0}y left: they could wait for a free`); }
  if (p.age >= 31) { max -= 0.1; reasons.push(`Age ${p.age}`); } else if (p.age <= 22 && p.potential >= p.rating + 6) { max += 0.1; reasons.push('Young with upside'); }
  if (deadline) { max += 0.06; reasons.push('Deadline day: they need a deal'); }
  const ceiling = Math.max(bid, Math.round(p.price * clamp(max, 0.75, 1.5)));
  return { ask: bid, floor: ceiling, rounds: clamp(rounds, 2, 3), soften: clamp(soften, 0.15, 0.6), reasons };
}

/* ───────────── 3. Personal terms with a new signing ───────────── */
export function termsStance(s: GameState, p: Player, ours: Club, from: Club | undefined, wouldStart: boolean): Stance {
  const reasons: string[] = []; let k = 1, rounds = 3, soften = 0.04;
  const pers = p.personality ?? 'Professional';
  if (pers === 'Ambitious') { k += 0.15; rounds -= 1; soften -= 0.02; reasons.push('Ambitious: wants paying'); }
  if (pers === 'Loyal' || pers === 'Easy-going') { rounds += 1; soften += 0.02; reasons.push(`${pers}: flexible`); }
  if (pers === 'Temperamental') { rounds -= 1; reasons.push('Temperamental: short fuse'); }
  const step = from ? ours.rating - from.rating + (from.division - ours.division) * 6 : 0;
  if (step >= 5) { k -= 0.05; soften += 0.01; reasons.push('A step up for him'); }
  else if (step <= -5) { k += 0.15; rounds -= 1; reasons.push('A step down: needs convincing'); }
  if (wouldStart) { k -= 0.05; reasons.push('Promised a starting place'); } else { k += 0.12; reasons.push('Would be a squad player: wants compensating'); }
  const agent = hash(`${s.seed}|agent|${p.id}`);
  if (agent < 0.3) { k += 0.05; soften -= 0.01; reasons.push('Tough agent'); } else if (agent > 0.8) { soften += 0.01; reasons.push('Reasonable agent'); }
  if (p.age >= 30) { k -= 0.04; reasons.push('Late career: values security'); }
  if (ours.id === s.clubId && s.fans >= 75) { k -= 0.04; reasons.push('Loves the atmosphere here'); } else if (ours.id === s.clubId && s.fans < 30) { k += 0.06; reasons.push('Toxic atmosphere: wants more'); }
  const ask = Math.max(1, Math.round(p.wage * k));
  return { ask, floor: Math.max(1, Math.round(ask * 0.9)), rounds: clamp(rounds, 2, 4), soften: clamp(soften, 0.01, 0.08), reasons };
}

/* ───────────── 4. Loans — the parent club decides ───────────── */
export type LoanOffer = { wageShare: number; role: 'starter' | 'rotation' | 'backup' };
export function loanStance(_s: GameState, p: Player, ours: Club): { needShare: number; needRole: LoanOffer['role']; fee: number; rounds: number; reasons: string[] } {
  const reasons: string[] = []; let need = 0.6, rounds = 3; let role: LoanOffer['role'] = 'rotation';
  const prospect = p.age <= 21 && p.potential >= p.rating + 6;
  if (prospect) { role = 'starter'; reasons.push('Prospect: they want him playing every week'); }
  if (p.age >= 29) { role = 'backup'; need += 0.2; reasons.push('Veteran: they mainly want his wages off the books'); }
  if (p.wage >= 20) { need += 0.15; reasons.push('High earner: you must cover most of his wage'); }
  if (ours.division >= 3) { need -= 0.1; rounds -= 1; reasons.push('Lower-league borrower: less leverage either way'); }
  if (!reasons.length) reasons.push('Squad player: they want regular minutes and a fair wage share');
  const fee = Math.round(p.price * (prospect ? 0.12 : 0.15));
  return { needShare: clamp(need, 0.4, 1), needRole: role, fee, rounds: clamp(rounds, 2, 3), reasons };
}
export const ROLE_RANK: Record<LoanOffer['role'], number> = { backup: 0, rotation: 1, starter: 2 };

/** Round bookkeeping shared by every deal type: returns the next session and whether patience ran out. */
export function nextRound(d: Deal | undefined, rounds: number, insult = false) {
  const used = (d?.rounds ?? 0) + 1, insults = (d?.insults ?? 0) + (insult ? 1 : 0);
  const cap = Math.max(1, rounds - Math.max(0, insults - 1)); // the first insult is forgiven, later ones cost patience
  return { used, insults, out: used >= cap, left: Math.max(0, cap - used) };
}
