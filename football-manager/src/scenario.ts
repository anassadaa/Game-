// Challenge scenarios chosen at new game: a twist at the start and a goal to beat.
import type { GameState } from './game.ts';
import { club } from './game.ts';

export type ScenarioId = 'none' | 'firefight' | 'debt' | 'nostars' | 'promotion';
export type Scenario = { id: Exclude<ScenarioId, 'none'>; start: number; deadline: number; target: number; status: 'active' | 'won' | 'failed' };
export const SCENARIOS: { id: ScenarioId; label: string; blurb: string; goal: string }[] = [
  { id: 'none', label: 'Normal career', blurb: 'No twist. Build your club your way.', goal: '' },
  { id: 'firefight', label: 'Relegation firefight', blurb: 'Morale is broken and the board are nervous.', goal: 'Avoid relegation in your first season' },
  { id: 'debt', label: 'Debt crisis', blurb: 'The bank account is almost empty.', goal: 'Finish season 1 with more money than you started with' },
  { id: 'nostars', label: 'Sold the stars', blurb: 'Your 3 best players were sold before you arrived.', goal: 'Finish in the top half in season 1' },
  { id: 'promotion', label: 'Promotion or bust', blurb: 'The owner wants to go up, fast.', goal: 'Win promotion or the title within 2 seasons' },
];
export const scenarioInfo = (id: string) => SCENARIOS.find((x) => x.id === id);
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
export function applyScenario(s: GameState, id: ScenarioId): GameState {
  if (id === 'none' || !scenarioInfo(id)) return s;
  const sc: Scenario = { id, start: s.season, deadline: s.season + (id === 'promotion' ? 1 : 0), target: 0, status: 'active' };
  const own = s.players.filter((p) => p.clubId === s.clubId);
  if (id === 'firefight') { own.forEach((p) => (p.morale = Math.max(20, p.morale - 15))); s.trust = Math.min(s.trust, 45); }
  if (id === 'debt') { s.budget = Math.round(s.budget * 0.15); sc.target = s.budget; }
  if (id === 'nostars') {
    const others = s.clubs.filter((c) => c.id !== s.clubId && c.division === club(s).division);
    own.sort((a, b) => b.rating - a.rating).slice(0, 3).forEach((p, i) => {
      p.clubId = others[hash(`${s.seed}|ns|${i}`) % others.length]!.id;
      p.listed = false;
    });
  }
  if (id === 'promotion') s.trust = Math.min(s.trust, 55);
  s.scenario = sc;
  s.headlines = [`🎯 Challenge: ${scenarioInfo(id)!.label}. Goal: ${scenarioInfo(id)!.goal}.`, ...s.headlines].slice(0, 6);
  return s;
}
/** Call at season end (before the season number advances). */
export function judgeScenario(s: GameState, pos: number, outcome: string) {
  const sc = s.scenario;
  if (!sc || sc.status !== 'active') return;
  const size = s.clubs.filter((c) => c.division === club(s).division).length;
  const won = sc.id === 'firefight' ? outcome !== 'Relegated'
    : sc.id === 'debt' ? s.budget > sc.target
    : sc.id === 'nostars' ? pos <= Math.ceil(size / 2)
    : outcome === 'Promoted' || outcome === 'Champions';
  if (won) sc.status = 'won';
  else if (s.season >= sc.deadline) sc.status = 'failed';
  else return;
  s.headlines = [`🎯 Challenge ${sc.status === 'won' ? 'complete' : 'failed'}: ${scenarioInfo(sc.id)!.label}.`, ...s.headlines].slice(0, 6);
}
export const validScenario = (s: Pick<GameState, 'scenario'>) =>
  s.scenario === undefined || (!!s.scenario && !!scenarioInfo(s.scenario.id) && s.scenario.id !== ('none' as string) && ['active', 'won', 'failed'].includes(s.scenario.status) && Number.isInteger(s.scenario.deadline));
