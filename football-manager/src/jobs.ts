import type { Club, GameState } from './game.ts';
import { clamp, club, copy, next, pick, standings, takeJob } from './game.ts';
import { league } from './world.ts';

export type Vacancy = { clubId: string; season: number; week: number };
export type JobResult = { ok: boolean; chance: number; interview: string; reason?: string };
/** Club stature 0-100 from its strength and tier. */
export const stature = (c: Club) => clamp(Math.round((c.rating - 45) * 2 + (league(c.division).tier === 1 ? 12 : 0)), 0, 100);
export const reputation = (s: GameState) => s.reputation ?? clamp(stature(club(s)) - 5);
function bump(s: GameState, d: number) { s.reputation = clamp(Math.round((reputation(s) + d) * 10) / 10); }

const rank = (s: GameState, c: Club) => s.clubs.filter((x) => x.division === c.division).sort((a, b) => b.rating - a.rating).findIndex((x) => x.id === c.id) + 1;
/** Weekly: reputation from the result vs expectation, AI sackings and vacancies filling. */
export function jobsWeek(s: GameState, us: number, them: number, oppId: string) {
  const opp = s.clubs.find((c) => c.id === oppId), me = club(s);
  if (!s.sacked && opp) {
    const edge = (opp.rating - me.rating) / 10; // positive = we were underdogs
    bump(s, us > them ? 0.4 + Math.max(0, edge) * 0.4 : us < them ? -0.4 + Math.max(0, edge) * 0.3 : 0.1 + edge * 0.2);
  }
  const vac = (s.vacancies ?? []).filter((v) => (s.season - v.season) * 20 + s.week - v.week < 5 && v.clubId !== s.clubId);
  const filled = (s.vacancies ?? []).filter((v) => !vac.includes(v) && v.clubId !== s.clubId);
  for (const v of filled) { const c = s.clubs.find((x) => x.id === v.clubId); if (c) s.news = [`W${s.week + 1}: 🪑 ${c.short} appoint a new manager.`, ...(s.news ?? [])].slice(0, 25); }
  if (s.week >= 5 && vac.length < 6) {
    const table = standings(s);
    const cands = s.clubs.filter((c) => {
      if (c.id === s.clubId || vac.some((v) => v.clubId === c.id)) return false;
      const div = table.filter((x) => x.division === c.division), pos = div.findIndex((x) => x.id === c.id) + 1;
      return pos > rank(s, c) + 4 || pos > div.length - 3;
    });
    if (cands.length && next(s) < 0.35) {
      const c = pick(s, cands);
      vac.push({ clubId: c.id, season: s.season, week: s.week });
      s.news = [`W${s.week + 1}: ❌ ${c.short} sack their manager. The job is open.`, ...(s.news ?? [])].slice(0, 25);
    }
  }
  s.vacancies = vac;
}
/** End of season: overachievement vs expected finish, titles, promotion, relegation. */
export function repSeason(s: GameState, pos: number, outcome: string) {
  if (s.sacked) return;
  const exp = rank(s, club(s));
  bump(s, clamp((exp - pos) * 1.2, -10, 10) + (outcome === 'Champions' ? 8 : outcome === 'Promoted' ? 6 : outcome === 'Relegated' ? -8 : 0));
}
export const repTrophy = (s: GameState) => bump(s, 5);
export const repSacked = (s: GameState) => bump(s, -8);

