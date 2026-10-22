// Deeper tactics: formations, roles, individual instructions, team instructions, set pieces and scouting.
import type { Club, GameState, Player, Position, Tactics } from './game.ts';
import { attributes } from './game.ts';

export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3'] as const;
/** Shape of each formation as DF-MF-FW counts (plus one GK). */
export const SHAPES: Record<string, [number, number, number]> = {
  '4-3-3': [4, 3, 3], '4-2-3-1': [4, 5, 1], '4-4-2': [4, 4, 2], '3-5-2': [3, 5, 2],
  '5-3-2': [5, 3, 2], '4-1-4-1': [4, 5, 1], '3-4-3': [3, 4, 3],
};
/** Attack / defence / control character of each formation. */
const FORM_BIAS: Record<string, { att: number; def: number; mid: number; beats: string }> = {
  '4-3-3': { att: 2, def: 0, mid: 1, beats: 'cautious' },
  '4-2-3-1': { att: 1, def: 1, mid: 2, beats: 'balanced' },
  '4-4-2': { att: 1, def: 1, mid: 0, beats: 'balanced' },
  '3-5-2': { att: 1, def: 0, mid: 2, beats: 'attacking' },
  '5-3-2': { att: -1, def: 3, mid: 0, beats: 'attacking' },
  '4-1-4-1': { att: 0, def: 2, mid: 2, beats: 'attacking' },
  '3-4-3': { att: 3, def: -1, mid: 0, beats: 'cautious' },
};
export const WIDTHS = ['narrow', 'normal', 'wide'] as const;
export const LINES = ['deep', 'normal', 'high'] as const;
export const PASSING = ['short', 'mixed', 'direct'] as const;
export type Width = (typeof WIDTHS)[number];
export type Line = (typeof LINES)[number];
export type Passing = (typeof PASSING)[number];

/** Roles per position and the attributes each role relies on. */
export const ROLES: Record<Position, Record<string, { label: string; uses: (keyof ReturnType<typeof attributes>)[]; att: number; def: number }>> = {
  GK: {
    keeper: { label: 'Goalkeeper', uses: ['goalkeeping'], att: 0, def: 1 },
    sweeper: { label: 'Sweeper keeper', uses: ['goalkeeping', 'passing'], att: 0.5, def: 0.5 },
  },
  DF: {
    stopper: { label: 'Stopper', uses: ['defending', 'mental'], att: 0, def: 1.2 },
    ballplaying: { label: 'Ball-playing defender', uses: ['defending', 'passing'], att: 0.4, def: 0.8 },
    wingback: { label: 'Wing-back', uses: ['pace', 'stamina'], att: 0.8, def: 0.5 },
  },
  MF: {
    anchor: { label: 'Anchor', uses: ['defending', 'mental'], att: 0.2, def: 1 },
    playmaker: { label: 'Playmaker', uses: ['passing', 'mental'], att: 0.9, def: 0.3 },
    boxtobox: { label: 'Box-to-box', uses: ['stamina', 'passing'], att: 0.6, def: 0.6 },
    winger: { label: 'Winger', uses: ['pace', 'passing'], att: 1, def: 0.2 },
  },
  FW: {
    poacher: { label: 'Poacher', uses: ['shooting', 'mental'], att: 1.2, def: 0 },
    target: { label: 'Target forward', uses: ['shooting', 'stamina'], att: 1, def: 0.2 },
    presser: { label: 'Pressing forward', uses: ['stamina', 'pace'], att: 0.8, def: 0.5 },
  },
};
export const INSTRUCTIONS = ['none', 'shoot more', 'stay back', 'get forward', 'mark tightly', 'roam'] as const;
export type Instruction = (typeof INSTRUCTIONS)[number];
export type DeepTactics = {
  width?: Width;
  line?: Line;
  passing?: Passing;
  counter?: boolean;
  roles?: Record<string, string>;
  instr?: Record<string, Instruction>;
  pens?: string;
  corners?: string;
  freekicks?: string;
};

export const defaultRole = (p: Player) => Object.keys(ROLES[p.position])[0]!;
export const roleOf = (t: Tactics, p: Player) => {
  const r = t.roles?.[p.id];
  return r && ROLES[p.position][r] ? r : defaultRole(p);
};
/** How well a player fits a role, 0-99. */
export function roleFit(p: Player, role: string) {
  const def = ROLES[p.position][role] ?? ROLES[p.position][defaultRole(p)]!;
  const a = attributes(p);
  return Math.round(def.uses.reduce((s, k) => s + a[k], 0) / def.uses.length);
}

