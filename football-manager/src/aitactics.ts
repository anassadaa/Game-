// Adaptive match tactics for AI clubs and a hired manager: hash-based, explained, and adjusted in-match.
import type { Formation, GameState, Mentality, Player, Press, Tempo } from './game.ts';
import { attributes, standings } from './game.ts';
import type { Line, Passing, Width } from './tactics.ts';

export const PHILOSOPHIES = ['possession', 'counter', 'pressing', 'direct', 'pragmatic'] as const;
export type Philosophy = (typeof PHILOSOPHIES)[number];
/** Formations whose wide midfielders are LM/RM (the rest use LW/RW). */
export const LMRM_SHAPES: string[] = ['4-4-2', '3-5-2', '4-1-4-1', '3-4-3', '5-3-2'];
export type Plan = {
  formation: Formation; mentality: Mentality; press: Press; tempo: Tempo;
  width: Width; line: Line; passing: Passing; counter: boolean;
  philosophy: Philosophy; reasons: string[];
};
export type PlanCtx = {
  seed: string; strength: number; oppStrength: number; oppStyle: Mentality; home: boolean;
  squad: Player[]; injured: number; fatigue: number; rank: number; size: number; week: number;
  personality: Mentality; philosophy: Philosophy;
};
function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
export const philosophyOf = (id: string): Philosophy => PHILOSOPHIES[Math.floor(h(`phil|${id}`) * PHILOSOPHIES.length)]!;
const FORMS: Formation[] = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3'];
const ATT: Record<string, number> = { '4-3-3': 2, '4-2-3-1': 1, '4-4-2': 1, '3-5-2': 1, '5-3-2': -2, '4-1-4-1': -1, '3-4-3': 3 };

function pickFormation(c: PlanCtx, gap: number, why: string[]): Formation {
  const top = [...c.squad].filter((p) => !p.injured).sort((a, b) => b.rating - a.rating).slice(0, 16);
  const n = (pos: string) => top.filter((p) => p.position === pos).length;
  const fw = n('FW'), mf = n('MF'), df = n('DF');
  const fastWide = top.filter((p) => p.position !== 'GK' && p.position !== 'DF' && attributes(p).pace >= 72).length;
  const score = (f: Formation) => {
    let v = h(`${c.seed}|form|${f}`) * 2.2 + ATT[f]! * (gap / 8);
    if (c.squad.length) {
      if (fw >= 4) v += ['4-3-3', '3-4-3', '4-4-2', '3-5-2', '5-3-2'].includes(f) ? 0.8 : 0;
      if (fw <= 2) v += ['4-2-3-1', '4-1-4-1'].includes(f) ? 0.8 : 0;
      if (mf >= 6) v += ['3-5-2', '4-2-3-1', '4-1-4-1'].includes(f) ? 0.6 : 0;
      if (df >= 6) v += f === '5-3-2' ? 0.6 : 0;
      if (df <= 4) v += f.startsWith('3') ? 0.4 : f === '5-3-2' ? -1 : 0;
      if (fastWide >= 4) v += ['4-3-3', '4-2-3-1', '3-4-3'].includes(f) ? 0.5 : 0;
    }
    v += c.personality === 'attacking' ? ATT[f]! * 0.3 : c.personality === 'cautious' ? -ATT[f]! * 0.3 : 0;
    v += ({ possession: ['4-3-3', '4-2-3-1'], counter: ['4-4-2', '5-3-2', '4-1-4-1'], pressing: ['4-3-3', '4-4-2'], direct: ['4-4-2', '3-5-2'], pragmatic: ['4-2-3-1', '4-1-4-1'] }[c.philosophy].includes(f) ? 0.7 : 0);
    if (c.oppStyle === 'attacking' && ATT[f]! < 1) v += 0.4;
    return v;
  };
  const f = [...FORMS].sort((a, b) => score(b) - score(a))[0]!;
  if (c.squad.length) why.push(`${f} suits the squad (${fw} forwards, ${mf} midfielders${fastWide >= 4 ? ', quick wide players' : ''}) — ${LMRM_SHAPES.includes(f) ? 'LM/RM' : 'LW/RW'} out wide`);
  else why.push(`${f} with ${LMRM_SHAPES.includes(f) ? 'LM/RM' : 'LW/RW'} out wide`);
  return f;
}

