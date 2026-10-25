import type { GameState } from './game.ts';
import { myStake } from './wallet.ts';

export type CelebrationKind = 'win' | 'promotion' | 'trophy' | 'signing' | 'control';
export type Celebration = { kind: CelebrationKind; title: string; text: string; big: boolean };

const ownedIds = (s: GameState) => {
  const out = new Set<string>();
  if (myStake(s) >= 51) out.add(s.clubId);
  for (const [id, h] of Object.entries(s.wallet?.holdings ?? {})) if ((h as { stake?: number })?.stake !== undefined && (h as { stake: number }).stake >= 51) out.add(id);
  return out;
};
const clubName = (s: GameState, id: string) => s.clubs.find((c) => c.id === id)?.name ?? 'the club';

/** Compare two consecutive states and list moments worth celebrating (biggest first). Pure. */
export function celebrations(prev: GameState | null, next: GameState | null): Celebration[] {
  if (!prev || !next || prev === next || prev.clubId !== next.clubId) return [];
  const out: Celebration[] = [];
  const mine = next.clubs.find((c) => c.id === next.clubId)?.name;
  const tAll = next.trophies ?? [], tNew = tAll.filter((t) => !(prev.trophies ?? []).some((o) => o.season === t.season && o.name === t.name && o.club === t.club));
  for (const t of tNew) if (t.club === mine) out.push({ kind: 'trophy', title: '🏆 Trophy won!', text: `${t.name} — season ${t.season}. Your name is on the cup.`, big: true });
  const h = next.history?.[0];
  if (h && (next.history?.length ?? 0) > (prev.history?.length ?? 0) && /promot/i.test(h.outcome)) out.push({ kind: 'promotion', title: '⬆️ Promoted!', text: `Up we go — finished ${h.position} and earned promotion.`, big: true });
  const r = next.results ?? [], pr = prev.results ?? [];
  if (r.length === pr.length + 1) { const last = r[r.length - 1]!; if (last.us > last.them) out.push({ kind: 'win', title: '🎉 Victory!', text: `${last.us}–${last.them} against ${last.opp}.`, big: last.us - last.them >= 3 }); }
  const before = new Set(prev.players.filter((p) => p.clubId === prev.clubId).map((p) => p.id));
  const squad = next.players.filter((p) => p.clubId === next.clubId);
  const avg = squad.reduce((a, p) => a + (p.price || 0), 0) / Math.max(1, squad.length);
  for (const p of squad) if (!before.has(p.id) && p.price >= Math.max(1500, avg * 1.8)) { out.push({ kind: 'signing', title: '✍️ Big signing!', text: `${p.name} (${p.rating}) joins the club.`, big: true }); break; }
  const was = ownedIds(prev);
  for (const id of ownedIds(next)) if (!was.has(id)) out.push({ kind: 'control', title: '👑 You control the club!', text: `You now hold a majority of ${clubName(next, id)}.`, big: true });
  const order: CelebrationKind[] = ['trophy', 'promotion', 'control', 'signing', 'win'];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Deterministic confetti layout (hash-based, no Math.random). */
export function confetti(seed: string, n = 36) {
  const pieces: { left: number; delay: number; dur: number; hue: number; rot: number }[] = [];
  for (let i = 0; i < n; i++) {
    let h = 2166136261;
    for (const ch of `${seed}|${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    pieces.push({ left: h % 100, delay: (h >>> 7) % 60 / 100, dur: 1.6 + ((h >>> 13) % 120) / 100, hue: [48, 140, 200, 0, 280][(h >>> 3) % 5]!, rot: (h >>> 17) % 360 });
  }
  return pieces;
}

/** Manager level from career achievements (pure). */
export function managerLevel(s: GameState) {
  const wins = (s.results ?? []).filter((r) => r.us > r.them).length;
  const seasons = (s.history ?? []).length, trophies = (s.trophies ?? []).length;
  const promos = (s.history ?? []).filter((h) => /promot/i.test(h.outcome)).length;
  const xp = wins * 10 + seasons * 60 + trophies * 150 + promos * 120;
  const level = 1 + Math.floor(Math.sqrt(xp / 40));
  const at = (l: number) => 40 * (l - 1) ** 2;
  return { level, xp, next: at(level + 1), from: at(level) };
}

export type Badge = { id: string; icon: string; name: string; got: boolean; hint: string };
export function badges(s: GameState): Badge[] {
  const r = s.results ?? [], h = s.history ?? [], t = s.trophies ?? [];
  const best = r.reduce((m, x) => Math.max(m, x.us - x.them), 0);
  let streak = 0, run = 0; for (const x of r) { run = x.us > x.them ? run + 1 : 0; streak = Math.max(streak, run); }
  const controls = Object.values(s.wallet?.holdings ?? {}).filter((x) => ((x as { stake?: number })?.stake ?? 0) >= 51).length + (myStake(s) >= 51 ? 1 : 0);
  return [
    { id: 'first-win', icon: '🥇', name: 'First win', got: r.some((x) => x.us > x.them), hint: 'Win a league match' },
    { id: 'thrash', icon: '💥', name: 'Thrashing', got: best >= 4, hint: 'Win by 4+ goals' },
    { id: 'streak', icon: '🔥', name: 'On fire', got: streak >= 5, hint: 'Win 5 in a row' },
    { id: 'promo', icon: '⬆️', name: 'Going up', got: h.some((x) => /promot/i.test(x.outcome)), hint: 'Win promotion' },
    { id: 'champ', icon: '👑', name: 'Champions', got: h.some((x) => x.outcome === 'Champions'), hint: 'Win the league' },
    { id: 'silver', icon: '🏆', name: 'Silverware', got: t.length > 0, hint: 'Lift any trophy' },
    { id: 'tycoon', icon: '💼', name: 'Tycoon', got: controls >= 2, hint: 'Control two clubs' },
    { id: 'veteran', icon: '🎖️', name: 'Veteran', got: h.length >= 5, hint: 'Complete 5 seasons' },
  ];
}
