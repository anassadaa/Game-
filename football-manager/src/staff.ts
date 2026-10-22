import type { GameState, Player } from './game.ts';
import { club, copy, int, next, opponent, pick } from './game.ts';
import { facilities } from './facilities.ts';
import { reputation, stature } from './jobs.ts';
import { MAX_SCOUTS, REGIONS } from './scouts.ts';

export type StaffRole = 'assistant' | 'attack' | 'defence' | 'fitness' | 'gk' | 'physio' | 'youth' | 'dof' | 'scout';
export type Staff = { id: string; name: string; role: StaffRole; rating: number; wage: number; contract: number; rep: number };
export const ROLES: { id: StaffRole; label: string; blurb: string }[] = [
  { id: 'assistant', label: 'Assistant manager', blurb: 'Team-talk and opposition advice' },
  { id: 'attack', label: 'Attacking coach', blurb: 'Faster training for forwards and midfielders' },
  { id: 'defence', label: 'Defending coach', blurb: 'Faster training for defenders and midfielders' },
  { id: 'fitness', label: 'Fitness coach', blurb: 'Quicker recovery between games' },
  { id: 'gk', label: 'Goalkeeping coach', blurb: 'Faster training for keepers' },
  { id: 'physio', label: 'Head physio', blurb: 'Fewer and shorter injuries' },
  { id: 'youth', label: 'Head of youth', blurb: 'Better youth intake' },
  { id: 'dof', label: 'Director of football', blurb: 'Cuts agent fees on transfers' },
  { id: 'scout', label: 'Scout', blurb: 'Joins your regional scouting network' },
];
const FIRST = ['Alan', 'Diego', 'Jürgen', 'Paolo', 'Rui', 'Hassan', 'Pep', 'Steve', 'Claude', 'Faisal', 'Marco', 'Thierry', 'Erik', 'Nuno', 'Sami', 'Lars'];
const LAST = ['Cartwright', 'Valdés', 'Kessler', 'Bianchi', 'Faria', 'Al-Harbi', 'Moreau', 'Doyle', 'Lindqvist', 'Rossetti', 'Okafor', 'Brandt', 'Quintero', 'Haddad'];
export const roleLabel = (r: StaffRole) => ROLES.find((x) => x.id === r)!.label;
export const staff = (s: GameState) => s.staff ?? [];
/** Board-set limit: grows with training and medical facilities. Scouts count. */
export const staffLimit = (s: GameState) => { const f = facilities(s); return 3 + f.training + f.medical; };
export const staffCount = (s: GameState) => staff(s).length + (s.scouts ?? []).length;
/** Weekly staff wage budget (£k) from club stature. */
export const staffBudget = (s: GameState) => 20 + Math.round(stature(club(s)) * 0.8);
export const staffWages = (s: GameState) => staff(s).reduce((a, x) => a + x.wage, 0) + (s.scouts ?? []).reduce((a, x) => a + 4 + x.skill * 3, 0);
/** How attractive the job is to staff: your reputation plus the club's pull. */
export const pull = (s: GameState) => Math.round(reputation(s) * 0.7 + stature(club(s)) * 0.3) + 15;
export const compensation = (x: Staff) => x.wage * 8 * x.contract;
export const best = (s: GameState, role: StaffRole) => Math.max(0, ...staff(s).filter((x) => x.role === role).map((x) => x.rating));

