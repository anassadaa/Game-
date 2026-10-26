// 3.5: per-season stats for every player in every league, plus leaderboards.
// AI-vs-AI league games only produce a score, so we hand out apps, ratings, goals, assists, MOTM,
// clean sheets and cards to each XI with hash-based randomness (the RNG stream is untouched).
// Our own players keep their real match numbers (p.apps/goals/assists/ratingSum/motm).
import type { GameState, Player, Match } from './game.ts';
import { slotPeek } from './positions.ts';

/** [apps, goals, assists, ratingSum×10, motm, clean sheets, yellows, reds] */
export type StatArr = [number, number, number, number, number, number, number, number];
export type StatMeta = [name: string, clubId: string, position: string, age: number, price: number, division: number];
export type LeagueStats = { season: number; rows: Record<string, StatArr> };
export type StatArchive = { season: number; rows: Record<string, StatArr>; meta: Record<string, StatMeta> };
const zero = (): StatArr => [0, 0, 0, 0, 0, 0, 0, 0];

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function ensureStats(s: GameState): LeagueStats {
  if (!s.lstats || s.lstats.season !== s.season || typeof s.lstats.rows !== 'object') s.lstats = { season: s.season, rows: {} };
  return s.lstats;
}
const row = (s: GameState, id: string) => (ensureStats(s).rows[id] ??= zero());

function pickWeighted(xs: Player[], w: (p: Player) => number, r: number, skip?: Player) {
  const pool = xs.filter((p) => p !== skip), tot = pool.reduce((a, p) => a + w(p), 0);
  let t = r * tot;
  for (const p of pool) { t -= w(p); if (t <= 0) return p; }
  return pool.at(-1);
}
const grp = (p: Player) => { const sl = slotPeek(p); return sl === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(sl) ? 'DF' : ['ST', 'LW', 'RW'].includes(sl) ? 'FW' : sl === 'AM' ? 'AM' : 'MF'; };
const GW: Record<string, number> = { FW: 6, AM: 3.5, MF: 2, DF: 0.6, GK: 0.02 };
const AW: Record<string, number> = { FW: 2.5, AM: 4, MF: 3, DF: 1.2, GK: 0.1 };
const YC: Record<string, number> = { FW: 0.07, AM: 0.08, MF: 0.11, DF: 0.13, GK: 0.02 };

