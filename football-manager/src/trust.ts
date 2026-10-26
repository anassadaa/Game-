// Board confidence drifts toward an equilibrium set by league position vs target, finances and form.
import type { GameState } from './game.ts';
import { standings } from './game.ts';

export type TrustReason = { label: string; value: number };
export type TrustLog = { eq: number; delta: number; reasons: TrustReason[]; debt?: boolean };
const money = (k: number) => (Math.abs(k) >= 1000 ? `£${(k / 1000).toFixed(1)}m` : `£${Math.round(k)}k`);
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function trustEquilibrium(s: GameState): { eq: number; reasons: TrustReason[] } {
  const me = s.clubs.find((c) => c.id === s.clubId)!;
  const pos = standings(s).filter((c) => c.division === me.division).findIndex((c) => c.id === me.id) + 1;
  const target = s.board?.target ?? pos;
  const reasons: TrustReason[] = [];
  const add = (label: string, value: number) => { value = Math.round(value); if (value) reasons.push({ label, value }); };
  // Early-season tables mean little; weight position in over the first 6 weeks.
  const weight = Math.min(1, Math.max(0.3, s.week / 6));
  const gap = target - pos;
  add(gap >= 0 ? `${gap ? `${gap} places above` : 'On'} target (${pos} vs ${target})` : `${-gap} places below target (${pos} vs ${target})`, clamp(gap * 3, -30, 30) * weight + (gap >= 0 ? 5 : 0));
  const weeks = (s.ledger?.weeks ?? []).slice(-4);
  const net = weeks.length ? weeks.reduce((a, w) => a + w.net, 0) / weeks.length : 0;
  add(net >= 0 ? `Weekly profit £${Math.round(net)}k` : `Weekly loss £${Math.round(-net)}k`, clamp(net / 10, -8, 8));
  if (s.budget < 0) add(`Overdrawn ${money(-s.budget)}`, -clamp(4 + -s.budget / 500, 0, 12));
  else add(`Bank balance ${money(s.budget)}`, clamp(s.budget / 400, 0, 6));
  if (s.budget >= 0 && (s.wasOverdrawn || s.trustLog?.debt)) add('Debt cleared', 6);
  const f = (me.form ?? []).slice(-5);
  add(`Form ${f.join('') || '—'}`, f.reduce((a, r) => a + (r === 'W' ? 2 : r === 'L' ? -2 : 0), 0));
  const eq = clamp(55 + reasons.reduce((a, r) => a + r.value, 0), 8, 95);
  return { eq: Math.round(eq), reasons };
}
/** Weekly drift: a fifth of the gap, at most −4 / +6 per week. */
export function trustWeek(s: GameState) {
  const { eq, reasons } = trustEquilibrium(s);
  const delta = Math.round(clamp((eq - s.trust) * 0.2, -4, 6));
  s.trust = clamp(s.trust + delta);
  if (s.budget < 0) s.wasOverdrawn = true; else if (s.wasOverdrawn && s.trustLog?.debt) s.wasOverdrawn = false;
  s.trustLog = { eq, delta, reasons, debt: s.budget < 0 || !!s.wasOverdrawn };
}
/** One-off for old saves: move halfway to equilibrium so trust isn't stuck from the old overdraft drain. */
export function migrateTrust(s: GameState) {
  if (s.trustV === 1) return;
  s.trustV = 1;
  if (s.sacked || !s.board) return;
  const { eq } = trustEquilibrium(s);
  if (eq > s.trust) s.trust = Math.round(s.trust + (eq - s.trust) * 0.6);
}
