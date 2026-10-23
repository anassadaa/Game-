import { aiInjuriesWeek, resetSquadRefs, squadClub, squadDelta } from './aisquads.ts';
import { cornerConv } from './setpieces.ts';
import { repairSlots } from './positions.ts';
import { passage, reason, segmentStats, shotStat } from './narrate.ts';
import { INTAKE_WEEK, youthIntake } from './youth.ts';
import { type Difficulty, isDifficulty, level, adaptive } from './difficulty.ts';
import { sharpness, weeklyTraining } from './training.ts';
import type { TrainingReport } from './training.ts';
import { facilities, facilitiesWeek, stadiumBonus } from './facilities.ts';
import type { Facilities } from './facilities.ts';
import { dressingWeek } from './dressing.ts';
import { addTrophy, seasonAwards } from './stats.ts';
import type { Award, Trophy } from './stats.ts';
import { agentFee, ffpSeason, ffpSpend, releaseClause, saleIncome, sellOnReceipt } from './finance.ts';
import type { Ffp, SellOn, Ledger } from './finance.ts';
import { refreshWageBudget } from './budget.ts';
import type { WageBudget } from './budget.ts';
import { book, closeLedger, ledger, seasonPayout, sync, weekNet } from './finance.ts';
import { developRival, retires, spawnRegen } from './regens.ts';
import type { Retiree } from './regens.ts';
import { jobsWeek, repSacked, repSeason, reputation, reputationOffers, stature } from './jobs.ts';
import type { Vacancy } from './jobs.ts';
import { scoutsWeek } from './scouts.ts';
import { loansReturn, loansWeek } from './loans.ts';
import { fillXI, topUpBench } from './lineup.ts';
import { buildReview, recordResult, type Result, type SeasonReview } from './fixtures.ts';
import { shoutEffect, type ShoutId } from './shouts.ts';
import { captainWeek, formSwing, hidden, leaderEdge, ppmEffect, revealWeek } from './traits.ts';
import { dropSuspended, matchCards, resetCards, settleCards, type Card } from './cards.ts';
import { injuryWeek, matchInjuries, migrateInjuries } from './injuries.ts';
import { midweekLoad } from './calendar.ts';
import { roomWeek } from './room.ts';
import { familiarityWeek, rememberShape } from './familiarity.ts';
import { abilityRange, askWeek, potentialRange } from './scoutrange.ts';
import { aiSubs, kickOff, oppFatigue, restoreXI } from './subs.ts';
import { agentsWeek, release, signFreeAgent, type AgentMsg } from './agents.ts';
import { dofDiscount, refreshStaffMarket, staffSeason, staffWeek } from './staff.ts';
import type { Staff } from './staff.ts';
import type { Scout, ScoutReport } from './scouts.ts';
import { recordRatings } from './highlights.ts';
import { FORMATIONS, INSTRUCTIONS, LINES, PASSING, ROLES, WIDTHS, scoutReport, setPieceTaker, tacticProfile } from './tactics.ts';
import type { DeepTactics } from './tactics.ts';
import { EURO_QUOTA, LEAGUES, PYRAMID, WORLD, pyramidOf, starsFor, league, sameCountry } from './world.ts';
export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type Mentality = 'cautious' | 'balanced' | 'attacking';
export type Press = 'low' | 'normal' | 'high';
export type Tempo = 'patient' | 'normal' | 'quick';
export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2' | '5-3-2' | '4-1-4-1' | '3-4-3';
export type Training =
  'balanced' | 'fitness' | 'attack' | 'defence' | 'bonding';
