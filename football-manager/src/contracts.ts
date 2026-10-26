/**
 * 3.8: dynamic contract renewals. A player's wage demand is built from the things that move real renewals
 * (perceived quality/market value, age and potential, recent form and playing time, position, personality,
 * time left on the deal, length asked for, the club's wage structure, rival interest, the agent and morale).
 * Every factor is returned as a reason so the negotiation screen can explain the figure.
 */
import type { GameState, Player } from './game.ts';
import { clamp, copy } from './game.ts';
import { league } from './world.ts';

export type Reason = { label: string; pct: number };
export type Demand = { ask: number; reasons: Reason[]; flex: number };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const unit = (k: string) => hash(k) / 4294967296;
const AGENTS = [['a tough agent', 8], ['a fair agent', 0], ['a friendly agent', -4]] as const;
export const agentOf = (s: GameState, p: Pick<Player, 'id'>) => AGENTS[hash(`${s.seed}|agent|${p.id}`) % 3];
const PERS: Record<string, [number, number]> = { Ambitious: [10, 0.04], Loyal: [-8, 0.14], Temperamental: [5, 0.05], Leader: [3, 0.08], Professional: [0, 0.09], 'Easy-going': [-4, 0.12] };
/** Clubs above us that would take him this season (hash-based, 0-3). */
export function rivals(s: GameState, p: Player) {
  const mine = s.clubs.find((c) => c.id === p.clubId)?.rating ?? 60;
  const strong = s.clubs.filter((c) => c.id !== p.clubId && c.rating >= Math.max(mine, p.rating - 4));
  return Math.min(3, strong.filter((c) => unit(`${s.seed}|rival|${p.id}|${s.season}|${c.id}`) < (p.age <= 29 ? 0.08 : 0.03)).length);
}
export function wageDemand(s: GameState, p: Player, years: number): Demand {
  const r: Reason[] = [], add = (label: string, pct: number) => r.push({ label, pct: Math.round(pct) });
  const home = p.clubId && p.clubId !== 'market' ? p.clubId : s.clubId;
  const squad = s.players.filter((x) => x.clubId === home && !x.loan && x.id !== p.id);
  const sw = squad.reduce((a, x) => a + x.wage, 0), sp = squad.reduce((a, x) => a + Math.max(1, x.price), 0);
  const avgR = squad.reduce((a, x) => a + x.rating, 0) / Math.max(1, squad.length), avgW = sw / Math.max(1, squad.length);
  const cur = Math.max(1, p.wage);
  // Market value at this club's wage-to-value ratio vs what he earns now.
  const byValue = (p.price || 0) * (sw / Math.max(1, sp));
  add(`Market value £${((p.price || 0) / 1000).toFixed(1)}m vs current pay`, clamp((byValue / cur - 1) * 50, -25, 40));
  // Club wage structure: where his rating sits among team-mates (and the league tier).
  const c = s.clubs.find((x) => x.id === home), lg = c ? league(c.division) : undefined;
  const struct = avgW * (1 + (p.rating - avgR) * 0.05);
  add(`Wage structure${lg ? ` (${lg.name})` : ''}: rating ${p.rating} vs squad ${Math.round(avgR)}`, clamp((struct / cur - 1) * 30, -15, 25));
  add(`Age ${p.age}${p.potential > p.rating && p.age < 24 ? `, potential ${p.potential}` : ''}`,
    p.age >= 30 ? -(p.age - 29) * 5 : p.age < 24 ? 3 + Math.min(12, Math.max(0, p.potential - p.rating) * 0.8) : 2);
  const apps = p.apps ?? 0, avg = apps ? (p.ratingSum ?? 0) / apps : 0;
  add(apps >= 3 ? `Form: average rating ${avg.toFixed(2)}` : 'Form: too few games to judge', apps >= 3 ? clamp((avg - 6.8) * 12, -12, 15) : 0);
  const games = Math.max(1, ...s.players.filter((x) => x.clubId === home).map((x) => x.apps ?? 0));
  const share = apps / games;
  add(p.starting || share >= 0.6 ? 'Squad status: key starter' : share >= 0.3 ? 'Squad status: rotation' : 'Squad status: fringe (few apps)', p.starting || share >= 0.6 ? 6 : share >= 0.3 ? 0 : -8);
  add(`Position: ${p.position}`, p.position === 'FW' ? 5 : p.position === 'GK' ? -5 : 0);
  const [pp, flex] = PERS[p.personality ?? 'Professional'] ?? [0, 0.09];
  add(`Personality: ${p.personality ?? 'Professional'}`, pp);
  const left = p.contract ?? 2;
  add(`Contract left: ${left} year${left === 1 ? '' : 's'}`, left <= 0 ? 10 : left === 1 ? 5 : left === 2 ? 0 : -3 * (left - 2));
  add(`Length asked: ${years} year${years === 1 ? '' : 's'}`, p.age <= 26 ? (years - 3) * 3 : p.age >= 30 ? -(years - 1) * 4 : 0);
  const n = rivals(s, p); add(n ? `Rival interest: ${n} club${n > 1 ? 's' : ''}` : 'Rival interest: none', n * 5);
  const ag = agentOf(s, p); add(`Represented by ${ag[0]}`, ag[1]);
  add(`Morale ${Math.round(p.morale)}`, clamp(-(p.morale - 60) * 0.15, -6, 8));
  const total = clamp(r.reduce((a, x) => a + x.pct, 0), -45, 90);
  return { ask: Math.max(1, Math.round(cur * (1 + total / 100))), reasons: r, flex };
}
export type Offer = { state: GameState; result: 'accepted' | 'countered' | 'refused'; counter?: number; message: string; demand: Demand; why: string[]; walkedOut?: boolean };
/** 3.9: one renewal negotiation per player: rounds used, his fixed counter, and a lock after he walks out. */
export type Talks = { years: number; rounds: number; counter?: number; lockUntil?: number; insults?: number };
export const MAX_ROUNDS = 3, LOCK_WEEKS = 4;
const now = (s: Pick<GameState, 'season' | 'week'>) => s.season * 18 + s.week;
export const talksOf = (s: GameState, id: string): Talks | undefined => s.renewTalks?.[id];
export const talksLocked = (s: GameState, id: string) => { const t = talksOf(s, id); return !!t?.lockUntil && t.lockUntil > now(s) ? t.lockUntil - now(s) : 0; };
const setTalks = (b: GameState, id: string, t?: Talks) => { const all = { ...(b.renewTalks ?? {}) }; if (t) all[id] = t; else delete all[id]; b.renewTalks = all; };
/** 3.9: how he negotiates — rounds of patience, how much his counter softens per round, how wide a gap he'll still counter. */
export type Temper = { rounds: number; soften: number; zone: number; reasons: string[] };
export function temperament(s: GameState, p: Player, insults = 0): Temper {
  const why: string[] = []; let rounds = 3, soften = 0.02, zone = 0.2;
  const pers = p.personality ?? 'Professional';
  const P: Record<string, [number, number, number, string]> = {
    Loyal: [1, 0.03, 0.08, 'Loyal: patient, eases his demand'], 'Easy-going': [1, 0.02, 0.06, 'Easy-going: relaxed about talks'],
    Ambitious: [0, -0.02, -0.06, 'Ambitious: holds firm'], Temperamental: [-1, 0, -0.04, 'Temperamental: short fuse'],
    Leader: [0, 0.01, 0, 'Leader: reasonable but proud'], Professional: [0, 0, 0, 'Professional: businesslike'] };
  const [r0, s0, z0, l0] = P[pers] ?? P.Professional; rounds += r0; soften += s0; zone += z0; why.push(l0);
  if (p.age >= 31) { soften += 0.02; zone += 0.04; why.push(`Age ${p.age}: values security`); } else if (p.age <= 23) { soften -= 0.01; why.push(`Age ${p.age}: knows his future value`); }
  if (p.starting) { soften -= 0.01; why.push('Key starter: knows his worth'); } else { soften += 0.01; why.push('Not a regular: keen to stay'); }
  const n = rivals(s, p); if (n >= 2) { rounds -= 1; soften -= 0.01; why.push(`${n} rival clubs interested: little patience`); } else if (n === 1) why.push('One rival club interested');
  if (p.morale >= 75) { soften += 0.02; rounds += 0; why.push('Happy here'); } else if (p.morale <= 35) { rounds -= 1; why.push('Unhappy: quick to walk'); }
  const ag = agentOf(s, p); if (ag[1] > 0) { soften -= 0.01; why.push('Tough agent: slow to budge'); } else if (ag[1] < 0) { soften += 0.01; why.push('Friendly agent: eases talks'); }
  if (insults) { rounds -= insults; zone -= 0.05 * insults; why.push(`Insulted by ${insults} lowball offer${insults > 1 ? 's' : ''}`); }
  return { rounds: Math.max(pers === 'Temperamental' ? 1 : 2, Math.min(5, rounds)), soften: Math.max(0, Math.min(0.08, soften)), zone: Math.max(0.05, zone), reasons: why };
}
/**
 * Make an offer. He accepts within his flexibility or at/above his standing counter; counters on a moderate gap
 * (a fixed figure that never rises; it softens by his temperament); refuses a lowball. When his patience runs out
 * he walks out and will not talk for a few weeks. Offering his full ask always works (one-tap renew).
 */
