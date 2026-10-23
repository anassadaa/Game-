import type { GameState } from './game.ts';

export type Difficulty = 'easy' | 'medium' | 'mediumHard' | 'hard';
export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: 'easy', label: 'Easy', blurb: 'Weaker rivals, richer board, patient owners.' },
  { id: 'medium', label: 'Medium', blurb: 'The intended balance.' },
  { id: 'mediumHard', label: 'Medium-Hard', blurb: 'Sharper rivals, tighter purse.' },
  { id: 'hard', label: 'Hard', blurb: 'Strong rivals, pricey deals, ruthless board.' },
];
/** ai: rival strength offset · money: income/budget · fee: transfer prices · patience: board tolerance. */
const TABLE: Record<Difficulty, { ai: number; money: number; fee: number; patience: number }> = {
  easy: { ai: -3, money: 1.25, fee: 0.85, patience: 1.4 },
  medium: { ai: 0, money: 1, fee: 1, patience: 1 },
  mediumHard: { ai: 1.5, money: 0.9, fee: 1.1, patience: 0.85 },
  hard: { ai: 3, money: 0.8, fee: 1.2, patience: 0.7 },
};
export const isDifficulty = (d: unknown): d is Difficulty => typeof d === 'string' && d in TABLE;
export const diff = (d?: Difficulty) => TABLE[d && isDifficulty(d) ? d : 'medium'];
export const level = (s: GameState) => diff(s.difficulty);
export function setDifficulty(s: GameState, d: Difficulty) {
  if (isDifficulty(d)) s.difficulty = d;
  return s;
}
/** Gentle rubber-band from the last five results: ±0.3 per net win/loss beyond two, capped at ±1.5. */
export function adaptive(s: GameState) {
  const form = s.clubs.find((c) => c.id === s.clubId)?.form ?? [];
  const net = form.filter((f) => f === 'W').length - form.filter((f) => f === 'L').length;
  const over = Math.abs(net) > 2 ? Math.sign(net) * (Math.abs(net) - 2) : 0;
  return Math.max(-1.5, Math.min(1.5, over * 0.5));
}