export type Tab = 'home' | 'squad' | 'tactics' | 'transfers' | 'recruitment' | 'club';
export type Tactics = {
  formation: Formation;
  mentality: Mentality;
  press: Press;
  tempo: Tempo;
} & DeepTactics;
export type Player = {
  id: string;
  name: string;
  age: number;
  position: Position;
  rating: number;
  potential: number;
  fitness: number;
  morale: number;
  wage: number;
  price: number;
  clubId: string;
  starting: boolean;
  goals: number;
  assists: number;
  academyGraduate?: boolean;
  slot?: import('./positions.ts').Slot;
  foot?: import('./positions.ts').Foot;
  injured?: number;
  injury?: { type: string; total: number; week?: number; fresh?: boolean };
  injuries?: number;
  yellows?: number;
  reds?: number;
  suspended?: number;
  rushed?: number;
  attrs?: Attrs;
  personality?: Personality;
  contract?: number;
  clause?: number;
  sellOn?: { clubId: string; pct: number };
  regenOf?: string;
  peak?: number;
  loan?: boolean;
  counter?: number;
  listed?: boolean;
  released?: boolean;
  loanListed?: boolean;
  loanClub?: string;
  apps?: number;
  ratingSum?: number;
  motm?: number;
  wonderkid?: boolean;
  focus?: AttrKey;
  retrain?: { to: Position; progress: number };
  sharp?: number;
  unhappy?: string;
  promise?: { weeks: number; kept: number };
  mentor?: string;
  careerGoals?: number;
  careerApps?: number;
  known?: boolean;
};
export type Instalment = { name: string; amount: number; weeks: number };
export const ATTRS = ['pace', 'shooting', 'passing', 'defending', 'stamina', 'mental', 'goalkeeping'] as const;
export type AttrKey = (typeof ATTRS)[number];
export type Attrs = Record<AttrKey, number>;
export const PERSONALITIES = ['Professional', 'Ambitious', 'Loyal', 'Temperamental', 'Leader', 'Easy-going'] as const;
export type Personality = (typeof PERSONALITIES)[number];
const PROFILE: Record<Position, Record<AttrKey, number>> = {
  GK: { pace: -14, shooting: -22, passing: -6, defending: 2, stamina: -4, mental: 6, goalkeeping: 14 },
  DF: { pace: 0, shooting: -12, passing: -2, defending: 10, stamina: 4, mental: 3, goalkeeping: -30 },
  MF: { pace: 1, shooting: 0, passing: 9, defending: -2, stamina: 6, mental: 4, goalkeeping: -30 },
  FW: { pace: 7, shooting: 10, passing: 1, defending: -14, stamina: 1, mental: 0, goalkeeping: -30 },
};
function hash(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
/** Attribute offsets are stored relative to overall, so overall growth lifts every skill. */
export function ensureProfile(p: Player) {
  let h = hash(p.id + p.name);
  const rnd = () => ((h = (Math.imul(1664525, h) + 1013904223) >>> 0) / 4294967296);
  if (!p.attrs) {
    const a = {} as Attrs;
    for (const k of ATTRS) a[k] = Math.round(PROFILE[p.position][k] + (rnd() - 0.5) * 12) + 0;
    p.attrs = a;
  }
  if (p.contract === undefined) p.contract = 1 + Math.floor(rnd() * 4);
  if (!p.personality) p.personality = PERSONALITIES[Math.floor(rnd() * PERSONALITIES.length)]!;
}
export function attributes(p: Player): Attrs {
  ensureProfile(p);
  const out = {} as Attrs;
  for (const k of ATTRS) out[k] = Math.max(1, Math.min(99, p.rating + p.attrs![k]));
  return out;
}
export const potentialStars = (p: Pick<Player, 'potential'>) =>
  Math.max(0.5, Math.min(5, Math.round(((p.potential - 40) / 50) * 10) / 2));
export type Club = {
  id: string;
  name: string;
  short: string;
  color: string;
  division: number;
  rating: number;
  style: Mentality;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
  form: string[];
};
export type Story = {
  id: string;
  title: string;
  body: string;
  options: [string, string];
  resolved: boolean;
  outcome?: string;
};
export type MatchEvent = {
  minute: number;
  text: string;
  side: 'us' | 'them' | 'neutral';
  kind: 'goal' | 'chance' | 'note';
  playerId?: string;
};
export type Match = {
  minute: number;
  opponentId: string;
  home: boolean;
  us: number;
  them: number;
  xgUs: number;
  xgThem: number;
  timeline: MatchEvent[];
  complete: boolean;
  ratings?: Record<string, number>;
  motm?: string;
  talks?: number[];
  pressDone?: boolean;
  subs?: { off: string; on: string; minute: number }[];
  windows?: number[];
  oppSubs?: number;
  played?: string[];
  xi0?: string[];
  lineup0?: string[];
  bench0?: string[];
  down?: string[];
  cards?: Card[];
  shout?: { id: ShoutId; at: number };
  redThem?: number;
  yellowThem?: number;
  stats?: import('./narrate.ts').MatchStats;
};
export type CareerRecord = {
  season: number;
  division: number;
  position: number;
  points: number;
  outcome: string;
};
export type GameState = {
  version: 2;
  seed: number;
  season: number;
  week: number;
  clubId: string;
  clubs: Club[];
  players: Player[];
  market: Player[];
  tactics: Tactics;
  training: Training;
  budget: number;
  trust: number;
  fans: number;
  academy: number;
  scouting: number;
  inbox: Story | null;
  match: Match | null;
  history: CareerRecord[];
  headlines: string[];
  ledger?: Ledger;
  wageBudget?: WageBudget;
  captain?: string;
  vice?: string;
  careerWins: number;
  careerGames: number;
  lastStory: string;
  instalments?: Instalment[];
  rivals?: Player[];
  squadRef?: Record<string, number>;
  cupRotate?: boolean;
  familiar?: Record<string, number>;
  boardAsk?: import('./scoutrange.ts').BoardAsk;
  tacticSets?: import('./tacticsets.ts').TacticSet[];
  bids?: Bid[];
  news?: string[];
  board?: Board;
  offers?: string[];
  sacked?: boolean;
  difficulty?: Difficulty;
  results?: Result[];
  review?: SeasonReview;
  cup?: Cup;
  euro?: Cup;
  lcup?: Cup;
  euro2?: Cup;
  youth?: Player[];
  drills?: string[];
  trainingReport?: TrainingReport;
  facilities?: Facilities;
  harmony?: number;
  drama?: string;
  trophies?: Trophy[];
  awards?: Award[];
  scouts?: Scout[];
  staff?: Staff[];
  staffMarket?: Staff[];
  ffp?: Ffp;
  sellOns?: SellOn[];
  embargo?: boolean;
  retired?: Retiree[];
  reputation?: number;
  agentMsgs?: AgentMsg[];
  loansOut?: Player[];
  lineup?: string[];
  bench?: string[];
  autoSubs?: boolean;
  medNews?: { week: number; text: string }[];
  vacancies?: Vacancy[];
  applied?: string[];
  resigned?: boolean;
  scoutReports?: ScoutReport[];
};
export type Cup = { season: number; round: number; alive: string[]; log: string[]; winners: { season: number; clubId: string }[]; wins: number };
export type Board = { target: number; objective: string; warnings: number };
export type Bid = { id: string; playerId: string; clubId: string; fee: number };

const FIRST = [
  'Leo',
  'Amir',
  'Theo',
  'Jude',
  'Milan',
  'Owen',
  'Rafi',
  'Elias',
  'Noah',
  'Ruben',
  'Felix',
  'Samir',
  'Ivo',
  'Nico',
  'Kian',
  'Ari',
  'Luca',
  'Adil',
  'Remy',
  'Tariq',
  'Soren',
  'Hugo',
  'Mika',
  'Zayd',
  'Finn',
  'Benji',
];
const LAST = [
  'Mercer',
  'Rahman',
  'Vale',
  'Costa',
  'Khan',
  'Silva',
  'Cole',
  'Marin',
  'Hale',
  'Dawson',
  'Ferri',
  'Nadir',
  'Quinn',
  'Archer',
  'Aziz',
  'Rowe',
  'Lennox',
  'Bennett',
  'Voss',
  'Farouk',
  'Ivers',
  'Santos',
  'Ward',
  'Rivers',
  'Moss',
  'Kerr',
];
const POSITIONS: Position[] = [
  'GK',
  'DF',
  'DF',
  'DF',
  'DF',
  'MF',
  'MF',
  'MF',
  'FW',
  'FW',
  'FW',
  'GK',
  'DF',
  'DF',
  'MF',
  'MF',
  'FW',
  'FW',
];
const STORY_TEMPLATES = [
  {
    id: 'captain',
    title: 'The captain wants a word',
    body: 'The dressing room is restless after a heavy training week. Your captain suggests a lighter session and a team dinner.',
    options: ['Back the captain', 'Keep standards high'] as [string, string],
    outcomes: [
      'The squad feels heard. Morale rises, but sharpness dips.',
      'Standards hold. The board approves, but morale takes a hit.',
    ],
  },
  {
    id: 'sponsor',
    title: 'A sponsor at the door',
    body: 'A local business offers immediate cash if the club hosts a public event before the next fixture.',
    options: ['Host the event', 'Protect preparation'] as [string, string],
    outcomes: [
      'The club earns a welcome boost; tired legs are the price.',
      'The squad gets a quiet week. The sponsor walks away.',
    ],
  },
  {
    id: 'prospect',
    title: 'The academy call',
    body: 'Your youth coach wants one prospect in first-team training. It could accelerate their growth, at the cost of a focused tactical session.',
    options: ['Bring them in', 'Keep the usual plan'] as [string, string],
    outcomes: [
      'A young player gains confidence and learns quickly.',
      'The senior squad keeps its rhythm.',
    ],
  },
  {
    id: 'media',
    title: 'Pressure from the press',
    body: 'A reporter asks whether the board is being too cautious with the transfer budget. Your answer will be on tomorrow’s back page.',
    options: ['Demand ambition', 'Defend the board'] as [string, string],
    outcomes: [
      'Supporters cheer, but the board dislikes the challenge.',
      'The board appreciates your loyalty; supporters want more.',
    ],
  },
  {
    id: 'rival',
    title: 'A rival’s mind game',
    body: 'The opposition coach calls your football predictable. There is a chance to change the message before matchday.',
    options: ['Fire up the squad', 'Ignore the noise'] as [string, string],
    outcomes: [
      'The players are ready to prove a point.',
      'A calm dressing room keeps its energy.',
    ],
  },
  {
    id: 'community',
    title: 'A town behind its club',
    body: 'The supporters’ trust asks the squad to visit a local school. It takes time but brings the club closer to its people.',
    options: ['Make the visit', 'Focus on football'] as [string, string],
    outcomes: [
      'The stands feel louder this week.',
      'Preparation stays focused, but some fans are disappointed.',
    ],
  },
  {
    id: 'physio',
    title: 'The physio’s warning',
    body: 'Your medical team thinks the squad is carrying too much fatigue. A recovery day could mean less sharpness on the ball.',
    options: ['Prioritise recovery', 'Train through it'] as [string, string],
    outcomes: [
      'Tired players recover and the injury risk eases.',
      'The session is intense. A few players feel the strain.',
    ],
  },
  {
    id: 'agent',
    title: 'An agent in the tunnel',
    body: 'An agent offers inside reports on an overlooked player. The information costs money but could help recruitment.',
    options: ['Buy the reports', 'Trust your scouts'] as [string, string],
    outcomes: [
      'Your scouting network gains a useful lead.',
      'Your budget stays intact.',
    ],
  },
  {
    id: 'ownership',
    title: 'A message from upstairs',
    body: 'The board wants a clear statement of intent. Is this a season for results now or building the next generation?',
    options: ['Promise results', 'Build for tomorrow'] as [string, string],
    outcomes: [
      'The board expects more, and the squad feels the urgency.',
      'The academy receives support, while immediate patience wears thin.',
    ],
  },
  {
    id: 'supporters',
    title: 'The travelling end',
    body: 'Supporters plan a costly away-day display. A modest club contribution could lift spirits.',
    options: ['Help fund it', 'Save every penny'] as [string, string],
    outcomes: ['The bond with supporters grows.', 'The budget stays healthy.'],
  },
];
export const storyIds = STORY_TEMPLATES.map((t) => t.id);
export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(n)));
// Rival players are flat records (their nested attrs are never mutated), so a shallow copy is enough and keeps phones fast.
export const copy = (s: GameState): GameState => {
  const b = structuredClone({ ...s, rivals: undefined }) as GameState;
  if (s.rivals) b.rivals = s.rivals.map((p) => ({ ...p }));
  else delete b.rivals;
  return b;
};
export function next(s: GameState): number {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function int(s: GameState, min: number, max: number) {
  return min + Math.floor(next(s) * (max - min + 1));
}
export function pick<T>(s: GameState, arr: T[]): T {
  return arr[Math.floor(next(s) * arr.length)]!;
}
export function makePlayer(
  s: GameState,
  clubId: string,
  i: number,
  position: Position,
  base: number,
  academyGraduate = false,
): Player {
  const rating = clamp(base + int(s, -9, 8), 35, 88),
    age = academyGraduate ? 17 + int(s, 0, 2) : 18 + int(s, 0, 15);
  const player: Player = {
    id: `p${s.season}-${s.week}-${i}-${s.seed}`,
    name: uniqueName(s),
    age,
    position,
    rating,
    potential: clamp(rating + int(s, 3, academyGraduate ? 22 : 15), rating, 95),
    fitness: int(s, 78, 100),
    morale: int(s, 60, 85),
    wage: Math.max(2, Math.round(rating / 8)),
    price: priceFor(rating, age),
    clubId,
    starting: i < 11,
    goals: 0,
    assists: 0,
    academyGraduate,
  };
  ensureProfile(player);
  return player;
}
function uniqueName(s: GameState): string {
  const used = new Set([...s.players, ...s.market, ...(s.rivals ?? [])].map((p) => p.name));
  for (let t = 0; t < 40; t++) {
    const n = `${pick(s, FIRST)} ${pick(s, LAST)}`;
    if (!used.has(n)) return n;
  }
  let n = `${pick(s, FIRST)} ${pick(s, LAST)}`,
    k = 2;
  while (used.has(`${n} ${k}`)) k++;
  return `${n} ${k}`;
}
export function migrate(s: GameState): GameState {
  const v = s as unknown as { version: number };
  if (v.version === 1) v.version = 2;
  s.instalments ??= [];
  [...s.players, ...s.market].forEach((p) => { ensureProfile(p); repairSlots(p); });
  s.bids ??= [];
  s.news ??= [];
  if (!s.rivals) makeRivals(s);
  s.board ??= boardTarget(s);
  s.offers ??= [];
  s.sacked ??= false;
  if (!isDifficulty(s.difficulty)) s.difficulty = 'medium';
  s.results ??= [];
  ledger(s);
  s.reputation ??= reputation(s);
  s.vacancies ??= [];
  migrateInjuries(s);
  s.agentMsgs ??= [];
  if (!s.staffMarket) refreshStaffMarket(s);
  // New divisions added after this save was made: bring their clubs and squads in.
  WORLD.forEach((w, i) => {
    if (s.clubs.some((c) => c.id === w.id)) return;
    const c = worldClub(w, i);
    s.clubs.push(c);
    rivalsFor(s, c);
  });
  s.cup ??= newCup(s, []);
  if (!validCup(s.lcup, s)) s.lcup = newLeagueCup(s, []);
  s.euro ??= newEuro(s, true);
  if (!validCup(s.euro2, s)) s.euro2 = newEuro2(s, true, s.euro.alive);
  s.youth ??= [];
  s.drills ??= [];
  facilities(s);
  if (!s.bench) topUpBench(s);
  return s;
}
function story(s: GameState): Story {
  const choices = STORY_TEMPLATES.filter((x) => x.id !== s.lastStory);
  const template = pick(s, choices);
  s.lastStory = template.id;
  return {
    id: template.id,
    title: template.title,
    body: template.body,
    options: template.options,
    resolved: false,
  };
}
function refreshMarket(s: GameState) {
  const kept = s.market.filter((p) => p.released).slice(-12);
  s.market = [];
  for (let i = 0; i < 8; i++)
    s.market.push(
      makePlayer(
        s,
        'market',
        i,
        pick(s, POSITIONS),
        Math.max(49, (s.clubs.find((c) => c.id === s.clubId)?.rating ?? 60) - 12) + s.scouting * 2 + int(s, -4, 12),
      ),
    );
  s.market.forEach((p) => {
    p.starting = false;
    p.price = Math.max(65, Math.round(p.price * (0.8 + next(s) * 0.6)));
  });
  s.market.push(...kept);
}
export const DEFAULT_CLUB = 'wrexham';
const STYLES: Mentality[] = ['attacking', 'balanced', 'cautious'];
function worldClub(w: (typeof WORLD)[number], i: number): Club {
  const styles = STYLES;
  return {
    id: w.id,
    name: w.name,
    short: w.name.split(' ').slice(-1)[0]!,
    color: w.color,
    division: w.division,
    rating: w.rating,
    style: styles[i % 3]!,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
    form: [],
  };
}
export function newGame(
  seed = Date.now() >>> 0,
  clubId = DEFAULT_CLUB,
  startRep?: number | null,
  difficulty: Difficulty = 'medium',
): GameState {
  const clubs = WORLD.map((w, i) => worldClub(w, i));
  if (!clubs.some((c) => c.id === clubId)) clubId = DEFAULT_CLUB;
  const s: GameState = {
    version: 2,
    seed: seed >>> 0,
    season: 1,
    week: 0,
    clubId,
    clubs,
    players: [],
    market: [],
    tactics: {
      formation: '4-3-3',
      mentality: 'balanced',
      press: 'normal',
      tempo: 'normal',
    },
    training: 'balanced',
    budget: 2800,
    trust: 65,
    fans: 62,
    academy: 1,
    scouting: 1,
    inbox: null,
    match: null,
    history: [],
    headlines: ['A new era begins. The board hands you the keys.'],
    careerWins: 0,
    careerGames: 0,
    lastStory: '',
    instalments: [],
    bids: [],
    news: [],
    difficulty: isDifficulty(difficulty) ? difficulty : 'medium',
    results: [],
  };
  const me = clubs.find((c) => c.id === clubId)!;
  s.budget = Math.round(2800 * Math.max(0.8, 1 + (me.rating - 60) / 12) * level(s).money);
  POSITIONS.forEach((pos, i) => s.players.push(makePlayer(s, clubId, i, pos, me.rating - 6)));
  applyStars(s, me, s.players);
  refreshMarket(s);
  s.inbox = story(s);
  makeRivals(s);
  s.board = boardTarget(s);
  s.offers = [];
  s.sacked = false;
  s.reputation = startRep == null ? clamp(stature(me) - 5) : clamp(startRep);
  s.vacancies = [];
  s.agentMsgs = [];
  refreshStaffMarket(s);
  s.cup = newCup(s, []);
  s.lcup = newLeagueCup(s, []);
  s.euro = newEuro(s, true);
  s.euro2 = newEuro2(s, true, s.euro.alive);
  s.youth = [];
  s.drills = [];
  facilities(s);
  topUpBench(s);
  ledger(s);
  refreshWageBudget(s);
  return s;
}
export function club(s: GameState) {
  return s.clubs.find((c) => c.id === s.clubId)!;
}
export function opponent(s: GameState) {
  const pairs = roundPairs(
    s.clubs.filter((c) => c.division === club(s).division).map((c) => c.id),
    s.week,
  );
  const pair = pairs.find((p) => p.includes(s.clubId))!;
  return s.clubs.find((c) => c.id === pair.find((id) => id !== s.clubId))!;
}
export function homeFixture(s: GameState) {
  const pair = roundPairs(
    s.clubs.filter((c) => c.division === club(s).division).map((c) => c.id),
    s.week,
  ).find((p) => p.includes(s.clubId))!;
  return pair[0] === s.clubId;
}
export function roundPairs(ids: string[], week: number): [string, string][] {
  const n = ids.length - (ids.length % 2),
    rounds = n - 1;
  const rotation = ids.slice(0, n);
  for (let r = 0; r < week % rounds; r++) rotation.splice(1, 0, rotation.pop()!);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < n / 2; i++) {
    const a = rotation[i]!,
      b = rotation[n - 1 - i]!;
    pairs.push(week < rounds ? (i % 2 ? [b, a] : [a, b]) : i % 2 ? [a, b] : [b, a]);
  }
  return pairs;
}
export function standings(s: GameState): Club[] {
  return [...s.clubs].sort(
    (a, b) =>
      a.division - b.division ||
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}
export function setTactics(s: GameState, patch: Partial<Tactics>): GameState {
  const valid: Record<string, readonly unknown[]> = {
    formation: FORMATIONS,
    width: WIDTHS,
    line: LINES,
    passing: PASSING,
    counter: [true, false],
    mentality: ['cautious', 'balanced', 'attacking'],
    press: ['low', 'normal', 'high'],
    tempo: ['patient', 'normal', 'quick'],
  };
  if (
    s.match?.complete ||
    Object.entries(patch).some(
      ([key, value]) =>
        !valid[key]?.includes(value),
    )
  )
    return s;
  const b = copy(s);
  if (patch.formation && patch.formation !== b.tactics.formation) rememberShape(b);
  b.tactics = { ...b.tactics, ...patch };
  return b;
}
/** Pick a role / individual instruction for a player, or a set-piece taker. */
export function setPlayerTactic(s: GameState, id: string, patch: { role?: string; instr?: string; taker?: 'pens' | 'corners' | 'freekicks' }): GameState {
  const p = s.players.find((x) => x.id === id && x.clubId === s.clubId);
  if (!p || s.match?.complete) return s;
  if (patch.role && !ROLES[p.position][patch.role]) return s;
  if (patch.instr && !(INSTRUCTIONS as readonly string[]).includes(patch.instr)) return s;
  const b = copy(s);
  if (patch.role) b.tactics.roles = { ...b.tactics.roles, [id]: patch.role };
  if (patch.instr) b.tactics.instr = { ...b.tactics.instr, [id]: patch.instr as DeepTactics['instr'] extends Record<string, infer I> | undefined ? I : never };
  if (patch.taker) b.tactics[patch.taker] = id;
  return b;
}
export function applyScoutSuggestion(s: GameState): GameState {
  const r = scoutReport(s, opponent(s));
  return setTactics(s, { formation: r.suggestion.formation as Formation, width: r.suggestion.width, line: r.suggestion.line, counter: r.suggestion.counter });
}
export function setTraining(s: GameState, focus: Training): GameState {
  if (
    s.match ||
    !['balanced', 'fitness', 'attack', 'defence', 'bonding'].includes(focus)
  )
    return s;
  const b = copy(s);
  b.training = focus;
  return b;
}
export function toggleStarter(s: GameState, id: string): GameState {
  if (s.match) return s;
  const target = s.players.find(
    (p) => p.id === id && p.clubId === s.clubId && !p.starting,
  );
  if (!target || target.injured) return s;
  const starters = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const toReplace =
    starters
      .filter((p) => p.position === target.position)
      .sort(
        (a, b) =>
          Number(!!b.injured) - Number(!!a.injured) || a.rating - b.rating,
      )[0] ??
    starters
      .filter((p) => p.position !== 'GK')
      .sort(
        (a, b) =>
          Number(!!b.injured) - Number(!!a.injured) || a.rating - b.rating,
      )[0];
  if (!toReplace || (target.position !== 'GK' && toReplace.position === 'GK'))
    return s;
  const b = copy(s);
  b.players.find((p) => p.id === id)!.starting = true;
  b.players.find((p) => p.id === toReplace.id)!.starting = false;
  return b;
}
export function chooseEvent(s: GameState, choice: 0 | 1): GameState {
  if (
    !s.inbox ||
    s.inbox.resolved ||
    ![0, 1].includes(choice) ||
    !storyIds.includes(s.inbox.id)
  )
    return s;
  const b = copy(s),
    id = b.inbox!.id,
    yes = choice === 0;
  switch (id) {
    case 'captain':
      b.players.forEach((p) => (p.morale = clamp(p.morale + (yes ? 7 : -5))));
      b.trust = clamp(b.trust + (yes ? -2 : 3));
      break;
    case 'sponsor':
      if (yes) {
        b.budget += 190;
        b.players.forEach((p) => (p.fitness = clamp(p.fitness - 4)));
      } else b.players.forEach((p) => (p.fitness = clamp(p.fitness + 2)));
      break;
    case 'prospect':
      if (yes) {
        const p = b.players
          .filter((p) => p.age <= 23)
          .sort((x, y) => y.potential - x.potential)[0];
        if (p) {
          p.rating = clamp(p.rating + 2, 0, p.potential);
          p.morale = clamp(p.morale + 8);
        }
      } else b.trust = clamp(b.trust + 2);
      break;
    case 'media':
      b.fans = clamp(b.fans + (yes ? 8 : -5));
      b.trust = clamp(b.trust + (yes ? -7 : 5));
      break;
    case 'rival':
      b.players.forEach((p) => (p.morale = clamp(p.morale + (yes ? 5 : 1))));
      if (yes) b.trust = clamp(b.trust - 1);
      break;
    case 'community':
      b.fans = clamp(b.fans + (yes ? 9 : -4));
      if (yes) b.budget -= 35;
      break;
    case 'physio':
      b.players.forEach((p) => (p.fitness = clamp(p.fitness + (yes ? 9 : -5))));
      break;
    case 'agent':
      if (yes && b.budget >= 75) {
        b.budget -= 75;
        b.scouting = clamp(b.scouting + 1, 1, 5);
        refreshMarket(b);
      }
      break;
    case 'ownership':
      if (yes) {
        b.trust = clamp(b.trust + 5);
        b.players.forEach((p) => (p.morale = clamp(p.morale + 2)));
      } else {
        b.academy = clamp(b.academy + 1, 1, 5);
        b.trust = clamp(b.trust - 4);
      }
      break;
    case 'supporters':
      if (yes && b.budget >= 70) {
        b.budget -= 70;
        b.fans = clamp(b.fans + 10);
      } else b.fans = clamp(b.fans - 2);
      break;
  }
  const template = STORY_TEMPLATES.find((t) => t.id === id)!;
  b.inbox = { ...b.inbox!, resolved: true, outcome: template.outcomes[choice] };
  return b;
}
export function signPlayer(s: GameState, id: string): GameState {
  if (s.match) return s;
  const p = s.market.find((p) => p.id === id);
  if (
    !p ||
    s.budget < askingPrice(p, s) ||
    s.players.filter((p) => p.clubId === s.clubId).length >= 25
  )
    return s;
  const b = copy(s);
  const recruit = b.market.find((p) => p.id === id)!;
  recruit.clubId = b.clubId;
  recruit.starting = false;
  recruit.morale = 75;
  b.players.push(recruit);
  b.market = b.market.filter((p) => p.id !== id);
  const paid = askingPrice(p, s);
  b.budget -= paid;
  autoPlace(b, recruit.id);
  b.headlines = [
    `${p.name} joins ${club(b).name} for £${paid}k.`,
    ...b.headlines,
  ].slice(0, 6);
  return b;
}
function autoPlace(b: GameState, id: string) {
  const p = b.players.find((x) => x.id === id);
  if (!p || p.injured) return false;
  const weakest = b.players
    .filter((x) => x.clubId === b.clubId && x.starting && x.position === p.position)
    .sort((x, y) => x.rating - y.rating)[0];
  if (weakest && weakest.rating < p.rating) {
    weakest.starting = false;
    p.starting = true;
    return true;
  }
  return false;
}
export type Offer = {
  fee: number;
  wage: number;
  years: number;
  instalments?: boolean;
  swapId?: string;
  sellOn?: number;
};
/** Negotiate with a transfer target. Returns the new state and a message for the manager. */
export function negotiate(s: GameState, id: string, o: Offer): [GameState, string] {
  const p = s.market.find((x) => x.id === id) ?? s.rivals?.find((x) => x.id === id);
  const roster = s.players.filter((x) => x.clubId === s.clubId);
  if (s.match || !p) return [s, 'That player is no longer available.'];
  const fromRival = p.clubId !== 'market';
  // Free agents never cost a fee: wages only.
  if (!fromRival) return signFreeAgent(s, id, { wage: Math.round(o.wage), years: o.years, bonus: 0 });
  if (fromRival && s.embargo) return [s, 'FFP embargo: you cannot sign players from clubs this season.'];
  if (fromRival && !windowOpen(s)) return [s, 'The transfer window is closed. Free agents only until it reopens.'];
  if (!(o.years >= 1 && o.years <= 5) || !Number.isFinite(o.fee) || o.fee < 0 || !Number.isFinite(o.wage))
    return [s, 'That offer is not valid.'];
  const swap = o.swapId ? roster.find((x) => x.id === o.swapId && !x.starting) : undefined;
  if (o.swapId && (!swap || roster.length <= 14)) return [s, 'That swap player cannot be included.'];
  if (!swap && roster.length >= 25) return [s, 'Your squad is full (25).'];
  const sellOnPct = fromRival ? Math.min(30, Math.max(0, Math.round(o.sellOn ?? 0))) : 0;
  const agent = Math.round(agentFee(p, o.fee) * dofDiscount(s));
  const upfront = (o.instalments ? Math.round(o.fee * 0.4) : o.fee) + agent;
  if (s.budget < upfront) return [s, `You cannot afford that upfront payment (incl. £${agent}k agent fee).`];
  const b = copy(s),
    t = (fromRival ? b.rivals! : b.market).find((x) => x.id === id)!;
  const seller = b.clubs.find((c) => c.id === t.clubId);
  const base = askingPrice(t, s);
  const ask = t.counter ?? base,
    value = o.fee + (swap ? Math.round(swap.price * 0.8) : 0) - (o.instalments ? Math.round(o.fee * 0.05) : 0) + Math.round(o.fee * sellOnPct / 100 * 0.6);
  const clause = fromRival ? releaseClause(t) : undefined;
  const triggered = clause !== undefined && o.fee >= clause;
  const wantWage = Math.round(t.wage * (t.personality === 'Ambitious' ? 1.15 : 1));
  if (!triggered && value < ask * 0.75) {
    t.counter = ask;
    return [b, `Rejected. The club will not go below ${ask}k.`];
  }
  if (!triggered && value < ask * 0.97) {
    t.counter = Math.max(Math.round((ask + value) / 2), Math.round(base * 0.85));
    return [b, `Counter-offer: they want £${t.counter}k.`];
  }
  if (o.wage < wantWage) return [b, `Fee agreed, but ${t.name} wants £${wantWage}k a week.`];
  t.clubId = b.clubId;
  t.starting = false;
  t.listed = false;
  t.morale = 78;
  t.wage = Math.round(o.wage);
  t.contract = o.years;
  delete t.counter;
  delete t.clause;
  if (sellOnPct && seller) t.sellOn = { clubId: seller.id, pct: sellOnPct };
  ffpSpend(b, o.fee + agent);
  b.players.push(t);
  b.market = b.market.filter((x) => x.id !== id);
  b.rivals = (b.rivals ?? []).filter((x) => x.id !== id);
  if (seller) addNews(b, `✍️ ${t.name} joins ${club(b).short} from ${seller.short} for £${o.fee}k.`);
  b.budget -= upfront;
  if (o.instalments)
    b.instalments = [...(b.instalments ?? []), { name: t.name, amount: Math.ceil((o.fee - upfront) / 6), weeks: 6 }];
  if (swap) b.players = b.players.filter((x) => x.id !== swap.id);
  autoPlace(b, t.id);
  b.headlines = [
    `${t.name} signs a ${o.years}-year deal${swap ? ` with ${swap.name} going the other way` : ''}.`,
    ...b.headlines,
  ].slice(0, 6);
  return [b, `${t.name} has signed!${triggered ? ' Release clause triggered.' : ''} Agent fee £${agent}k.${t.starting ? ' He goes straight into your XI.' : ''}`];
}
export function loanIn(s: GameState, id: string): GameState {
  const p = s.market.find((x) => x.id === id);
  const fee = p ? Math.round(p.price * 0.15) : 0;
  if (s.match || !p || s.budget < fee || s.players.filter((x) => x.clubId === s.clubId).length >= 25) return s;
  const b = copy(s),
    t = b.market.find((x) => x.id === id)!;
  Object.assign(t, { clubId: b.clubId, starting: false, loan: true, contract: 0, morale: 72 });
  delete t.counter;
  b.players.push(t);
  b.market = b.market.filter((x) => x.id !== id);
  b.budget -= fee;
  autoPlace(b, t.id);
  b.headlines = [`${t.name} arrives on a season-long loan.`, ...b.headlines].slice(0, 6);
  return b;
}
export function renewContract(s: GameState, id: string, years: number, clause?: number): GameState {
  const p = s.players.find((x) => x.id === id && x.clubId === s.clubId && !x.loan);
  if (s.match || !p || !(years >= 1 && years <= 5)) return s;
  const b = copy(s),
    t = b.players.find((x) => x.id === id)!;
  const withClause = clause !== undefined && Number.isFinite(clause) && clause > 0;
  t.wage = Math.round(t.wage * (withClause ? 1.08 : 1.15) + 1);
  t.contract = years;
  if (withClause) t.clause = Math.max(Math.round(t.price * 1.2), Math.round(clause));
  t.morale = clamp(t.morale + 6);
  b.headlines = [`${t.name} commits his future for ${years} more years.`, ...b.headlines].slice(0, 6);
  return b;
}
export function sellPlayer(s: GameState, id: string): GameState {
  if (s.match) return s;
  const team = s.players.filter((p) => p.clubId === s.clubId);
  const p = team.find((p) => p.id === id && !p.starting);
  if (!p || team.length <= 14) return s;
  const b = copy(s);
  const fee = Math.round(p.price * 0.68);
  b.budget += saleIncome(b, b.players.find((x) => x.id === id)!, fee);
  b.players = b.players.filter((x) => x.id !== id);
  b.fans = clamp(b.fans - 1);
  b.headlines = [`${p.name} departs for £${fee}k.`, ...b.headlines].slice(0, 6);
  return b;
}
export function upgradeFacility(
  s: GameState,
  type: 'academy' | 'scouting',
  overrideCost?: number,
): GameState {
  if (s.match || !['academy', 'scouting'].includes(type) || s[type] >= 5)
    return s;
  const cost =
    overrideCost ??
    (type === 'academy' ? 350 + s.academy * 250 : 240 + s.scouting * 180);
  if (!Number.isFinite(cost) || cost < 0 || s.budget < cost) return s;
  const b = copy(s);
  b.budget -= cost;
  b[type]++;
  b.trust = clamp(b.trust + 3);
  b.headlines = [
    `The board opens an improved ${type} department.`,
    ...b.headlines,
  ].slice(0, 6);
  return b;
}
/** Match engine tuning: how much a strength point shifts chance share, and finishing quality. */
export const EDGE_PER_POINT = 0.026, FINISH = 1.4;
function strength(s: GameState, ourSide: boolean): number {
  if (!ourSide) return opponent(s).rating + squadDelta(s, opponent(s)) + 2 - oppFatigue(s) + level(s).ai + adaptive(s) - (s.match?.redThem ?? 0) * 4;
  const starters = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const big = !!s.match && standings(s).filter((c) => c.division === club(s).division).findIndex((c) => c.id === s.match!.opponentId) < 3;
  const quality =
    starters.reduce((sum, p) => sum + (p.rating + formSwing(s, p, big)) * (p.injured ? 0.65 : 1) * (0.95 + 0.05 * sharpness(p) / 100), 0) /
    Math.max(1, starters.length) - Math.max(0, 11 - starters.length) * 4;
  const fitness =
    starters.reduce((sum, p) => sum + p.fitness, 0) /
    Math.max(1, starters.length);
  const morale =
    starters.reduce((sum, p) => sum + p.morale, 0) /
    Math.max(1, starters.length);
  const shape =
    s.tactics.formation === '4-3-3' && opponent(s).style === 'cautious'
      ? 2
      : s.tactics.formation === '3-5-2' && opponent(s).style === 'attacking'
        ? 2
        : s.tactics.formation === '4-4-2' && opponent(s).style === 'balanced'
          ? 2
          : 0;
  return (
    quality +
    (fitness - 85) * 0.11 +
    (morale - 70) * 0.08 +
    shape +
    (s.tactics.mentality === 'attacking'
      ? 2
      : s.tactics.mentality === 'cautious'
        ? -1
        : 0)
  );
}
export function startMatch(s: GameState): GameState {
  if (s.sacked) return s;
  if (s.match || s.week >= 18) return s;
  const b = copy(s),
    opp = opponent(b);
  dropSuspended(b);
  if (b.players.filter((p) => p.clubId === b.clubId && p.starting).length < 11) fillXI(b);
  topUpBench(b);
  b.match = {
    minute: 0,
    opponentId: opp.id,
    home: homeFixture(b),
    us: 0,
    them: 0,
    xgUs: 0,
    xgThem: 0,
    complete: false,
    timeline: [
      {
        minute: 0,
        text: `Kick-off against ${opp.name}. ${b.match ? '' : 'The whistle blows.'}`,
        side: 'neutral',
        kind: 'note',
      },
    ],
  };
  kickOff(b);
  return b;
}
export function advanceMatch(s: GameState): GameState {
  if (!s.match || s.match.complete) return s;
  const b = copy(s),
    m = b.match!,
    prev = m.minute;
  m.minute = Math.min(90, m.minute + 15);
  const energyCost =
    (b.tactics.press === 'high' ? 3 : b.tactics.press === 'normal' ? 2 : 1) +
    (b.tactics.tempo === 'quick' ? 1 : 0) + shoutEffect(b).energy +
    (b.tactics.oopMode === 'press' ? 1 : b.tactics.oopMode === 'block' ? -0.5 : 0);
  b.players
    .filter((p) => p.starting)
    .forEach(
      (p) =>
        (p.fitness = clamp(
          p.fitness - energyCost * (attributes(p).stamina >= 70 ? 0.7 : 1),
        )),
    );
  const rates: number[] = [];
  for (const side of ['us', 'them'] as const) {
    const us = side === 'us';
    const gap = strength(b, us) - strength(b, !us);
    let edge = gap * EDGE_PER_POINT;
    if (us) {
      edge +=
        b.tactics.mentality === 'attacking'
          ? 0.12
          : b.tactics.mentality === 'cautious'
            ? -0.08
            : 0;
      edge +=
        b.tactics.press === 'high'
          ? 0.05
          : b.tactics.press === 'low'
            ? -0.04
            : 0;
      edge +=
        b.tactics.tempo === 'quick'
          ? 0.04
          : b.tactics.tempo === 'patient'
            ? -0.02
            : 0;
    } else {
      edge +=
        b.tactics.mentality === 'attacking'
          ? 0.07
          : b.tactics.mentality === 'cautious'
            ? -0.1
            : 0;
      if (b.tactics.tempo === 'patient') edge -= 0.03;
      if (b.tactics.press === 'low') edge -= 0.03;
    }
    const prof = tacticProfile(b, opponent(b).style);
    edge += us ? prof.att : -prof.def;
    const sh = shoutEffect(b);
    edge += us ? sh.att : -sh.def;
    const pe = ppmEffect(b);
    edge += us ? pe.att + leaderEdge(b) : -pe.def;
    const chance = Math.max(
      0.2,
      Math.min(0.88, 0.52 + edge + (m.home && us ? 0.04 : 0)),
    );
    rates.push(chance);
    if (next(b) < chance) {
      const minute = prev + int(b, 2, 14),
        xg = Math.round((0.13 + next(b) * 0.33) * (us ? pe.xg : 1) * 100) / 100;
      if (us) m.xgUs = Math.round((m.xgUs + xg) * 100) / 100;
      else m.xgThem = Math.round((m.xgThem + xg) * 100) / 100;
      const scorer = us
        ? pick(
            b,
            b.players.filter((p) => p.starting && p.position !== 'GK'),
          )
        : null;
      // Set pieces: some chances are corners, free kicks or penalties taken by the chosen taker.
      const sp = us ? next(b) : 1;
      if (sp < 0.22) {
        const kind = sp < 0.04 ? 'pens' : sp < 0.14 ? 'corners' : 'freekicks';
        const taker = setPieceTaker(b, kind);
        if (taker) {
          const a = attributes(taker);
          const conv = kind === 'pens' ? 0.55 + a.shooting / 400 : kind === 'corners' ? cornerConv(b, taker, a.passing) : 0.05 + (a.shooting + a.passing) / 1600;
          const label = kind === 'pens' ? 'penalty' : kind === 'corners' ? 'corner' : 'free kick';
          if (next(b) < conv) {
            m.us++;
            taker.goals++;
            shotStat(m, true, true);
            m.timeline.push({ minute, text: `${taker.name} scores from a ${label} at the ${kind === 'corners' ? 'near post' : 'edge of the box'}!`, side, kind: 'goal', playerId: taker.id });
          } else { shotStat(m, true, true); m.timeline.push({ minute, text: `${taker.name}'s ${label} from the ${kind === 'pens' ? 'six-yard' : 'edge of the box'} area is saved.`, side, kind: 'chance' }); }
          continue;
        }
      }
      const goal = next(b) < xg * FINISH * Math.max(0.6, Math.min(1.5, 1 + gap * 0.025));
      if (goal) {
        if (us) {
          m.us++;
          if (scorer) scorer.goals++;
        } else m.them++;
      }
      const ps = passage(b, us, scorer, opponent(b).short, goal, reason(b, us, prof.notes));
      shotStat(m, us, ps.on);
      m.timeline.push({ minute, text: ps.text, side, kind: goal ? 'goal' : 'chance', ...(goal && scorer ? { playerId: scorer.id } : {}) });
    }
  }
  segmentStats(b, rates[0] ?? 0.5, rates[1] ?? 0.5);
  aiSubs(b, () => next(b));
  if (!m.complete) matchInjuries(b);
  matchCards(b);
  if (m.minute === 45)
    m.timeline.push({
      minute: 45,
      text: 'Half-time. Change your approach before the second half.',
      side: 'neutral',
      kind: 'note',
    });
  if (m.minute === 90) {
    m.complete = true;
    rateMatch(b);
    recordRatings(b);
    settleCards(b);
    m.timeline.push({
      minute: 90,
      text: `Full-time. ${club(b).short} ${m.us}–${m.them} ${opponent(b).short}.`,
      side: 'neutral',
      kind: 'note',
    });
  }
  m.timeline.sort((x, y) => x.minute - y.minute);
  return b;
}
function rateMatch(b: GameState) {
  const m = b.match!,
    diff = m.us - m.them,
    ratings: Record<string, number> = {};
  const played = new Set(m.played ?? []);
  const subOn = new Map((m.subs ?? []).map((x) => [x.on, x.minute]));
  for (const p of b.players.filter((p) => p.clubId === b.clubId && (p.starting || played.has(p.id)))) {
    let r = 6.2 + diff * 0.3 + (p.rating - 55) * 0.03 + (next(b) - 0.5) * 1.2;
    const goals = m.timeline.filter((e) => e.kind === 'goal' && e.playerId === p.id).length;
    r += goals * 1.0;
    if ((p.position === 'DF' || p.position === 'GK') && m.them === 0) r += 0.7;
    if (subOn.has(p.id)) r = 6.3 + (r - 6.2) * Math.max(0.3, (90 - subOn.get(p.id)!) / 90);
    ratings[p.id] = Math.max(4, Math.min(10, Math.round(r * 10) / 10));
  }
  m.ratings = ratings;
  m.motm = Object.entries(ratings).sort((x, y) => y[1] - x[1])[0]?.[0];
}
function result(a: Club, b: Club, ga: number, gb: number) {
  a.played++;
  b.played++;
  a.gf += ga;
  a.ga += gb;
  b.gf += gb;
  b.ga += ga;
  let fa: string, fb: string;
  if (ga > gb) {
    a.wins++;
    a.points += 3;
    b.losses++;
    fa = 'W';
    fb = 'L';
  } else if (gb > ga) {
    b.wins++;
    b.points += 3;
    a.losses++;
    fa = 'L';
    fb = 'W';
  } else {
    a.draws++;
    b.draws++;
    a.points++;
    b.points++;
    fa = 'D';
    fb = 'D';
  }
  a.form = [...a.form, fa].slice(-5);
  b.form = [...b.form, fb].slice(-5);
}
function simulateScore(s: GameState, a: Club, b: Club): [number, number] {
  let x = 0,
    y = 0;
  for (let i = 0; i < 6; i++) {
    if (
      next(s) <
      Math.max(0.12, Math.min(0.72, 0.39 + (a.rating - b.rating) * 0.011))
    )
      if (next(s) < 0.56) x++;
    if (
      next(s) <
      Math.max(0.12, Math.min(0.72, 0.38 + (b.rating - a.rating) * 0.011))
    )
      if (next(s) < 0.56) y++;
  }
  return [x, y];
}
function train(s: GameState) {
  for (const p of s.players.filter((p) => p.clubId === s.clubId)) {
    const starter = p.starting;
    p.fitness = clamp(
      p.fitness +
        (s.training === 'fitness'
          ? 16
          : s.training === 'balanced'
            ? 11
            : s.training === 'bonding'
              ? 12
              : 8) +
        (starter ? 0 : 4),
    );
    if (s.training === 'bonding') p.morale = clamp(p.morale + 3);
    if (
      (s.training === 'attack' && p.position === 'FW') ||
      (s.training === 'defence' && p.position === 'DF')
    ) {
      if (next(s) < 0.28 && p.rating < p.potential) p.rating++;
    } else if (
      p.age < 24 &&
      next(s) < (s.training === 'fitness' ? 0.02 : 0.06) + s.academy * 0.015 &&
      p.rating < p.potential
    )
      p.rating++;
    if (p.personality === 'Temperamental') p.morale = clamp(p.morale + int(s, -4, 4));
    if (hidden(p).professionalism >= 14) p.fitness = clamp(p.fitness + 2);
    if (p.personality === 'Professional' && p.age < 27 && p.rating < p.potential && next(s) < 0.04) p.rating++;
  }
  injuryWeek(s);
}
/** Reserve sides can never go up. */
const RESERVE_SIDES = new Set(['sociedadb', 'benficab', 'portob', 'sportingb']);
function rollSeason(s: GameState) {
  resetSquadRefs(s);
  const table = standings(s),
    pyr = pyramidOf(club(s).division),
    k = pyr?.k ?? 0,
    size = s.clubs.filter((c) => c.division === club(s).division).length,
    pos =
      table
        .filter((c) => c.division === club(s).division)
        .findIndex((c) => c.id === s.clubId) + 1;
  const before = club(s).division;
  let outcome =
    pyr?.second === before && pos <= k && !RESERVE_SIDES.has(s.clubId)
      ? 'Promoted'
      : pyr?.top === before && pos > size - k
        ? 'Relegated'
        : pos === 1
          ? 'Champions'
          : 'Stayed the course';
  s.history.unshift({
    season: s.season,
    division: before,
    position: pos,
    points: club(s).points,
    outcome,
  });
  s.history = s.history.slice(0, 20);
  s.review = buildReview(s, pos, outcome, before, s.board?.target);
  s.results = [];
  resetCards(s);
  seasonAwards(s, outcome, before);
  repSeason(s, pos, outcome);
  s.applied = [];
  staffSeason(s);
  addNews(s, ffpSeason(s));
  boardReview(s, pos, outcome);
  s.euro = newEuro(s);
  s.euro2 = newEuro2(s, false, s.euro.alive);
  for (const p of PYRAMID) {
    const d1 = table.filter((c) => c.division === p.top), d2 = table.filter((c) => c.division === p.second && !RESERVE_SIDES.has(c.id));
    if (!d1.length || !d2.length) continue;
    d1.slice(-p.k).forEach((c) => (c.division = p.second));
    d2.slice(0, p.k).forEach((c) => (c.division = p.top));
  }
  const pay = seasonPayout(league(before).tier, pos, size, outcome === 'Promoted' || outcome === 'Champions');
  s.budget += pay.tv + pay.prize;
  book(s, 'tv', pay.tv); book(s, 'prize', pay.prize);
  addNews(s, `💷 Season payment: TV £${pay.tv}k · prize money £${pay.prize}k.`);
  closeLedger(s);
  refreshWageBudget(s, 0.5);
  s.trust = clamp(
    s.trust +
      (outcome === 'Promoted' || outcome === 'Champions'
        ? 14
        : pos > size * 0.75
          ? -10
          : 4),
  );
  s.fans = clamp(s.fans + (outcome === 'Promoted' ? 12 : pos <= 4 ? 5 : -5));
  s.clubs.forEach((c) => {
    c.played = c.wins = c.draws = c.losses = c.gf = c.ga = c.points = 0;
    c.form = [];
    c.rating = clamp(c.rating + int(s, -2, 2), 40, 85);
  });
  loansReturn(s);
  const leaving: string[] = [];
  const freed: Player[] = [];
  s.players = s.players.filter((p) => {
    p.age++;
    if (p.loan) {
      leaving.push(`${p.name} (loan ends)`);
      return false;
    }
    p.contract = (p.contract ?? 1) - 1;
    if (p.contract <= 0) {
      leaving.push(`${p.name} (contract expired)`);
      freed.push(p);
      return false;
    }
    if (retires(s, p)) {
      const r = spawnRegen(s, p, true);
      leaving.push(`${p.name} (retired, regen ${r.name} emerges)`);
      return false;
    }
    return true;
  });
  if (leaving.length) s.headlines = [`Departures: ${leaving.join(', ')}.`, ...s.headlines];
  const needsKeeper = !s.players.some((p) => p.position === 'GK');
  const recruits = Array.from(
    { length: Math.max(3, 14 - s.players.length) },
    (_, i) =>
      makePlayer(
        s,
        s.clubId,
        20 + i,
        needsKeeper && i === 0 ? 'GK' : pick(s, ['DF', 'MF', 'FW']),
        44 + s.academy * 3,
        true,
      ),
  );
  recruits.forEach((p) => (p.starting = false));
  s.players.push(...recruits);
  const keeper =
    s.players.find((p) => p.starting && p.position === 'GK') ??
    s.players
      .filter((p) => p.position === 'GK')
      .sort((a, b) => b.rating - a.rating)[0]!;
  s.players
    .filter((p) => p.position === 'GK')
    .forEach((p) => (p.starting = p.id === keeper.id));
  while (s.players.filter((p) => p.starting).length > 11) {
    const p = s.players
      .filter((p) => p.starting && p.position !== 'GK')
      .sort((a, b) => a.rating - b.rating)[0]!;
    p.starting = false;
  }
  while (s.players.filter((p) => p.starting).length < 11) {
    const p = s.players
      .filter((p) => !p.starting && p.position !== 'GK')
      .sort((a, b) => b.rating - a.rating)[0];
    if (!p) break;
    p.starting = true;
  }
  while (s.players.length > 25) {
    const reserve = s.players
      .filter((p) => !p.starting && p.id !== keeper.id)
      .sort((a, b) => a.rating - b.rating)[0];
    if (!reserve) break;
    s.players = s.players.filter((p) => p.id !== reserve.id);
  }
  s.players.forEach((p) => {
    p.fitness = clamp(p.fitness + 25);
    p.morale = clamp(p.morale + 8);
    p.goals = 0;
    p.assists = 0;
    p.injured = undefined;
  });
  s.season++;
  s.week = 0;
  s.match = null;
  refreshMarket(s);
  freed.forEach((p) => release(s, p));
  // A few rival veterans are released into the free-agent pool each summer.
  const vets = (s.rivals ?? []).filter((p) => p.age >= 30 && next(s) < 0.02).slice(0, 4);
  if (vets.length) { const ids = new Set(vets.map((p) => p.id)); s.rivals = s.rivals!.filter((p) => !ids.has(p.id)); vets.forEach((p) => release(s, p)); }
  s.agentMsgs = [];
  s.inbox = story(s);
  s.headlines = [
    `Season ${s.season - 1}: ${outcome.toLowerCase()}! You finished ${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}. ${recruits.length} academy prospects join the squad.`,
    ...s.headlines,
  ].slice(0, 6);
}
export function advanceWeek(s: GameState): GameState {
  if (!s.match?.complete) return s;
  const b = copy(s),
    m = b.match!,
    before = ledger(b).last;
  sync(b, 'deals');
  const
    us = club(b),
    opp = opponent(b);
  const home = m.home ? us : opp,
    away = m.home ? opp : us;
  result(home, away, m.home ? m.us : m.them, m.home ? m.them : m.us);
  recordResult(b, { week: b.week, opp: opp.id, home: m.home, us: m.us, them: m.them });
  b.careerGames++;
  if (m.us > m.them) b.careerWins++;
  for (const division of [...new Set(b.clubs.map((c) => c.division))]) {
    const pairs = roundPairs(
      b.clubs.filter((c) => c.division === division).map((c) => c.id),
      b.week,
    );
    for (const [aid, bid] of pairs) {
      if (aid === us.id || bid === us.id) continue;
      const a = b.clubs.find((c) => c.id === aid)!,
        c = b.clubs.find((c) => c.id === bid)!;
      const [ga, gb] = simulateScore(b, squadClub(b, a), squadClub(b, c));
      result(a, c, ga, gb);
    }
  }
  const wages = b.players
    .filter((p) => p.clubId === b.clubId)
    .reduce((sum, p) => sum + p.wage, 0);
  const mult = level(b).money,
    tv = Math.round((league(club(b).division).tier === 1 ? 130 : 90) * mult),
    gate = Math.round((m.home ? 90 + Math.round(b.fans * 0.5) : 35) * mult) + stadiumBonus(b, m.home),
    sponsor = Math.round(Math.round(b.fans * 0.2) * mult),
    income = tv + gate + sponsor;
  b.budget += income - wages;
  book(b, 'tv', tv); book(b, 'gate', gate); book(b, 'sponsor', sponsor); book(b, 'wages', wages);
  for (const i of b.instalments ?? []) {
    b.budget -= i.amount;
    i.weeks--;
  }
  b.instalments = (b.instalments ?? []).filter((i) => i.weeks > 0);
  if (b.budget < 0) {
    b.trust = clamp(b.trust - 5);
    b.players.forEach((p) => (p.morale = clamp(p.morale - 3)));
  }
  b.trust = clamp(b.trust + (m.us > m.them ? 3 : m.us < m.them ? -3 : 0));
  b.fans = clamp(b.fans + (m.us > m.them ? 2 : m.us < m.them ? -2 : 0));
  const played = new Set(Object.keys(m.ratings ?? {}));
  train(b);
  weeklyTraining(b, played);
  facilitiesWeek(b);
  dressingWeek(b, played);
  scoutsWeek(b);
  aiInjuriesWeek(b);
  revealWeek(b);
  captainWeek(b);
  roomWeek(b);
  familiarityWeek(b);
  askWeek(b);
  staffWeek(b);
  agentsWeek(b);
  loansWeek(b);
  jobsWeek(b, m.us, m.them, m.opponentId);
  transferWeek(b);
  b.headlines = [
    `${m.home ? 'Home' : 'Away'} to ${opp.name}: ${m.us}–${m.them}. ${m.us > m.them ? 'Three points banked.' : m.us < m.them ? 'Time to regroup.' : 'A point to build on.'}`,
    `Matchday income £${income}k · wages £${wages}k`,
    ...b.headlines,
  ].slice(0, 6);
  b.week++;
  restoreXI(b);
  b.match = null;
  runCup(b, b.cup, CUP_WEEKS, CUP_PRIZE, 'Cup');
  runCup(b, b.euro, EURO_WEEKS, EURO_PRIZE, 'Champions Cup');
  runCup(b, b.lcup, LCUP_WEEKS, LCUP_PRIZE, 'League Cup');
  { // Continental Trophy ties draw from a side stream so they don't reshuffle league randomness.
    const keep = b.seed;
    b.seed = (keep ^ 0x9e3779b9) >>> 0;
    runCup(b, b.euro2, EURO2_WEEKS, EURO2_PRIZE, 'Continental Trophy');
    b.seed = keep;
  }
  boardWeek(b);
  if (b.week === INTAKE_WEEK + 1) youthIntake(b);
  if (b.week === 18) {
    rollSeason(b);
    rollRivals(b);
    b.board = boardTarget(b);
    b.cup = newCup(b, b.cup?.winners ?? [], b.cup?.wins ?? 0);
    b.lcup = newLeagueCup(b, b.lcup?.winners ?? [], b.lcup?.wins ?? 0);
  }
  else {
    if (b.week % 3 === 0) refreshMarket(b);
    b.inbox = story(b);
  }
  sync(b, 'running');
  weekNet(b, before);
  if (b.week % 4 === 0) refreshWageBudget(b);
  return b;
}

// ---------- Transfer market: rival squads, windows, bids, AI trading ----------
export const SQUAD_SHAPE: Position[] = ['GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'];
function rivalPlayer(s: GameState, c: Club, i: number, pos: Position, young = false): Player {
  const p = makePlayer(s, c.id, i, pos, c.rating - 8, young);
  p.id = `r-${c.id}-${s.season}-${s.seed}-${i}`;
  p.starting = false;
  p.listed = next(s) < 0.12;
  return p;
}
function rivalsFor(s: GameState, c: Club) {
  const start = s.rivals!.length;
  // Look-alike data gives a real-shaped first team. Foreign second-tier squads are capped smaller to keep saves compact.
  const cap = league(c.division).tier === 2 && !sameCountry(c.division, club(s).division) ? 16 : 22;
  const real = starsFor(c.id).slice(0, cap);
  const shape = real.length >= 14 ? real.map((x) => x.position) : SQUAD_SHAPE;
  shape.forEach((pos, i) => s.rivals!.push(rivalPlayer(s, c, i, pos)));
  applyStars(s, c, s.rivals!.slice(start));
}
function makeRivals(s: GameState) {
  s.rivals = [];
  for (const c of s.clubs) if (c.id !== s.clubId) rivalsFor(s, c);
  keepKeepers(s);
}
/** Every AI club carries at least two goalkeepers; a youth keeper is promoted when short. */
export function keepKeepers(s: GameState) {
  const count = new Map<string, number>(), size = new Map<string, number>();
  for (const p of s.rivals ?? []) {
    size.set(p.clubId, (size.get(p.clubId) ?? 0) + 1);
    if (p.position === 'GK') count.set(p.clubId, (count.get(p.clubId) ?? 0) + 1);
  }
  for (const c of s.clubs) {
    if (c.id === s.clubId) continue;
    for (let n = count.get(c.id) ?? 0, i = 0; n < 2; n++, i++) s.rivals!.push(rivalPlayer(s, c, 400 + (size.get(c.id) ?? 0) + i, 'GK', true));
  }
}
/** Transfer windows: pre-season (weeks 1–4) and mid-season (weeks 10–11). */
export const windowOpen = (s: Pick<GameState, 'week'>) => s.week <= 3 || s.week === 9 || s.week === 10;
export const deadlineDay = (s: Pick<GameState, 'week'>) => s.week === 3 || s.week === 10;
export function windowLabel(s: Pick<GameState, 'week'>) {
  const name = s.week <= 3 ? 'Summer window' : 'January window';
  if (deadlineDay(s)) return `${name} deadline day! Closes after this match`;
  if (windowOpen(s)) return `${name} open · closes in ${(s.week <= 3 ? 3 : 10) - s.week + 1} weeks`;
  return s.week < 9 ? `Window closed · January window opens in ${9 - s.week} weeks` : `Window closed · summer window opens in ${18 - s.week} weeks`;
}
/** What the owning club wants. Free agents cost their price; rivals want a premium unless listed. */
export function askingPrice(p: Player, s?: GameState) {
  const k = s ? level(s).fee : 1;
  if (p.clubId === 'market') return Math.round(p.price * k);
  return Math.round(p.price * (p.listed ? 0.9 : 1.3) * k);
}
export type MarketFilter = {
  q?: string;
  position?: Position | 'ALL';
  maxAge?: number;
  maxPrice?: number;
  minStars?: number;
  attr?: AttrKey | '';
  minAttr?: number;
  minRating?: number;
  /** Matches when the upper bound of the scouted potential range reaches this. */
  minPotential?: number;
  division?: number;
  country?: string;
  listedOnly?: boolean;
  source?: 'all' | 'free' | 'clubs';
  sort?: 'rating' | 'price' | 'potential' | 'age';
};
export function searchMarket(s: GameState, f: MarketFilter): Player[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const pool = [...(f.source === 'clubs' ? [] : s.market), ...(f.source === 'free' ? [] : (s.rivals ?? []))];
  const clubName = (id: string) => s.clubs.find((c) => c.id === id)?.name.toLowerCase() ?? '';
  const divOf = (id: string) => s.clubs.find((c) => c.id === id)?.division ?? -1;
  const ab = new Map<string, [number, number]>(), po = new Map<string, [number, number]>();
  const abR = (p: Player) => ab.get(p.id) ?? (ab.set(p.id, abilityRange(s, p)), ab.get(p.id)!);
  const poR = (p: Player) => po.get(p.id) ?? (po.set(p.id, potentialRange(s, p)), po.get(p.id)!);
  const out = pool.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || clubName(p.clubId).includes(q)) &&
      (!f.position || f.position === 'ALL' || p.position === f.position) &&
      (!f.maxAge || p.age <= f.maxAge) &&
      (!f.minRating || abR(p)[1] >= f.minRating) &&
      (!f.minPotential || poR(p)[1] >= f.minPotential) &&
      (f.division === undefined || divOf(p.clubId) === f.division) &&
      (!f.country || (p.clubId !== 'market' && league(divOf(p.clubId)).country === f.country)) &&
      (!f.maxPrice || askingPrice(p, s) <= f.maxPrice) &&
      (!f.minStars || potentialStars({ potential: poR(p)[1] }) >= f.minStars) &&
      (!f.attr || attributes(p)[f.attr] >= (f.minAttr ?? 0)) &&
      (!f.listedOnly || p.listed || p.clubId === 'market'),
  );
  const key = f.sort ?? 'rating';
  out.sort((a, b) =>
    key === 'price' ? askingPrice(a, s) - askingPrice(b, s) : key === 'age' ? a.age - b.age
      : key === 'potential' ? poR(b)[0] + poR(b)[1] - poR(a)[0] - poR(a)[1] : abR(b)[0] + abR(b)[1] - abR(a)[0] - abR(a)[1],
  );
  return out;
}
function addNews(s: GameState, line: string) {
  s.news = [`W${s.week + 1}: ${line}`, ...(s.news ?? [])].slice(0, 25);
}
export function toggleListed(s: GameState, id: string): GameState {
  const p = s.players.find((x) => x.id === id && x.clubId === s.clubId && !x.loan);
  if (s.match || !p) return s;
  const b = copy(s),
    t = b.players.find((x) => x.id === id)!;
  t.listed = !t.listed;
  if (!t.listed) b.bids = (b.bids ?? []).filter((x) => x.playerId !== id);
  if (t.listed) addNews(b, `📋 ${club(b).short} transfer-list ${t.name}.`);
  return b;
}
export function acceptBid(s: GameState, bidId: string): [GameState, string] {
  const bid = s.bids?.find((x) => x.id === bidId);
  const team = s.players.filter((p) => p.clubId === s.clubId);
  const p = bid && team.find((x) => x.id === bid.playerId);
  if (s.match || !bid || !p) return [s, 'That bid has expired.'];
  if (team.length <= 14) return [s, 'You need at least 14 players. Sign a replacement first.'];
  const b = copy(s),
    t = b.players.find((x) => x.id === p.id)!,
    buyer = b.clubs.find((c) => c.id === bid.clubId)!;
  b.players = b.players.filter((x) => x.id !== t.id);
  if (t.starting) {
    const own = b.players.filter((x) => x.clubId === b.clubId && !x.starting && !x.injured);
    const sub = own.filter((x) => x.position === t.position).sort((x, y) => y.rating - x.rating)[0] ??
      own.filter((x) => (t.position === 'GK') === (x.position === 'GK')).sort((x, y) => y.rating - x.rating)[0] ??
      b.players.filter((x) => x.clubId === b.clubId && !x.starting).sort((x, y) => y.rating - x.rating)[0];
    if (sub) sub.starting = true;
  }
  Object.assign(t, { clubId: buyer.id, starting: false, listed: false, goals: 0, assists: 0 });
  b.rivals = [...(b.rivals ?? []), t];
  b.budget += saleIncome(b, t, bid.fee);
  delete t.clause;
  if (t.age <= 23) b.sellOns = [...(b.sellOns ?? []), { playerId: t.id, name: t.name, pct: 15 }].slice(-20);
  b.bids = (b.bids ?? []).filter((x) => x.playerId !== t.id);
  addNews(b, `💰 ${t.name} leaves ${club(b).short} for ${buyer.short} (£${bid.fee}k).`);
  b.headlines = [`${t.name} sold to ${buyer.name} for £${bid.fee}k.`, ...b.headlines].slice(0, 6);
  return [b, `${t.name} sold to ${buyer.name} for £${bid.fee}k.`];
}
export function rejectBid(s: GameState, bidId: string): GameState {
  const bid = s.bids?.find((x) => x.id === bidId);
  if (!bid) return s;
  const b = copy(s);
  b.bids = b.bids!.filter((x) => x.id !== bidId);
  const p = b.players.find((x) => x.id === bid.playerId);
  if (p && !p.listed && p.personality === 'Ambitious' && bid.fee > p.price * 1.1) p.morale = clamp(p.morale - 8);
  return b;
}
function transferWeek(b: GameState) {
  b.bids = [];
  const rivals = (b.rivals ??= []);
  if (!windowOpen(b)) return;
  const dd = deadlineDay(b) ? 1.7 : 1;
  const ours = club(b);
  // Incoming bids for our players
  const own = b.players.filter((p) => p.clubId === b.clubId && !p.loan);
  for (const p of own) {
    if (b.bids.length >= 4) break;
    const chance = p.listed ? 0.45 : p.rating >= ours.rating + 4 ? 0.1 : 0.02; // even through the window, no deadline pile-up
    if (next(b) >= chance) continue;
    const buyers = b.clubs.filter((c) => c.id !== b.clubId && c.rating >= p.rating - 12);
    if (!buyers.length) continue;
    const buyer = pick(b, buyers);
    const fee = Math.round(p.price * (p.listed ? 0.7 + next(b) * 0.3 : 1.0 + next(b) * 0.35) * (dd > 1 ? 1.1 : 1));
    b.bids.push({ id: `bid-${b.season}-${b.week}-${p.id}`, playerId: p.id, clubId: buyer.id, fee });
  }
  // Release clauses on our players can be triggered by richer clubs
  for (const p of b.players.filter((x) => x.clubId === b.clubId && x.clause && !x.loan)) {
    if (b.players.filter((x) => x.clubId === b.clubId).length <= 14) break;
    if (p.clause! > p.price * 1.6 || next(b) >= 0.06) continue;
    const buyer = pick(b, b.clubs.filter((c) => c.id !== b.clubId));
    b.bids.push({ id: `clause-${b.season}-${b.week}-${p.id}`, playerId: p.id, clubId: buyer.id, fee: p.clause! });
    const [after] = acceptBid(b, `clause-${b.season}-${b.week}-${p.id}`);
    Object.assign(b, after);
    addNews(b, `🚨 ${buyer.short} trigger ${p.name}'s £${p.clause}k release clause.`);
  }
  if (b.bids.length) addNews(b, `📨 ${b.bids.length} bid${b.bids.length > 1 ? 's' : ''} received for your players.`);
  // AI clubs trade with each other
  const moves = int(b, 0, deadlineDay(b) ? 3 : 1);
  for (let k = 0; k < moves; k++) {
    const p = pick(b, rivals);
    const from = b.clubs.find((c) => c.id === p.clubId)!;
    if (rivals.filter((x) => x.clubId === from.id).length <= 13) continue;
    const to = pick(b, b.clubs.filter((c) => c.id !== b.clubId && c.id !== from.id));
    const fee = Math.round(p.price * (0.9 + next(b) * 0.5));
    sellOnReceipt(b, p, fee);
    p.clubId = to.id;
    p.listed = false;
    delete p.counter;
    addNews(b, `🔁 ${p.name} (${p.position}, ${p.rating}) moves from ${from.short} to ${to.short} for £${fee}k.`);
  }
  // Clubs keep squads topped up and occasionally list players
  for (const c of b.clubs) {
    if (c.id === b.clubId) continue;
    const squad = rivals.filter((x) => x.clubId === c.id);
    if (squad.length < 14) rivals.push(rivalPlayer(b, c, 100 + b.week * 10 + squad.length, pick(b, POSITIONS)));
    if (squad.length > 17) squad.sort((x, y) => x.rating - y.rating)[0]!.listed = true;
  }
  if (deadlineDay(b)) addNews(b, '⏰ Deadline day! The window shuts after this week.');
}
function rollRivals(b: GameState) {
  const rivals = b.rivals ?? [];
  const retiring: Player[] = [];
  b.rivals = [];
  for (const p of rivals) {
    p.age++;
    p.goals = 0;
    p.assists = 0;
    delete p.counter;
    if (retires(b, p)) { retiring.push(p); continue; }
    developRival(b, p);
    b.rivals.push(p);
  }
  for (const p of retiring) spawnRegen(b, p);
  const stars = retiring.filter((p) => (p.peak ?? p.rating) >= 72);
  if (stars.length) addNews(b, `👴 Retirements: ${stars.slice(0, 3).map((p) => p.name).join(', ')}${stars.length > 3 ? ` and ${stars.length - 3} more` : ''}. Watch for their regens.`);
  for (const c of b.clubs) {
    if (c.id === b.clubId) continue;
    let n = b.rivals.filter((x) => x.clubId === c.id).length;
    while (n < 14) b.rivals.push(rivalPlayer(b, c, 200 + n++, pick(b, POSITIONS), true));
  }
  keepKeepers(b);
  b.news = [`Season ${b.season}: the summer window is open!`, ...(b.news ?? [])].slice(0, 25);
}

