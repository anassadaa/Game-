import type { GameState, Player } from './game.ts';
import { ext } from './positions.ts';

/** Set-piece routines: corner delivery, marking scheme and how many stay up. */
export const CORNER = ['short', 'near', 'far'] as const;
export const MARKING = ['zonal', 'man'] as const;
export type Corner = (typeof CORNER)[number];
export type Marking = (typeof MARKING)[number];
export type SetPlan = { corner?: Corner; marking?: Marking; stayUp?: 0 | 1 | 2 };

const xi = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId && p.starting && p.position !== 'GK');
const top = (ps: Player[], k: 'heading' | 'tackling', n: number) => {
  const v = ps.map((p) => ext(p)[k]).sort((a, b) => b - a).slice(0, n);
  return v.reduce((a, x) => a + x, 0) / Math.max(1, v.length);
};
export const plan = (s: GameState): Required<SetPlan> => ({ corner: s.tactics.sp?.corner ?? 'far', marking: s.tactics.sp?.marking ?? 'zonal', stayUp: s.tactics.sp?.stayUp ?? 1 });

/** Chance a corner is converted, given delivery and the box's aerial threat. */
export function cornerConv(s: GameState, taker: Player, passing: number) {
  const pl = plan(s), ps = xi(s);
  const aerial = top(ps, 'heading', 3), best = top(ps, 'heading', 1);
  const base = 0.06 + passing / 900;
  if (pl.corner === 'short') return base * 0.7 + ext(taker).vision / 2500;
  if (pl.corner === 'near') return base + (aerial - 60) / 1400;
  return base + (best - 60) / 900;
}
/** Defensive set pieces and counter threat, as edge adjustments. */
export function setPieceProfile(s: GameState) {
  const pl = plan(s), ps = xi(s), notes: string[] = [];
  const air = top(ps, 'heading', 5), tck = top(ps, 'tackling', 5);
  let att = 0, def = 0;
  if (pl.marking === 'zonal') def += (air - 62) * 0.0006;
  else def += (tck - 62) * 0.0006 - 0.002;
  att += (pl.stayUp - 1) * 0.008; def -= (pl.stayUp - 1) * 0.01;
  if (pl.stayUp === 2) notes.push('two left up for the counter');
  if (pl.stayUp === 0) notes.push('everyone back for set pieces');
  if (pl.marking === 'zonal' && air > 66) notes.push('a tall zonal line clears their crosses');
  return { att, def, notes };
}
export function validPlan(v: unknown) {
  if (v === undefined) return true;
  const o = v as SetPlan;
  return !!o && typeof o === 'object' && (o.corner === undefined || (CORNER as readonly string[]).includes(o.corner)) &&
    (o.marking === undefined || (MARKING as readonly string[]).includes(o.marking)) && (o.stayUp === undefined || [0, 1, 2].includes(o.stayUp));
}