/** Breakdown of how the current setup shifts attack and defence (applied each passage of the match engine). */
export function tacticProfile(s: GameState, oppStyle: Club['style']) {
  const t = s.tactics;
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const f = FORM_BIAS[t.formation] ?? FORM_BIAS['4-4-2']!;
  let att = f.att * 0.012, def = f.def * 0.012;
  const notes: string[] = [];
  if (f.beats === oppStyle) { att += 0.03; def += 0.02; notes.push(`${t.formation} suits a ${oppStyle} opponent`); }
  // Shape vs personnel: penalty when the XI doesn't match the formation's lines.
  const shape = SHAPES[t.formation] ?? [4, 4, 2];
  const have = (['DF', 'MF', 'FW'] as const).map((pos) => xi.filter((p) => p.position === pos).length);
  const mismatch = have.reduce((sum, n, i) => sum + Math.abs(n - shape[i]!), 0);
  if (mismatch) { att -= mismatch * 0.01; def -= mismatch * 0.01; notes.push(`XI doesn't fit ${t.formation} (${mismatch} out of position)`); }
  // Roles: fit quality and attacking/defensive lean.
  let fitSum = 0;
  for (const p of xi) {
    const role = roleOf(t, p), r = ROLES[p.position][role]!;
    const fit = roleFit(p, role) - p.rating;
    fitSum += fit;
    att += r.att * 0.006 + (fit > 0 ? fit * 0.0008 * r.att : 0);
    def += r.def * 0.006 + (fit > 0 ? fit * 0.0008 * r.def : 0);
    const ins = t.instr?.[p.id];
    if (ins === 'shoot more') att += p.position === 'FW' || attributes(p).shooting > 65 ? 0.012 : -0.006;
    if (ins === 'get forward') { att += 0.01; def -= 0.008; }
    if (ins === 'stay back') { att -= 0.006; def += 0.01; }
    if (ins === 'mark tightly') def += attributes(p).defending > 60 ? 0.01 : 0.002;
    if (ins === 'roam') att += attributes(p).mental > 65 ? 0.012 : -0.004;
  }
  if (fitSum / Math.max(1, xi.length) > 4) notes.push('roles suit your players');
  // Team instructions vs opponent style.
  const w = t.width ?? 'normal', l = t.line ?? 'normal', ps = t.passing ?? 'mixed';
  const avg = (k: 'pace' | 'passing' | 'defending') => xi.reduce((sum, p) => sum + attributes(p)[k], 0) / Math.max(1, xi.length);
  if (w === 'wide') { att += oppStyle === 'cautious' ? 0.03 : 0.01; def -= 0.01; }
  if (w === 'narrow') { def += 0.015; att -= oppStyle === 'cautious' ? 0.02 : 0; }
  if (l === 'high') { att += 0.015; def += avg('pace') > 62 ? 0.005 : -0.03; if (avg('pace') <= 62) notes.push('a high line is risky with slow defenders'); }
  if (l === 'deep') { def += 0.02; att -= 0.015; }
  if (ps === 'short') att += avg('passing') > 62 ? 0.025 : -0.01;
  if (ps === 'direct') att += avg('pace') > 62 ? 0.02 : 0.005;
  if (t.counter) { att += oppStyle === 'attacking' ? 0.04 : -0.01; def += 0.01; if (oppStyle === 'attacking') notes.push('counter-attacks will hurt them'); }
  return { att, def, notes };
}

/** Best taker of a set piece by attributes (used when none is picked). */
export function setPieceTaker(s: GameState, kind: 'pens' | 'corners' | 'freekicks') {
  const xi = s.players.filter((p) => p.clubId === s.clubId && p.starting && p.position !== 'GK');
  const chosen = xi.find((p) => p.id === s.tactics[kind]);
  if (chosen) return chosen;
  const key = kind === 'pens' ? 'shooting' : 'passing';
  return xi.slice().sort((a, b) => attributes(b)[key] - attributes(a)[key])[0];
}

/** Pre-match opposition report with a suggested counter. */
export function scoutReport(s: GameState, opp: Club) {
  const formation = opp.style === 'attacking' ? '4-3-3' : opp.style === 'cautious' ? '5-3-2' : '4-2-3-1';
  const counterForm = Object.entries(FORM_BIAS).filter(([, f]) => f.beats === opp.style).map(([k]) => k)[0] ?? '4-4-2';
  const our = club(s);
  const gap = opp.rating - our.rating;
  return {
    formation,
    style: opp.style,
    danger: gap > 4 ? 'Much stronger than us' : gap > 0 ? 'Slightly stronger' : gap > -4 ? 'Evenly matched' : 'Weaker side',
    tips: [
      `Use ${counterForm} against their ${opp.style} approach.`,
      opp.style === 'attacking' ? 'Turn on counter-attack and sit a little deeper.' : opp.style === 'cautious' ? 'Play wide and use short passing to unlock them.' : 'Mixed passing and a normal line keep it tight.',
      gap > 4 ? 'Narrow shape and a deep line limit their quality.' : 'A high press can rush them.',
    ],
    suggestion: {
      formation: counterForm,
      width: (opp.style === 'cautious' ? 'wide' : opp.style === 'attacking' ? 'narrow' : 'normal') as Width,
      line: (gap > 4 || opp.style === 'attacking' ? 'deep' : 'normal') as Line,
      counter: opp.style === 'attacking',
    },
  };
}
function club(s: GameState) {
  return s.clubs.find((c) => c.id === s.clubId)!;
}
