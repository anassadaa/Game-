// Fan mood: labels, protests when furious, chants when ecstatic.
import type { GameState } from './game.ts';

export type FanLog = { last?: { kind: 'protest' | 'chant'; season: number; week: number }; protests: number };
const MOODS = [
  { min: 80, label: 'Ecstatic', icon: '🤩', color: '#15803d' },
  { min: 60, label: 'Happy', icon: '😀', color: '#4d7c0f' },
  { min: 40, label: 'Content', icon: '🙂', color: '#a16207' },
  { min: 25, label: 'Unhappy', icon: '😠', color: '#c2410c' },
  { min: -1, label: 'Furious', icon: '🤬', color: '#b91c1c' },
];
export const fanMood = (s: GameState) => MOODS.find((m) => s.fans >= m.min)!;
const COOL = 5;
export function fanWeek(s: GameState): 'protest' | 'chant' | undefined {
  const log = (s.fanLog ??= { protests: 0 }), l = log.last;
  if (l && l.season === s.season && s.week - l.week < COOL) return undefined;
  const kind = s.fans < 25 ? 'protest' : s.fans >= 88 ? 'chant' : undefined;
  if (!kind) return undefined;
  log.last = { kind, season: s.season, week: s.week };
  if (kind === 'protest') {
    log.protests++;
    s.trust = Math.max(0, s.trust - 4);
    s.headlines = [`📣 Fans protest outside the ground before the game. The board are watching (trust −4).`, ...s.headlines].slice(0, 6);
  } else {
    s.trust = Math.min(100, s.trust + 1);
    s.headlines = [`🎶 The whole ground sings your name. The board notice (trust +1).`, ...s.headlines].slice(0, 6);
  }
  return kind;
}
export const validFanLog = (s: Pick<GameState, 'fanLog'>) => s.fanLog === undefined || (!!s.fanLog && typeof s.fanLog === 'object' && Number.isFinite(s.fanLog.protests));
