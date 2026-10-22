export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type Mentality = 'cautious' | 'balanced' | 'attacking';
export type Press = 'low' | 'normal' | 'high';
export type Tempo = 'patient' | 'normal' | 'quick';
export type Formation = '4-3-3' | '4-4-2' | '3-5-2';
export type Training =
  'balanced' | 'fitness' | 'attack' | 'defence' | 'bonding';
export type Tab = 'home' | 'squad' | 'tactics' | 'recruitment' | 'club';
export type Tactics = {
  formation: Formation;
  mentality: Mentality;
  press: Press;
  tempo: Tempo;
};
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
  injured?: number;
  attrs?: Attrs;
  personality?: Personality;
  contract?: number;
  loan?: boolean;
  counter?: number;
  listed?: boolean;
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
  careerWins: number;
  careerGames: number;
  lastStory: string;
  instalments?: Instalment[];
  rivals?: Player[];
  bids?: Bid[];
  news?: string[];
};
export type Bid = { id: string; playerId: string; clubId: string; fee: number };

const CLUBS: [string, string, string, number, Mentality][] = [
  ['northport', 'Northport Athletic', '#D9F06F', 66, 'attacking'],
  ['westhaven', 'Westhaven City', '#6FE0DE', 64, 'balanced'],
  ['crownford', 'Crownford FC', '#EFAB76', 65, 'cautious'],
  ['bellwick', 'Bellwick United', '#B9ABF5', 63, 'attacking'],
  ['stonebridge', 'Stonebridge Rovers', '#F3CD6C', 62, 'balanced'],
  ['redmere', 'Redmere Albion', '#F28384', 62, 'attacking'],
  ['elmfield', 'Elmfield FC', '#9AD19A', 60, 'balanced'],
  ['highborough', 'Highborough', '#86B5F2', 61, 'cautious'],
  ['southgate', 'Southgate Town', '#E9A9CE', 59, 'attacking'],
  ['kingswell', 'Kingswell', '#C1C8D4', 58, 'balanced'],
  ['harbour', 'Harbour Vale', '#C8ED75', 54, 'balanced'],
  ['marlowe', 'Marlowe Town', '#FBBC89', 56, 'attacking'],
  ['ashford', 'Ashford Rovers', '#99CFEC', 57, 'cautious'],
  ['riverside', 'Riverside FC', '#B8AAEE', 55, 'balanced'],
  ['halewood', 'Halewood United', '#E69C9C', 55, 'attacking'],
  ['bracken', 'Bracken Athletic', '#EACD88', 53, 'cautious'],
  ['oldcastle', 'Oldcastle', '#A8D9AD', 52, 'balanced'],
  ['wycombe', 'Wycombe Vale', '#93B9E8', 51, 'attacking'],
  ['penrose', 'Penrose FC', '#DEAAC8', 50, 'balanced'],
  ['eastmoor', 'Eastmoor', '#B9BECA', 49, 'cautious'],
];
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
const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(n)));
const copy = (s: GameState): GameState => structuredClone(s);
function next(s: GameState): number {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function int(s: GameState, min: number, max: number) {
  return min + Math.floor(next(s) * (max - min + 1));
}
function pick<T>(s: GameState, arr: T[]): T {
  return arr[Math.floor(next(s) * arr.length)]!;
}
function makePlayer(
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
    price: Math.max(65, Math.round((rating - 30) * 7 + (24 - age) * 5)),
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
  [...s.players, ...s.market].forEach(ensureProfile);
  s.bids ??= [];
  s.news ??= [];
  if (!s.rivals) makeRivals(s);
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
  s.market = [];
  for (let i = 0; i < 8; i++)
    s.market.push(
      makePlayer(
        s,
        'market',
        i,
        pick(s, POSITIONS),
        49 + s.scouting * 2 + int(s, -4, 12),
      ),
    );
  s.market.forEach((p) => {
    p.starting = false;
    p.price = Math.max(65, Math.round(p.price * (0.8 + next(s) * 0.6)));
  });
}
export function newGame(
  seed = Date.now() >>> 0,
  clubId = 'harbour',
): GameState {
  const clubs = CLUBS.map(([id, name, color, rating, style], i): Club => ({
    id,
    name,
    short: name.split(' ')[0]!,
    color,
    division: i < 10 ? 1 : 2,
    rating,
    style,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
    form: [],
  }));
  if (!clubs.some((c) => c.id === clubId && c.division === 2))
    clubId = 'harbour';
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
  };
  POSITIONS.forEach((pos, i) => s.players.push(makePlayer(s, clubId, i, pos, 54)));
  refreshMarket(s);
  s.inbox = story(s);
  makeRivals(s);
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
  const rotation = [...ids];
  for (let r = 0; r < week % 9; r++) rotation.splice(1, 0, rotation.pop()!);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < 5; i++) {
    const a = rotation[i]!,
      b = rotation[9 - i]!;
    pairs.push(week < 9 ? (i % 2 ? [b, a] : [a, b]) : i % 2 ? [a, b] : [b, a]);
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
  const valid = {
    formation: ['4-3-3', '4-4-2', '3-5-2'],
    mentality: ['cautious', 'balanced', 'attacking'],
    press: ['low', 'normal', 'high'],
    tempo: ['patient', 'normal', 'quick'],
  };
  if (
    s.match?.complete ||
    Object.entries(patch).some(
      ([key, value]) =>
        !(valid as Record<string, string[]>)[key]?.includes(value as string),
    )
  )
    return s;
  const b = copy(s);
  b.tactics = { ...b.tactics, ...patch };
  return b;
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
    s.budget < p.price ||
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
  b.budget -= p.price;
  autoPlace(b, recruit.id);
  b.headlines = [
    `${p.name} joins ${club(b).name} for £${p.price}k.`,
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
};
/** Negotiate with a transfer target. Returns the new state and a message for the manager. */
export function negotiate(s: GameState, id: string, o: Offer): [GameState, string] {
  const p = s.market.find((x) => x.id === id) ?? s.rivals?.find((x) => x.id === id);
  const roster = s.players.filter((x) => x.clubId === s.clubId);
  if (s.match || !p) return [s, 'That player is no longer available.'];
  const fromRival = p.clubId !== 'market';
  if (fromRival && !windowOpen(s)) return [s, 'The transfer window is closed. Free agents only until it reopens.'];
  if (!(o.years >= 1 && o.years <= 5) || !Number.isFinite(o.fee) || o.fee < 0 || !Number.isFinite(o.wage))
    return [s, 'That offer is not valid.'];
  const swap = o.swapId ? roster.find((x) => x.id === o.swapId && !x.starting) : undefined;
  if (o.swapId && (!swap || roster.length <= 14)) return [s, 'That swap player cannot be included.'];
  if (!swap && roster.length >= 25) return [s, 'Your squad is full (25).'];
  const upfront = o.instalments ? Math.round(o.fee * 0.4) : o.fee;
  if (s.budget < upfront) return [s, 'You cannot afford that upfront payment.'];
  const b = copy(s),
    t = (fromRival ? b.rivals! : b.market).find((x) => x.id === id)!;
  const seller = b.clubs.find((c) => c.id === t.clubId);
  const base = askingPrice(t);
  const ask = t.counter ?? base,
    value = o.fee + (swap ? Math.round(swap.price * 0.8) : 0) - (o.instalments ? Math.round(o.fee * 0.05) : 0);
  const wantWage = Math.round(t.wage * (t.personality === 'Ambitious' ? 1.15 : 1));
  if (value < ask * 0.75) {
    t.counter = ask;
    return [b, `Rejected. The club will not go below ${ask}k.`];
  }
  if (value < ask * 0.97) {
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
  return [b, `${t.name} has signed!${t.starting ? ' He goes straight into your XI.' : ''}`];
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
export function renewContract(s: GameState, id: string, years: number): GameState {
  const p = s.players.find((x) => x.id === id && x.clubId === s.clubId && !x.loan);
  if (s.match || !p || !(years >= 1 && years <= 5)) return s;
  const b = copy(s),
    t = b.players.find((x) => x.id === id)!;
  t.wage = Math.round(t.wage * 1.15 + 1);
  t.contract = years;
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
  b.players = b.players.filter((x) => x.id !== id);
  const fee = Math.round(p.price * 0.68);
  b.budget += fee;
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
function strength(s: GameState, ourSide: boolean): number {
  if (!ourSide) return opponent(s).rating + 2;
  const starters = s.players.filter((p) => p.clubId === s.clubId && p.starting);
  const quality =
    starters.reduce((sum, p) => sum + p.rating * (p.injured ? 0.65 : 1), 0) /
    Math.max(1, starters.length);
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
    (fitness - 70) * 0.11 +
    (morale - 65) * 0.08 +
    shape +
    (s.tactics.mentality === 'attacking'
      ? 2
      : s.tactics.mentality === 'cautious'
        ? -1
        : 0)
  );
}
export function startMatch(s: GameState): GameState {
  if (s.match || s.week >= 18) return s;
  const b = copy(s),
    opp = opponent(b);
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
    (b.tactics.tempo === 'quick' ? 1 : 0);
  b.players
    .filter((p) => p.starting)
    .forEach(
      (p) =>
        (p.fitness = clamp(
          p.fitness - energyCost * (attributes(p).stamina >= 70 ? 0.7 : 1),
        )),
    );
  for (const side of ['us', 'them'] as const) {
    const us = side === 'us';
    let edge = (strength(b, us) - strength(b, !us)) * 0.012;
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
    const chance = Math.max(
      0.2,
      Math.min(0.88, 0.52 + edge + (m.home && us ? 0.04 : 0)),
    );
    if (next(b) < chance) {
      const minute = prev + int(b, 2, 14),
        xg = Math.round((0.13 + next(b) * 0.33) * 100) / 100;
      if (us) m.xgUs = Math.round((m.xgUs + xg) * 100) / 100;
      else m.xgThem = Math.round((m.xgThem + xg) * 100) / 100;
      const scorer = us
        ? pick(
            b,
            b.players.filter((p) => p.starting && p.position !== 'GK'),
          )
        : null;
      if (next(b) < xg * 1.1) {
        if (us) {
          m.us++;
          if (scorer) scorer.goals++;
        } else m.them++;
        m.timeline.push({
          minute,
          text: us
            ? `${scorer?.name ?? 'A forward'} scores! A sharp move cuts through the defence.`
            : `${opponent(b).short} score after a dangerous spell.`,
          side,
          kind: 'goal',
          playerId: scorer?.id,
        });
      } else
        m.timeline.push({
          minute,
          text: us
            ? `${scorer?.name ?? 'The attack'} goes close — a good opening slips away.`
            : `${opponent(b).short} threaten, but the chance is missed.`,
          side,
          kind: 'chance',
        });
    }
  }
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
  for (const p of b.players.filter((p) => p.clubId === b.clubId && p.starting)) {
    let r = 6.2 + diff * 0.3 + (p.rating - 55) * 0.03 + (next(b) - 0.5) * 1.2;
    const goals = m.timeline.filter((e) => e.kind === 'goal' && e.playerId === p.id).length;
    r += goals * 1.0;
    if ((p.position === 'DF' || p.position === 'GK') && m.them === 0) r += 0.7;
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
      if (next(s) < 0.28) x++;
    if (
      next(s) <
      Math.max(0.12, Math.min(0.72, 0.38 + (b.rating - a.rating) * 0.011))
    )
      if (next(s) < 0.28) y++;
  }
  return [x, y];
}
function train(s: GameState) {
  for (const p of s.players.filter((p) => p.clubId === s.clubId)) {
    p.injured = Math.max(0, (p.injured ?? 0) - 1) || undefined;
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
    if (p.personality === 'Professional' && p.age < 27 && p.rating < p.potential && next(s) < 0.04) p.rating++;
    if (starter && p.fitness < 38 && next(s) < 0.09) p.injured = int(s, 1, 3);
  }
}
function rollSeason(s: GameState) {
  const d1 = standings(s).filter((c) => c.division === 1),
    d2 = standings(s).filter((c) => c.division === 2),
    pos =
      standings(s)
        .filter((c) => c.division === club(s).division)
        .findIndex((c) => c.id === s.clubId) + 1;
  const before = club(s).division;
  let outcome =
    before === 2 && pos <= 2
      ? 'Promoted'
      : before === 1 && pos >= 9
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
  d1.slice(-2).forEach((c) => (c.division = 2));
  d2.slice(0, 2).forEach((c) => (c.division = 1));
  s.budget += before === 1 ? 1250 : 850;
  s.trust = clamp(
    s.trust +
      (outcome === 'Promoted' || outcome === 'Champions'
        ? 14
        : pos >= 8
          ? -10
          : 4),
  );
  s.fans = clamp(s.fans + (outcome === 'Promoted' ? 12 : pos <= 4 ? 5 : -5));
  s.clubs.forEach((c) => {
    c.played = c.wins = c.draws = c.losses = c.gf = c.ga = c.points = 0;
    c.form = [];
    c.rating = clamp(c.rating + int(s, -2, 2), 40, 85);
  });
  const leaving: string[] = [];
  s.players = s.players.filter((p) => {
    p.age++;
    if (p.loan) {
      leaving.push(`${p.name} (loan ends)`);
      return false;
    }
    p.contract = (p.contract ?? 1) - 1;
    if (p.contract <= 0) {
      leaving.push(`${p.name} (contract expired)`);
      return false;
    }
    return p.age <= 36;
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
    us = club(b),
    opp = opponent(b);
  const home = m.home ? us : opp,
    away = m.home ? opp : us;
  result(home, away, m.home ? m.us : m.them, m.home ? m.them : m.us);
  b.careerGames++;
  if (m.us > m.them) b.careerWins++;
  for (const division of [1, 2]) {
    const pairs = roundPairs(
      b.clubs.filter((c) => c.division === division).map((c) => c.id),
      b.week,
    );
    for (const [aid, bid] of pairs) {
      if (aid === us.id || bid === us.id) continue;
      const a = b.clubs.find((c) => c.id === aid)!,
        c = b.clubs.find((c) => c.id === bid)!;
      const [ga, gb] = simulateScore(b, a, c);
      result(a, c, ga, gb);
    }
  }
  const wages = b.players
    .filter((p) => p.clubId === b.clubId)
    .reduce((sum, p) => sum + p.wage, 0);
  const income =
    (club(b).division === 1 ? 130 : 90) +
    (m.home ? 90 + Math.round(b.fans * 0.5) : 35) +
    Math.round(b.fans * 0.2);
  b.budget += income - wages;
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
  train(b);
  transferWeek(b);
  b.headlines = [
    `${m.home ? 'Home' : 'Away'} to ${opp.name}: ${m.us}–${m.them}. ${m.us > m.them ? 'Three points banked.' : m.us < m.them ? 'Time to regroup.' : 'A point to build on.'}`,
    `Matchday income £${income}k · wages £${wages}k`,
    ...b.headlines,
  ].slice(0, 6);
  b.week++;
  b.match = null;
  if (b.week === 18) {
    rollSeason(b);
    rollRivals(b);
  }
  else {
    if (b.week % 3 === 0) refreshMarket(b);
    b.inbox = story(b);
  }
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
function makeRivals(s: GameState) {
  s.rivals = [];
  for (const c of s.clubs) {
    if (c.id === s.clubId) continue;
    SQUAD_SHAPE.forEach((pos, i) => s.rivals!.push(rivalPlayer(s, c, i, pos)));
  }
}
/** Transfer windows: pre-season (weeks 1–4) and mid-season (weeks 10–11). */
export const windowOpen = (s: Pick<GameState, 'week'>) => s.week <= 3 || s.week === 9 || s.week === 10;
export const deadlineDay = (s: Pick<GameState, 'week'>) => s.week === 3 || s.week === 10;
export function windowLabel(s: Pick<GameState, 'week'>) {
  if (deadlineDay(s)) return 'Deadline day! Window closes after this match';
  if (windowOpen(s)) return `Window open · closes in ${(s.week <= 3 ? 3 : 10) - s.week + 1} weeks`;
  return `Window closed · reopens in ${(s.week < 9 ? 9 : 18) - s.week} weeks`;
}
/** What the owning club wants. Free agents cost their price; rivals want a premium unless listed. */
export function askingPrice(p: Player) {
  if (p.clubId === 'market') return p.price;
  return Math.round(p.price * (p.listed ? 0.9 : 1.3));
}
export type MarketFilter = {
  q?: string;
  position?: Position | 'ALL';
  maxAge?: number;
  maxPrice?: number;
  minStars?: number;
  attr?: AttrKey | '';
  minAttr?: number;
  listedOnly?: boolean;
  source?: 'all' | 'free' | 'clubs';
  sort?: 'rating' | 'price' | 'potential' | 'age';
};
export function searchMarket(s: GameState, f: MarketFilter): Player[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const pool = [...(f.source === 'clubs' ? [] : s.market), ...(f.source === 'free' ? [] : (s.rivals ?? []))];
  const clubName = (id: string) => s.clubs.find((c) => c.id === id)?.name.toLowerCase() ?? '';
  const out = pool.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || clubName(p.clubId).includes(q)) &&
      (!f.position || f.position === 'ALL' || p.position === f.position) &&
      (!f.maxAge || p.age <= f.maxAge) &&
      (!f.maxPrice || askingPrice(p) <= f.maxPrice) &&
      (!f.minStars || potentialStars(p) >= f.minStars) &&
      (!f.attr || attributes(p)[f.attr] >= (f.minAttr ?? 0)) &&
      (!f.listedOnly || p.listed || p.clubId === 'market'),
  );
  const key = f.sort ?? 'rating';
  out.sort((a, b) =>
    key === 'price' ? askingPrice(a) - askingPrice(b) : key === 'age' ? a.age - b.age : b[key] - a[key],
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
  b.budget += bid.fee;
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
    const chance = (p.listed ? 0.45 : p.rating >= ours.rating + 4 ? 0.1 : 0.02) * dd;
    if (next(b) >= chance) continue;
    const buyers = b.clubs.filter((c) => c.id !== b.clubId && c.rating >= p.rating - 12);
    if (!buyers.length) continue;
    const buyer = pick(b, buyers);
    const fee = Math.round(p.price * (p.listed ? 0.7 + next(b) * 0.3 : 1.0 + next(b) * 0.35) * (dd > 1 ? 1.1 : 1));
    b.bids.push({ id: `bid-${b.season}-${b.week}-${p.id}`, playerId: p.id, clubId: buyer.id, fee });
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
  b.rivals = [];
  for (const p of rivals) {
    p.age++;
    p.goals = 0;
    p.assists = 0;
    delete p.counter;
    if (p.age > 34) continue;
    if (p.age <= 24 && p.rating < p.potential) p.rating = Math.min(p.potential, p.rating + int(b, 0, 4));
    else if (p.age >= 31) p.rating = Math.max(35, p.rating - int(b, 0, 3));
    p.price = Math.max(65, Math.round((p.rating - 30) * 7 + (24 - p.age) * 5));
    b.rivals.push(p);
  }
  for (const c of b.clubs) {
    if (c.id === b.clubId) continue;
    let n = b.rivals.filter((x) => x.clubId === c.id).length;
    while (n < 14) b.rivals.push(rivalPlayer(b, c, 200 + n++, pick(b, POSITIONS), true));
  }
  b.news = [`Season ${b.season}: the summer window is open!`, ...(b.news ?? [])].slice(0, 25);
}