/** Pre-match plan from squad, opponent, venue, fitness, table and the manager's personality and philosophy. */
export function planMatch(c: PlanCtx): Plan {
  const why: string[] = [];
  const gap = c.strength - c.oppStrength + (c.home ? 2 : -1) - c.injured * 0.6;
  let mentality: Mentality = c.personality;
  if (gap >= 6) { mentality = 'attacking'; why.push(c.home ? 'Favourites at home: take the game to them' : 'Clearly stronger: go for it'); }
  else if (gap <= -6) { mentality = 'cautious'; why.push(c.home ? 'Much stronger visitors: stay compact' : 'Underdogs away: low block and counter'); }
  else if (c.home && mentality === 'cautious') { mentality = 'balanced'; why.push('Home crowd: no sitting back'); }
  else if (!c.home && mentality === 'attacking' && gap < 2) { mentality = 'balanced'; why.push('Away from home: measured approach'); }
  const late = c.week >= 12, bottom = c.rank > c.size - 3, top = c.rank <= 2;
  if (late && bottom && gap > -6) { mentality = 'attacking'; why.push('Relegation fight: need the win'); }
  else if (late && top && gap < 0 && mentality === 'attacking') { mentality = 'balanced'; why.push('Title race: avoid defeat'); }
  if (!why.length) why.push(`${Math.abs(gap) < 3 ? 'Evenly matched' : gap > 0 ? 'Slight edge' : 'Slight underdogs'} ${c.home ? 'at home' : 'away'}: ${mentality} approach`);
  const formation = pickFormation(c, gap, why);
  const counter = gap <= -6 || c.philosophy === 'counter' || (c.oppStyle === 'attacking' && gap < 3);
  let press: Press = c.philosophy === 'pressing' ? 'high' : mentality === 'attacking' ? 'high' : mentality === 'cautious' ? 'low' : 'normal';
  if (press === 'high' && (c.fatigue < 75 || gap <= -6)) { press = 'normal'; why.push(c.fatigue < 75 ? 'Tired legs: press less' : 'Too risky to press them high'); }
  else if (press === 'high' && c.philosophy === 'pressing') why.push('Pressing philosophy: win it back high');
  const line: Line = gap <= -6 || (counter && mentality === 'cautious') ? 'deep' : press === 'high' ? 'high' : 'normal';
  let tempo: Tempo = c.philosophy === 'possession' ? 'patient' : counter || c.philosophy === 'direct' ? 'quick' : 'normal';
  let width: Width = gap <= -6 ? 'narrow' : 'normal';
  if (c.oppStyle === 'cautious' && gap > -6) { width = 'wide'; tempo = 'patient'; why.push('They sit deep: be patient and stretch them wide'); }
  else if (counter) why.push('Counter-attack: let them come, break fast');
  const passing: Passing = c.philosophy === 'possession' || (tempo === 'patient' && !counter) ? 'short' : counter || c.philosophy === 'direct' ? 'direct' : 'mixed';
  if (c.philosophy === 'possession' && !why.some((w) => /patient/.test(w))) why.push('Possession philosophy: short passing, control the ball');
  return { formation, mentality, press, tempo, width, line, passing, counter, philosophy: c.philosophy, reasons: why.slice(0, 4) };
}

const CHASE: Record<string, Formation> = { '4-4-2': '3-4-3', '3-5-2': '3-4-3', '5-3-2': '4-4-2', '4-1-4-1': '4-3-3', '4-2-3-1': '4-3-3', '4-3-3': '3-4-3', '3-4-3': '3-4-3' };
/** In-match changes by score, minute and fatigue. Returns a note when something changed. */
export function adjustPlan(p: Plan, m: { us: number; them: number; minute: number; fatigue: number }): { plan: Plan; note?: string } {
  const d = m.us - m.them, q = { ...p };
  let note: string | undefined;
  if (d < 0 && m.minute >= 60) {
    Object.assign(q, { mentality: 'attacking', tempo: 'quick', line: 'high', passing: 'direct', counter: false, width: 'wide' });
    if (m.minute >= 75 && q.formation !== CHASE[q.formation]) q.formation = CHASE[q.formation]!;
    note = `chasing the game: ${q.formation}, all-out attack`;
  } else if (d > 0 && m.minute >= 70) {
    Object.assign(q, { mentality: 'cautious', tempo: 'patient', line: 'deep', press: 'low', counter: true, width: 'narrow' });
    if (m.minute >= 75 && d === 1 && q.formation !== '5-3-2') q.formation = '5-3-2';
    note = `protecting the lead: ${q.formation}, sitting deep`;
  } else if (d === 0 && m.minute >= 75 && p.mentality === 'cautious' && p.counter) {
    note = undefined; // happy with a point
  }
  if (m.fatigue < 60 && q.press === 'high') { q.press = 'normal'; note = note ?? 'legs going: pressing less'; }
  const same = JSON.stringify({ ...q, reasons: 0 }) === JSON.stringify({ ...p, reasons: 0 });
  return same ? { plan: p } : { plan: q, note };
}

/** Build a plan for any club from the game state (AI squads from rivals, ours from players). */
export function clubPlan(s: GameState, clubId: string, oppId: string, home: boolean, fatigue = 90): Plan {
  const club = s.clubs.find((c) => c.id === clubId)!, opp = s.clubs.find((c) => c.id === oppId)!;
  const ours = clubId === s.clubId;
  const squad = ours ? s.players.filter((p) => p.clubId === clubId) : (s.rivals ?? []).filter((p) => p.clubId === clubId);
  const table = standings(s).filter((c) => c.division === club.division);
  const mgr = ours ? s.hiredManager : undefined;
  return planMatch({
    seed: `${s.seed}|${s.season}|${s.week}|${clubId}|${oppId}`,
    strength: club.rating, oppStrength: opp.rating, oppStyle: opp.style, home,
    squad, injured: squad.filter((p) => p.injured).length, fatigue,
    rank: table.findIndex((c) => c.id === clubId) + 1, size: table.length, week: s.week,
    personality: mgr?.style ?? club.style, philosophy: philosophyOf(mgr?.id ?? clubId),
  });
}
export const planLine = (p: Plan) => `${p.formation} · ${p.mentality} · ${p.press} press · ${p.line} line · ${p.tempo} tempo · ${p.width} · ${p.counter ? 'counter' : 'possession'}`;
