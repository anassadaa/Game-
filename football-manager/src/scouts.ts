import type { GameState, Player } from './game.ts';
import { attributes, copy, int, next, pick } from './game.ts';
import { LEAGUES, league } from './world.ts';

export type Scout = { id: string; name: string; region: string; skill: number };
export type ScoutReport = { playerId: string; name: string; clubId: string; region: string; week: number; season: number; knowledge: number; xg90: number; xa90: number; est: [number, number]; verdict: string };
export const REGIONS = [...new Set(LEAGUES.map((l) => l.country))];
export const MAX_SCOUTS = 3;
export const scoutWage = (skill: number) => 4 + skill * 3;
const SCOUT_NAMES = ['Gordon Pike', 'Luis Moreno', 'Ingrid Falk', 'Tariq Haddad', 'Marco Bellini', 'Yusuf Kaya', 'Pierre Lambert', 'Rui Costeira'];

/** True per-90 output implied by a player's attributes. */
export function trueXg(p: Player) {
  const a = attributes(p);
  const pos = { GK: 0.01, DF: 0.25, MF: 0.6, FW: 1 }[p.position];
  const xg = Math.max(0.01, ((a.shooting - 35) / 60) * 0.75 * pos + ((a.pace - 50) / 100) * 0.1 * pos);
  const xa = Math.max(0.01, ((a.passing - 35) / 60) * 0.4 * (p.position === 'MF' ? 1 : p.position === 'FW' ? 0.8 : 0.35));
  return { xg: Math.round(xg * 100) / 100, xa: Math.round(xa * 100) / 100 };
}
export function hireScout(s: GameState, region: string): GameState {
  if (s.match || !REGIONS.includes(region) || (s.scouts ?? []).length >= MAX_SCOUTS) return s;
  const b = copy(s);
  const skill = Math.min(5, b.scouting + int(b, -1, 1)) || 1;
  const used = new Set((b.scouts ?? []).map((x) => x.name));
  const name = pick(b, SCOUT_NAMES.filter((n) => !used.has(n)));
  b.scouts = [...(b.scouts ?? []), { id: `sc${b.season}-${b.week}-${b.seed % 9973}`, name, region, skill }];
  b.headlines = [`🔭 ${name} joins as regional scout for ${region}.`, ...b.headlines].slice(0, 6);
  return b;
}
export function moveScout(s: GameState, id: string, region: string): GameState {
  if (s.match || !REGIONS.includes(region) || !s.scouts?.some((x) => x.id === id)) return s;
  const b = copy(s);
  b.scouts!.find((x) => x.id === id)!.region = region;
  return b;
}
export function fireScout(s: GameState, id: string): GameState {
  if (s.match || !s.scouts?.some((x) => x.id === id)) return s;
  const b = copy(s);
  b.scouts = b.scouts!.filter((x) => x.id !== id);
  return b;
}
/** Weekly: each scout files 2 reports in their region; repeat reports sharpen knowledge. */
export function scoutsWeek(s: GameState) {
  const reports = s.scoutReports ?? [];
  for (const sc of s.scouts ?? []) {
    s.budget -= scoutWage(sc.skill);
    const pool = (s.rivals ?? []).filter((p) => { const c = s.clubs.find((x) => x.id === p.clubId); return c && league(c.division).country === sc.region; });
    for (let k = 0; k < 2 && pool.length; k++) {
      const p = pick(s, pool), t = trueXg(p);
      const old = reports.find((r) => r.playerId === p.id);
      const knowledge = Math.min(100, (old?.knowledge ?? 0) + 25 + sc.skill * 8);
      const err = (100 - knowledge) / 100;
      const noise = () => 1 + (next(s) - 0.5) * err * 0.8;
      const spread = Math.round(err * 10);
      const rep: ScoutReport = {
        playerId: p.id, name: p.name, clubId: p.clubId, region: sc.region, week: s.week, season: s.season, knowledge,
        xg90: Math.round(t.xg * noise() * 100) / 100, xa90: Math.round(t.xa * noise() * 100) / 100,
        est: [Math.max(1, p.rating - spread - int(s, 0, 2)), Math.min(99, p.rating + spread + int(s, 0, 2))],
        verdict: p.rating >= 80 ? 'World class' : p.rating >= 72 ? 'Excellent signing' : p.age <= 21 && p.potential >= 80 ? 'Hot prospect' : p.rating >= 64 ? 'Solid option' : 'Squad depth',
      };
      const i = reports.findIndex((r) => r.playerId === p.id);
      if (i >= 0) reports.splice(i, 1);
      reports.unshift(rep);
    }
  }
  s.scoutReports = reports.slice(0, 40);
}
export const validScouts = (s: GameState) =>
  (s.scouts === undefined || (Array.isArray(s.scouts) && s.scouts.length <= MAX_SCOUTS && s.scouts.every((x) => x && typeof x.id === 'string' && REGIONS.includes(x.region) && Number.isFinite(x.skill)))) &&
  (s.scoutReports === undefined || (Array.isArray(s.scoutReports) && s.scoutReports.length <= 40 && s.scoutReports.every((r) => r && typeof r.playerId === 'string' && Number.isFinite(r.xg90))));
