// Fan mood: labels, protests when furious, chants when ecstatic.
import type { GameState } from './game.ts';
import { club, standings } from './game.ts';
import { book } from './finance.ts';
import { level } from './difficulty.ts';
import { priceThisMatch } from './tickets.ts';
import { citySize } from './tickets.ts';
import { league } from './world.ts';

export type FanNote = { label: string; pct: number; w: number };
export type FanLog = { last?: { kind: 'protest' | 'chant'; season: number; week: number }; protests: number; notes?: FanNote[]; season?: { s: number; protests: number }; target?: number; delta?: number };
const MOODS = [
  { min: 80, label: 'Ecstatic', icon: '🤩', color: '#15803d' },
  { min: 60, label: 'Happy', icon: '😀', color: '#4d7c0f' },
  { min: 40, label: 'Content', icon: '🙂', color: '#a16207' },
  { min: 25, label: 'Unhappy', icon: '😠', color: '#c2410c' },
  { min: -1, label: 'Furious', icon: '🤬', color: '#b91c1c' },
];
export const fanMood = (s: GameState) => MOODS.find((m) => s.fans >= m.min)!;
const COOL = 5;
const hashN = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
const absW = (s: Pick<GameState, 'season' | 'week'>) => s.season * 18 + s.week;
const NOTE_WEEKS = 8;
/** Record a one-off event the fans will remember for a few weeks (fades linearly). */
export function fanNote(s: GameState, label: string, pct: number) {
  const log = (s.fanLog ??= { protests: 0 });
  log.notes = [{ label, pct, w: absW(s) }, ...(log.notes ?? []).filter((n) => absW(s) - n.w < NOTE_WEEKS)].slice(0, 8);
}
const seasonProtests = (s: GameState) => (s.fanLog?.season && s.fanLog.season.s === s.season ? s.fanLog.season.protests : 0);
/** Where the mood is heading: a level set by results, table, prices, transfers, promises, investment, style, youth,
 *  trophies and protest fatigue (see docs/fan-research.md). Mood drifts toward it every week. */
