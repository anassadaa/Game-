import type { GameState, Player } from './game.ts';
import { club, copy, next, pick, windowOpen } from './game.ts';

export const loansOut = (s: GameState) => s.loansOut ?? [];
const own = (s: GameState) => s.players.filter((p) => p.clubId === s.clubId && !p.loan);
/** Put a reserve on (or take him off) the loan list. */
export function toggleLoanListed(s: GameState, id: string): GameState {
  const p = own(s).find((x) => x.id === id);
  if (s.match || !p) return s;
  const b = copy(s), t = b.players.find((x) => x.id === id)!;
  t.loanListed = !t.loanListed;
  if (t.loanListed) t.starting = false;
  return b;
}
/** Weekly, in a window: clubs may take loan-listed players for the season, paying a fee and his wages. */
export function loansWeek(b: GameState) {
  if (!windowOpen(b)) return;
  for (const p of own(b).filter((x) => x.loanListed && !x.starting)) {
    if (own(b).length <= 14 || loansOut(b).length >= 10 || next(b) > 0.2) continue;
    const takers = b.clubs.filter((c) => c.id !== b.clubId && Math.abs(c.rating - p.rating) <= 10);
    if (!takers.length) continue;
    const to = pick(b, takers), fee = Math.max(5, Math.round(p.price * 0.05));
    b.players = b.players.filter((x) => x.id !== p.id);
    b.loansOut = [...loansOut(b), { ...p, loanListed: false, loanClub: to.id }];
    b.budget += fee;
    b.news = [`W${b.week + 1}: 🔁 ${p.name} joins ${to.short} on loan from ${club(b).short} (£${fee}k).`, ...(b.news ?? [])].slice(0, 25);
    b.headlines = [`${p.name} loaned to ${to.name} for £${fee}k; they cover his wages.`, ...b.headlines].slice(0, 6);
  }
}
/** Season end: loanees come home. */
export function loansReturn(s: GameState) {
  for (const p of loansOut(s)) {
    const back: Player = { ...p, clubId: s.clubId, starting: false };
    delete back.loanClub;
    s.players.push(back);
  }
  s.loansOut = [];
}
export function validLoans(s: GameState) {
  const l = s.loansOut;
  if (l === undefined) return true;
  const ids = new Set([...s.players, ...s.market, ...(s.rivals ?? [])].map((p) => p.id));
  return Array.isArray(l) && l.length <= 10 && l.every((p) => p && typeof p.id === 'string' && !ids.has(p.id) && typeof p.name === 'string' && Number.isFinite(p.rating) && Number.isFinite(p.price) && Number.isFinite(p.wage) && typeof p.loanClub === 'string');
}
