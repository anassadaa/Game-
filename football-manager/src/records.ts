// Club records and achievements — updated after every match and at season end.
import type { GameState } from './game.ts';
import { club } from './game.ts';
import type { Result } from './fixtures.ts';

export type Score = { us: number; them: number; opp: string; season: number };
export type Records = {
  bigWin?: Score; bigLoss?: Score; winRun: number; bestWinRun: number; unbeaten: number; bestUnbeaten: number;
  mostPoints?: { pts: number; season: number }; bestFinish?: { pos: number; division: number; season: number };
};
export type Unlocked = { id: string; season: number };
type Ach = { id: string; icon: string; title: string; desc: string; ok: (s: GameState) => boolean };
const tr = (s: GameState) => s.trophies ?? [];
export const ACHIEVEMENTS: Ach[] = [
  { id: 'first_win', icon: '✅', title: 'Off the mark', desc: 'Win your first match', ok: (s) => s.careerWins >= 1 },
  { id: 'wins_25', icon: '💪', title: 'Winning habit', desc: 'Win 25 matches', ok: (s) => s.careerWins >= 25 },
  { id: 'wins_100', icon: '💯', title: 'Centurion', desc: 'Win 100 matches', ok: (s) => s.careerWins >= 100 },
  { id: 'games_100', icon: '🗓️', title: 'Long service', desc: 'Manage 100 matches', ok: (s) => s.careerGames >= 100 },
  { id: 'big_win', icon: '🔥', title: 'Demolition', desc: 'Win by 5 or more goals', ok: (s) => !!s.records?.bigWin && s.records.bigWin.us - s.records.bigWin.them >= 5 },
  { id: 'run5', icon: '📈', title: 'On a roll', desc: 'Win 5 in a row', ok: (s) => (s.records?.bestWinRun ?? 0) >= 5 },
  { id: 'unbeaten10', icon: '🛡️', title: 'Unbeatable', desc: 'Go 10 games unbeaten', ok: (s) => (s.records?.bestUnbeaten ?? 0) >= 10 },
  { id: 'pts40', icon: '⭐', title: 'Points machine', desc: 'Earn 40+ league points in a season', ok: (s) => (s.records?.mostPoints?.pts ?? 0) >= 40 },
  { id: 'first_trophy', icon: '🏆', title: 'Silverware', desc: 'Win your first trophy', ok: (s) => tr(s).length >= 1 },
  { id: 'trophies5', icon: '👑', title: 'Trophy cabinet', desc: 'Win 5 trophies', ok: (s) => tr(s).length >= 5 },
  { id: 'champions', icon: '🥇', title: 'Champions', desc: 'Win a league title', ok: (s) => tr(s).some((t) => t.name.includes('title')) },
  { id: 'promoted', icon: '⬆️', title: 'Going up', desc: 'Win promotion', ok: (s) => tr(s).some((t) => t.name.startsWith('Promotion')) },
  { id: 'cup', icon: '🏺', title: 'Cup run', desc: 'Win a cup competition', ok: (s) => tr(s).some((t) => !t.name.includes('title') && !t.name.startsWith('Promotion')) },
  { id: 'rich', icon: '💰', title: 'Deep pockets', desc: 'Have £20m in the bank', ok: (s) => s.budget >= 20000 },
  { id: 'season5', icon: '🎖️', title: 'Five seasons', desc: 'Reach your 6th season', ok: (s) => s.season >= 6 },
];
const recs = (s: GameState): Records => (s.records ??= { winRun: 0, bestWinRun: 0, unbeaten: 0, bestUnbeaten: 0 });
export function noteMatch(s: GameState, r: Result) {
  const x = recs(s), sc: Score = { us: r.us, them: r.them, opp: s.clubs.find((c) => c.id === r.opp)?.name ?? r.opp, season: s.season };
  const m = r.us - r.them;
  if (m > 0 && (!x.bigWin || m > x.bigWin.us - x.bigWin.them)) x.bigWin = sc;
  if (m < 0 && (!x.bigLoss || -m > x.bigLoss.them - x.bigLoss.us)) x.bigLoss = sc;
  x.winRun = m > 0 ? x.winRun + 1 : 0; x.unbeaten = m >= 0 ? x.unbeaten + 1 : 0;
  x.bestWinRun = Math.max(x.bestWinRun, x.winRun); x.bestUnbeaten = Math.max(x.bestUnbeaten, x.unbeaten);
}
export function seasonRecords(s: GameState, pos: number, division: number) {
  const x = recs(s), pts = club(s).points;
  if (!x.mostPoints || pts > x.mostPoints.pts) x.mostPoints = { pts, season: s.season };
  const better = !x.bestFinish || division < x.bestFinish.division || (division === x.bestFinish.division && pos < x.bestFinish.pos);
  if (better) x.bestFinish = { pos, division, season: s.season };
}
export function checkAchievements(s: GameState) {
  const have = new Set((s.achievements ?? []).map((a) => a.id));
  const got = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.ok(s));
  if (got.length) {
    s.achievements = [...(s.achievements ?? []), ...got.map((a) => ({ id: a.id, season: s.season }))];
    s.headlines = [`🏆 Achievement unlocked: ${got.map((a) => `${a.icon} ${a.title}`).join(' · ')}`, ...s.headlines].slice(0, 6);
  }
  return got;
}
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
export const validRecords = (s: GameState) =>
  (s.records === undefined || (!!s.records && typeof s.records === 'object' && num(s.records.winRun) && num(s.records.bestUnbeaten))) &&
  (s.achievements === undefined || (Array.isArray(s.achievements) && s.achievements.every((a) => a && typeof a.id === 'string' && num(a.season))));
