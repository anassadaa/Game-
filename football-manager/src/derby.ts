// Derbies and rival managers: one local rival per league, named managers for every club.
import type { GameState } from './game.ts';
import { club } from './game.ts';

export type DerbyLog = { w: number; d: number; l: number };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const FN = ['Marco', 'Dieter', 'Sean', 'Ricardo', 'Pavel', 'Yusuf', 'Gareth', 'Henrik', 'Luis', 'Kenji', 'Omar', 'Bruno', 'Arne', 'Tomas', 'Idris', 'Claude'];
const LN = ['Brandt', 'Okafor', 'Lindqvist', 'Moreau', 'Petrov', 'Haddad', 'Doyle', 'Castillo', 'Weber', 'Sato', 'Nakamura', 'Fontaine', 'Rossi', 'Kowalski', 'Mensah', 'Ferreira'];
export function managerName(s: GameState, clubId: string) {
  const h = hash(`${s.seed}|mgr|${clubId}`);
  return `${FN[h % FN.length]} ${LN[(h >>> 8) % LN.length]}`;
}
export function derbyRival(s: GameState) {
  const me = club(s);
  const pool = s.clubs.filter((c) => c.division === me.division && c.id !== me.id).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return undefined;
  return pool[hash(`${s.seed}|derby|${me.id}|${me.division}`) % pool.length];
}
export const isDerby = (s: GameState, oppId: string) => derbyRival(s)?.id === oppId;
/** Call after a league match. Returns true if it was the derby. */
export function noteDerby(s: GameState, oppId: string, us: number, them: number) {
  if (!isDerby(s, oppId)) return false;
  const d = (s.derby ??= { w: 0, d: 0, l: 0 }), name = derbyRival(s)!.name;
  if (us > them) { d.w++; s.fans = Math.min(100, s.fans + 4); }
  else if (us < them) { d.l++; s.fans = Math.max(0, s.fans - 4); }
  else d.d++;
  s.headlines = [`🔥 Derby: ${us}–${them} against ${name}. ${us > them ? 'Bragging rights are ours!' : us < them ? 'The fans won’t forget this one.' : 'Honours even.'}`, ...s.headlines].slice(0, 6);
  return true;
}
export const validDerby = (s: Pick<GameState, 'derby'>) => s.derby === undefined || (!!s.derby && [s.derby.w, s.derby.d, s.derby.l].every((n) => Number.isInteger(n)));