// ---------- Board objectives, sacking and job offers ----------
function divisionRank(s: GameState, id: string) {
  const c = s.clubs.find((x) => x.id === id)!;
  return s.clubs.filter((x) => x.division === c.division).sort((a, b) => b.rating - a.rating).findIndex((x) => x.id === id) + 1;
}
export function boardTarget(s: GameState): Board {
  const c = club(s),
    rank = divisionRank(s, s.clubId);
  const size = s.clubs.filter((x) => x.division === c.division).length;
  const target = Math.min(size - 3, Math.max(1, rank + (s.trust >= 70 ? -1 : 1)));
  const objective =
    league(c.division).tier === 2
      ? target <= 2
        ? 'Win promotion to the top flight'
        : `Finish in the top ${target} and build for promotion`
      : target <= 3
        ? `Challenge for the title (top ${target})`
        : target >= size - 3
          ? `Avoid the drop (${size - 3}th or better)`
          : `Finish in the top ${target}`;
  return { target, objective, warnings: 0 };
}
function leaguePos(s: GameState) {
  return standings(s).filter((c) => c.division === club(s).division).findIndex((c) => c.id === s.clubId) + 1;
}
function makeOffers(s: GameState, better: boolean) {
  // Scaled by manager reputation; never leaves a sacked manager without a way back.
  s.offers = reputationOffers(s, better);
}
function boardWeek(s: GameState) {
  if (s.sacked) return;
  const b = (s.board ??= boardTarget(s));
  const pos = leaguePos(s);
  if (s.week >= 6 && pos > b.target + 3 && s.trust < 45 / level(s).patience && b.warnings < 2 && s.week % 3 === 0) {
    b.warnings++;
    s.trust = clamp(s.trust - 4);
    s.headlines = [`📉 Board warning ${b.warnings}/2: results must improve (${b.objective.toLowerCase()}).`, ...s.headlines].slice(0, 6);
  }
  if (s.trust <= 12 / level(s).patience && s.week >= 4) sack(s, 'The board has lost faith after a run of poor results.');
}
function sack(s: GameState, why: string) {
  s.sacked = true;
  repSacked(s);
  makeOffers(s, false);
  s.headlines = [`❌ Sacked! ${why}`, ...s.headlines].slice(0, 6);
}
function boardReview(s: GameState, pos: number, outcome: string) {
  const b = s.board ?? boardTarget(s);
  const met = pos <= b.target || outcome === 'Promoted' || outcome === 'Champions';
  if (met) {
    s.trust = clamp(s.trust + 6);
    s.budget += 300;
    s.headlines = [`✅ Board objective met: ${b.objective}. Bonus £300k.`, ...s.headlines];
    if (pos <= Math.max(1, b.target - 2) || outcome === 'Champions') makeOffers(s, true);
  } else if (pos >= b.target + 4 || outcome === 'Relegated') {
    sack(s, `Objective missed: ${b.objective.toLowerCase()}.`);
  } else {
    s.trust = clamp(s.trust - 8);
    s.headlines = [`⚠️ Board objective missed: ${b.objective}. They expect more.`, ...s.headlines];
  }
}
export function pickXI(s: GameState) {
  const own = s.players.filter((p) => p.clubId === s.clubId);
  own.forEach((p) => (p.starting = false));
  const fit = own.filter((p) => !p.injured);
  const gk = (fit.filter((p) => p.position === 'GK').sort((a, b) => b.rating - a.rating)[0] ??
    own.filter((p) => p.position === 'GK').sort((a, b) => b.rating - a.rating)[0]);
  if (gk) gk.starting = true;
  [...fit, ...own.filter((p) => p.injured)]
    .filter((p) => p.position !== 'GK')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, gk ? 10 : 11)
    .forEach((p) => (p.starting = true));
}
/** Accept a job offer: your old squad stays behind and you inherit the new club's players. */
export function takeJob(s: GameState, clubId: string): GameState {
  if (s.match || !s.offers?.includes(clubId) || clubId === s.clubId) return s;
  const b = copy(s),
    old = club(b),
    target = b.clubs.find((c) => c.id === clubId)!;
  const mine = b.players.filter((p) => p.clubId === old.id && !p.loan);
  mine.forEach((p) => Object.assign(p, { starting: false, listed: false }));
  const theirs = (b.rivals ?? []).filter((p) => p.clubId === clubId);
  b.rivals = [...(b.rivals ?? []).filter((p) => p.clubId !== clubId), ...mine];
  b.players = theirs.map((p) => {
    delete p.counter;
    return Object.assign(p, { listed: false, contract: Math.max(1, p.contract ?? 2) });
  });
  b.clubId = clubId;
  while (b.players.length < 14 || !b.players.some((p) => p.position === 'GK'))
    b.players.push(makePlayer(b, clubId, 300 + b.players.length, b.players.some((p) => p.position === 'GK') ? pick(b, POSITIONS) : 'GK', target.rating - 8));
  b.players.sort((x, y) => y.rating - x.rating);
  b.rivals.push(...b.players.splice(25));
  // Never leave the new squad short of keepers (the cut above can drop a low-rated GK).
  while (b.players.filter((p) => p.position === 'GK').length < 2) {
    const out = [...b.players].reverse().find((p) => p.position !== 'GK');
    if (b.players.length >= 25 && out) { b.players = b.players.filter((p) => p !== out); b.rivals.push(out); }
    b.players.push(makePlayer(b, clubId, 300 + b.players.length + b.rivals.length, 'GK', target.rating - 8));
  }
  pickXI(b);
  b.players.forEach((p) => (p.clubId = clubId));
  b.instalments = [];
  b.bids = [];
  b.offers = [];
  b.trust = 60;
  b.fans = clamp(b.fans - 5);
  b.sacked = false;
  b.resigned = false;
  b.vacancies = (b.vacancies ?? []).filter((v) => v.clubId !== clubId);
  b.board = boardTarget(b);
  b.headlines = [`🤝 You are the new manager of ${target.name}!`, ...b.headlines].slice(0, 6);
  addNews(b, `🎙️ ${target.short} appoint a new manager, who leaves ${old.short}.`);
  return b;
}
export function declineOffers(s: GameState): GameState {
  if (s.sacked || !s.offers?.length) return s;
  const b = copy(s);
  b.offers = [];
  b.trust = clamp(b.trust + 3);
  b.headlines = ['You turn down the approaches. The board appreciates your loyalty.', ...b.headlines].slice(0, 6);
  return b;
}

