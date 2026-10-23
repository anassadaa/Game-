// Leadership, captaincy, player traits (PPMs) and hidden attributes revealed by coaches and scouts.
// Everything here derives from a hash of the player, so it needs no save data and never shifts the match RNG.
import type { GameState, Player } from './game.ts';
import { copy, clamp, ensureProfile } from './game.ts';
import { best } from './staff.ts';

export type Hidden = { consistency: number; bigMatch: number; professionalism: number; proneness: number };
export type Ppm = 'longShots' | 'divesIn' | 'runsWithBall';
export const PPM_LABEL: Record<Ppm, string> = { longShots: 'Tries long shots', divesIn: 'Dives into tackles', runsWithBall: 'Runs with ball' };
export const HIDDEN_LABEL: Record<keyof Hidden, string> = { consistency: 'Consistency', bigMatch: 'Big matches', professionalism: 'Professionalism', proneness: 'Injury proneness' };

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}
const roll = (p: Player, salt: string) => h(p.id + p.name + salt) / 4294967296;
const d20 = (p: Player, salt: string, bias = 0) => Math.max(1, Math.min(20, Math.round(4 + roll(p, salt) * 14 + bias)));

/** Leadership 1–20: visible. Leaders and older pros lead. */
export function leadership(p: Player) {
  ensureProfile(p);
  return d20(p, 'lead', (p.personality === 'Leader' ? 6 : 0) + (p.age >= 29 ? 2 : p.age <= 20 ? -3 : 0));
}
export function hidden(p: Player): Hidden {
  ensureProfile(p);
  return {
    consistency: d20(p, 'cons', p.personality === 'Temperamental' ? -4 : p.personality === 'Professional' ? 2 : 0),
    bigMatch: d20(p, 'big', p.personality === 'Leader' ? 3 : 0),
    professionalism: d20(p, 'pro', p.personality === 'Professional' ? 6 : p.personality === 'Easy-going' ? -4 : 0),
    proneness: d20(p, 'inj', (p.injuries ?? 0) * 1.5),
  };
}
export function ppms(p: Player): Ppm[] {
  const out: Ppm[] = [];
  if ((p.position === 'FW' || p.position === 'MF') && roll(p, 'ls') < 0.3) out.push('longShots');
  if ((p.position === 'DF' || p.position === 'MF') && roll(p, 'dt') < 0.25) out.push('divesIn');
  if ((p.position === 'FW' || p.position === 'MF') && roll(p, 'rb') < 0.3) out.push('runsWithBall');
  return out.slice(0, 2);
}
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);

// ---- Captaincy ----
export function captains(s: GameState): { captain?: Player; vice?: Player } {
  const o = own(s), byLead = [...o].sort((a, b) => leadership(b) - leadership(a) || b.age - a.age);
  const captain = o.find((p) => p.id === s.captain) ?? byLead[0];
  const vice = o.find((p) => p.id === s.vice && p.id !== captain?.id) ?? byLead.find((p) => p !== captain);
  return { captain, vice };
}
export function setCaptain(s: GameState, id: string, role: 'captain' | 'vice'): GameState {
  if (!own(s).some((p) => p.id === id)) return s;
  const b = copy(s);
  if (role === 'captain') { if (b.vice === id) b.vice = b.captain; b.captain = id; }
  else { if (b.captain === id) b.captain = b.vice; b.vice = id; }
  return b;
}
/** The armband on the pitch: captain if he starts, else the vice. */
export function onPitchLeader(s: GameState) {
  const { captain, vice } = captains(s);
  return captain?.starting ? captain : vice?.starting ? vice : undefined;
}
/** Small edge for a strong leader on the pitch; a weak one costs a little. */
export const leaderEdge = (s: GameState) => {
  const l = onPitchLeader(s);
  return l ? (leadership(l) - 11) * 0.004 : -0.02;
};
/** Weekly: a respected captain steadies morale. */
export function captainWeek(s: GameState) {
  const { captain } = captains(s);
  if (!captain) return;
  const lift = leadership(captain) >= 15 ? 1 : leadership(captain) <= 7 ? -1 : 0;
  if (lift) for (const p of own(s)) if (p !== captain) p.morale = clamp(p.morale + lift);
}

// ---- Match effects ----
/** Rating points added to a player this match: consistency swings, big-match temperament in cup or top games. */
export function formSwing(s: GameState, p: Player, big: boolean) {
  const x = hidden(p), r = h(`${p.id}-${s.season}-${s.week}`) / 4294967296 - 0.5;
  return r * (21 - x.consistency) * 0.45 + (big ? (x.bigMatch - 10) * 0.3 : 0);
}
/** Starters' traits shape the attack: long shots = more but poorer chances; runners add threat; divers win the ball but get booked. */
export function ppmEffect(s: GameState) {
  const xi = own(s).filter((p) => p.starting);
  let att = 0, def = 0, xg = 1, cards = 1;
  for (const p of xi) for (const t of ppms(p)) {
    if (t === 'longShots') { att += 0.012; xg *= 0.93; }
    if (t === 'runsWithBall') att += 0.012;
    if (t === 'divesIn') { def += 0.01; cards *= 1.12; }
  }
  return { att: Math.min(att, 0.06), def: Math.min(def, 0.04), xg: Math.max(xg, 0.75), cards: Math.min(cards, 1.6) };
}
export const playerCardMul = (p: Player) => (ppms(p).includes('divesIn') ? 1.35 : 1);

// ---- Knowledge ----
/** Weekly: coaches learn own players' hidden sides (2 a week, +1 per good coach); scouted players are revealed on a repeat report. */
export function revealWeek(s: GameState) {
  const coaches = 2 + (best(s, 'assistant') > 0 ? 1 : 0) + (best(s, 'attack') + best(s, 'defence') > 0 ? 1 : 0);
  own(s).filter((p) => !p.known).sort((a, b) => b.rating - a.rating).slice(0, coaches).forEach((p) => (p.known = true));
  for (const r of s.scoutReports ?? []) if (r.knowledge >= 60) {
    const p = s.players.find((x) => x.id === r.playerId) ?? (s.rivals ?? []).find((x) => x.id === r.playerId);
    if (p) p.known = true;
  }
}
export function validTraits(s: GameState) {
  const id = (v: unknown) => v === undefined || typeof v === 'string';
  return id(s.captain) && id(s.vice) && s.players.every((p) => p.known === undefined || typeof p.known === 'boolean');
}
