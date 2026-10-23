// Discipline: yellow and red cards in matches, accumulation and suspensions.
import type { GameState, Player } from './game.ts';
import { next } from './game.ts';
import { shoutEffect } from './shouts.ts';

export const YELLOW_RATE = 0.026, RED_RATE = 0.0012, BAN_AT = 5;
export type Card = { id: string; y: number; red?: boolean };

/** Aggression nudges the rate: pressing, tired legs, and a player's own temperament (mental). */
export function cardRisk(s: GameState, p: Player) {
  const press = s.tactics.press === 'high' ? 1.3 : s.tactics.press === 'low' ? 0.8 : 1;
  const tired = 1 + Math.max(0, 60 - p.fitness) / 80;
  const def = p.position === 'DF' || p.position === 'MF' ? 1.2 : p.position === 'GK' ? 0.25 : 0.8;
  return press * tired * def * shoutEffect(s).cards;
}
const line = (s: GameState, text: string, side: 'us' | 'them', playerId?: string) =>
  s.match!.timeline.push({ minute: Math.min(90, s.match!.minute - 15 + Math.ceil(next(s) * 14)), text, side, kind: 'note', ...(playerId ? { playerId } : {}) });

function sendOff(s: GameState, p: Player) {
  p.starting = false;
  if (s.lineup) s.lineup = s.lineup.map((x) => (x === p.id ? '' : x));
}
/** One 15-minute segment of bookings for both sides. */
export function matchCards(s: GameState) {
  const m = s.match!;
  m.cards ??= [];
  for (const p of s.players.filter((x) => x.clubId === s.clubId && x.starting)) {
    const k = cardRisk(s, p);
    let c = m.cards.find((x) => x.id === p.id);
    if (next(s) < RED_RATE * k) {
      if (!c) m.cards.push((c = { id: p.id, y: 0 }));
      c.red = true;
      line(s, `🟥 ${p.name} is sent off for a reckless challenge!`, 'us', p.id);
      sendOff(s, p);
    } else if (next(s) < YELLOW_RATE * k) {
      if (!c) m.cards.push((c = { id: p.id, y: 0 }));
      c.y++;
      if (c.y >= 2) {
        c.red = true;
        line(s, `🟨🟥 Second yellow for ${p.name} — he's off!`, 'us', p.id);
        sendOff(s, p);
      } else line(s, `🟨 ${p.name} is booked.`, 'us', p.id);
    }
  }
  const opp = s.clubs.find((c) => c.id === m.opponentId);
  for (let i = 0; i < 10 - (m.redThem ?? 0); i++) {
    if (next(s) < RED_RATE) {
      m.redThem = (m.redThem ?? 0) + 1;
      line(s, `🟥 ${opp?.short ?? 'Opposition'} reduced to ${11 - m.redThem} men — a red card!`, 'them');
    } else if (next(s) < YELLOW_RATE) {
      m.yellowThem = (m.yellowThem ?? 0) + 1;
      if (next(s) < 0.06) {
        m.redThem = (m.redThem ?? 0) + 1;
        line(s, `🟨🟥 Second yellow — ${opp?.short ?? 'the opposition'} are down to ${11 - m.redThem}.`, 'them');
      } else line(s, `🟨 Booking for ${opp?.short ?? 'the opposition'}.`, 'them');
    }
  }
}
/** Full-time: serve existing bans, then hand out new ones (red = 1 match, straight red = 2, 5 yellows = 1). */
export function settleCards(s: GameState) {
  const m = s.match!;
  for (const p of s.players.filter((x) => x.clubId === s.clubId && x.suspended)) p.suspended = p.suspended! > 1 ? p.suspended! - 1 : undefined;
  for (const c of m.cards ?? []) {
    const p = s.players.find((x) => x.id === c.id);
    if (!p) continue;
    if (c.red) {
      p.suspended = (p.suspended ?? 0) + (c.y >= 2 ? 1 : 2);
      p.reds = (p.reds ?? 0) + 1;
      news(s, `🟥 ${p.name} is suspended for ${p.suspended} match${p.suspended > 1 ? 'es' : ''}.`);
    } else if (c.y) {
      p.yellows = (p.yellows ?? 0) + 1;
      if (p.yellows >= BAN_AT) {
        p.yellows = 0;
        p.suspended = (p.suspended ?? 0) + 1;
        news(s, `🟨 ${p.name} reaches ${BAN_AT} bookings — banned for the next match.`);
      }
    }
  }
}
function news(s: GameState, text: string) {
  s.headlines = [text, ...s.headlines].slice(0, 12);
}
/** Banned players are dropped before kick-off. */
export function dropSuspended(s: GameState) {
  for (const p of s.players.filter((x) => x.clubId === s.clubId && x.suspended)) {
    sendOff(s, p);
    if (s.bench) s.bench = s.bench.filter((id) => id !== p.id);
  }
}
export const suspended = (p: Player) => !!p.suspended;
export function resetCards(s: GameState) {
  for (const p of s.players) { p.yellows = undefined; }
}
export function validCards(s: GameState) {
  const n = (v: unknown) => v === undefined || (Number.isInteger(v) && (v as number) >= 0);
  return s.players.every((p) => n(p.yellows) && n(p.reds) && n(p.suspended));
}
