// 3.2: tap any club in the league table to see its squad and bid for a player.
import type { GameState, Player } from './game.ts';
import { windowOpen } from './game.ts';
import { slotPeek } from './positions.ts';

const ORDER = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];
/** Everyone registered to a club, keepers first, then by position and rating. */
export function clubSquad(s: GameState, clubId: string): Player[] {
  const pool = clubId === s.clubId ? s.players : (s.rivals ?? []);
  const rank = (p: Player) => { const i = ORDER.indexOf(slotPeek(p)); return i < 0 ? 99 : i; };
  return pool.filter((p) => p.clubId === clubId).sort((a, b) => rank(a) - rank(b) || b.rating - a.rating || a.id.localeCompare(b.id));
}
export const WINDOW_MSG = 'Transfer window closed. Offers reopen in weeks 1–3 and 9–10.';
/** Why you can't bid for this player right now, or null if you can. */
export function offerBlocked(s: GameState, p: Player): string | null {
  if (p.clubId === s.clubId) return 'Already your player.';
  if (s.match) return 'Not during a match.';
  if (!windowOpen(s)) return WINDOW_MSG;
  if (s.embargo) return 'FFP embargo: no signings from clubs this season.';
  if (s.players.filter((x) => x.clubId === s.clubId).length >= 25) return 'Your squad is full (25).';
  return null;
}