/** One simulated side: returns each player's match rating so MOTM can be picked across both sides. */
function side(s: GameState, key: string, xi: Player[], scored: number, conceded: number): [Player, number][] {
  if (!xi.length) return [];
  const g = new Map<Player, number>(), a = new Map<Player, number>();
  const q = (p: Player) => Math.pow(Math.max(30, p.rating) / 70, 2);
  for (let i = 0; i < scored; i++) {
    const sc = pickWeighted(xi, (p) => GW[grp(p)] * q(p), h(`${key}|g${i}`))!;
    g.set(sc, (g.get(sc) ?? 0) + 1);
    if (h(`${key}|a?${i}`) < 0.75) { const as = pickWeighted(xi, (p) => AW[grp(p)] * q(p), h(`${key}|a${i}`), sc); if (as) a.set(as, (a.get(as) ?? 0) + 1); }
  }
  const avg = xi.reduce((t, p) => t + p.rating, 0) / xi.length, res = scored > conceded ? 0.3 : scored < conceded ? -0.3 : 0;
  return xi.map((p) => {
    const r = row(s, p.id), gp = grp(p), gl = g.get(p) ?? 0, as = a.get(p) ?? 0, cs = conceded === 0 && (gp === 'GK' || gp === 'DF');
    const rt = Math.min(9.8, Math.max(4.5, 6.6 + res + (p.rating - avg) * 0.03 + gl * 0.8 + as * 0.4 + (cs ? 0.4 : 0) - (gp === 'GK' || gp === 'DF' ? conceded * 0.12 : 0) + (h(`${key}|r|${p.id}`) - 0.5) * 1.2));
    r[0]++; r[1] += gl; r[2] += as; r[3] += Math.round(rt * 10);
    if (conceded === 0 && gp === 'GK') r[5]++;
    const c = h(`${key}|c|${p.id}`);
    if (c < 0.006) r[7]++; else if (c < 0.006 + YC[gp]) r[6]++;
    return [p, rt] as [Player, number];
  });
}
/** Squads by club, built once per week (aiXI per club would scan every rival each time). */
export function squadsByClub(s: GameState) {
  const m = new Map<string, Player[]>();
  for (const p of s.rivals ?? []) { const l = m.get(p.clubId); if (l) l.push(p); else m.set(p.clubId, [p]); }
  return m;
}
function xiOf(squads: Map<string, Player[]>, id: string) {
  const ps = (squads.get(id) ?? []).filter((p) => !p.injured).sort((a, b) => b.rating - a.rating);
  const gk = ps.find((p) => p.position === 'GK');
  const out = ps.filter((p) => p.position !== 'GK').slice(0, 10);
  return gk ? [gk, ...out] : out;
}
/** An AI-vs-AI league game. */
export function aiLeagueMatch(s: GameState, squads: Map<string, Player[]>, home: string, away: string, gh: number, ga: number) {
  const key = `${s.seed}|${s.season}|${s.week}|${home}|${away}`;
  const all = [...side(s, `${key}|h`, xiOf(squads, home), gh, ga), ...side(s, `${key}|a`, xiOf(squads, away), ga, gh)];
  const best = all.sort((x, y) => y[1] - x[1])[0];
  if (best) row(s, best[0].id)[4]++;
}
/** Our league game: the opponent's XI gets simulated stats; ours get clean sheets and cards (the rest is real). */
export function ourLeagueMatch(s: GameState, squads: Map<string, Player[]>, m: Match) {
  side(s, `${s.seed}|${s.season}|${s.week}|${m.opponentId}|vs-us`, xiOf(squads, m.opponentId), m.them, m.us);
  for (const p of s.players) {
    if (m.ratings?.[p.id] === undefined) continue;
    if (m.them === 0 && p.position === 'GK') row(s, p.id)[5]++;
  }
  for (const c of m.cards ?? []) { const r = s.players.some((p) => p.id === c.id) ? row(s, c.id) : null; if (!r) continue; if (c.red) r[7]++; else if (c.y) r[6]++; }
}

export type StatLine = { apps: number; goals: number; assists: number; rating: number; motm: number; cleanSheets: number; yellows: number; reds: number };
const lineOf = (r: StatArr): StatLine => ({ apps: r[0], goals: r[1], assists: r[2], rating: r[0] ? Math.round(r[3] / r[0]) / 10 : 0, motm: r[4], cleanSheets: r[5], yellows: r[6], reds: r[7] });
/** This season's numbers for one player (ours: real match stats; everyone else: the ledger). */
export function statRow(s: GameState, p: Player): StatLine {
  const r = ensureStats(s).rows[p.id] ?? zero();
  if (!s.players.some((x) => x.id === p.id)) return lineOf(r);
  const apps = p.apps ?? 0;
  return { ...lineOf(r), apps: apps + r[0], goals: (p.goals ?? 0) + r[1], assists: (p.assists ?? 0) + r[2], motm: (p.motm ?? 0) + r[4], rating: apps + r[0] ? Math.round(((p.ratingSum ?? 0) * 10 + r[3]) / (apps + r[0])) / 10 : 0 };
}

export const STAT_CATS = [
  { id: 'goals', label: 'Top scorers', short: 'Goals' },
  { id: 'assists', label: 'Assists', short: 'Ast' },
  { id: 'ga', label: 'Goals + assists', short: 'G+A' },
  { id: 'rating', label: 'Average rating', short: 'Rating' },
  { id: 'motm', label: 'Player of the match', short: 'MOTM' },
  { id: 'cleanSheets', label: 'Clean sheets', short: 'CS' },
  { id: 'yellows', label: 'Yellow cards', short: 'YC' },
  { id: 'reds', label: 'Red cards', short: 'RC' },
  { id: 'apps', label: 'Appearances', short: 'Apps' },
] as const;
export type StatCat = (typeof STAT_CATS)[number]['id'];
export type BoardRow = { id: string; name: string; clubId: string; club: string; age: number; position: string; price: number; apps: number; value: number; player: Player };
const valueOf = (l: StatLine, cat: StatCat) => (cat === 'ga' ? l.goals + l.assists : l[cat]);

/** Seasons we can show (current first). */
export function statSeasons(s: GameState) { return [s.season, ...(s.lstatsHist ?? []).map((a) => a.season)]; }