export function offerRenewal(s: GameState, id: string, years: number, wage: number, clause?: number): Offer {
  const p = s.players.find((x) => x.id === id && x.clubId === s.clubId && !x.loan);
  const d = p ? wageDemand(s, p, years) : { ask: 0, reasons: [], flex: 0 };
  if (!p || s.match || !(years >= 1 && years <= 5) || !(wage >= 1)) return { state: s, result: 'refused', message: 'No talks possible right now.', demand: d, why: [] };
  const withClause = clause !== undefined && Number.isFinite(clause) && clause > 0;
  const ask = withClause ? Math.max(1, Math.round(d.ask * 0.95)) : d.ask, floor = ask * (1 - d.flex);
  const old = talksOf(s, id), locked = talksLocked(s, id);
  const live = old && !old.lockUntil ? old : undefined;
  const standing = live && live.years === years ? live.counter : undefined;
  const tm = temperament(s, p, live?.insults ?? 0), why = tm.reasons;
  const lowball = wage < floor - ask * tm.zone;
  // A counter must be a whole number strictly between the offer and the ask (and above 85% of the ask).
  const counterLo = Math.max(Math.floor(wage) + 1, Math.floor(ask * 0.85) + 1);
  const counterHi = ask - 1;
  const noCounter = !lowball && counterLo > counterHi;
  if (wage >= ask || (!locked && (wage >= floor || (standing !== undefined && wage >= standing) || noCounter))) {
    const b = copy(s), t = b.players.find((x) => x.id === id)!;
    t.wage = Math.round(wage); t.contract = years;
    if (withClause) t.clause = Math.max(Math.round(t.price * 1.2), Math.round(clause!));
    t.morale = clamp(t.morale + (wage >= ask ? 6 : 3)); setTalks(b, id);
    b.headlines = [`${t.name} commits his future for ${years} more year${years > 1 ? 's' : ''} (£${t.wage}k/wk).`, ...b.headlines].slice(0, 6);
    return { state: b, result: 'accepted', message: `${p.name} accepts £${t.wage}k/wk for ${years} year${years > 1 ? 's' : ''}.`, demand: d, why };
  }
  if (locked) return { state: s, result: 'refused', message: `${p.name} won't talk for another ${locked} week${locked > 1 ? 's' : ''} (only his full ask of £${ask}k/wk would do).`, demand: d, why };
  const b = copy(s), t = b.players.find((x) => x.id === id)!, rounds = (live?.rounds ?? 0) + 1;
  const pers = p.personality ?? 'Professional';
  const insults = (live?.insults ?? 0) + (lowball ? 1 : 0);
  const walk = rounds >= tm.rounds || (lowball && pers === 'Temperamental' && insults >= 2);
  if (walk) {
    t.morale = clamp(t.morale - (pers === 'Temperamental' ? 12 : pers === 'Ambitious' ? 9 : pers === 'Loyal' || pers === 'Easy-going' ? 4 : 6));
    setTalks(b, id, { years, rounds, insults, lockUntil: now(b) + LOCK_WEEKS });
    return { state: b, result: 'refused', walkedOut: true, message: `${p.name} walks out after ${rounds} round${rounds > 1 ? 's' : ''}. No talks for ${LOCK_WEEKS} weeks.`, demand: d, why };
  }
  if (!lowball) {
    // Fixed counter between the offer and the ask; never rises, eases by his temperament each further round.
    const fresh = Math.max(Math.ceil(floor), Math.round(ask - (ask - floor) * 0.5));
    const prev = live?.counter;
    const raw = prev !== undefined ? Math.max(Math.ceil(floor), Math.min(prev - (tm.soften > 0 ? 1 : 0), Math.round(prev * (1 - tm.soften)))) : fresh;
    const hi = prev !== undefined ? Math.min(counterHi, prev) : counterHi;
    const counter = Math.max(counterLo, Math.min(hi, raw));
    setTalks(b, id, { years, rounds, counter, insults });
    const left = tm.rounds - rounds;
    return { state: b, result: 'countered', counter, message: `${p.name}'s agent counters at £${counter}k/wk${prev !== undefined ? (counter < prev ? ' (softened)' : ' (holding firm)') : ''}. ${left} round${left === 1 ? '' : 's'} of patience left.`, demand: d, why };
  }
  t.morale = clamp(t.morale - (pers === 'Temperamental' ? 8 : 4));
  setTalks(b, id, { years, rounds, counter: live?.counter, insults });
  return { state: b, result: 'refused', message: `${p.name} is insulted by £${wage}k/wk and rejects it. His patience is wearing thin.`, demand: d, why };
}

