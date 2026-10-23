import type { GameState, MatchEvent } from './game.ts';
import { advanceMatch } from './game.ts';
import { autoSubs } from './subs.ts';

/** Play the rest of the match instantly (skips half-time too). */
export function simToEnd(s: GameState): GameState {
  let b = s;
  for (let i = 0; i < 8 && b.match && !b.match.complete; i++) {
    if (b.autoSubs) b = autoSubs(b);
    b = advanceMatch(b);
  }
  return b;
}

export type Frame = { x: number; y: number };
/** Deterministic ball path for a highlight, in pitch % (attack goes right for us, left for them). */
export function highlightPath(e: MatchEvent, i: number): Frame[] {
  let h = (e.minute * 131 + i * 977 + e.text.length * 17) >>> 0;
  const r = () => ((h = (Math.imul(1664525, h) + 1013904223) >>> 0) / 4294967296);
  const dir = e.side === 'them' ? -1 : 1;
  const pts: Frame[] = [{ x: 50, y: 50 }];
  for (let k = 1; k <= 3; k++) pts.push({ x: 50 + dir * (12 * k + r() * 8), y: 15 + r() * 70 });
  const goal = e.kind === 'goal';
  pts.push({ x: dir > 0 ? (goal ? 99 : 97) : goal ? 1 : 3, y: goal ? 44 + r() * 12 : r() < 0.5 ? 36 : 64 });
  return pts;
}
export const highlights = (s: GameState) =>
  (s.match?.timeline ?? []).filter((e) => e.kind === 'goal' || e.kind === 'chance');

/** Season stats per player, updated after each rated match. */
export function recordRatings(s: GameState) {
  const m = s.match;
  if (!m?.ratings) return;
  for (const p of s.players) {
    const r = m.ratings[p.id];
    if (r === undefined) continue;
    p.apps = (p.apps ?? 0) + 1;
    p.ratingSum = Math.round(((p.ratingSum ?? 0) + r) * 10) / 10;
    if (m.motm === p.id) p.motm = (p.motm ?? 0) + 1;
  }
}
export const avgRating = (p: { apps?: number; ratingSum?: number }) =>
  p.apps ? Math.round(((p.ratingSum ?? 0) / p.apps) * 100) / 100 : 0;
