// Touchline shouts: short in-match instructions that last 30 minutes and trade one thing for another.
import type { GameState } from './game.ts';
import { copy } from './game.ts';

export type ShoutId = 'demand' | 'encourage' | 'focus' | 'stuckin' | 'calm';
export type Shout = { id: ShoutId; label: string; att: number; def: number; cards: number; energy: number; tip: string };
export const SHOUTS: Shout[] = [
  { id: 'demand', label: 'Demand more', att: 0.07, def: -0.04, cards: 1, energy: 1, tip: 'More attacks, more risk at the back.' },
  { id: 'encourage', label: 'Encourage', att: 0.04, def: 0, cards: 1, energy: 0, tip: 'Lifts a side that is behind or level.' },
  { id: 'focus', label: 'Concentrate', att: -0.02, def: 0.06, cards: 1, energy: 0, tip: 'Tighter at the back, fewer chances made.' },
  { id: 'stuckin', label: 'Get stuck in', att: 0.02, def: 0.04, cards: 1.6, energy: 1, tip: 'Win the battles — but bookings follow.' },
  { id: 'calm', label: 'Calm down', att: -0.01, def: 0.01, cards: 0.5, energy: -0.5, tip: 'Fewer cards, cooler heads.' },
];
export const SHOUT_LEN = 30;
export const shoutOf = (id?: string) => SHOUTS.find((x) => x.id === id);
/** The shout in force right now (it lasts 30 match minutes). */
export function activeShout(s: GameState): Shout | undefined {
  const m = s.match;
  if (!m?.shout || m.complete || m.minute >= m.shout.at + SHOUT_LEN) return undefined;
  return shoutOf(m.shout.id);
}
/** Encourage only works if we're not winning; demand backfires on a tired team. */
export function shoutEffect(s: GameState): { att: number; def: number; cards: number; energy: number } {
  const sh = activeShout(s), m = s.match;
  if (!sh || !m) return { att: 0, def: 0, cards: 1, energy: 0 };
  let { att, def } = sh;
  if (sh.id === 'encourage' && m.us > m.them) att = 0;
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const fit = xi.reduce((a, p) => a + p.fitness, 0) / Math.max(1, xi.length);
  if (sh.id === 'demand' && fit < 55) att /= 2;
  return { att, def, cards: sh.cards, energy: sh.energy };
}
export function shout(s: GameState, id: ShoutId): GameState {
  const m = s.match;
  if (!m || m.complete || !shoutOf(id) || m.shout?.at === m.minute) return s;
  const b = copy(s);
  b.match!.shout = { id, at: m.minute };
  b.match!.timeline.push({ minute: m.minute, text: `📣 ${shoutOf(id)!.label}! The manager is out on the touchline.`, side: 'us', kind: 'note' });
  return b;
}
export function validShout(s: GameState) {
  const sh = s.match?.shout;
  return sh === undefined || (!!shoutOf(sh.id) && Number.isInteger(sh.at));
}