// ---------- Knockout cup ----------
export const CUP_WEEKS = [4, 8, 12, 16];
export const CUP_ROUNDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
export const CUP_PRIZE = [120, 200, 350, 600];
export const cupClubs = (s: GameState) => s.clubs.filter((c) => sameCountry(c.division, club(s).division));
function newCup(s: GameState, winners: Cup['winners'], wins = 0): Cup {
  const pool = [...cupClubs(s)].sort((a, b) => b.rating - a.rating);
  const alive = [s.clubId, ...pool.filter((c) => c.id !== s.clubId).map((c) => c.id)].slice(0, 16);
  alive.sort(() => next(s) - 0.5);
  return { season: s.season, round: 0, alive, log: [], winners: winners.slice(0, 30), wins };
}
export function cupOpponent(s: GameState, c = s.cup) {
  if (!c || c.round > 3) return null;
  const i = c.alive.indexOf(s.clubId);
  if (i < 0) return null;
  return s.clubs.find((x) => x.id === c.alive[i ^ 1]) ?? null;
}
/** League Cup: second domestic knockout on its own midweeks, smaller prizes. */
export const LCUP_WEEKS = [2, 5, 9, 13];
export const LCUP_PRIZE = [60, 100, 180, 300];
/** League Cup draw: same domestic field as the Cup, drawn with its own seed so it doesn't disturb the main random stream. */
function newLeagueCup(s: GameState, winners: Cup['winners'], wins = 0): Cup {
  const pool = [...cupClubs(s)].sort((a, b) => b.rating - a.rating);
  const alive = [s.clubId, ...pool.filter((c) => c.id !== s.clubId).map((c) => c.id)].slice(0, 16);
  let h = s.season * 7919 + 17;
  for (const ch of s.clubId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = alive.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [alive[i], alive[j]] = [alive[j]!, alive[i]!]; }
  return { season: s.season, round: 0, alive, log: [], winners: winners.slice(0, 30), wins };
}
export function validCup(c: unknown, s?: GameState): c is Cup {
  const x = c as Cup;
  return !!x && (!s || (Array.isArray(x.alive) && x.alive.every((id) => s.clubs.some((k) => k.id === id)))) && typeof x === 'object' && Number.isInteger(x.season) && Number.isInteger(x.round) && x.round >= 0 && x.round <= 4 &&
    Array.isArray(x.alive) && x.alive.every((id) => typeof id === 'string') && Array.isArray(x.log) && x.log.every((l) => typeof l === 'string') &&
    Array.isArray(x.winners) && x.winners.every((w) => w && typeof w.clubId === 'string' && Number.isInteger(w.season)) && Number.isInteger(x.wins);
}
export const EURO_WEEKS = [6, 10, 14, 17];
export const EURO_PRIZE = [300, 500, 800, 1500];
/** Continental cup: top finishers from the big leagues, topped up by the strongest remaining clubs. */
export function newEuro(s: GameState, byRating = false): Cup {
  const prev = s.euro;
  const table = byRating ? [...s.clubs].sort((a, b) => a.division - b.division || b.rating - a.rating) : standings(s);
  const picked: string[] = [];
  for (const [div, n] of Object.entries(EURO_QUOTA))
    picked.push(...table.filter((c) => c.division === +div).slice(0, n).map((c) => c.id));
  for (const c of [...s.clubs].sort((a, b) => b.rating - a.rating)) if (picked.length < 16 && !picked.includes(c.id)) picked.push(c.id);
  const alive = picked.slice(0, 16).sort(() => next(s) - 0.5);
  return { season: s.season + (byRating ? 0 : 1), round: 0, alive, log: [], winners: (prev?.winners ?? []).slice(0, 30), wins: prev?.wins ?? 0 };
}
/** Continental Trophy: second-tier continental cup on its own midweeks, mid-size prizes. */
export const EURO2_WEEKS = [3, 7, 11, 15];
export const EURO2_PRIZE = [180, 300, 500, 900];
/** Entrants (never Champions Cup clubs): this season's national cup winner, the next-best league finishers
 *  (half the Champions Cup quota, rounded up, per big league), each big league's second-tier champions, then the strongest others. */