function makeStaff(s: GameState, i: number): Staff {
  const role = ROLES[i % ROLES.length]!.id;
  const rating = int(s, 4, 20), rep = Math.min(100, Math.max(0, rating * 5 - 10 + int(s, -8, 8)));
  return { id: `st${s.season}-${s.week}-${i}-${s.seed % 997}`, name: `${pick(s, FIRST)} ${pick(s, LAST)}`, role, rating, wage: 2 + Math.round(rating * rating * 0.12), contract: int(s, 1, 3), rep };
}
export function refreshStaffMarket(s: GameState) {
  const off = int(s, 0, ROLES.length - 1);
  s.staffMarket = Array.from({ length: 12 }, (_, i) => makeStaff(s, i + off));
}
export function canHire(s: GameState, x: Staff): string | null {
  if (staffCount(s) >= staffLimit(s)) return `The board limit is ${staffLimit(s)} staff. Upgrade facilities for more.`;
  if (x.rep > pull(s)) return `${x.name} wants a bigger job (needs pull ${x.rep}, you have ${pull(s)}).`;
  if (staffWages(s) + x.wage > staffBudget(s)) return `Wages break the staff budget (£${staffBudget(s)}k/wk).`;
  if (x.role === 'scout' && (s.scouts ?? []).length >= MAX_SCOUTS) return `You already have ${MAX_SCOUTS} scouts.`;
  if (x.role !== 'scout' && x.role !== 'attack' && x.role !== 'defence' && staff(s).some((y) => y.role === x.role)) return `You already have a ${roleLabel(x.role).toLowerCase()}. Sack them first.`;
  return null;
}
export function hireStaff(s: GameState, id: string): GameState {
  const x = s.staffMarket?.find((y) => y.id === id);
  if (s.match || !x || canHire(s, x)) return s;
  const b = copy(s);
  b.staffMarket = b.staffMarket!.filter((y) => y.id !== id);
  if (x.role === 'scout') b.scouts = [...(b.scouts ?? []), { id: x.id, name: x.name, region: REGIONS[0]!, skill: Math.max(1, Math.min(5, Math.round(x.rating / 4))) }];
  else b.staff = [...staff(b), { ...x }];
  b.headlines = [`🤝 ${x.name} joins as ${roleLabel(x.role).toLowerCase()}.`, ...b.headlines].slice(0, 6);
  return b;
}
export function sackStaff(s: GameState, id: string): GameState {
  const x = staff(s).find((y) => y.id === id);
  if (s.match || !x) return s;
  const b = copy(s);
  b.staff = staff(b).filter((y) => y.id !== id);
  b.budget -= compensation(x);
  b.headlines = [`✂️ ${x.name} leaves; £${compensation(x)}k compensation paid.`, ...b.headlines].slice(0, 6);
  return b;
}
/** Weekly: wages, fitness coach and physio work. Season roll handled by staffSeason. */
export function staffWeek(s: GameState) {
  s.budget -= staff(s).reduce((a, x) => a + x.wage, 0);
  const fit = best(s, 'fitness'), phy = best(s, 'physio');
  for (const p of s.players.filter((x) => x.clubId === s.clubId)) {
    if (fit) p.fitness = Math.min(100, p.fitness + Math.round(fit / 5));
    if (p.injured && phy && next(s) < phy / 40) p.injured = p.injured > 1 ? p.injured - 1 : undefined;
  }
  if (!s.staffMarket || s.week % 4 === 1) refreshStaffMarket(s);
}
export function staffSeason(s: GameState) {
  for (const x of staff(s)) x.contract--;
  const gone = staff(s).filter((x) => x.contract <= 0);
  s.staff = staff(s).filter((x) => x.contract > 0);
  if (gone.length) s.headlines = [`📄 Staff contracts expired: ${gone.map((x) => x.name).join(', ')}.`, ...s.headlines].slice(0, 6);
}
export function renewStaff(s: GameState, id: string): GameState {
  if (s.match || !staff(s).some((x) => x.id === id)) return s;
  const b = copy(s), x = b.staff!.find((y) => y.id === id)!;
  x.contract = Math.min(4, x.contract + 2);
  x.wage = Math.round(x.wage * 1.1) + 1;
  return b;
}
/** Training multiplier for a player from the relevant coaches (1 = no coach). */
export function coachBoost(s: GameState, p: Player) {
  const a = best(s, 'attack'), d = best(s, 'defence'), g = best(s, 'gk');
  const r = p.position === 'GK' ? g : p.position === 'DF' ? d : p.position === 'FW' ? a : (a + d) / 2;
  return 1 + r / 25;
}
export const injuryFactor = (s: GameState) => 1 - best(s, 'physio') / 35;
export const youthBonus = (s: GameState) => best(s, 'youth');
export const dofDiscount = (s: GameState) => 1 - best(s, 'dof') / 50;
/** Assistant's pre-match advice; null without an assistant. */
export function assistantAdvice(s: GameState): { talk: string; opposition: string } | null {
  const a = best(s, 'assistant');
  if (!a) return null;
  const o = opponent(s), us = club(s), gap = us.rating - o.rating;
  const exact = a >= 12;
  const talk = gap >= 5 ? 'We are favourites: keep them calm, warn against complacency.' : gap <= -5 ? 'Underdogs today: encourage them, there is no pressure.' : 'Even contest: a firm, demanding talk should sharpen them.';
  const opp = o.style === 'attacking' ? `${o.short} like to attack${exact ? ' and leave space behind; a counter-attacking setup could hurt them' : ''}.` : o.style === 'cautious' ? `${o.short} sit deep${exact ? '; patient possession and width should break them down' : ''}.` : `${o.short} are balanced${exact ? '; win the midfield battle and press their build-up' : ''}.`;
  return { talk, opposition: `${opp} Strength ${exact ? o.rating : `${o.rating - 3}–${o.rating + 3}`}.` };
}
const ROLE_IDS = ROLES.map((r) => r.id);
const ok = (x: Staff) => x && typeof x.id === 'string' && typeof x.name === 'string' && ROLE_IDS.includes(x.role) && [x.rating, x.wage, x.contract, x.rep].every(Number.isFinite);
export const validStaff = (s: GameState) =>
  (s.staff === undefined || (Array.isArray(s.staff) && s.staff.length <= 20 && s.staff.every(ok))) &&
  (s.staffMarket === undefined || (Array.isArray(s.staffMarket) && s.staffMarket.length <= 20 && s.staffMarket.every(ok)));
