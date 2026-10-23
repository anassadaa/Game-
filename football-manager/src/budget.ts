import type { GameState, Player } from './game.ts';
import { club, windowOpen } from './game.ts';
import { agentFee } from './finance.ts';
import { level } from './difficulty.ts';
import { dofDiscount } from './staff.ts';
import { league } from './world.ts';

const ours = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
/** Total weekly wages of everyone registered to us (incl. loanees we pay). */
export const wageBill = (s: GameState) => ours(s).reduce((a, p) => a + (p.wage || 0), 0);
/** Board's weekly wage budget: scales with TV money, crowd and difficulty. Advisory (never blocks). */
export function wageLimit(s: GameState) {
  const tv = league(club(s).division).tier === 1 ? 130 : 90;
  return Math.round((tv + 80 + (s.fans ?? 0) * 0.45) * level(s).money * 1.4);
}
export const wageRoom = (s: GameState) => wageLimit(s) - wageBill(s);
export const salaryList = (s: GameState) =>
  ours(s).map((p) => ({ id: p.id, name: p.name, position: p.position, wage: p.wage || 0, years: p.contract ?? 0 })).sort((a, b) => b.wage - a.wage);
/** Why an offer for p at this fee can't be submitted, or null if it can. */
export function offerBlock(s: GameState, p: Player, fee: number, instalments = false): string | null {
  if (s.match) return 'Not during a match';
  const rival = p.clubId !== 'market';
  if (ours(s).length >= 25) return 'Squad full (25)';
  if (!rival) return null;
  if (s.embargo) return 'FFP embargo this season';
  if (!windowOpen(s)) return 'Window closed';
  const upfront = (instalments ? Math.round(fee * 0.4) : fee) + Math.round(agentFee(p, fee) * dofDiscount(s));
  if (s.budget < upfront) return `Over budget by £${upfront - s.budget}k`;
  return null;
}
