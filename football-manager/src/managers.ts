// Manager hiring (for Director / Chairman careers): candidates, hire, fire, weekly effect.
import type { Formation, GameState, Mentality } from './game.ts';
import { clamp, copy, standings } from './game.ts';
import { book } from './finance.ts';
import { level } from './difficulty.ts';

export type HiredManager = { id: string; name: string; style: Mentality; formation: Formation; rating: number; wage: number; since: number; contractEnd?: number; alerted?: boolean };

// ---------- Contracts (shared by the main club and boardroom clubs) ----------
export const SEASON_WEEKS = 18;
export const CONTRACT_YEARS = [1, 2, 3, 4, 5] as const;
/** The best managers insist on security. */
export const minYears = (m: Pick<HiredManager, 'rating'>) => (m.rating >= 5 ? 2 : 1);
const validYears = (m: Pick<HiredManager, 'rating'>, y: number) => Number.isInteger(y) && y >= minYears(m) && y <= 5;
/** Longer deals: 3% off the weekly wage per extra year. */
export const contractWage = (m: Pick<HiredManager, 'wage'>, years: number) => Math.max(1, Math.round(m.wage * (1 - 0.03 * (years - 1))));
/** A contract covers the current season (if hired by mid-season) plus the extra years. */
export const contractEndFor = (s: Pick<GameState, 'season' | 'week'>, years: number) => s.season + years - (s.week <= 9 ? 1 : 0);
export const endOf = (s: Pick<GameState, 'season'>, m: HiredManager) => m.contractEnd ?? s.season + 1;
export const weeksLeft = (s: Pick<GameState, 'season' | 'week'>, m: HiredManager) => Math.max(0, (endOf(s, m) - s.season) * SEASON_WEEKS + (SEASON_WEEKS - s.week));
/** Sacking pays off the rest of the contract. */
export const compensation = (s: Pick<GameState, 'season' | 'week'>, m: HiredManager) => weeksLeft(s, m) * m.wage;
/** Leaving early: he (or his new club) pays ~6 months' wages, more for top managers. */
export const exitPenalty = (m: HiredManager) => Math.round(m.wage * 26 * (0.8 + m.rating * 0.1));
export const tenure = (s: Pick<GameState, 'season'>, m: HiredManager) => s.season - m.since + 1;
/** % chance per 4-week check that he walks out. overperf = places above expectation. */
export function leaveChance(s: Pick<GameState, 'trust'>, m: Pick<HiredManager, 'rating'>, overperf: number) {
  let c = 2;
  if (overperf >= 3 && m.rating >= 3) c += 6 + Math.min(10, (overperf - 2) * 2); // a bigger club comes calling
  if (s.trust < 30) c += Math.round((30 - s.trust) / 2);
  return Math.min(35, c);
}
export const finalSeason = (s: Pick<GameState, 'season' | 'week'>, m: HiredManager) => weeksLeft(s, m) <= SEASON_WEEKS;
/** Renewal terms: performance (places above expectation) earns a raise of up to 30%. */
export function renewalTerms(s: Pick<GameState, 'season' | 'week'>, years: number, overperf: number, m?: HiredManager) {
  const base = m ?? (s as GameState).hiredManager!;
  const raise = Math.min(0.3, Math.max(0, overperf) * 0.06);
  return { years, raise: Math.round(raise * 100), wage: contractWage({ wage: Math.round(base.wage * (1 + raise)) }, years) };
}
/** Contract events for one manager this week. */
export function contractTick(s: GameState, m: HiredManager, key: string, trust: number, overperf: number): { kind: 'expire' | 'alert' | 'leave' | null; penalty?: number } {
  const end = endOf(s, m);
  if (s.season > end || (s.season === end && s.week >= SEASON_WEEKS)) return { kind: 'expire' };
  if (s.week % 4 === 0 && hash(`${s.seed}|mgr-exit|${key}|${m.id}|${s.season}|${s.week}`) % 100 < leaveChance({ trust }, m, overperf)) return { kind: 'leave', penalty: exitPenalty(m) };
  if (finalSeason(s, m) && !m.alerted) return { kind: 'alert' };
  return { kind: null };
}
export function overperformance(s: GameState) {
  const c = s.clubs.find((x) => x.id === s.clubId); if (!c) return 0;
  const exp = s.clubs.filter((x) => x.division === c.division).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).findIndex((x) => x.id === s.clubId) + 1;
  const pos = standings(s).filter((x) => x.division === c.division).findIndex((x) => x.id === s.clubId) + 1;
  return (s.results?.length ?? 0) >= 4 ? exp - pos : 0;
}
const mgrNote = (s: GameState, line: string) => { if (s.mgr) s.mgr.log = [`S${s.season} W${s.week}: ${line}`, ...s.mgr.log].slice(0, 30); };
const headline = (s: GameState, h: string) => { s.headlines = [h, ...s.headlines].slice(0, 6); };

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
export function hireManager(s: GameState, id: string, years?: number): GameState {
  const m = managerCandidates(s).find((x) => x.id === id);
  if (m && years === undefined) years = minYears(m);
  if (!m || years === undefined || s.match || !canHire(s) || !validYears(m, years)) return s;
  const b = copy(s);
  if (b.hiredManager) { const pay = compensation(b, b.hiredManager); b.budget -= pay; book(b, 'wages', pay); }
  b.hiredManager = { ...m, wage: contractWage(m, years), since: b.season, contractEnd: contractEndFor(b, years) };
  b.hires = (b.hires ?? 0) + 1;
  b.tactics = { ...b.tactics, mentality: m.style, formation: m.formation };
  b.headlines = [`🧑‍💼 ${m.name} appointed manager (${'★'.repeat(m.rating)}, ${m.style} ${m.formation}) on a ${years}-year deal.`, ...b.headlines].slice(0, 6);
  return b;
}
export function fireManager(s: GameState): GameState {
  if (!s.hiredManager || s.match) return s;
  const b = copy(s), m = b.hiredManager!, pay = compensation(b, m);
  b.budget -= pay; book(b, 'wages', pay);
  delete b.hiredManager;
  b.headlines = [`🚪 ${m.name} sacked. Compensation £${pay}k. A caretaker takes charge.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Renew in the final season: 1-5 more years; he may ask for a raise if he's overperforming. */
export function renewManager(s: GameState, years: number): GameState {
  const m = s.hiredManager;
  if (!m || s.match || !Number.isInteger(years) || years < 1 || years > 5 || !finalSeason(s, m)) return s;
  const b = copy(s), t = renewalTerms(b, years, overperformance(b), m);
  b.hiredManager = { ...m, wage: t.wage, contractEnd: endOf(b, m) + years, alerted: false };
  headline(b, `✍️ ${m.name} signs a ${years}-year extension (£${t.wage}k/wk, to season ${endOf(b, m) + years}).`);
  mgrNote(b, `Signed a ${years}-year extension at £${t.wage}k/wk${t.raise ? ` (+${t.raise}% raise)` : ''}.`);
  return b;
}
/** Weekly: in Director/Chairman careers the hired manager is paid and lifts (or drags) morale. */
export function managerWeek(s: GameState) {
  if ((s.mode ?? 'manager') === 'manager') return;
  const m = s.hiredManager, d = m ? m.rating - 3 : -2;
  if (m) { s.budget -= m.wage; book(s, 'wages', m.wage); }
  if (m) {
    const ev = contractTick(s, m, 'main', s.trust, overperformance(s));
    if (ev.kind === 'expire') { delete s.hiredManager; headline(s, `📄 ${m.name}'s contract has expired. He leaves on a free; a caretaker takes charge.`); mgrNote(s, 'My contract ran out, so I am leaving. Good luck.'); }
    else if (ev.kind === 'leave') {
      const pen = ev.penalty!; s.budget += pen; book(s, 'other', pen); delete s.hiredManager;
      headline(s, `✈️ ${m.name} quits ${s.trust < 30 ? 'after losing the board\'s backing' : 'for a bigger club'}. £${pen}k exit penalty paid to us.`);
      mgrNote(s, `Leaving before my contract ends; £${pen}k penalty paid to the club.`);
    } else if (ev.kind === 'alert') { m.alerted = true; headline(s, `📄 ${m.name}'s contract ends after season ${endOf(s, m)}. Offer a renewal in Club → Board or let him go.`); mgrNote(s, 'My contract is in its final season. Waiting on your offer.'); }
  }
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