export function newEuro2(s: GameState, byRating = false, euroIds: string[] = s.euro?.alive ?? []): Cup {
  const prev = s.euro2;
  const table = byRating ? [...s.clubs].sort((a, b) => a.division - b.division || b.rating - a.rating) : standings(s);
  const out = new Set(euroIds), picked: string[] = [];
  const add = (id?: string) => { if (id && !out.has(id) && !picked.includes(id) && s.clubs.some((c) => c.id === id)) picked.push(id); };
  const cw = s.cup?.winners[0];
  if (!byRating && cw && cw.season === s.season) add(cw.clubId);
  for (const [div, n] of Object.entries(EURO_QUOTA))
    table.filter((c) => c.division === +div && !out.has(c.id)).slice(0, Math.ceil(n / 2)).forEach((c) => add(c.id));
  for (const p of PYRAMID) if (EURO_QUOTA[p.top]) add(table.find((c) => c.division === p.second)?.id);
  for (const c of [...s.clubs].sort((a, b) => b.rating - a.rating)) if (picked.length < 16) add(c.id);
  const alive = picked.slice(0, 16);
  let h = (s.season + (byRating ? 0 : 1)) * 104729 + 7;
  const rnd = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = alive.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [alive[i], alive[j]] = [alive[j]!, alive[i]!]; }
  return { season: s.season + (byRating ? 0 : 1), round: 0, alive, log: [], winners: (prev?.winners ?? []).slice(0, 30), wins: prev?.wins ?? 0 };
}
function runCup(b: GameState, c: Cup | undefined, weeks: number[], prizes: number[], label: string) {
  if (!c || c.round > 3 || weeks[c.round] !== b.week) return;
  const winners: string[] = [];
  for (let i = 0; i + 1 < c.alive.length; i += 2) {
    const h = b.clubs.find((x) => x.id === c.alive[i])!,
      a = b.clubs.find((x) => x.id === c.alive[i + 1])!;
    const ours = h.id === b.clubId || a.id === b.clubId;
    const load = ours ? midweekLoad(b) : 0;
    const boost = (x: Club) => (x.id === b.clubId ? { ...x, rating: Math.round(strength(b, true)) + load } : squadClub(b, x));
    let [gh, ga] = simulateScore(b, boost(h), boost(a));
    let pens = '';
    if (gh === ga) {
      const hw = next(b) < 0.5;
      pens = ` (${hw ? h.short : a.short} win on penalties)`;
      winners.push(hw ? h.id : a.id);
    } else winners.push(gh > ga ? h.id : a.id);
    const line = `${CUP_ROUNDS[c.round]}: ${h.short} ${gh}–${ga} ${a.short}${pens}`;
    if (ours) {
      c.log.unshift(line);
      const won = winners[winners.length - 1] === b.clubId;
      if (won) {
        b.budget += prizes[c.round]!;
        book(b, 'prize', prizes[c.round]!);
        b.fans = clamp(b.fans + 2);
      }
      b.headlines = [`🏆 ${label} ${line}${won ? ` · prize £${prizes[c.round]}k` : ' · knocked out'}`, ...b.headlines].slice(0, 6);
    }
  }
  c.alive = winners;
  c.round++;
  if (c.round === 4) {
    const w = winners[0]!;
    c.winners.unshift({ season: b.season, clubId: w });
    const wc = b.clubs.find((x) => x.id === w)!;
    if (w === b.clubId) {
      c.wins++;
      addTrophy(b, label);
      b.trust = clamp(b.trust + 10);
      b.headlines = [`🏆 ${label.toUpperCase()} WINNERS! The trophy is coming home.`, ...b.headlines].slice(0, 6);
    }
    addNews(b, `🏆 ${wc.name} win the ${label}.`);
  }
}

