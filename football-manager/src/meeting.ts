// Mid-season board meeting: ask once a season (weeks 4–14) for cash, a wage raise, or an easier target.
import type { GameState } from './game.ts';
import { club, copy, standings } from './game.ts';
import { refreshWageBudget, wageLimit } from './budget.ts';

export type MeetingAsk = 'cash' | 'wages' | 'target';
export type Meeting = { season: number; week: number; ask: MeetingAsk; ok: boolean };
export const MEETING_ASKS: { id: MeetingAsk; label: string; blurb: string }[] = [
  { id: 'cash', label: 'Transfer funds', blurb: 'Ask for extra money to spend now' },
  { id: 'wages', label: 'Wage budget raise', blurb: '+10% wage budget for the rest of the season' },
  { id: 'target', label: 'Lower the target', blurb: 'Board expect one place lower; costs trust' },
];
const FROM = 4, TO = 14;
export const meetingOpen = (s: GameState) => !s.match && !s.sacked && s.week >= FROM && s.week <= TO && s.meeting?.season !== s.season && !!s.board;
/** How warm the board is: trust plus a bonus if on target, minus if not. */
export function boardMood(s: GameState) {
  const me = club(s), pos = standings(s).filter((c) => c.division === me.division).findIndex((c) => c.id === me.id) + 1;
  return s.trust + (s.board && pos <= s.board.target ? 10 : -10) + Math.round((s.fans - 50) / 5);
}
export function requestMeeting(s: GameState, ask: MeetingAsk): GameState {
  if (!meetingOpen(s) || !MEETING_ASKS.some((a) => a.id === ask)) return s;
  const b = copy(s), mood = boardMood(b);
  let ok: boolean, msg: string;
  if (ask === 'target') {
    ok = true; b.board!.target += 1; b.trust = Math.max(0, b.trust - 6);
    msg = `The board agree to lower the target to ${b.board!.target}${['st', 'nd', 'rd'][b.board!.target - 1] ?? 'th'}, but trust drops.`;
  } else {
    ok = mood >= 60;
    if (ok && ask === 'cash') { const x = Math.max(500, Math.round(Math.abs(b.budget) * 0.12)); b.budget += x; msg = `The board release £${x}k of extra transfer funds.`; }
    else if (ok) { const g = Math.round(wageLimit(b) * 1.1); b.wageBudget = { ...(b.wageBudget ?? { limit: g, season: b.season, week: b.week }), grace: g, graceSeason: b.season }; refreshWageBudget(b, 0); msg = `The board raise the wage budget to £${g}k a week.`; }
    else { b.trust = Math.max(0, b.trust - 3); msg = 'The board say no — results and support must improve first.'; }
  }
  b.meeting = { season: b.season, week: b.week, ask, ok };
  b.headlines = [`🏛️ Board meeting: ${msg}`, ...b.headlines].slice(0, 6);
  return b;
}
export const validMeeting = (s: Pick<GameState, 'meeting'>) => s.meeting === undefined || (!!s.meeting && typeof s.meeting === 'object' && Number.isInteger(s.meeting.season));
