// Dressing-room structure: hierarchy, social groups, mentoring and wage grievances.
// Weekly effects use a hash of (player, week) so they never shift the match RNG.
import type { GameState, Player } from './game.ts';
import { clamp, copy } from './game.ts';
import { leadership } from './traits.ts';

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
export type Tier = 'Team leader' | 'Highly influential' | 'Influential' | 'Other';
const clout = (s: GameState, p: Player) => leadership(p) * 2 + Math.min(12, Math.max(0, p.age - 20)) + (p.rating - 50) / 2 + (s.captain === p.id ? 30 : s.vice === p.id ? 15 : 0);

/** The squad pecking order: captain and big personalities at the top. */
export function hierarchy(s: GameState): { id: string; name: string; tier: Tier }[] {
  const sq = own(s).sort((a, b) => clout(s, b) - clout(s, a));
  return sq.map((p, i) => ({ id: p.id, name: p.name, tier: i === 0 ? 'Team leader' : i < 3 ? 'Highly influential' : i < 7 ? 'Influential' : 'Other' }));
}
/** Social groups by age band. */
export function groups(s: GameState) {
  const sq = own(s);
  const band = (p: Player) => (p.age >= 29 ? 'Senior core' : p.age <= 22 ? 'Young guns' : 'Prime-age core');
  return ['Senior core', 'Prime-age core', 'Young guns'].map((name) => ({ name, ids: sq.filter((p) => band(p) === name).map((p) => p.id) })).filter((g) => g.ids.length);
}
export const canMentor = (m: Player, k: Player) => m.id !== k.id && m.age >= 27 && k.age <= 22 && m.age - k.age >= 6;
export function setMentor(s: GameState, kidId: string, mentorId: string | null): GameState {
  const k = s.players.find((p) => p.id === kidId && p.clubId === s.clubId);
  if (!k) return s;
  if (mentorId === null) { const b = copy(s); delete b.players.find((p) => p.id === kidId)!.mentor; return b; }
  const m = s.players.find((p) => p.id === mentorId && p.clubId === s.clubId);
  if (!m || !canMentor(m, k) || own(s).filter((p) => p.mentor === mentorId && p.id !== kidId).length >= 2) return s;
  const b = copy(s);
  b.players.find((p) => p.id === kidId)!.mentor = mentorId;
  return b;
}
/** Mentees grow a little faster, more so under leaders and professionals. */
export function mentorWeek(s: GameState) {
  for (const k of own(s).filter((p) => p.mentor)) {
    const m = s.players.find((p) => p.id === k.mentor && p.clubId === s.clubId);
    if (!m || !canMentor(m, k)) { delete k.mentor; continue; }
    const pro = m.personality === 'Professional' || m.personality === 'Leader' ? 0.12 : 0;
    const chance = 0.15 + pro + leadership(m) / 200;
    if (k.rating < k.potential && h(`${k.id}|${m.id}|${s.season}|${s.week}`) < chance) k.rating++;
    k.morale = clamp(k.morale + 1);
  }
}
/** A good player paid well below lesser team-mates. */
export function wageGrievance(s: GameState, p: Player) {
  const lesser = own(s).filter((x) => x.id !== p.id && x.rating < p.rating);
  if (p.rating < 60 || !lesser.length) return false;
  return Math.max(...lesser.map((x) => x.wage)) > p.wage * 1.3;
}
export function roomWeek(s: GameState) {
  for (const p of own(s)) {
    if (p.unhappy || p.promise || !wageGrievance(s, p)) continue;
    const r = h(`${p.id}|wage|${s.season}|${s.week}`);
    if (r < (p.personality === 'Ambitious' ? 0.3 : p.personality === 'Loyal' ? 0.06 : 0.15)) {
      p.unhappy = 'wages';
      s.headlines = [`💷 ${p.name} wants a pay rise — lesser players earn more.`, ...s.headlines].slice(0, 6);
    }
  }
  const g = groups(s), cap = s.captain;
  if (cap && g.length && g.reduce((a, b) => (b.ids.length > a.ids.length ? b : a)).ids.includes(cap)) s.harmony = clamp((s.harmony ?? 70) + 1);
  mentorWeek(s);
}
export function raiseCost(s: GameState, p: Player) {
  const lesser = own(s).filter((x) => x.id !== p.id && x.rating < p.rating);
  return Math.max(p.wage + 1, Math.max(0, ...lesser.map((x) => x.wage)));
}
export function giveRaise(s: GameState, id: string): GameState {
  const p0 = s.players.find((p) => p.id === id && p.clubId === s.clubId);
  if (!p0 || s.match) return s;
  const b = copy(s), p = b.players.find((x) => x.id === id)!;
  const to = raiseCost(b, p);
  b.budget -= (to - p.wage) * 4;
  p.wage = to;
  p.morale = clamp(p.morale + 10);
  if (p.unhappy === 'wages') delete p.unhappy;
  return b;
}
export const validMentors = (s: GameState) => s.players.every((p) => p.mentor === undefined || typeof p.mentor === 'string');
