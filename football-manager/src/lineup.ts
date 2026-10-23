// FM-mobile-style lineup: 11 formation slots, a 7-man bench and reserves.
import type { GameState, Player, Position } from './game.ts';
import { copy } from './game.ts';
import { SHAPES } from './tactics.ts';
import { sharpness } from './training.ts';

export type Slot = { pos: Position; label: string; x: number; y: number };
export type Fit = 'natural' | 'awkward' | 'unsuitable';
export const BENCH = 7;

const DF_LABELS: Record<number, string[]> = { 3: ['CB', 'CB', 'CB'], 4: ['LB', 'CB', 'CB', 'RB'], 5: ['LWB', 'CB', 'CB', 'CB', 'RWB'] };
const MF_LABELS: Record<string, string[]> = {
  '4-3-3': ['CM', 'CM', 'CM'], '4-2-3-1': ['DM', 'DM', 'LM', 'AM', 'RM'], '4-4-2': ['LM', 'CM', 'CM', 'RM'], '3-5-2': ['LWB', 'CM', 'DM', 'CM', 'RWB'],
  '5-3-2': ['CM', 'CM', 'CM'], '4-1-4-1': ['DM', 'LM', 'CM', 'CM', 'RM'], '3-4-3': ['LM', 'CM', 'CM', 'RM'],
};
const FW_LABELS: Record<number, string[]> = { 1: ['ST'], 2: ['ST', 'ST'], 3: ['LW', 'ST', 'RW'] };
const row = (n: number, y: number, pos: Position, labels: string[]): Slot[] =>
  Array.from({ length: n }, (_, i) => ({ pos, label: labels[i] ?? pos, x: Math.round(((i + 1) / (n + 1)) * 100), y }));
