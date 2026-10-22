import { FORMATIONS, INSTRUCTIONS, LINES, PASSING, WIDTHS } from './tactics.ts';
import type { GameState } from './game.ts';
import { LEAGUES } from './world.ts';
import { ATTRS, PERSONALITIES, migrate, storyIds } from './game.ts';

export const SAVE_KEY = 'touchline-career-v1';
export const encodeSave = (state: GameState) => JSON.stringify(state);

export function decodeSave(raw: string): GameState | null {
  if (typeof raw !== 'string' || raw.length > 6_000_000) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    if (s && [1, 2].includes((s as { version: number }).version) && Array.isArray(s.players) && Array.isArray(s.market) && Array.isArray(s.clubs)) migrate(s);
    if (
      !s ||
      s.version !== 2 ||
      !Number.isInteger(s.seed) ||
      !Number.isInteger(s.season) ||
      s.season < 1 ||
      s.season > 1000 ||
      !Number.isInteger(s.week) ||
      s.week < 0 ||
      s.week >= 18 ||
      !Number.isFinite(s.budget) ||
      Math.abs(s.budget) > 1e9 ||
      !Number.isFinite(s.trust) ||
      !Number.isFinite(s.fans) ||
      !Number.isInteger(s.academy) ||
      !Number.isInteger(s.scouting) ||
      s.academy < 1 ||
      s.academy > 5 ||
      s.scouting < 1 ||
      s.scouting > 5 ||
      !Number.isInteger(s.careerGames) ||
      !Number.isInteger(s.careerWins) ||
      s.careerGames < 0 ||
      s.careerWins < 0 ||
      s.careerWins > s.careerGames
    )
      return null;
    const validPlayer = (p: GameState['players'][number]) =>
      !!p &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      p.name.length < 100 &&
      typeof p.starting === 'boolean' &&
      typeof p.clubId === 'string' &&
      ['GK', 'DF', 'MF', 'FW'].includes(p.position) &&
      [
        p.age,
        p.rating,
        p.potential,
        p.fitness,
        p.morale,
        p.wage,
        p.price,
      ].every(Number.isFinite) &&
      p.rating >= 0 &&
      p.rating <= 100 &&
      p.fitness >= 0 &&
      p.fitness <= 100 &&
      p.morale >= 0 &&
      p.morale <= 100 &&
      p.wage >= 0 &&
      p.price >= 0 &&
      (p.attrs === undefined ||
        (typeof p.attrs === 'object' &&
          p.attrs !== null &&
          ATTRS.every((k) => Number.isFinite(p.attrs![k])))) &&
      (p.contract === undefined || (Number.isInteger(p.contract) && p.contract >= 0 && p.contract <= 10)) &&
      (p.loan === undefined || typeof p.loan === 'boolean') &&
      (p.counter === undefined || Number.isFinite(p.counter)) &&
      (p.personality === undefined ||
        (PERSONALITIES as readonly string[]).includes(p.personality));
    if (
      !s.market.every(
        (p) => validPlayer(p) && p.clubId === 'market' && !p.starting,
      ) ||
      !s.players.every(validPlayer) ||
      !Array.isArray(s.rivals) ||
      s.rivals.length > 5000 ||
      !s.rivals.every(
        (p) =>
          validPlayer(p) &&
          !p.starting &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          ['GK', 'DF', 'MF', 'FW'].includes(p.position) &&
          [p.age, p.rating, p.potential].every(Number.isFinite) &&
          s.clubs.some((c) => c.id === p.clubId && c.id !== s.clubId),
      ) ||
      listedTypeInvalid(s) ||
      !Array.isArray(s.bids) ||
      s.bids.length > 10 ||
      !s.bids.every(
        (b) =>
          b && typeof b.id === 'string' && typeof b.playerId === 'string' && typeof b.clubId === 'string' && Number.isFinite(b.fee) && b.fee >= 0,
      ) ||
      !s.board ||
      !Number.isInteger(s.board.target) ||
      typeof s.board.objective !== 'string' ||
      !Number.isInteger(s.board.warnings) ||
      !Array.isArray(s.offers) ||
      !s.offers.every((id) => s.clubs.some((c) => c.id === id)) ||
      typeof s.sacked !== 'boolean' ||
      !s.euro ||
      !Array.isArray(s.euro.alive) ||
      !s.euro.alive.every((id) => s.clubs.some((c) => c.id === id)) ||
      !Number.isInteger(s.euro.round) ||
      !s.cup ||
      !Number.isInteger(s.cup.round) ||
      s.cup.round < 0 ||
      s.cup.round > 4 ||
      !Array.isArray(s.cup.alive) ||
      !s.cup.alive.every((id) => s.clubs.some((c) => c.id === id)) ||
      !Array.isArray(s.cup.log) ||
      !s.cup.log.every((l) => typeof l === 'string') ||
      !Array.isArray(s.cup.winners) ||
      !Number.isInteger(s.cup.wins) ||
      !Array.isArray(s.news) ||
      s.news.length > 50 ||
      !s.news.every((n) => typeof n === 'string') ||
      !s.headlines.every((n) => typeof n === 'string') ||
      (s.instalments !== undefined &&
        (!Array.isArray(s.instalments) ||
          !s.instalments.every(
            (i) => i && typeof i.name === 'string' && Number.isFinite(i.amount) && Number.isInteger(i.weeks),
          ))) ||
      !s.history.every(
        (h) =>
          h &&
          Number.isInteger(h.season) &&
          Number.isInteger(h.division) &&
          Number.isInteger(h.position) &&
          typeof h.outcome === 'string' &&
          Number.isFinite(h.points),
      )
    )
      return null;
    if (
      !Array.isArray(s.clubs) ||
      s.clubs.length < 20 ||
      s.clubs.length > 400 ||
      !s.clubs.every((c) => c && LEAGUES.some((l) => l.division === c.division)) ||
      [...new Set(s.clubs.map((c) => c.division))].some((d) => s.clubs.filter((c) => c.division === d).length < 10) ||
      new Set(s.clubs.map((c) => c?.id)).size !== s.clubs.length
    )
      return null;
    if (
      !s.clubs.every(
        (c) =>
          c &&
          typeof c.short === 'string' &&
          typeof c.color === 'string' &&
          Array.isArray(c.form) &&
          c.form.every((v) => ['W', 'D', 'L'].includes(v)) &&
          ['cautious', 'balanced', 'attacking'].includes(c.style),
      )
    )
      return null;
    if (
      !Array.isArray(s.clubs) ||
      !Array.isArray(s.players) ||
      s.players.length < 14 ||
      s.players.length > 100 ||
      !Array.isArray(s.market) ||
      s.market.length > 20 ||
      !Array.isArray(s.history) ||
      !Array.isArray(s.headlines) ||
      typeof s.clubId !== 'string'
    )
      return null;
    if (
      !s.clubs.some((c) => c.id === s.clubId) ||
      !s.clubs.every(
        (c) =>
          typeof c.id === 'string' &&
          typeof c.name === 'string' &&
          c.name.length <= 40 &&
          [
            c.rating,
            c.played,
            c.points,
            c.gf,
            c.ga,
            c.wins,
            c.draws,
            c.losses,
          ].every((n) => Number.isInteger(n) && n >= 0),
      )
    )
      return null;
    if (!Array.isArray(s.youth) || s.youth.length > 12 || !s.youth.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && [p.age, p.rating, p.potential].every(Number.isFinite))) s.youth = [];
    const own = s.players.filter((p) => p.clubId === s.clubId),
      ids = new Set(s.players.map((p) => p.id));
    if (
      own.length < 14 ||
      own.filter((p) => p.starting).length !== 11 ||
      ids.size !== s.players.length ||
      new Set([...s.players, ...s.market, ...s.rivals!].map((p) => p.id)).size !==
        s.players.length + s.market.length + s.rivals!.length ||
      own.filter((p) => p.starting && p.position === 'GK').length !== 1 ||
      !s.players.every(
        (p) =>
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          ['GK', 'DF', 'MF', 'FW'].includes(p.position) &&
          [
            p.age,
            p.rating,
            p.potential,
            p.fitness,
            p.morale,
            p.wage,
            p.price,
          ].every(Number.isFinite),
      )
    )
      return null;
    if (
      !s.tactics ||
      !(FORMATIONS as readonly string[]).includes(s.tactics.formation) ||
      (s.tactics.width !== undefined && !(WIDTHS as readonly string[]).includes(s.tactics.width)) ||
      (s.tactics.line !== undefined && !(LINES as readonly string[]).includes(s.tactics.line)) ||
      (s.tactics.passing !== undefined && !(PASSING as readonly string[]).includes(s.tactics.passing)) ||
      (s.tactics.counter !== undefined && typeof s.tactics.counter !== 'boolean') ||
      (s.tactics.roles !== undefined && (typeof s.tactics.roles !== 'object' || Object.values(s.tactics.roles).some((r) => typeof r !== 'string'))) ||
      (s.tactics.instr !== undefined && (typeof s.tactics.instr !== 'object' || Object.values(s.tactics.instr).some((r) => !(INSTRUCTIONS as readonly string[]).includes(r)))) ||
      [s.tactics.pens, s.tactics.corners, s.tactics.freekicks].some((x) => x !== undefined && typeof x !== 'string') ||
      !['cautious', 'balanced', 'attacking'].includes(s.tactics.mentality) ||
      !['low', 'normal', 'high'].includes(s.tactics.press) ||
      !['patient', 'normal', 'quick'].includes(s.tactics.tempo) ||
      !['balanced', 'fitness', 'attack', 'defence', 'bonding'].includes(
        s.training,
      )
    )
      return null;
    if (s.match) {
      if (
        !Number.isInteger(s.match.minute) ||
        s.match.minute < 0 ||
        s.match.minute > 90 ||
        s.match.minute % 15 !== 0 ||
        !Number.isFinite(s.match.us) ||
        !Number.isFinite(s.match.them) ||
        !Number.isFinite(s.match.xgUs) ||
        !Number.isFinite(s.match.xgThem) ||
        typeof s.match.complete !== 'boolean' ||
        typeof s.match.home !== 'boolean' ||
        !Array.isArray(s.match.timeline) ||
        !s.match.timeline.every(
          (e) =>
            e &&
            Number.isFinite(e.minute) &&
            typeof e.text === 'string' &&
            ['goal', 'chance', 'note'].includes(e.kind) &&
            ['us', 'them', 'neutral'].includes(e.side),
        ) ||
        !s.clubs.some((c) => c.id === s.match!.opponentId)
      )
        return null;
    }
    if (
      s.inbox &&
      (!Array.isArray(s.inbox.options) ||
        s.inbox.options.length !== 2 ||
        typeof s.inbox.title !== 'string' ||
        !storyIds.includes(s.inbox.id) ||
        (s.inbox.outcome !== undefined &&
          typeof s.inbox.outcome !== 'string') ||
        typeof s.inbox.body !== 'string' ||
        typeof s.inbox.resolved !== 'boolean' ||
        !s.inbox.options.every((o) => typeof o === 'string'))
    )
      return null;
    return s;
  } catch {
    return null;
  }
}

export function loadSave(): GameState | null {
  try {
    return decodeSave(localStorage.getItem(SAVE_KEY) ?? '');
  } catch {
    return null;
  }
}
export function storeSave(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(state));
    return true;
  } catch {
    return false;
  }
}

function listedTypeInvalid(s: GameState) {
  return [...s.players, ...(s.rivals ?? [])].some((p) => p.listed !== undefined && typeof p.listed !== 'boolean');
}
