import { youthBonus } from './staff.ts';
import type { GameState, Player, Position } from './game.ts';
import { clamp, copy, int, makePlayer, next, pick } from './game.ts';
import { spawnPotential } from './potential.ts';

export const INTAKE_WEEK = 12;
const POS: Position[] = ['GK', 'DF', 'DF', 'MF', 'MF', 'FW'];

/** Annual youth intake: 3-6 prospects, better academies mean better odds of a wonderkid. */
export function youthIntake(s: GameState) {
  const n = 3 + int(s, 0, 1) + Math.floor(s.academy / 2);
  const list: Player[] = [];
  for (let i = 0; i < n; i++) {
    const p = makePlayer(s, s.clubId, 700 + i, pick(s, POS), 40 + s.academy * 3 + Math.round(youthBonus(s) / 3), true);
    p.age = 15 + int(s, 0, 2);
    p.starting = false;
    p.contract = 3;
    p.wage = 1;
    if (next(s) < 0.04 + s.academy * 0.03 + youthBonus(s) * 0.003) {
      p.wonderkid = true;
      p.rating = clamp(p.rating + int(s, 4, 9), 35, 75);
      const clubRating = s.clubs.find((c) => c.id === s.clubId)?.rating ?? 70;
      const leagueLevel = clamp(Math.round((88 - clubRating) / 8) + 1, 1, 5);
      p.potential = spawnPotential({ id: p.id, rating: p.rating, age: p.age, position: p.position, academy: s.academy, wonderkid: true, leagueLevel });
    }
    list.push(p);
  }
  s.youth = list;
  const wk = list.filter((p) => p.wonderkid);
  s.headlines = [
    `🌱 Youth intake day: ${n} prospects arrive${wk.length ? ` — including wonderkid ${wk.map((p) => p.name).join(', ')}!` : '.'}`,
    ...s.headlines,
  ].slice(0, 6);
}
export function promoteYouth(s: GameState, id: string): GameState {
  const p = s.youth?.find((x) => x.id === id);
  if (!p || s.match || s.players.length >= 30) return s;
  const b = copy(s);
  b.youth = b.youth!.filter((x) => x.id !== id);
  b.players.push({ ...p, starting: false });
  b.headlines = [`${p.name} signs a first professional contract.`, ...b.headlines].slice(0, 6);
  return b;
}
export function releaseYouth(s: GameState, id: string): GameState {
  if (!s.youth?.some((x) => x.id === id) || s.match) return s;
  const b = copy(s);
  b.youth = b.youth!.filter((x) => x.id !== id);
  return b;
}
