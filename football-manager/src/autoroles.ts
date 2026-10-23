import type { GameState, Player } from './game.ts';
import { ROLES, roleFit, type Instruction } from './tactics.ts';
import { ext, slotOf } from './positions.ts';
import { ppms } from './traits.ts';

/** Slot-driven role preferences (bonus points on top of attribute fit). */
const SLOT_BONUS: Record<string, Record<string, number>> = {
  GK: { keeper: 2 },
  LB: { wingback: 7 }, RB: { wingback: 7 }, CB: { stopper: 3, ballplaying: 2, wingback: -10 },
  DM: { anchor: 6, winger: -8 }, CM: { boxtobox: 4, winger: -4 }, AM: { playmaker: 5, anchor: -6 },
  LW: { presser: 2 }, RW: { presser: 2 }, ST: { poacher: 3, target: 2 },
};
const INSTR: Record<string, Instruction> = {
  keeper: 'none', sweeper: 'none', stopper: 'stay back', ballplaying: 'none', wingback: 'get forward',
  anchor: 'stay back', playmaker: 'roam', boxtobox: 'get forward', winger: 'get forward',
  poacher: 'shoot more', target: 'none', presser: 'mark tightly',
};

/** Best-fit role and instruction for a player in his slot, with a short reason. */
export function bestRole(p: Player): { role: string; instr: Instruction; why: string } {
  const sl = slotOf({ ...p }), x = ext({ ...p }), tr = ppms({ ...p });
  const keys = Object.keys(ROLES[p.position]);
  const fits = Object.fromEntries(keys.map((k) => [k, roleFit(p, k)]));
  const top = Math.max(...keys.map((k) => fits[k]!));
  let best = keys[0]!, bestScore = -Infinity, reason = '';
  for (const k of keys) {
    if (fits[k]! < top - 8) continue; // never pick a clearly worse fit
    let sc = fits[k]! + (SLOT_BONUS[sl]?.[k] ?? 0), why = `${ROLES[p.position][k]!.label} fit ${fits[k]}`;
    if (k === 'target' && x.heading >= p.rating + 3) { sc += 3; why += ', strong in the air'; }
    if (k === 'stopper' && x.tackling >= p.rating + 3) { sc += 2; why += ', good tackler'; }
    if (k === 'playmaker' && x.vision >= p.rating + 3) { sc += 3; why += ', sees passes'; }
    if ((k === 'winger' || k === 'wingback') && tr.includes('runsWithBall')) { sc += 3; why += ', likes to run with the ball'; }
    if ((k === 'poacher' || k === 'playmaker') && tr.includes('longShots')) sc += 1;
    if (k === 'sweeper' && x.composure >= p.rating + 4) { sc += 2; why += ', composed on the ball'; }
    if (SLOT_BONUS[sl]?.[k]) why += `, suits ${sl}`;
    if (sc > bestScore) { bestScore = sc; best = k; reason = why; }
  }
  let instr = INSTR[best] ?? 'none';
  if (tr.includes('longShots') && (best === 'boxtobox' || best === 'target')) instr = 'shoot more';
  if (tr.includes('divesIn') && instr === 'mark tightly') instr = 'none';
  if (best === 'wingback' && p.attrs && (p.rating + (p.attrs.stamina ?? 0)) < 45) instr = 'none';
  return { role: best, instr, why: reason };
}

/** One tap: best-fit role + instruction for every starter. Returns s unchanged once the match is over. */
export function autoAssign(s: GameState): GameState {
  if (s.match?.complete) return s;
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const roles = { ...s.tactics.roles }, instr = { ...s.tactics.instr };
  for (const p of xi) { const b = bestRole(p); roles[p.id] = b.role; instr[p.id] = b.instr; }
  return { ...s, tactics: { ...s.tactics, roles, instr } };
}