export function priceFor(rating: number, age: number) {
  const base = Math.max(65, Math.round((rating - 30) * 7 + (24 - age) * 5));
  return Math.round(base * (rating > 65 ? 1 + (rating - 65) * 0.15 : 1));
}
/** Give famous look-alike stars to their club's squad. */
function applyStars(_s: GameState, c: Club, squad: Player[]) {
  const used = new Set<string>();
  for (const st of starsFor(c.id)) {
    const p = squad.find((x) => x.position === st.position && !used.has(x.id)) ?? squad.find((x) => !used.has(x.id) && x.position !== 'GK');
    if (!p) continue;
    used.add(p.id);
    Object.assign(p, {
      name: st.name,
      age: st.age,
      rating: st.rating,
      position: st.position,
      potential: Math.min(97, st.rating + (st.age <= 21 ? 6 : st.age <= 24 ? 3 : 0)),
      price: priceFor(st.rating, st.age),
      wage: Math.max(2, Math.round(st.rating / 5)),
    });
  }
}
export function renameClub(s: GameState, id: string, name: string): GameState {
  const n = name.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 32 || !s.clubs.some((c) => c.id === id)) return s;
  const b = copy(s),
    c = b.clubs.find((x) => x.id === id)!;
  c.name = n;
  c.short = n.split(' ').slice(-1)[0]!.slice(0, 14);
  return b;
}
export { LEAGUES };
