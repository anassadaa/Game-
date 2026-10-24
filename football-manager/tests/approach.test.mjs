import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, standings } from '../src/game.ts';
import { applyJob, jobChance, canApply, managerSecurity, reputation, stature, APPROACH_LIMIT } from '../src/jobs.ts';
import { decodeSave, encodeSave } from '../src/save.ts';

const midSeason = (seed = 91) => { const s = newGame(seed); s.week = 8; return s; };
const occupied = (s) => s.clubs.filter((c) => c.id !== s.clubId && !(s.vacancies ?? []).some((v) => v.clubId === c.id));
// Fake a table: set points so a club sits at a chosen position in its division.
function place(s, c, where) {
  const div = s.clubs.filter((x) => x.division === c.division);
  div.forEach((x, i) => { x.points = 31 - i; x.wins = 0; x.draws = 0; x.losses = 0; x.gf = 20; x.ga = 10; });
  c.points = where === 'top' ? 99 : 0;
  c.form = where === 'top' ? ['W', 'W', 'W', 'W', 'W'] : ['L', 'L', 'L', 'L', 'L'];
}

test('can approach any club with a manager; occupied jobs carry a penalty', () => {
  const s = midSeason();
  const c = occupied(s)[0];
  assert.equal(canApply(s, c.id), null);
  const f = jobChance(s, c.id).factors;
  assert.ok(f.some((x) => x.label === 'Approaching an occupied job' && x.value < 0));
  assert.ok(f.some((x) => x.label.startsWith('Manager')));
});

test('a struggling club is likelier to swap than an overperforming one', () => {
  const s = midSeason();
  const strong = [...s.clubs].filter((c) => c.id !== s.clubId && c.division === s.clubs.find((x) => x.id === s.clubId).division).sort((a, b) => b.rating - a.rating);
  const a = structuredClone(s), b = structuredClone(s);
  const id = strong[3].id;
  place(a, a.clubs.find((x) => x.id === id), 'bottom');
  place(b, b.clubs.find((x) => x.id === id), 'top');
  assert.ok(managerSecurity(a, id) < managerSecurity(b, id));
  assert.ok(jobChance(a, id).chance > jobChance(b, id).chance + 15);
  assert.ok(jobChance(b, id).chance <= 8, 'overperforming clubs almost never swap');
});

test('vacancies have no occupied penalty and rank above the same club occupied', () => {
  const s = midSeason();
  const c = occupied(s).sort((a, b) => stature(a) - stature(b))[0];
  const before = jobChance(s, c.id).chance;
  s.vacancies = [{ clubId: c.id, season: s.season, week: s.week }];
  assert.ok(jobChance(s, c.id).chance > before);
  assert.ok(!jobChance(s, c.id).factors.some((x) => x.label === 'Approaching an occupied job'));
});

test('cooldowns: once per club per season, limited approaches per 4 weeks, reasons given', () => {
  let s = midSeason(92);
  assert.match(canApply(s, s.clubId), /your club/i);
  const list = occupied(s).filter((c) => jobChance(s, c.id).chance < 50);
  let made = 0;
  for (const c of list) {
    if (made >= APPROACH_LIMIT) break;
    const [n, r] = applyJob(s, c.id);
    if (r.ok) return; // appointed — limit no longer relevant for this seed
    s = n; made++;
    assert.match(canApply(s, c.id), /already/i);
  }
  const nextC = list[APPROACH_LIMIT];
  assert.match(canApply(s, nextC.id), /approaches/i);
  assert.equal(applyJob(s, nextC.id)[1].chance, 0);
  const later = structuredClone(s); later.week += 4;
  assert.equal(canApply(later, nextC.id), null);
  const live = structuredClone(s); live.match = { complete: false };
  assert.match(canApply(live, nextC.id), /match/i);
});

test('success: old manager sacked, he takes over; rejection leaks are modest', () => {
  let won = null, leakSeen = false;
  for (let seed = 100; seed < 160 && (!won || !leakSeen); seed++) {
    const s = midSeason(seed); s.reputation = 90;
    const c = occupied(s).sort((a, b) => stature(a) - stature(b))[0];
    place(s, c, 'bottom');
    const rep0 = reputation(s), trust0 = s.trust;
    const [n, r] = applyJob(s, c.id);
    if (r.ok) { won = { n, c }; continue; }
    assert.ok(reputation(n) >= rep0 - 2 && n.trust >= trust0 - 5, 'leak penalty stays small');
    if (reputation(n) < rep0) leakSeen = true;
  }
  assert.ok(won, 'some approach succeeds');
  assert.equal(won.n.clubId, won.c.id);
  assert.ok(won.n.news.some((x) => x.includes('sack') && x.includes(won.c.short)));
  assert.ok(decodeSave(encodeSave(won.n)));
});

test('approach log survives saves; corrupt one is dropped', () => {
  let s = midSeason(93);
  const c = occupied(s)[5];
  s = applyJob(s, c.id)[0];
  const d = decodeSave(encodeSave(s));
  assert.deepEqual(d.approaches, s.approaches);
  const bad = decodeSave(JSON.stringify({ ...s, approaches: 'x' }));
  assert.ok(bad && bad.approaches === undefined);
});
