import type { AttrKey, GameState, Player, Position } from './game.ts';
import { trainingBoost } from './facilities.ts';
import { ATTRS, clamp, copy, next } from './game.ts';

export const DRILLS: { id: string; name: string; attr: AttrKey; cost: number }[] = [
  { id: 'finishing', name: 'Finishing', attr: 'shooting', cost: 3 },
  { id: 'rondo', name: 'Rondos', attr: 'passing', cost: 2 },
  { id: 'sprints', name: 'Sprints', attr: 'pace', cost: 5 },
  { id: 'shape', name: 'Defensive shape', attr: 'defending', cost: 2 },
  { id: 'endurance', name: 'Endurance', attr: 'stamina', cost: 6 },
  { id: 'video', name: 'Video analysis', attr: 'mental', cost: 0 },
  { id: 'keeping', name: 'Shot-stopping', attr: 'goalkeeping', cost: 2 },
];
export const MAX_DRILLS = 3;
export type TrainingReport = { week: number; lines: string[] };

export function toggleDrill(s: GameState, id: string): GameState {
  if (s.match || !DRILLS.some((d) => d.id === id)) return s;
  const b = copy(s), cur = b.drills ?? [];
  b.drills = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_DRILLS ? cur : [...cur, id];
  return b;
}
export function setFocus(s: GameState, pid: string, attr: AttrKey | null): GameState {
  if (s.match || (attr && !ATTRS.includes(attr))) return s;
  const b = copy(s), p = b.players.find((x) => x.id === pid && x.clubId === b.clubId);
  if (!p) return s;
  if (attr) p.focus = attr;
  else delete p.focus;
  return b;
}
export function retrain(s: GameState, pid: string, to: Position | null): GameState {
  if (s.match || (to && !['GK', 'DF', 'MF', 'FW'].includes(to))) return s;
  const b = copy(s), p = b.players.find((x) => x.id === pid && x.clubId === b.clubId);
  if (!p || p.position === to) return s;
  if (to) p.retrain = { to, progress: 0 };
  else delete p.retrain;
  return b;
}
const bump = (p: Player, k: AttrKey) => {
  if (!p.attrs || p.attrs[k] >= 20 || p.rating + p.attrs[k] >= 99) return false;
  p.attrs[k]++;
  return true;
};
export const sharpness = (p: Player) => p.sharp ?? 70;

/** Weekly training: drills, individual focus, retraining, sharpness, then the reveal report. */
export function weeklyTraining(s: GameState, played: Set<string>) {
  const drills = DRILLS.filter((d) => (s.drills ?? []).includes(d.id));
  const lines: string[] = [];
  for (const p of s.players.filter((x) => x.clubId === s.clubId)) {
    const young = (p.age < 24 ? 1.4 : p.age > 30 ? 0.6 : 1) * trainingBoost(s);
    const gains: string[] = [];
    for (const d of drills) {
      p.fitness = clamp(p.fitness - d.cost * 0.5);
      if (next(s) < 0.12 * young && bump(p, d.attr)) gains.push(d.attr);
    }
    if (p.focus && next(s) < 0.22 * young && bump(p, p.focus)) gains.push(p.focus);
    if (gains.length) lines.push(`📈 ${p.name}: +${[...new Set(gains)].join(', +')}`);
    if (p.retrain) {
      p.retrain.progress = Math.min(100, p.retrain.progress + Math.round(8 + 10 * young + next(s) * 6));
      if (p.retrain.progress >= 100) {
        lines.push(`🔁 ${p.name} is now a natural ${p.retrain.to}.`);
        p.position = p.retrain.to;
        delete p.attrs;
        delete p.retrain;
      }
    }
    p.sharp = clamp(sharpness(p) + (played.has(p.id) ? 12 : -6) + drills.length * 2, 20, 100);
    if (p.sharp < 40 && !played.has(p.id) && next(s) < 0.15) lines.push(`😴 ${p.name} is rusty — sharpness ${p.sharp}.`);
  }
  s.trainingReport = { week: s.week, lines: lines.length ? lines.slice(0, 12) : ['A quiet week — no standout changes.'] };
}
