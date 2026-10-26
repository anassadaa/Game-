import { isProtected, PROTECTED_BADGE } from './protect.ts';
// One shared player profile: lookup by id or by a tapped piece of text, plus what the UI may show.
import type { GameState, Player } from './game.ts';
import { attributes } from './game.ts';
const ATTR_LABEL: Record<string, string> = { pace: 'Pace', shooting: 'Shooting', passing: 'Passing', defending: 'Defending', stamina: 'Stamina', mental: 'Mental', goalkeeping: 'Goalkeeping' };
import { abilityRange, potentialRange, rangeText, scouted } from './scoutrange.ts';
import { ext, EXT_LABEL, slotOf, footOf, FOOT_LABEL } from './positions.ts';
import { hidden, HIDDEN_LABEL, leadership, ppms, PPM_LABEL } from './traits.ts';
import { injuryName } from './injuries.ts';
import { avgRating } from './highlights.ts';

export function allPlayers(s: GameState): Player[] {
  const seen = new Set<string>(), out: Player[] = [];
  for (const p of [...s.players, ...s.market, ...(s.rivals ?? []), ...(s.youth ?? [])]) if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
  return out;
}
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idx = new WeakMap<GameState, { full: [RegExp, string][]; sur: [RegExp, string][] }>();
function index(s: GameState) {
  let i = idx.get(s); if (i) return i;
  const ps = allPlayers(s);
  const byName = new Map<string, string[]>();
  for (const p of ps) byName.set(p.name, [...(byName.get(p.name) ?? []), p.id]);
  const pick = (ids: string[]) => ids.find((id) => s.players.some((p) => p.id === id && p.clubId === s.clubId)) ?? ids[0]!;
  const full = [...byName.entries()].sort((a, b) => b[0].length - a[0].length).map(([n, ids]) => [new RegExp(`(^|[^\\p{L}])${esc(n)}(?![\\p{L}])`, 'u'), pick(ids)] as [RegExp, string]);
  const own = s.players.filter((p) => p.clubId === s.clubId), cnt = new Map<string, number>();
  for (const p of own) { const k = p.name.split(' ').slice(-1)[0]!; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  const sur = own.filter((p) => { const k = p.name.split(' ').slice(-1)[0]!; return k.length >= 4 && cnt.get(k) === 1; })
    .map((p) => [new RegExp(`(^|[^\\p{L}])${esc(p.name.split(' ').slice(-1)[0]!)}(?![\\p{L}])`, 'u'), p.id] as [RegExp, string]);
  i = { full, sur }; idx.set(s, i); return i;
}
/** Exactly one player named in the text → his id; none or several → null (or 'many'). */
function scan(s: GameState, text: string): string | null | 'many' {
  if (!text || text.length > 400) return text ? 'many' : null;
  const { full, sur } = index(s), hits = new Set<string>();
  let rest = text;
  for (const [re, id] of full) if (re.test(rest)) { hits.add(id); rest = rest.replace(re, '$1 '); }
  if (!hits.size) for (const [re, id] of sur) if (re.test(rest)) hits.add(id);
  return hits.size === 1 ? [...hits][0]! : hits.size ? 'many' : null;
}
export function findPlayer(s: GameState, text: string): string | null {
  const r = scan(s, text); return r === 'many' ? null : r;
}
/** Texts of the tapped element and its ancestors, innermost first. */
export function pidFromTexts(s: GameState, texts: string[]): string | null {
  for (const t of texts) { const r = scan(s, t); if (r === 'many') return null; if (r) return r; }
  return null;
}

export type Profile = {
  id: string; name: string; age: number; position: string; slot: string; foot: string; club: string; value: number; ours: boolean; scouted: boolean; protected: boolean;
  ability: string; potential: string; personality: string; leadership: number | null;
  attrs: { label: string; value: string }[]; hidden: { label: string; value: number }[] | null;
  traits: string[]; contract: string; injury: string | null; status: string[];
  stats: { label: string; value: string }[]; fitness: number | null; morale: number | null;
};
function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
export function playerProfile(s: GameState, id: string): Profile | null {
  const p0 = allPlayers(s).find((p) => p.id === id); if (!p0) return null;
  const p = { ...p0 }; // never mutate state while rendering
  const ours = p.clubId === s.clubId, sc = scouted(s, p);
  const clubName = p.clubId === 'market' ? 'Free agent' : s.clubs.find((c) => c.id === p.clubId)?.name ?? (p.clubId === 'youth' ? 'Academy' : p.clubId);
  const ab = abilityRange(s, p), off = Math.round((ab[0] + ab[1]) / 2) - p.rating, w = ours || sc ? 0 : Math.max(2, Math.round((ab[1] - ab[0]) / 2));
  const show = (k: string, v: number) => {
    const c = Math.max(1, Math.min(99, v + off));
    if (!w) return String(c);
    const lo = Math.max(1, Math.round(c - w * (0.3 + 0.7 * h(p.id + k))));
    return `${lo}–${Math.min(99, lo + 2 * w)}`;
  };
  const a = attributes(p);
  const attrs = [
    ...Object.entries(a).map(([k, v]) => ({ label: ATTR_LABEL[k] ?? k, value: show(k, v) })),
    ...Object.entries(ext(p)).map(([k, v]) => ({ label: (EXT_LABEL as Record<string, string>)[k] ?? k, value: show(k, v) })),
  ];
  const hid = ours || sc ? Object.entries(hidden(p)).map(([k, v]) => ({ label: HIDDEN_LABEL[k as keyof typeof HIDDEN_LABEL], value: v })) : null;
  const status: string[] = [];
  if (p.starting && ours) status.push('In the XI');
  if (p.suspended) status.push(`Suspended ${p.suspended}`);
  if (p.yellows) status.push(`${p.yellows} yellow${p.yellows > 1 ? 's' : ''}`);
  if (p.listed) status.push('Transfer listed');
  if (p.loanListed) status.push('Loan listed');
  if (p.loan) status.push('On loan');
  if (p.unhappy) status.push(`Unhappy (${p.unhappy})`);
  const prot = ours && isProtected(p); if (prot) status.push(PROTECTED_BADGE);
  if (p.wonderkid) status.push('Wonderkid');
  if (p.academyGraduate) status.push('Academy graduate');
  return {
    id: p.id, name: p.name, age: p.age, position: p.position, slot: slotOf(p), foot: FOOT_LABEL[footOf(p)], club: clubName, value: p.price, ours, scouted: sc, protected: prot,
    ability: rangeText(ab), potential: rangeText(potentialRange(s, p)),
    personality: ours || sc ? p.personality ?? 'Unknown' : 'Unknown — scout him', leadership: ours || sc ? leadership(p) : null,
    attrs, hidden: hid, traits: ppms(p).map((t) => PPM_LABEL[t]),
    contract: p.loan ? 'On loan' : p.clubId === 'market' ? `Free agent · asks £${p.wage}k/wk` : `${p.contract ?? '?'}y left · £${p.wage}k/wk${p.clause ? ` · clause £${p.clause}k` : ''}`,
    injury: p.injured ? `${injuryName(p.injury?.type)} · out ${p.injured}w` : null,
    status,
    stats: [
      { label: 'Apps', value: String(p.apps ?? 0) }, { label: 'Goals', value: String(p.goals ?? 0) }, { label: 'Assists', value: String(p.assists ?? 0) },
      { label: 'Avg', value: p.apps ? avgRating(p).toFixed(2) : '—' }, { label: 'MOTM', value: String(p.motm ?? 0) },
      { label: 'Reds', value: String(p.reds ?? 0) }, { label: 'Injuries', value: String(p.injuries ?? 0) },
    ],
    fitness: ours ? p.fitness : null, morale: ours ? p.morale : null,
  };
}
