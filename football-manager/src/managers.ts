// Manager hiring (for Director / Chairman careers): candidates, hire, fire, weekly effect.
import type { Formation, GameState, Mentality } from './game.ts';
import { clamp, copy } from './game.ts';
import { book } from './finance.ts';
import { level } from './difficulty.ts';

export type HiredManager = { id: string; name: string; style: Mentality; formation: Formation; rating: number; wage: number; since: number };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const FN = ['Arturo', 'Jens', 'Callum', 'Mateo', 'Viktor', 'Karim', 'Rory', 'Stefan', 'Emre', 'Takumi', 'Didier', 'Paulo'];
const LN = ['Varga', 'Holm', 'Reid', 'Navarro', 'Ilic', 'Benali', 'Quinn', 'Hofmann', 'Aksoy', 'Mori', 'Lambert', 'Sousa'];
const STYLES: Mentality[] = ['cautious', 'balanced', 'attacking'];
const FORMS: Formation[] = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2', '4-1-4-1'];
export function managerCandidates(s: GameState): HiredManager[] {
  const out: HiredManager[] = [];
  for (let i = 0; i < 4; i++) {
    const h = hash(`${s.seed}|hire|${s.season}|${s.hires ?? 0}|${i}`);
    const rating = 1 + (h % 5);
    out.push({ id: `m${s.season}-${s.hires ?? 0}-${i}`, name: `${FN[(h >>> 4) % FN.length]} ${LN[(h >>> 9) % LN.length]}`, style: STYLES[(h >>> 13) % 3]!, formation: FORMS[(h >>> 16) % FORMS.length]!, rating, wage: Math.round((6 + rating * rating * 3) * level(s).money), since: s.season });
  }
  return out;
}
export function hireManager(s: GameState, id: string): GameState {
  const m = managerCandidates(s).find((x) => x.id === id);
  if (!m || s.match || !canHire(s)) return s;
  const b = copy(s);
  if (b.hiredManager) { b.budget -= b.hiredManager.wage * 6; book(b, 'wages', b.hiredManager.wage * 6); }
  b.hiredManager = { ...m, since: b.season };
  b.hires = (b.hires ?? 0) + 1;
  b.tactics = { ...b.tactics, mentality: m.style, formation: m.formation };
  b.headlines = [`🧑‍💼 ${m.name} appointed manager (${'★'.repeat(m.rating)}, ${m.style} ${m.formation}).`, ...b.headlines].slice(0, 6);
  return b;
}
export function fireManager(s: GameState): GameState {
  if (!s.hiredManager || s.match) return s;
  const b = copy(s), m = b.hiredManager!, pay = m.wage * 6;
  b.budget -= pay; book(b, 'wages', pay);
  delete b.hiredManager;
  b.headlines = [`🚪 ${m.name} sacked. Compensation £${pay}k. A caretaker takes charge.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Weekly: in Director/Chairman careers the hired manager is paid and lifts (or drags) morale. */
export function managerWeek(s: GameState) {
  if ((s.mode ?? 'manager') === 'manager') return;
  const m = s.hiredManager, d = m ? m.rating - 3 : -2;
  if (m) { s.budget -= m.wage; book(s, 'wages', m.wage); }
  if (d) s.players.forEach((p) => { if (p.clubId === s.clubId) p.morale = clamp(p.morale + d); });
}
export const validHired = (s: Pick<GameState, 'hiredManager'>) =>
  s.hiredManager === undefined || (!!s.hiredManager && typeof s.hiredManager.id === 'string' && typeof s.hiredManager.name === 'string' && Number.isFinite(s.hiredManager.wage));

export type Mode = 'manager' | 'director' | 'chairman' | 'owner';
export const MODES: { id: Mode; label: string; blurb: string; short?: string }[] = [
  { id: 'manager', label: 'Manager', short: 'Coach the team', blurb: 'Pick the team, set tactics, play every match. The board can sack you.' },
  { id: 'director', label: 'Director', short: 'Transfers + hire the boss', blurb: 'Director of Football: you run transfers and choose the manager, but hiring needs the board’s backing (trust 40+) and they can still sack you.' },
  { id: 'owner', label: 'Owner-Director', short: 'Own it and run it all', blurb: 'Own the club AND run the football: money, stadium, sponsors, transfers, scouting, youth and the manager. Lose the fans or sell too much to investors and they can force you out.' },
  { id: 'chairman', label: 'Chairman', short: 'Money and the manager', blurb: 'You own the club: money, tickets, sponsors and who manages. You can’t be sacked, but the fans can turn.' },
];
export const isManagerMode = (s: Pick<GameState, 'mode'>) => (s.mode ?? 'manager') === 'manager';
export function setMode(s: GameState, mode: Mode): GameState {
  if (mode === 'manager') return s;
  const b = copy(s);
  b.mode = mode;
  b.headlines = [`🏛️ You start as ${mode === 'chairman' ? 'Chairman' : mode === 'owner' ? 'Owner-Director' : 'Director of Football'}. Hire a manager in Club → Board.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Directors of Football need the board's backing (trust 40+) to appoint a manager. */
export const canHire = (s: GameState) => s.mode !== 'director' || s.trust >= 40;
/** Owner-Director: chance (0–60%) that a shareholder/fan vote forces you out this check. */
export function voteRisk(s: GameState) {
  if (s.mode !== 'owner') return 0;
  const p = (s.fans < 20 ? 1 : 0) + ((s.investor?.stakes ?? 0) >= 40 ? 1 : 0) + (s.trust < 25 ? 1 : 0) + ((s.investor?.stakes ?? 0) > 0 && (s.wallet?.investorMood ?? 50) < 30 ? 1 : 0);
  return p >= 2 || s.fans < 20 ? p * 20 : 0;
}
