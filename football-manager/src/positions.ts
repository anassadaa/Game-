import type { GameState, Player, Position } from './game.ts';

/** Real position slots, preferred foot and extended attributes. Derived deterministically from the player's id, stored on first use. */
export const SLOTS = ['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'] as const;
export type Slot = (typeof SLOTS)[number];
export const FEET = ['L', 'R', 'B'] as const;
export type Foot = (typeof FEET)[number];
export const EXT = ['decisions', 'heading', 'tackling', 'vision', 'composure'] as const;
export type ExtKey = (typeof EXT)[number];
export const EXT_LABEL: Record<ExtKey, string> = { decisions: 'DEC', heading: 'HEA', tackling: 'TCK', vision: 'VIS', composure: 'CMP' };
export const FOOT_LABEL: Record<Foot, string> = { L: 'Left foot', R: 'Right foot', B: 'Both feet' };
export const LINE_OF: Record<Slot, Position> = { GK: 'GK', LB: 'DF', CB: 'DF', RB: 'DF', DM: 'MF', CM: 'MF', AM: 'MF', LW: 'FW', RW: 'FW', ST: 'FW' };

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const SPLIT: Record<Position, [Slot, number][]> = {
  GK: [['GK', 1]],
  DF: [['LB', 0.25], ['CB', 0.5], ['RB', 0.25]],
  MF: [['DM', 0.3], ['CM', 0.45], ['AM', 0.25]],
  FW: [['LW', 0.22], ['RW', 0.23], ['ST', 0.55]],
};
const BASE: Record<Slot, Record<ExtKey, number>> = {
  GK: { decisions: 4, heading: -10, tackling: -20, vision: -6, composure: 6 },
  LB: { decisions: 0, heading: -2, tackling: 7, vision: 0, composure: -1 },
  CB: { decisions: 2, heading: 10, tackling: 10, vision: -6, composure: 2 },
  RB: { decisions: 0, heading: -2, tackling: 7, vision: 0, composure: -1 },
  DM: { decisions: 5, heading: 2, tackling: 8, vision: 2, composure: 3 },
  CM: { decisions: 4, heading: -2, tackling: 1, vision: 6, composure: 2 },
  AM: { decisions: 3, heading: -6, tackling: -8, vision: 10, composure: 4 },
  LW: { decisions: -1, heading: -8, tackling: -8, vision: 4, composure: 0 },
  RW: { decisions: -1, heading: -8, tackling: -8, vision: 4, composure: 0 },
  ST: { decisions: 1, heading: 6, tackling: -12, vision: 0, composure: 7 },
};

export function slotOf(p: Player): Slot {
  if (p.slot && LINE_OF[p.slot] === p.position) return p.slot;
  let r = h(p.id + '|slot'), out: Slot = SPLIT[p.position][0]![0];
  for (const [sl, w] of SPLIT[p.position]) { if (r < w) { out = sl; break; } r -= w; }
  return (p.slot = out);
}
export function footOf(p: Player): Foot {
  if (p.foot && (FEET as readonly string[]).includes(p.foot)) return p.foot;
  const sl = slotOf(p), r = h(p.id + '|foot');
  const left = sl === 'LB' || sl === 'LW' ? 0.6 : 0.2;
  return (p.foot = r < 0.05 ? 'B' : r < 0.05 + left ? 'L' : 'R');
}
export function ext(p: Player): Record<ExtKey, number> {
  const sl = slotOf(p), out = {} as Record<ExtKey, number>;
  for (const k of EXT) out[k] = Math.max(1, Math.min(99, Math.round(p.rating + BASE[sl][k] + (h(p.id + '|' + k) - 0.5) * 14)));
  return out;
}
export function ensureSlots(p: Player) { slotOf(p); footOf(p); }
/** Migration: drop corrupt slot/foot values so they are re-derived. */
export function repairSlots(p: Player) {
  if (p.slot !== undefined && LINE_OF[p.slot] !== p.position) delete p.slot;
  if (p.foot !== undefined && !(FEET as readonly string[]).includes(p.foot)) delete p.foot;
}

/** Which slots a formation wants (outfield). */
export const FORMATION_SLOTS: Record<string, Slot[]> = {
  '4-3-3': ['LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LW', 'RW', 'ST'],
  '4-2-3-1': ['LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'AM', 'LW', 'RW', 'ST'],
  '4-4-2': ['LB', 'CB', 'CB', 'RB', 'LW', 'CM', 'CM', 'RW', 'ST', 'ST'],
  '3-5-2': ['CB', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'ST', 'ST'],
  '5-3-2': ['LB', 'CB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'ST', 'ST'],
  '4-1-4-1': ['LB', 'CB', 'CB', 'RB', 'DM', 'LW', 'CM', 'CM', 'RW', 'ST'],
  '3-4-3': ['CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RB', 'LW', 'RW', 'ST'],
};
const NEAR: Partial<Record<Slot, Slot[]>> = { LB: ['CB'], RB: ['CB'], CB: ['LB', 'RB', 'DM'], DM: ['CM', 'CB'], CM: ['DM', 'AM'], AM: ['CM', 'ST'], LW: ['RW', 'AM'], RW: ['LW', 'AM'], ST: ['AM'] };

/** Slots filled by the XI: exact, near (small cost) or missing (bigger cost); feet and extended attributes add nuance. */
export function slotProfile(s: GameState) {
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting && p.position !== 'GK');
  const want = [...(FORMATION_SLOTS[s.tactics.formation] ?? FORMATION_SLOTS['4-4-2']!)];
  const left = xi.map(slotOf);
  let exact = 0, near = 0;
  for (let i = want.length - 1; i >= 0; i--) { const j = left.indexOf(want[i]!); if (j >= 0) { exact++; left.splice(j, 1); want.splice(i, 1); } }
  for (let i = want.length - 1; i >= 0; i--) { const j = left.findIndex((x) => NEAR[want[i]!]?.includes(x)); if (j >= 0) { near++; left.splice(j, 1); want.splice(i, 1); } }
  const missing = want.length;
  let att = -near * 0.0015 - missing * 0.004, def = -near * 0.0015 - missing * 0.004;
  const notes: string[] = [];
  if (missing) notes.push(`no natural ${want.join('/')} in the XI`);
  // Inverted wingers cut inside; full-backs on their natural side cross better.
  const inv = xi.filter((p) => (slotOf(p) === 'LW' && footOf(p) === 'R') || (slotOf(p) === 'RW' && footOf(p) === 'L')).length;
  if (inv) { att += inv * 0.004; notes.push('inverted wingers cut inside'); }
  const avg = (k: ExtKey) => xi.reduce((a, p) => a + ext(p)[k] - p.rating, 0) / Math.max(1, xi.length);
  att += (avg('vision') + avg('composure')) * 0.0006;
  def += (avg('tackling') + avg('decisions')) * 0.0006;
  return { att, def, notes, exact };
}
export function validSlots(s: GameState) {
  return [...s.players, ...(s.market ?? [])].every((p) =>
    (p.slot === undefined || (SLOTS as readonly string[]).includes(p.slot)) && (p.foot === undefined || (FEET as readonly string[]).includes(p.foot)));
}