/** Contract length a club offers: long for the young, short for veterans. */
export const renewYears = (p: Pick<Player, 'age'>) => p.age <= 24 ? 5 : p.age <= 28 ? 4 : p.age <= 30 ? 3 : 2; // 1 would not extend a deal that ends this season
export type RenewPlan = { renew: boolean; years: number; ask: number; why: string };
/**
 * 3.8: should the club (a delegated manager or an AI club) keep him, for how long and at what wage?
 * Uses the same demand model as the negotiation screen; protected/wonderkid players are always kept.
 */
export function renewalPlan(s: GameState, p: Player, protectedPlayer = false): RenewPlan {
  const years = renewYears(p), d = wageDemand(s, p, years);
  const home = p.clubId && p.clubId !== 'market' ? p.clubId : s.clubId;
  const sq = s.players.filter((x) => x.clubId === home && !x.loan);
  const mean = sq.reduce((a, x) => a + x.rating, 0) / Math.max(1, sq.length);
  const sw = sq.reduce((a, x) => a + x.wage, 0), sp = sq.reduce((a, x) => a + Math.max(1, x.price), 0);
  const worth = Math.max(1, (p.price || 0) * (sw / Math.max(1, sp)));
  const top = d.reasons.filter((r) => r.pct !== 0).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3).map((r) => `${r.label} ${r.pct > 0 ? '+' : ''}${r.pct}%`).join('; ');
  const out = (renew: boolean, why: string): RenewPlan => ({ renew, years, ask: d.ask, why: `${why}${top ? ` (${top})` : ''}` });
  if (protectedPlayer) return out(true, 'protected talent');
  if (p.age >= 33 && p.rating < mean + 3) return out(false, `declining at ${p.age}`);
  if (p.rating < mean - 4) return out(false, `below squad level (${p.rating} vs ${Math.round(mean)})`);
  if (d.ask > worth * 1.6 && p.rating < mean + 5) return out(false, `asks £${d.ask}k/wk, worth about £${Math.round(worth)}k`);
  return out(true, `ask £${d.ask}k/wk vs worth about £${Math.round(worth)}k`);
}

/** 3.9: years for a one-tap renewal at any time — always longer than what's left, max 5 (0 = already maxed). */
export const earlyRenewYears = (p: Pick<Player, 'age' | 'contract'>) => {
  const left = p.contract ?? 0;
  return left >= 5 ? 0 : Math.min(5, Math.max(renewYears(p), left + 1));
};

/** 3.9: the Squad › Contracts list: every player, soonest expiry first. */
export function contractRows(s: GameState) {
  return s.players.filter((p) => p.clubId === s.clubId).map((p) => {
    const years = earlyRenewYears(p);
    return { id: p.id, name: p.name, position: p.position, age: p.age, left: p.contract ?? 0, wage: p.wage, mv: p.price, years, ask: wageDemand(s, p, years || 5).ask };
  }).sort((a, b) => a.left - b.left || b.wage - a.wage);
}
