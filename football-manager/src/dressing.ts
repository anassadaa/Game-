import type { GameState, Player } from './game.ts';
import { clamp, copy, next, pick } from './game.ts';

export type Tone = 'encourage' | 'demand' | 'calm' | 'praise';
export const TONES: { id: Tone; label: string }[] = [
  { id: 'encourage', label: 'Encourage' },
  { id: 'demand', label: 'Demand more' },
  { id: 'calm', label: 'Stay calm' },
  { id: 'praise', label: 'Praise' },
];
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId);
export const harmony = (s: GameState) => s.harmony ?? 70;

/** Expected morale change for one player from a tone, given the score difference (us − them). */
export function toneEffect(p: Player, tone: Tone, diff: number) {
  let d = tone === 'praise' ? (diff > 0 ? 6 : -4) : tone === 'demand' ? (diff < 0 ? 5 : diff > 0 ? -2 : 2) : tone === 'calm' ? (diff >= 0 ? 3 : 0) : diff <= 0 ? 4 : 2;
  const pers = p.personality;
  if (tone === 'demand' && (pers === 'Temperamental' || pers === 'Easy-going')) d -= 4;
  if (tone === 'demand' && (pers === 'Ambitious' || pers === 'Professional')) d += 2;
  if (tone === 'calm' && (pers === 'Easy-going' || pers === 'Temperamental')) d += 2;
  if (tone === 'calm' && pers === 'Ambitious') d -= 1;
  if (tone === 'praise' && (pers === 'Loyal' || pers === 'Easy-going')) d += 1;
  if (tone === 'praise' && pers === 'Professional' && diff <= 0) d -= 1;
  if (tone === 'encourage' && p.age < 22) d += 2;
  return d;
}
/** Best tone for the current XI and score, with the reason. */
export function recommendTalk(s: GameState, diff = s.match ? s.match.us - s.match.them : 0): { tone: Tone; why: string } {
  const xi = own(s).filter((x) => x.starting);
  const score = (t: Tone) => xi.reduce((n, p) => n + toneEffect(p, t, diff), 0);
  const tone = TONES.map((t) => t.id).sort((a, b) => score(b) - score(a))[0]!;
  const hot = xi.filter((p) => p.personality === 'Temperamental' || p.personality === 'Easy-going').length;
  const why = diff > 0 ? `We're ahead; ${tone === 'praise' ? 'they have earned praise' : 'keep the level'}.` : diff < 0 ? `We're behind; ${tone === 'demand' ? 'they need a jolt' : hot >= 3 ? `${hot} sensitive players won't take a rollicking` : 'lift them'}.` : hot >= 3 ? `${hot} sensitive characters in the XI; go easy.` : 'Level game; set the tone.';
  return { tone, why };
}

/** Team talk before kick-off or at half-time. Personalities react differently. */
export function teamTalk(s: GameState, tone: Tone): GameState {
  const m = s.match;
  if (!m || m.complete || (m.minute !== 0 && m.minute !== 45) || !TONES.some((t) => t.id === tone)) return s;
  if ((m.talks ?? []).includes(m.minute)) return s;
  const b = copy(s), bm = b.match!, diff = bm.us - bm.them;
  let up = 0, down = 0;
  for (const p of own(b).filter((x) => x.starting)) {
    const d = toneEffect(p, tone, diff) + Math.round((next(b) - 0.5) * 4);
    p.morale = clamp(p.morale + d);
    d > 0 ? up++ : d < 0 && down++;
  }
  bm.talks = [...(bm.talks ?? []), bm.minute];
  bm.timeline.push({ minute: bm.minute, side: 'neutral', kind: 'note', text: `Team talk (${TONES.find((t) => t.id === tone)!.label}): ${up} lifted, ${down} unsettled.` });
  return b;
}