/** Top players for a category; division undefined = all leagues. Past seasons come from the archive. */
export function leaderboard(s: GameState, cat: StatCat, opt: { division?: number; season?: number } = {}, limit = 20): BoardRow[] {
  const clubs = new Map(s.clubs.map((c) => [c.id, c]));
  const out: BoardRow[] = [];
  const arch = opt.season !== undefined && opt.season !== s.season ? (s.lstatsHist ?? []).find((a) => a.season === opt.season) : undefined;
  if (opt.season !== undefined && opt.season !== s.season && !arch) return [];
  const live = new Map<string, Player>();
  for (const p of [...s.players, ...(s.rivals ?? []), ...s.market, ...(s.loansOut ?? [])]) if (!live.has(p.id)) live.set(p.id, p);
  const consider = (id: string, l: StatLine, meta: StatMeta | undefined) => {
    const p = live.get(id);
    const clubId = meta ? meta[1] : p?.clubId ?? 'market', div = meta ? meta[5] : clubs.get(clubId)?.division;
    if (opt.division !== undefined && div !== opt.division) return;
    const position = meta ? meta[2] : p?.position ?? '';
    if (cat === 'cleanSheets' && position !== 'GK') return;
    out.push({ id, name: meta ? meta[0] : p?.name ?? '?', clubId, club: clubs.get(clubId)?.name ?? (clubId === 'market' ? 'Free agent' : '—'), age: meta ? meta[3] : p?.age ?? 0, position, price: meta ? meta[4] : p?.price ?? 0, apps: l.apps, value: valueOf(l, cat), player: p! });
  };
  if (arch) for (const [id, r] of Object.entries(arch.rows)) consider(id, lineOf(r), arch.meta[id]);
  else {
    const ids = new Set(Object.keys(ensureStats(s).rows));
    for (const p of s.players) if ((p.apps ?? 0) > 0) ids.add(p.id);
    for (const id of ids) { const p = live.get(id); if (p) consider(id, statRow(s, p), undefined); }
  }
  let rows = out.filter((r) => r.value > 0);
  if (cat === 'rating') { const most = Math.max(0, ...out.map((r) => r.apps)); rows = rows.filter((r) => r.apps >= Math.max(2, Math.ceil(most * 0.4))); }
  return rows.sort((a, b) => b.value - a.value || a.apps - b.apps || a.name.localeCompare(b.name)).slice(0, limit);
}

/** Team leaderboard from the league table. */
export function teamBoard(s: GameState, cat: 'gf' | 'ga' | 'cs', opt: { division?: number } = {}) {
  return s.clubs.filter((c) => opt.division === undefined || c.division === opt.division)
    .map((c) => ({ id: c.id, name: c.name, division: c.division, played: c.played, value: cat === 'cs' ? 0 : c[cat] }))
    .sort((a, b) => (cat === 'ga' ? a.value - b.value : b.value - a.value) || a.name.localeCompare(b.name)).slice(0, 20);
}

/** Season end: keep the top 20 of every category in every league, then start a fresh ledger. Last 3 seasons. */
export function archiveStats(s: GameState) {
  const st = ensureStats(s), keep = new Set<string>();
  for (const div of new Set(s.clubs.map((c) => c.division))) for (const c of STAT_CATS) for (const r of leaderboard(s, c.id, { division: div }, 20)) keep.add(r.id);
  const rows: Record<string, StatArr> = {}, meta: Record<string, StatMeta> = {};
  const clubs = new Map(s.clubs.map((c) => [c.id, c]));
  for (const p of [...s.players, ...(s.rivals ?? []), ...s.market, ...(s.loansOut ?? [])]) {
    if (!keep.has(p.id) || rows[p.id]) continue;
    const l = statRow(s, p);
    rows[p.id] = [l.apps, l.goals, l.assists, Math.round(l.rating * 10 * l.apps), l.motm, l.cleanSheets, l.yellows, l.reds];
    meta[p.id] = [p.name, p.clubId, p.position, p.age, p.price, clubs.get(p.clubId)?.division ?? 0];
  }
  s.lstatsHist = [{ season: st.season, rows, meta }, ...(s.lstatsHist ?? []).filter((a) => a.season !== st.season)].slice(0, 3);
  s.lstats = { season: s.season + 1, rows: {} };
}