/** How safe the club's current manager is, 0-100: league position vs pre-season expectation plus recent form. */
export function managerSecurity(s: GameState, clubId: string) {
  const c = s.clubs.find((x) => x.id === clubId)!;
  const played = c.wins + c.draws + c.losses;
  const div = standings(s).filter((x) => x.division === c.division);
  const pos = div.findIndex((x) => x.id === c.id) + 1;
  const over = played ? rank(s, c) - pos : 0;
  const form = c.form.slice(-5);
  const ppg = form.length ? form.reduce((a, r) => a + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / form.length : 1.3;
  return clamp(Math.round(60 + over * 5 + (ppg - 1.3) * 15));
}
export type Approach = { clubId: string; season: number; week: number };
export const APPROACH_LIMIT = 2;
export const APPROACH_WINDOW = 4;
const recentApproaches = (s: GameState) => (s.approaches ?? []).filter((a) => a.season === s.season && s.week - a.week < APPROACH_WINDOW);
/** Why he can't apply to this club right now, or null if he can. */
export function canApply(s: GameState, clubId: string): string | null {
  if (s.match) return 'Finish the match first';
  if (clubId === s.clubId) return 'This is your club';
  if (!s.clubs.some((c) => c.id === clubId)) return 'Unknown club';
  if (s.applied?.includes(clubId)) return 'Already applied this season';
  const open = (s.vacancies ?? []).some((v) => v.clubId === clubId);
  if (!open) {
    const r = recentApproaches(s);
    if (r.length >= APPROACH_LIMIT) {
      const wait = APPROACH_WINDOW - (s.week - Math.min(...r.map((a) => a.week)));
      return `${APPROACH_LIMIT} approaches per ${APPROACH_WINDOW} weeks · next in ${wait} wk${wait === 1 ? '' : 's'}`;
    }
  }
  return null;
}
export const validApproaches = (v: unknown) =>
  v === undefined || (Array.isArray(v) && v.length <= 60 && v.every((a) => a && typeof a.clubId === 'string' && Number.isInteger(a.season) && Number.isInteger(a.week)));

export type Factor = { label: string; value: number };
export function jobChance(s: GameState, clubId: string): { chance: number; factors: Factor[] } {
  const c = s.clubs.find((x) => x.id === clubId)!;
  const f: Factor[] = [];
  f.push({ label: 'Reputation vs club stature', value: Math.round((reputation(s) - stature(c)) * 2) });
  const form = s.sacked ? [] : club(s).form.slice(-5);
  const ppg = form.length ? form.reduce((a, r) => a + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / form.length : 1;
  f.push({ label: 'Recent form', value: Math.round((ppg - 1.3) * 8) });
  const recent = (s.trophies ?? []).filter((t) => t.season >= s.season - 3).length;
  f.push({ label: 'Recent trophies', value: Math.min(20, recent * 7) });
  const lg = league(c.division);
  const seasonsLeague = s.history.filter((h) => h.division === c.division).length + (!s.sacked && club(s).division === c.division ? 1 : 0);
  const seasonsCountry = s.history.filter((h) => league(h.division).country === lg.country).length + (!s.sacked && league(club(s).division).country === lg.country ? 1 : 0);
  f.push({ label: seasonsLeague ? 'Knows this league' : seasonsCountry ? 'Knows this country' : 'No experience in this country', value: seasonsLeague ? Math.min(15, 6 + seasonsLeague * 3) : seasonsCountry ? 5 : -10 });
  f.push({ label: s.sacked ? 'Out of work' : 'Currently employed', value: s.sacked ? (s.resigned ? -2 : -6) : 4 });
  const open = (s.vacancies ?? []).some((v) => v.clubId === clubId);
  if (!open) {
    const sec = managerSecurity(s, clubId);
    f.push({ label: sec >= 80 ? 'Manager overperforming' : sec <= 35 ? 'Manager under pressure' : 'Manager fairly secure', value: sec >= 80 ? -45 : Math.min(14, Math.round((50 - sec) * 0.6)) });
    f.push({ label: 'Approaching an occupied job', value: -15 });
  }
  const chance = clamp(Math.round(45 + f.reduce((a, x) => a + x.value, 0)), 2, open ? 95 : 85);
  return { chance, factors: f };
}
const ADJ: Record<string, string> = { England: 'English', Spain: 'Spanish', Italy: 'Italian', Germany: 'German', France: 'French', Portugal: 'Portuguese', 'Saudi Arabia': 'Saudi' };
const INTERVIEW = ['The chairman asks how you would handle a dressing room in crisis.', 'The board grills you on your transfer philosophy and youth policy.', 'They want to know how quickly you can turn results around.', 'The sporting director quizzes you on your preferred formation.', 'The owner asks whether you see this as a stepping stone.'];
/** Apply for any club: vacancies or an approach for a job that is taken. One application per club per season; approaches are rate-limited. */
export function applyJob(s: GameState, clubId: string): [GameState, JobResult] {
  const block = canApply(s, clubId);
  if (block) return [s, { ok: false, chance: 0, interview: '', reason: block }];
  const open = (s.vacancies ?? []).some((x) => x.clubId === clubId);
  let b = copy(s);
  const { chance, factors } = jobChance(b, clubId);
  const interview = pick(b, INTERVIEW);
  b.applied = [...(b.applied ?? []), clubId];
  if (!open) b.approaches = [...(b.approaches ?? []).filter((a) => a.season === b.season), { clubId, season: b.season, week: b.week }];
  const c = b.clubs.find((x) => x.id === clubId)!;
  if (next(b) * 100 < chance) {
    b.offers = [...(b.offers ?? []).filter((x) => x !== clubId), clubId];
    b.vacancies = (b.vacancies ?? []).filter((x) => x.clubId !== clubId);
    b = takeJob(b, clubId);
    if (!open) b.news = [`W${b.week + 1}: ❌ ${c.short} sack their manager to make room for you.`, ...(b.news ?? [])].slice(0, 25);
    return [b, { ok: true, chance, interview, reason: open ? `${c.name} appoint you as their new manager!` : `${c.name} sack their manager and appoint you!` }];
  }
  if (!open && !b.sacked && next(b) < 0.35) {
    bump(b, -1);
    b.trust = clamp(b.trust - 3);
    b.headlines = [`📰 Word leaks that you approached ${c.short}. Your board is not impressed.`, ...b.headlines].slice(0, 6);
  }
  const worst = [...factors].sort((a, z) => a.value - z.value)[0]!;
  const why: Record<string, string> = {
    'Reputation vs club stature': `The board feel your reputation is not yet big enough for ${c.short}.`,
    'Recent form': 'Your recent results worried the board.',
    'No experience in this country': `They wanted someone who knows ${ADJ[league(c.division).country] ?? league(c.division).country} football.`,
    'Out of work': 'They preferred a candidate currently in a job.',
    'Manager overperforming': `${c.short} are happy with their manager and see no reason to change.`,
    'Approaching an occupied job': `${c.short} are standing by their manager for now.`,
    'Manager fairly secure': `${c.short} are standing by their manager for now.`,
  };
  return [b, { ok: false, chance, interview, reason: worst.value < 0 ? why[worst.label] ?? 'The board went with another candidate.' : 'The board went with another candidate after a close vote.' }];
}
/** Resign: you become a free agent with reputation-scaled offers. */
export function resign(s: GameState): GameState {
  if (s.match || s.sacked) return s;
  const b = copy(s);
  b.sacked = true;
  b.resigned = true;
  bump(b, -3);
  b.offers = reputationOffers(b, false);
  b.headlines = [`🚪 You resign as manager of ${club(b).name}.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Offers scaled by reputation: clubs whose stature is within reach. */
export function reputationOffers(s: GameState, better: boolean) {
  const rep = reputation(s), mine = club(s);
  let pool = s.clubs.filter((c) => c.id !== s.clubId && stature(c) <= rep + 8 && (better ? c.rating > mine.rating : true));
  pool.sort((a, z) => Math.abs(stature(a) - rep) - Math.abs(stature(z) - rep) || next(s) - 0.5);
  if (!pool.length && !better) pool = s.clubs.filter((c) => c.id !== s.clubId).sort((a, z) => a.rating - z.rating).slice(0, 3);
  return pool.slice(0, better ? 2 : 3).map((c) => c.id);
}
export const validJobs = (s: GameState) =>
  (s.reputation === undefined || (Number.isFinite(s.reputation) && s.reputation >= 0 && s.reputation <= 100)) &&
  (s.vacancies === undefined || (Array.isArray(s.vacancies) && s.vacancies.length <= 12 && s.vacancies.every((v) => v && s.clubs.some((c) => c.id === v.clubId)))) &&
  (s.applied === undefined || (Array.isArray(s.applied) && s.applied.every((x) => typeof x === 'string')));
