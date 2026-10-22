import type { GameState, Player, Position } from './game.ts';

export const COLS = 6, ROWS = 4;
export const LINES: Position[] = ['FW', 'MF', 'DF', 'GK'];
/** Depth chart: per position, starters first then backups by rating; injured last. */
export function depthChart(s: GameState) {
  const own = s.players.filter((p) => p.clubId === s.clubId);
  return LINES.map((pos) => ({
    pos,
    players: own.filter((p) => p.position === pos).sort((a, b) => Number(!!a.injured) - Number(!!b.injured) || Number(b.starting) - Number(a.starting) || b.rating - a.rating),
  }));
}
const BASE: Record<Position, number> = { GK: 0.2, DF: 1.5, MF: 2.8, FW: 4.4 };
/** Heatmap grid [row][col] in 0..1: col 0 = own goal, col 5 = opponent goal. */
export function heatmap(s: GameState, p: Player): number[][] {
  const t = s.tactics;
  const mates = s.players.filter((x) => x.clubId === s.clubId && x.starting && x.position === p.position);
  const idx = Math.max(0, mates.findIndex((x) => x.id === p.id));
  const lane = mates.length <= 1 ? 1.5 : (idx / (mates.length - 1)) * 3;
  const instr = t.instr?.[p.id];
  let x = BASE[p.position];
  if (p.position !== 'GK') {
    x += t.mentality === 'attacking' ? 0.4 : t.mentality === 'cautious' ? -0.4 : 0;
    x += t.press === 'high' ? 0.3 : t.press === 'low' ? -0.3 : 0;
    x += instr === 'get forward' ? 0.6 : instr === 'stay back' ? -0.6 : instr === 'shoot more' ? 0.3 : 0;
  }
  const spread = p.position === 'GK' ? 0.5 : instr === 'roam' ? 1.6 : p.position === 'MF' ? 1.2 : 0.9;
  const goals = (s.match?.timeline ?? []).filter((e) => e.playerId === p.id && e.kind !== 'note').length;
  const g: number[][] = [];
  let max = 0;
  for (let r = 0; r < ROWS; r++) {
    g.push([]);
    for (let c = 0; c < COLS; c++) {
      let v = Math.exp(-(((c - x) / spread) ** 2 + ((r - lane) / (spread * 1.3)) ** 2));
      if (c === COLS - 1 && r >= 1 && r <= 2) v += goals * 0.25;
      g[r]!.push(v);
      max = Math.max(max, v);
    }
  }
  return g.map((row) => row.map((v) => Math.round((v / max) * 100) / 100));
}
