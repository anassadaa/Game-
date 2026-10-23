import type { GameState, Match, Player } from './game.ts';

/** Readable match: deterministic (hash-based) narration and stats, so the engine's RNG stream is untouched. */
export type MatchStats = { shots: [number, number]; on: [number, number]; fouls: [number, number]; poss: number; segs: number; possSum: number };

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const key = (s: GameState, tag: string) => `${s.season}|${s.week}|${s.match!.opponentId}|${s.match!.minute}|${s.match!.timeline.length}|${tag}`;
const pickOf = <T,>(s: GameState, tag: string, xs: readonly T[]) => xs[Math.floor(h(key(s, tag)) * xs.length)]!;

export function stats(m: Match): MatchStats {
  return (m.stats ??= { shots: [0, 0], on: [0, 0], fouls: [0, 0], poss: 50, segs: 0, possSum: 0 });
}
export function validStats(v: unknown) {
  if (v === undefined) return true;
  const o = v as MatchStats;
  const pair = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && n >= 0);
  return !!o && typeof o === 'object' && pair(o.shots) && pair(o.on) && pair(o.fouls) && typeof o.poss === 'number';
}

/** Why our tactic mattered in this passage (or '' if nothing stands out). */
export function reason(s: GameState, us: boolean, notes: string[]) {
  const t = s.tactics, r: string[] = [];
  if (us) {
    if (t.press === 'high') r.push('the high press won it back high up');
    if (t.mentality === 'attacking') r.push('the attacking mentality committed bodies forward');
    if (t.tempo === 'quick') r.push('quick tempo caught them unset');
    if (t.counter) r.push('the counter-attack set-up left space behind them');
    if (t.width === 'wide') r.push('playing wide stretched their back line');
    if (t.passing === 'short') r.push('short passing pulled them out of shape');
    if (t.passing === 'direct') r.push('a direct ball bypassed the midfield');
    if (s.match?.shout) r.push('the touchline shout lifted the tempo');
    notes.filter((n) => !/doesn't fit|risky/.test(n)).forEach((n) => r.push(`your formation choice paid off: ${n}`));
  } else {
    if (t.press === 'high') r.push('they played through the high press');
    if (t.line === 'high') r.push('a ball over the top exposed the high line');
    if (t.mentality === 'attacking') r.push('the attacking mentality left gaps at the back');
    if (t.press === 'low' || t.mentality === 'cautious') r.push('sitting deep invited pressure');
    notes.filter((n) => /doesn't fit|risky/.test(n)).forEach((n) => r.push(`the shape cost you: ${n}`));
  }
  if (!r.length || h(key(s, 'why' + us)) < 0.25) return '';
  return pickOf(s, 'whypick' + us, r);
}

const ZONES = ['down the left', 'down the right', 'through the middle', 'on the counter', 'from a cut-back', 'at the edge of the box'];
const FIN = ['inside the six-yard box', 'at the far post', 'at the near post', 'from the edge of the box'];
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** A one-line passage: where the ball went, who shot, how it ended, and (sometimes) why. */
export function passage(s: GameState, us: boolean, who: Player | null, opp: string, goal: boolean, why: string) {
  const zone = pickOf(s, 'zone' + us, ZONES), fin = pickOf(s, 'fin' + us, FIN);
  const name = who?.name ?? (us ? 'A forward' : `${opp}'s striker`);
  const on = goal || h(key(s, 'on' + us)) < 0.45;
  const end = goal ? 'and scores!' : on ? '— saved by the keeper.' : pickOf(s, 'miss', ['— just wide.', '— over the bar.', '— blocked.']);
  const lead = us ? `Move ${zone}; ${name} shoots ${fin} ${end}` : `${opp} break ${zone}; ${name} shoots ${fin} ${end}`;
  return { text: why ? `${lead} (${cap(why)}.)` : lead, on };
}

/** Per-15-minute bookkeeping: possession from the two chance rates, extra off-target efforts, fouls. */
export function segmentStats(s: GameState, chanceUs: number, chanceThem: number) {
  const m = s.match!, st = stats(m);
  const press = s.tactics.press === 'high' ? 1 : s.tactics.press === 'low' ? -1 : 0;
  const ment = s.tactics.mentality === 'attacking' ? 1 : s.tactics.mentality === 'cautious' ? -1 : 0;
  const p = Math.max(25, Math.min(75, 50 + (chanceUs - chanceThem) * 45 + press * 3 + ment * 3 + (h(key(s, 'poss')) - 0.5) * 8));
  st.segs++; st.possSum += p; st.poss = Math.round(st.possSum / st.segs);
  if (h(key(s, 'xs0')) < chanceUs * 0.6) st.shots[0]++;
  if (h(key(s, 'xs1')) < chanceThem * 0.6) st.shots[1]++;
  st.fouls[0] += Math.floor(h(key(s, 'f0')) * (2.4 + press * 0.8));
  st.fouls[1] += Math.floor(h(key(s, 'f1')) * 2.6);
}
export function shotStat(m: Match, us: boolean, on: boolean) {
  const st = stats(m), i = us ? 0 : 1;
  st.shots[i]++; if (on) st.on[i]++;
}