export type PressQ = { q: string; a: [string, string, string] };
export function pressQuestion(s: GameState): PressQ | null {
  const m = s.match;
  if (!m?.complete || m.pressDone) return null;
  const w = m.us > m.them, l = m.us < m.them;
  return w
    ? { q: 'A big win today. Is this squad title material?', a: ['We take it one game at a time.', 'Absolutely — we fear nobody.', 'The lads deserve all the credit.'] }
    : l
      ? { q: 'A poor result. Are you worried about your job?', a: ['We will learn and move on.', 'The referee cost us today.', 'The players let me down.'] }
      : { q: 'A share of the spoils. Fair result?', a: ['A fair point on the road to progress.', 'We should have won that comfortably.', 'I am proud of the effort.'] };
}
/** 0 = measured (trust), 1 = bold (fans, risky), 2 = players-first (morale) — except a public blast hurts harmony. */
export function answerPress(s: GameState, i: 0 | 1 | 2): GameState {
  const q = pressQuestion(s);
  if (!q || ![0, 1, 2].includes(i)) return s;
  const b = copy(s), m = b.match!, lost = m.us < m.them;
  m.pressDone = true;
  if (i === 0) b.trust = clamp(b.trust + 2);
  if (i === 1) {
    b.fans = clamp(b.fans + 3);
    b.trust = clamp(b.trust + (lost ? -3 : 1));
  }
  if (i === 2) {
    const blame = lost;
    own(b).forEach((p) => (p.morale = clamp(p.morale + (blame ? -6 : 4))));
    b.harmony = clamp(harmony(b) + (blame ? -10 : 4));
  }
  b.headlines = [`🎤 "${q.a[i]}" — the manager in the press room.`, ...b.headlines].slice(0, 6);
  return b;
}

export type Concern = 'playing time' | 'contract' | 'morale';
/** Weekly dressing-room update: unhappy players, promises and drama. */
export function dressingWeek(s: GameState, played: Set<string>) {
  const squad = own(s);
  for (const p of squad) {
    if (p.promise) {
      p.promise.weeks--;
      if (played.has(p.id)) p.promise.kept++;
      if (p.promise.weeks <= 0) {
        const ok = p.promise.kept >= 2;
        p.morale = clamp(p.morale + (ok ? 12 : -18));
        s.harmony = clamp(harmony(s) + (ok ? 3 : -8));
        if (!ok) p.unhappy = 'broken promise';
        s.headlines = [ok ? `🤝 ${p.name} is happy you kept your word.` : `💢 ${p.name} says you broke your promise of playing time.`, ...s.headlines].slice(0, 6);
        delete p.promise;
      }
    }
    if (p.unhappy || p.promise) continue;
    const benched = !played.has(p.id) && p.rating >= 60 && (p.personality === 'Ambitious' || p.rating >= 70);
    if ((benched && next(s) < 0.18) || (p.morale < 30 && next(s) < 0.3)) {
      p.unhappy = benched ? 'playing time' : p.contract === 1 ? 'contract' : 'morale';
      s.headlines = [`😠 ${p.name} is unhappy about ${p.unhappy}.`, ...s.headlines].slice(0, 6);
    }
  }
  const sulking = squad.filter((p) => p.unhappy).length, leaders = squad.filter((p) => p.personality === 'Leader').length;
  s.harmony = clamp(harmony(s) + Math.min(3, leaders) - sulking * 2 + (s.training === 'bonding' ? 3 : 0) + 1);
  const hot = squad.filter((p) => p.personality === 'Temperamental');
  if (hot.length && (sulking >= 3 || harmony(s) < 40) && next(s) < 0.35) {
    const a = pick(s, hot), others = squad.filter((p) => p.id !== a.id), c = others.length ? pick(s, others) : a;
    squad.forEach((p) => (p.morale = clamp(p.morale - 4)));
    s.harmony = clamp(harmony(s) - 6);
    s.drama = `${a.name} and ${c.name} clashed in training — the dressing room is split.`;
    s.headlines = [`🔥 Drama: ${s.drama}`, ...s.headlines].slice(0, 6);
  } else s.drama = undefined;
}
export function handleUnhappy(s: GameState, id: string, how: 'promise' | 'list' | 'talk'): GameState {
  const p0 = s.players.find((p) => p.id === id && p.unhappy);
  if (!p0 || s.match) return s;
  const b = copy(s), p = b.players.find((x) => x.id === id)! as Player;
  if (how === 'promise') {
    p.promise = { weeks: 3, kept: 0 };
    p.morale = clamp(p.morale + 8);
  } else if (how === 'list') {
    p.listed = true;
    b.harmony = clamp(harmony(b) - 2);
  } else {
    const calm = p.personality === 'Loyal' || p.personality === 'Professional' || next(b) < 0.4;
    p.morale = clamp(p.morale + (calm ? 6 : -6));
    if (!calm) b.harmony = clamp(harmony(b) - 4);
    b.headlines = [calm ? `${p.name} accepts your explanation.` : `${p.name} storms out of your office.`, ...b.headlines].slice(0, 6);
    if (!calm) return b;
  }
  delete p.unhappy;
  return b;
}