/** Slots for a formation: index 0 is the GK, then defenders, midfielders, forwards (y: 0 = own goal, 100 = attack). */
export function slotsFor(formation: string): Slot[] {
  const [d, m, f] = SHAPES[formation] ?? [4, 4, 2];
  const mf = MF_LABELS[formation] ?? Array(m).fill('CM');
  // 4-2-3-1 / 4-1-4-1 have two midfield bands; draw them on two rows.
  const mid = formation === '4-2-3-1' ? [...row(2, 45, 'MF', ['DM', 'DM']), ...row(3, 64, 'MF', ['LM', 'AM', 'RM'])]
    : formation === '4-1-4-1' ? [...row(1, 40, 'MF', ['DM']), ...row(4, 60, 'MF', ['LM', 'CM', 'CM', 'RM'])]
    : row(m, 52, 'MF', mf);
  return [{ pos: 'GK', label: 'GK', x: 50, y: 6 }, ...row(d, 26, 'DF', DF_LABELS[d] ?? []), ...mid, ...row(f, 84, 'FW', FW_LABELS[f] ?? [])];
}
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
export function fit(p: Player, pos: Position): Fit {
  if (p.position === pos || p.retrain?.to === pos && p.retrain.progress >= 100) return 'natural';
  if (p.position === 'GK' || pos === 'GK') return 'unsuitable';
  const order = ['DF', 'MF', 'FW'];
  return Math.abs(order.indexOf(p.position) - order.indexOf(pos)) === 1 ? 'awkward' : 'unsuitable';
}
const FIT_MULT: Record<Fit, number> = { natural: 1, awkward: 0.85, unsuitable: 0.55 };
/** Suitability score for a slot: rating x position fit, nudged by fitness and sharpness; injured last. */
export function suitability(p: Player, pos: Position) {
  return p.rating * FIT_MULT[fit(p, pos)] * (0.85 + 0.1 * p.fitness / 100 + 0.05 * sharpness(p) / 100) - (p.injured ? 1000 : 0);
}
/** Current XI as an array aligned to the formation slots (undefined = empty). Tolerates starters changed elsewhere. */
export function layout(s: GameState): (Player | undefined)[] {
  const slots = slotsFor(s.tactics.formation);
  const starters = own(s).filter((p) => p.starting);
  const out: (Player | undefined)[] = slots.map(() => undefined);
  const used = new Set<string>();
  (s.lineup ?? []).slice(0, slots.length).forEach((id, i) => {
    const p = starters.find((x) => x.id === id);
    if (p && !used.has(p.id)) { out[i] = p; used.add(p.id); }
  });
  const rest = starters.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - a.rating);
  for (const pass of [true, false])
    for (const p of [...rest]) {
      const i = slots.findIndex((sl, k) => !out[k] && (!pass || fit(p, sl.pos) === 'natural'));
      if (i >= 0) { out[i] = p; used.add(p.id); rest.splice(rest.indexOf(p), 1); }
    }
  return out;
}
function commit(b: GameState, xi: (Player | undefined)[]) {
  const ids = new Set(xi.filter(Boolean).map((p) => p!.id));
  own(b).forEach((p) => (p.starting = ids.has(p.id)));
  b.lineup = xi.map((p) => p?.id ?? '');
  b.bench = (b.bench ?? []).filter((id) => !ids.has(id) && own(b).some((p) => p.id === id));
}
/** Put a player into slot i; swaps if he was already in the XI, and takes the old occupant's bench place if he was benched. */
export function setSlot(s: GameState, i: number, id: string): GameState {
  if (s.match) return s;
  const b = copy(s);
  const p = own(b).find((x) => x.id === id);
  const xi = layout(b);
  if (!p || i < 0 || i >= xi.length) return s;
  const j = xi.findIndex((x) => x?.id === id);
  const old = xi[i];
  const benchIdx = (b.bench ?? []).indexOf(id);
  if (j >= 0) { xi[j] = old; xi[i] = p; }
  else {
    xi[i] = p;
    if (benchIdx >= 0) b.bench![benchIdx] = old?.id ?? '';
  }
  b.bench = (b.bench ?? []).filter(Boolean);
  commit(b, xi);
  return b;
}
export function clearSlot(s: GameState, i: number): GameState {
  if (s.match) return s;
  const b = copy(s), xi = layout(b);
  xi[i] = undefined;
  commit(b, xi);
  return b;
}
export function clearXI(s: GameState): GameState {
  if (s.match) return s;
  const b = copy(s);
  commit(b, slotsFor(b.tactics.formation).map(() => undefined));
  b.bench = [];
  return b;
}
/** Fill empty slots (or all, if fresh) with the most suitable fit players; bench the best 7 left (one GK if possible). */
export function fillXI(b: GameState, fresh = false) {
  const slots = slotsFor(b.tactics.formation);
  const xi = fresh ? slots.map(() => undefined as Player | undefined) : layout(b);
  const taken = new Set(xi.filter(Boolean).map((p) => p!.id));
  const pool = own(b);
  // Fill GK first, then the rest in slot order.
  for (const i of slots.map((_, k) => k)) {
    if (xi[i]) continue;
    const best = pool.filter((p) => !taken.has(p.id)).sort((x, y) => suitability(y, slots[i]!.pos) - suitability(x, slots[i]!.pos))[0];
    if (best) { xi[i] = best; taken.add(best.id); }
  }
  commit(b, xi);
  if (fresh || !(b.bench ?? []).length) {
    const left = pool.filter((p) => !taken.has(p.id) && !p.injured).sort((x, y) => y.rating - x.rating);
    const gk = left.find((p) => p.position === 'GK');
    b.bench = [...(gk ? [gk] : []), ...left.filter((p) => p !== gk)].slice(0, BENCH).map((p) => p.id);
  }
}
export function autoPick(s: GameState): GameState {
  if (s.match) return s;
  const b = copy(s);
  fillXI(b, true);
  return b;
}
export function bench(s: GameState): Player[] {
  const o = own(s);
  return (s.bench ?? []).map((id) => o.find((p) => p.id === id && !p.starting)).filter(Boolean) as Player[];
}
export function toggleBench(s: GameState, id: string): GameState {
  if (s.match) return s;
  const p = own(s).find((x) => x.id === id && !x.starting);
  if (!p) return s;
  const b = copy(s), cur = bench(b).map((x) => x.id);
  if (cur.includes(id)) b.bench = cur.filter((x) => x !== id);
  else if (cur.length < BENCH) b.bench = [...cur, id];
  else return s;
  return b;
}
export type Warning = { id: string; text: string };
export function warnings(s: GameState): Warning[] {
  const slots = slotsFor(s.tactics.formation), xi = layout(s), out: Warning[] = [];
  xi.forEach((p, i) => {
    const sl = slots[i]!;
    if (!p) { out.push({ id: `e${i}`, text: `${sl.label} slot is empty: it will be auto-filled at kick-off.` }); return; }
    if (p.injured) out.push({ id: `i${p.id}`, text: `🚑 ${p.name} is injured (${p.injured} wk) and playing at ${sl.label}.` });
    const f = fit(p, sl.pos);
    if (f !== 'natural') out.push({ id: `f${p.id}`, text: `⚠️ ${p.name} (${p.position}) is ${f === 'awkward' ? 'out of position' : 'badly out of position'} at ${sl.label}.` });
    if (p.fitness < 60) out.push({ id: `t${p.id}`, text: `🔋 ${p.name} is tired (${p.fitness}% fitness).` });
  });
  bench(s).filter((p) => p.injured).forEach((p) => out.push({ id: `b${p.id}`, text: `🚑 ${p.name} is injured on the bench.` }));
  return out;
}
export function validLineup(s: GameState) {
  const ok = (a: unknown, n: number) => a === undefined || (Array.isArray(a) && a.length <= n && a.every((x) => typeof x === 'string' && x.length <= 64));
  return ok(s.lineup, 11) && ok(s.bench, BENCH);
}
/** Move a player to the bench (leaving his XI slot empty) or to the reserves. */
export function moveTo(s: GameState, id: string, where: 'bench' | 'reserves'): GameState {
  if (s.match) return s;
  const p = own(s).find((x) => x.id === id);
  if (!p) return s;
  const b = copy(s), xi = layout(b);
  const i = xi.findIndex((x) => x?.id === id);
  if (i >= 0) xi[i] = undefined;
  commit(b, xi);
  const cur = (b.bench ?? []).filter((x) => x !== id);
  if (where === 'bench') {
    if (cur.length >= BENCH) cur.pop();
    cur.unshift(id);
  }
  b.bench = cur;
  return b;
}
/** Where a player currently sits: slot label, Bench or Reserve. */
export function placeOf(s: GameState, id: string): string {
  const i = layout(s).findIndex((x) => x?.id === id);
  if (i >= 0) return slotsFor(s.tactics.formation)[i]!.label;
  return (s.bench ?? []).includes(id) ? 'Bench' : 'Reserve';
}
