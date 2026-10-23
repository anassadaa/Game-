// Scouting ranges: other clubs' players show an ability range until scouted; wonderkids keep an uncertain ceiling.
// Plus a seasonal board recruitment ask. Ranges use a hash, never the match RNG.
import type { GameState, Player, Position } from './game.ts';
import { clamp } from './game.ts';

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const report = (s: GameState, p: Player) => (s.scoutReports ?? []).find((r) => r.playerId === p.id);
const band = (v: number, w: number, salt: string): [number, number] => {
  if (w <= 0) return [v, v];
  const lo = Math.round(v - 2 * w * (0.15 + 0.7 * h(salt)));
  return [Math.max(1, lo), Math.min(99, lo + 2 * w)];
};
export const isOurs = (s: GameState, p: Player) => p.clubId === s.clubId;
/** What you can see of a player's current ability. */
export function abilityRange(s: GameState, p: Player): [number, number] {
  if (isOurs(s, p)) return [p.rating, p.rating];
  const r = report(s, p);
  if (r) return r.est;
  return band(p.rating, p.clubId === 'market' ? 4 : 8, `${p.id}|ab`);
}
export function potentialRange(s: GameState, p: Player): [number, number] {
  const r = report(s, p), k = isOurs(s, p) ? 70 : r ? r.knowledge : 0;
  const w = Math.round((100 - k) / 10) + (p.wonderkid || (p.age <= 20 && p.potential >= 80) ? 4 : 0);
  return band(p.potential, w, `${p.id}|pot|${k}`);
}
export const scouted = (s: GameState, p: Player) => isOurs(s, p) || !!report(s, p);
export const rangeText = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}–${b}`);

export type BoardAsk = { season: number; text: string; maxAge?: number; pos?: Position; minRating?: number; base: string[]; done: boolean; failed?: boolean };
export const recruitAsk = (s: GameState) => s.boardAsk;
export function askWeek(s: GameState) {
  const own = s.players.filter((p) => p.clubId === s.clubId);
  if (!s.boardAsk || s.boardAsk.season !== s.season) {
    const avg = Math.round(own.reduce((n, p) => n + p.rating, 0) / Math.max(1, own.length));
    const kind = Math.floor(h(`${s.clubId}|${s.season}|ask`) * 3);
    const base = own.map((p) => p.id);
    s.boardAsk = kind === 0 ? { season: s.season, text: 'Sign a young player aged 21 or under', maxAge: 21, base, done: false }
      : kind === 1 ? { season: s.season, text: `Sign a forward rated ${avg + 2}+`, pos: 'FW', minRating: avg + 2, base, done: false }
      : { season: s.season, text: `Sign a defender rated ${avg + 2}+`, pos: 'DF', minRating: avg + 2, base, done: false };
    return;
  }
  const a = s.boardAsk;
  if (a.done || a.failed) return;
  const hit = own.find((p) => !a.base.includes(p.id) && !p.academyGraduate && (!a.maxAge || p.age <= a.maxAge) && (!a.pos || p.position === a.pos) && p.rating >= (a.minRating ?? 0));
  if (hit) {
    a.done = true;
    s.trust = clamp(s.trust + 6);
    s.headlines = [`🏛️ The board is pleased: ${hit.name} fits their recruitment ask.`, ...s.headlines].slice(0, 6);
  } else if (s.week >= 17) {
    a.failed = true;
    s.trust = clamp(s.trust - 3);
    s.headlines = ['🏛️ The board notes you ignored their recruitment ask.', ...s.headlines].slice(0, 6);
  }
}
export const validAsk = (v: unknown) => {
  if (v === undefined) return true;
  const a = v as BoardAsk;
  return !!a && typeof a.text === 'string' && Number.isInteger(a.season) && Array.isArray(a.base) && a.base.every((x) => typeof x === 'string') && typeof a.done === 'boolean';
};