export function fanTarget(s: GameState) {
  const r: { label: string; pct: number }[] = [], add = (label: string, pct: number) => { const v = Math.round(pct); if (v) r.push({ label, pct: v }); };
  const me = club(s), table = standings(s).filter((c) => c.division === me.division), n = table.length, pos = table.findIndex((c) => c.id === me.id) + 1;
  const form = me.form.slice(-5);
  if (form.length) { const ppg = form.reduce((a, x) => a + (x === 'W' ? 3 : x === 'D' ? 1 : 0), 0) / form.length; add(`Form ${form.join('')}`, (ppg - 1.3) * 9); }
  if (s.week >= 3 && pos) {
    const exp = [...table].sort((a, b) => b.rating - a.rating).findIndex((c) => c.id === me.id) + 1;
    add(pos < exp ? `${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}, above expectations (${exp}th)` : pos > exp ? `${pos}th, below expectations (${exp}th)` : 'Where we should be', Math.max(-12, Math.min(12, (exp - pos) * 2)));
    if (pos <= 2) add('In the title race', 5); else if (pos > n - 3) add('Relegation fight', -6);
  }
  const price = priceThisMatch(s), fair = 3 + (citySize(s) >= 1.2 ? 0.5 : citySize(s) < 0.9 ? -0.5 : 0) + (league(me.division).tier === 1 ? 0.5 : 0);
  add(price > fair + 0.6 ? 'Ticket prices feel unfair' : price < fair - 0.6 ? 'Affordable tickets' : 'Fair ticket prices', Math.max(-10, Math.min(8, (fair - price) * 4)));
  const signings = s.players.filter((p) => p.clubId === s.clubId && p.boughtAt && absW(s) - (p.boughtAt.s * 18 + p.boughtAt.w) <= 8 && p.rating >= me.rating + 3).length;
  if (signings) add(`${signings} exciting signing${signings > 1 ? 's' : ''}`, Math.min(9, signings * 3));
  const f = s.facilities; if (f) { if (f.building) add('Investment in the club', 3); if (f.stadium > 1) add('Improved stadium', (f.stadium - 1) * 1.5); }
  const style = s.tactics?.mentality; if (style === 'attacking') add('Attacking football', 4); else if (style === 'cautious') add('Negative football', -4);
  const youth = s.players.filter((p) => p.clubId === s.clubId && p.starting && p.age <= 20).length; if (youth) add('Youngsters coming through', Math.min(6, youth * 2));
  const cups = (s.trophies ?? []).filter((x) => x.season >= s.season - 1 && x.club === me.name).length; if (cups) add(`${cups} recent troph${cups > 1 ? 'ies' : 'y'}`, cups * 6);
  for (const k of ['cup', 'lcup', 'euro', 'euro2'] as const) { const c = (s as unknown as Record<string, { round?: number } | undefined>)[k]; if (c?.round && c.round >= 2) add(`Cup run (${k === 'euro' || k === 'euro2' ? 'Europe' : 'cup'})`, Math.min(6, c.round * 1.5)); }
  for (const x of s.fanLog?.notes ?? []) { const age = absW(s) - x.w; if (age >= 0 && age < NOTE_WEEKS) add(x.label, x.pct * (1 - age / NOTE_WEEKS)); }
  const fat = seasonProtests(s); if (fat) add('Protest fatigue: anger burning out', Math.min(10, fat * 3));
  const target = Math.max(5, Math.min(95, Math.round(52 + r.reduce((a, x) => a + x.pct, 0))));
  return { target, reasons: r };
}
/** What the mood is doing right now — good and bad. */
export function fanEffects(s: Pick<GameState, 'fans'> & Partial<GameState>) {
  const m = (s.fans - 50) / 50; // −1 … +1
  return {
    demand: Math.round((s.fans - 50) * 0.5), // % on match demand (tickets.ts)
    merch: Math.max(0, Math.round((4 + s.fans * 0.25) * (s.season !== undefined ? level(s as GameState).money : 1))), // £k/wk merchandise
    sponsor: Math.round(m * 15), // % on sponsor value (sponsors.ts uses fans)
    homeEdge: Math.round((0.02 + Math.max(0, s.fans) / 2500) * 1000) / 1000, // win-chance edge at home (was flat 0.04)
    trust: s.fans >= 75 ? 1 : s.fans < 30 ? -1 : 0, // board confidence each week… protests cost more
    valuation: Math.round((s.fans - 50) / 10), // % on club value (wallet.ts)
    protest: s.fans < 20 ? 100 : s.fans < 32 ? Math.max(0, Math.round((32 - s.fans) * 6 - seasonProtests(s as GameState) * 8)) : 0, // % chance this week
    morale: s.fans >= 75 ? 1 : s.fans < 25 ? -1 : 0, // squad morale each week
    appeal: s.fans >= 75 ? 'Signings love the atmosphere' : s.fans < 30 ? 'A toxic atmosphere puts signings off' : '',
  };
}
export function fanWeek(s: GameState): 'protest' | 'chant' | undefined {
  const log = (s.fanLog ??= { protests: 0 });
  if (log.season?.s !== s.season) log.season = { s: s.season, protests: 0 };
  const mood0 = s.fans, protestChance = fanEffects(s).protest;
  // weekly drift toward the target (at least 1 point, about a fifth of the gap)
  const t = fanTarget(s), gap = t.target - s.fans, step = gap === 0 ? 0 : Math.sign(gap) * Math.max(1, Math.round(Math.abs(gap) * 0.2));
  s.fans = Math.max(0, Math.min(100, s.fans + step)); log.target = t.target; log.delta = step;
  const fx = fanEffects(s);
  if (s.clubId && s.season !== undefined) { const merch = fx.merch; s.budget += merch; book(s, 'sponsor', merch); }
  if (fx.trust && s.week % 3 === 0) s.trust = Math.max(0, Math.min(100, s.trust + fx.trust));
  if (fx.morale && s.week % 2 === 0) s.players.forEach((p) => { if (p.clubId === s.clubId) p.morale = Math.max(0, Math.min(100, p.morale + fx.morale)); });
  const l = log.last;
  if (l && l.season === s.season && s.week - l.week < COOL) return undefined;
  const roll = hashN(`${s.seed}|fans|${s.season}|${s.week}`) * 100;
  const kind = protestChance > roll ? 'protest' : mood0 >= 88 ? 'chant' : undefined;
  if (!kind) return undefined;
  log.last = { kind, season: s.season, week: s.week };
  if (kind === 'protest') {
    log.protests++; log.season.protests++;
    s.trust = Math.max(0, s.trust - 4);
    s.headlines = [`📣 Fans protest outside the ground before the game. The board are watching (trust −4).`, ...s.headlines].slice(0, 6);
  } else {
    s.trust = Math.min(100, s.trust + 1);
    s.headlines = [`🎶 The whole ground sings your name. The board notice (trust +1).`, ...s.headlines].slice(0, 6);
  }
  return kind;
}
export const validFanLog = (s: Pick<GameState, 'fanLog'>) => s.fanLog === undefined || (!!s.fanLog && typeof s.fanLog === 'object' && Number.isFinite(s.fanLog.protests));
