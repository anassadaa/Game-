// In-match substitutions: up to 5 subs in 3 windows (half-time is a free window).
import type { GameState, Player } from './game.ts';
import { copy, opponent } from './game.ts';
import { suitability } from './lineup.ts';

export const MAX_SUBS = 5, MAX_WINDOWS = 3, TIRED = 60;
export type Sub = { off: string; on: string; minute: number };
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);

/** Snapshot the picked XI/bench at kick-off so it can be restored after the match. */
export function kickOff(b: GameState) {
  const m = b.match!;
  const xi = own(b).filter((p) => p.starting).map((p) => p.id);
  m.subs = []; m.windows = []; m.oppSubs = 0;
  m.played = xi; m.xi0 = xi;
  if (b.lineup) m.lineup0 = [...b.lineup];
  if (b.bench) m.bench0 = [...b.bench];
}
/** Put the pre-match selection back once the match is over. */
export function restoreXI(b: GameState) {
  const m = b.match;
  if (!m?.xi0) return;
  const ids = new Set(m.xi0);
  own(b).forEach((p) => (p.starting = ids.has(p.id)));
  b.lineup = m.lineup0;
  b.bench = m.bench0;
  if (!b.lineup) delete b.lineup;
  if (!b.bench) delete b.bench;
}
export const subsUsed = (s: GameState) => s.match?.subs?.length ?? 0;
export const windowsUsed = (s: GameState) => s.match?.windows?.length ?? 0;
/** Players who can come on: the named bench, or (old saves / no bench) any fit non-starter who has not played. */
export function subsBench(s: GameState): Player[] {
  const m = s.match, played = new Set(m?.played ?? []);
  const o = own(s).filter((p) => !p.starting && !played.has(p.id) && !p.injured && !p.suspended);
  const named = (s.bench ?? []).map((id) => o.find((p) => p.id === id)).filter(Boolean) as Player[];
  return named.length ? named : o.sort((a, b) => b.rating - a.rating).slice(0, 7);
}
export function canSub(s: GameState): string | null {
  const m = s.match;
  if (!m || m.complete) return 'The match is over.';
  if (subsUsed(s) >= MAX_SUBS) return 'All 5 substitutions used.';
  if (m.minute !== 45 && m.minute > 0 && !(m.windows ?? []).includes(m.minute) && windowsUsed(s) >= MAX_WINDOWS) return 'No substitution windows left (half-time is still free).';
  return null;
}
export function makeSub(s: GameState, offId: string, onId: string): [GameState, string] {
  const why = canSub(s);
  if (why) return [s, why];
  const b = copy(s), m = b.match!;
  const off = own(b).find((p) => p.id === offId && p.starting);
  const on = subsBench(b).find((p) => p.id === onId);
  if (!off || !on) return [s, 'That change is not possible.'];
  off.starting = false; on.starting = true;
  if (b.lineup) b.lineup = b.lineup.map((id) => (id === off.id ? on.id : id));
  if (b.bench) b.bench = b.bench.filter((id) => id !== on.id);
  m.subs = [...(m.subs ?? []), { off: off.id, on: on.id, minute: m.minute }];
  if (m.minute !== 45 && m.minute > 0 && !(m.windows ?? []).includes(m.minute)) m.windows = [...(m.windows ?? []), m.minute];
  m.played = [...new Set([...(m.played ?? []), on.id])];
  const msg = `🔁 ${on.name} replaces ${off.name}${off.injured ? ' (injured)' : off.fitness < TIRED ? ' (tired)' : ''}.`;
  m.timeline.push({ minute: m.minute, text: msg, side: 'us', kind: 'note', playerId: on.id });
  if (m.down) m.down = m.down.filter((x) => x !== off.id);
  return [b, msg];
}
/** Assistant's suggested changes: injured or tired starters swapped for the most suitable bench player. */
export function subAdvice(s: GameState, max = 2): { off: Player; on: Player; why: string }[] {
  const out: { off: Player; on: Player; why: string }[] = [];
  const bench = [...subsBench(s)];
  const need = own(s).filter((p) => p.starting && (p.injured || p.fitness < TIRED + 8)).sort((a, b) => Number(!!b.injured) - Number(!!a.injured) || a.fitness - b.fitness);
  for (const off of need) {
    if (out.length >= max) break;
    bench.sort((a, b) => suitability(b, off.position) - suitability(a, off.position));
    const on = bench[0];
    if (!on || (!off.injured && on.position !== off.position && on.rating < off.rating)) continue;
    bench.splice(0, 1);
    out.push({ off, on, why: off.injured ? 'injured' : `tired (${Math.round(off.fitness)}%)` });
  }
  return out;
}
/** Simulate-mode auto subs: follow the assistant at half-time, 60' and 75'. */
export function autoSubs(s: GameState): GameState {
  const m = s.match;
  if (!m || m.complete || ![45, 60, 75].includes(m.minute)) return s;
  let b = s;
  for (const a of subAdvice(s, m.minute === 45 ? 1 : 2)) {
    const [n] = makeSub(b, a.off.id, a.on.id);
    if (n === b) break;
    n.match!.timeline[n.match!.timeline.length - 1]!.text += ' (assistant)';
    b = n;
  }
  return b;
}
/** AI side: one or two changes around the hour and at 75', giving them fresh legs. */
export function aiSubs(b: GameState, roll: () => number) {
  const m = b.match!;
  if (![60, 75].includes(m.minute) || (m.oppSubs ?? 0) >= MAX_SUBS) return;
  const n = Math.min(MAX_SUBS - (m.oppSubs ?? 0), roll() < 0.5 ? 1 : 2 + (m.us > m.them ? 1 : 0));
  m.oppSubs = (m.oppSubs ?? 0) + n;
  m.timeline.push({ minute: m.minute, text: `🔁 ${opponent(b).short} make ${n === 1 ? 'a change' : `${n} changes`}: fresh legs on.`, side: 'them', kind: 'note' });
}
/** Opponent strength drift: tire after the break, partly offset by their subs. */
export const oppFatigue = (s: GameState) => {
  const m = s.match;
  if (!m) return 0;
  return Math.max(0, (m.minute - 45) / 45) * 2.5 - (m.oppSubs ?? 0) * 0.45;
};
export function validSubs(s: GameState) {
  const m = s.match as unknown as Record<string, unknown> | null;
  if (s.autoSubs !== undefined && typeof s.autoSubs !== 'boolean') return false;
  if (!m) return true;
  const ids = (a: unknown, n: number) => a === undefined || (Array.isArray(a) && a.length <= n && a.every((x) => typeof x === 'string'));
  if (!ids(m.played, 30) || !ids(m.xi0, 11) || !ids(m.lineup0, 11) || !ids(m.bench0, 7)) return false;
  if (m.subs !== undefined && !(Array.isArray(m.subs) && m.subs.length <= MAX_SUBS && m.subs.every((x: Sub) => x && typeof x.off === 'string' && typeof x.on === 'string' && Number.isFinite(x.minute)))) return false;
  if (m.windows !== undefined && !(Array.isArray(m.windows) && m.windows.length <= MAX_WINDOWS && m.windows.every(Number.isFinite))) return false;
  return m.oppSubs === undefined || (Number.isInteger(m.oppSubs) && (m.oppSubs as number) >= 0 && (m.oppSubs as number) <= MAX_SUBS);
}
/** Simulate mode: an injured player is always replaced (best fit from the bench) if a change is allowed. */
export function subInjured(s: GameState): GameState {
  let b = s;
  for (const id of s.match?.down ?? []) {
    const off = own(b).find((p) => p.id === id && p.starting);
    if (!off) continue;
    const pool = subsBench(b);
    const on = pool.find((p) => p.position === off.position) ?? pool.find((p) => p.position !== 'GK') ?? pool[0];
    if (!on) break;
    const [n] = makeSub(b, off.id, on.id);
    if (n === b) break;
    b = n;
  }
  return b;
}
