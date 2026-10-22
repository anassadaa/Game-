import type { GameState } from './game.ts';
import { storyIds } from './game.ts';

export const SAVE_KEY = 'touchline-career-v1';
export const encodeSave = (state: GameState) => JSON.stringify(state);

export function decodeSave(raw: string): GameState | null {
  if (typeof raw !== 'string' || raw.length > 2_000_000) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    if (
      !s ||
      s.version !== 1 ||
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
      p.price >= 0;
    if (
      !s.market.every(
        (p) => validPlayer(p) && p.clubId === 'market' && !p.starting,
      ) ||
      !s.players.every(validPlayer) ||
      !s.headlines.every((n) => typeof n === 'string') ||
      !s.history.every(
        (h) =>
          h &&
          Number.isInteger(h.season) &&
          [1, 2].includes(h.division) &&
          Number.isInteger(h.position) &&
          typeof h.outcome === 'string' &&
          Number.isFinite(h.points),
      )
    )
      return null;
    if (
      s.clubs.filter((c) => c?.division === 1).length !== 10 ||
      s.clubs.filter((c) => c?.division === 2).length !== 10 ||
      new Set(s.clubs.map((c) => c?.id)).size !== 20
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
      s.clubs.length !== 20 ||
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
          [1, 2].includes(c.division) &&
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
    const own = s.players.filter((p) => p.clubId === s.clubId),
      ids = new Set(s.players.map((p) => p.id));
    if (
      own.length < 14 ||
      own.filter((p) => p.starting).length !== 11 ||
      ids.size !== s.players.length ||
      new Set([...s.players, ...s.market].map((p) => p.id)).size !==
        s.players.length + s.market.length ||
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
      !['4-3-3', '4-4-2', '3-5-2'].includes(s.tactics.formation) ||
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
