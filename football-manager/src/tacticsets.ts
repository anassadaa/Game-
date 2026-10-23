// Saved tactics: up to three named plans you can switch between, including mid-match.
import type { GameState, Tactics } from './game.ts';
import { copy } from './game.ts';
import { rememberShape } from './familiarity.ts';
import { FORMATIONS } from './tactics.ts';

export const MAX_SETS = 3;
export type TacticSet = { name: string; t: Tactics };
export function saveTacticSet(s: GameState, name: string): GameState {
  const sets = s.tacticSets ?? [];
  const clean = name.trim().slice(0, 20) || `Plan ${sets.length + 1}`;
  const i = sets.findIndex((x) => x.name === clean);
  if (i < 0 && sets.length >= MAX_SETS) return s;
  const b = copy(s), t = JSON.parse(JSON.stringify(b.tactics)) as Tactics;
  b.tacticSets = i >= 0 ? sets.map((x, j) => (j === i ? { name: clean, t } : x)) : [...sets, { name: clean, t }];
  return b;
}
export function useTacticSet(s: GameState, i: number): GameState {
  const set = s.tacticSets?.[i];
  if (!set || s.match?.complete) return s;
  const b = copy(s);
  if (set.t.formation !== b.tactics.formation) rememberShape(b);
  b.tactics = JSON.parse(JSON.stringify(set.t));
  return b;
}
export function deleteTacticSet(s: GameState, i: number): GameState {
  if (!s.tacticSets?.[i]) return s;
  const b = copy(s);
  b.tacticSets = b.tacticSets!.filter((_, j) => j !== i);
  return b;
}
export const validTacticSets = (v: unknown) =>
  v === undefined || (Array.isArray(v) && v.length <= MAX_SETS && v.every((x) => x && typeof x.name === 'string' && x.t && typeof x.t === 'object' && (FORMATIONS as readonly string[]).includes(x.t.formation)));
