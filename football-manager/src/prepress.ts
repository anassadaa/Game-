// Pre-match press conference: one question a week, three tones. Effects: fans, board trust, squad morale/harmony.
import type { GameState } from './game.ts';
import { clamp, copy, opponent } from './game.ts';
import { harmony } from './dressing.ts';
import { isDerby, managerName } from './derby.ts';

export type PreQ = { q: string; a: [string, string, string]; derby?: boolean };
type Fx = { fans: number; trust: number; morale: number; harmony: number };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
// Tones: 0 measured, 1 bold, 2 players-first.
const FX: Fx[] = [
  { fans: 0, trust: 2, morale: 0, harmony: 1 },
  { fans: 3, trust: -1, morale: 2, harmony: 0 },
  { fans: 1, trust: 0, morale: 3, harmony: 2 },
];
const POOL = (opp: string, mgr: string): PreQ[] => [
  { q: `${mgr} says ${opp} will "walk all over" your side. Your reply?`, a: ['Talk is cheap — we’ll see on the pitch.', 'He’ll be eating those words on Saturday.', 'My players will give the answer.'] },
  { q: `How do you rate ${opp} this week?`, a: ['A good side; we respect them.', 'We should beat them, simple as that.', 'If we play our game, we can beat anyone.'] },
  { q: 'Fans are asking for more goals. Will we see a change?', a: ['We stay balanced and patient.', 'Expect us to go for the throat.', 'The lads are working hard on it in training.'] },
  { q: 'Is there pressure on your job right now?', a: ['The board and I talk every week.', 'Pressure? I live for it.', 'All my focus is on the players.'] },
  { q: 'Any transfer plans before the window shuts?', a: ['We’ll be sensible with the budget.', 'Watch this space — we want stars.', 'I trust the squad I have.'] },
];
const DERBY = (opp: string, mgr: string): PreQ => ({ derby: true, q: `🔥 Derby week against ${opp}. ${mgr} has called it "just another game". Is it?`, a: ['Three points like any other.', 'This is the one the fans live for — we’ll win it.', 'The players know what this means to the city.'] });
const done = (s: GameState) => s.prePress?.season === s.season && s.prePress.week === s.week;
export function preQuestion(s: GameState): PreQ | null {
  if (s.match || done(s) || s.sacked) return null;
  const opp = opponent(s); if (!opp) return null;
  const mgr = managerName(s, opp.id);
  if (isDerby(s, opp.id)) return DERBY(opp.name, mgr);
  const pool = POOL(opp.name, mgr);
  return pool[hash(`${s.seed}|press|${s.season}|${s.week}`) % pool.length]!;
}
export function answerPre(s: GameState, i: 0 | 1 | 2): GameState {
  const q = preQuestion(s);
  if (!q || ![0, 1, 2].includes(i)) return s;
  const b = copy(s), f = FX[i]!, x = q.derby ? 2 : 1;
  b.prePress = { season: b.season, week: b.week, tone: i };
  b.fans = clamp(b.fans + f.fans * x);
  b.trust = clamp(b.trust + f.trust);
  b.harmony = clamp(harmony(b) + f.harmony);
  if (f.morale) b.players.forEach((p) => { if (p.clubId === b.clubId) p.morale = clamp(p.morale + f.morale); });
  b.headlines = [`🎙️ Pre-match: "${q.a[i]}"`, ...b.headlines].slice(0, 6);
  return b;
}
export const validPrePress = (s: Pick<GameState, 'prePress'>) => s.prePress === undefined || (!!s.prePress && Number.isInteger(s.prePress.week) && Number.isInteger(s.prePress.season));
