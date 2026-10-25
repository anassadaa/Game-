import type { Club, GameState, Player } from './game.ts';
import { investmentStrength } from './investments.ts';

/** AI clubs field real squads: their best available XI (injuries, sales) moves their match strength. */
function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const squad = (s: GameState, id: string) => (s.rivals ?? []).filter((p) => p.clubId === id);

export function aiXI(s: GameState, id: string, fit = true): Player[] {
  const ps = squad(s, id).filter((p) => !fit || !p.injured).sort((a, b) => b.rating - a.rating);
  const gk = ps.find((p) => p.position === 'GK');
  const out = ps.filter((p) => p.position !== 'GK').slice(0, 10);
  return gk ? [gk, ...out] : out;
}
const avg = (xs: Player[]) => (xs.length ? xs.reduce((a, p) => a + p.rating, 0) / 11 : 0);

/** Baseline XI quality is fixed at the start of the season; changes since then shift strength. */
export function squadDelta(s: GameState, c: Club) {
  if (c.id === s.clubId || !s.rivals?.length) return 0;
  s.squadRef ??= {};
  const now = avg(aiXI(s, c.id));
  if (!now) return 0;
  const ref = (s.squadRef[c.id] ??= avg(aiXI(s, c.id, false)));
  // +0.3: a normal knock or two is already priced into the club rating.
  const d = Math.max(-8, Math.min(0, (now - ref) * 0.5 + 0.3));
  return Math.abs(d) < 0.05 ? 0 : Math.round(d * 10) / 10;
}
export const squadClub = (s: GameState, c: Club): Club => {
  if (c.id === s.clubId) return c;
  const management = investmentStrength(s, c.id);
  return { ...c, rating: c.rating + squadDelta(s, c) + management.rating, style: management.style ?? c.style };
};

/** Weekly: AI players recover and pick up knocks (hash-based; the main RNG stream is untouched). */
export function aiInjuriesWeek(s: GameState) {
  for (const p of s.rivals ?? []) {
    if (p.injured) { p.injured--; if (!p.injured) delete p.injured; continue; }
    if (h(`${p.id}|${s.season}|${s.week}|inj`) < 0.007) p.injured = 1 + Math.floor(h(`${p.id}|${s.week}|len`) * 5);
  }
}
export function resetSquadRefs(s: GameState) { s.squadRef = {}; }
export function squadNote(s: GameState, c: Club) {
  const out = squad(s, c.id).filter((p) => p.injured);
  const d = squadDelta(s, c);
  return `${out.length} injured${out.length ? ` (${out.sort((a, b) => b.rating - a.rating).slice(0, 2).map((p) => p.name).join(', ')})` : ''}${d ? ` · squad strength ${d > 0 ? '+' : ''}${d}` : ''}`;
}
export function validSquadRef(v: unknown) {
  return v === undefined || (!!v && typeof v === 'object' && Object.values(v as object).every((x) => typeof x === 'number' && Number.isFinite(x)));
}
