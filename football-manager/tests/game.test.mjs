import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  setTactics,
  toggleStarter,
  chooseEvent,
  signPlayer,
  sellPlayer,
  upgradeFacility,
  startMatch,
  advanceMatch,
  advanceWeek,
  standings,
} from '../src/game.ts';

test('new careers are seeded and have a playable two-division world', () => {
  const a = newGame(421, 'harbour');
  assert.deepEqual(a, newGame(421, 'harbour'));
  assert.equal(a.clubs.length, 20);
  assert.equal(
    a.players.filter((p) => p.clubId === a.clubId && p.starting).length,
    11,
  );
  assert.equal(standings(a).filter((c) => c.division === 2).length, 10);
  assert.ok(a.inbox);
});

test('tactical and selection changes are legal and visible', () => {
  const a = newGame(4);
  const b = setTactics(a, {
    mentality: 'attacking',
    press: 'high',
    tempo: 'quick',
    formation: '4-4-2',
  });
  assert.equal(b.tactics.mentality, 'attacking');
  assert.equal(a.tactics.mentality, 'balanced');
  const benched = b.players.find((p) => p.clubId === b.clubId && !p.starting);
  const c = toggleStarter(b, benched.id);
  assert.equal(
    c.players.filter((p) => p.clubId === c.clubId && p.starting).length,
    11,
  );
  assert.equal(toggleStarter(c, 'missing'), c);
});

test('event choices resolve once, while invalid spending cannot change the club', () => {
  const a = newGame(8);
  const b = chooseEvent(a, 0);
  assert.equal(b.inbox?.resolved, true);
  assert.equal(chooseEvent(b, 1), b);
  assert.equal(signPlayer(a, 'missing'), a);
  assert.equal(upgradeFacility(a, 'academy', 999999), a);
  const expensive = { ...a, budget: 0 };
  assert.equal(signPlayer(expensive, expensive.market[0].id), expensive);
});

test('a match advances in steps, responds to tactics and records a result', () => {
  const a = newGame(99);
  const begun = startMatch(a);
  assert.equal(begun.match.minute, 0);
  assert.equal(startMatch(begun), begun);
  let b = begun;
  for (let i = 0; i < 6; i++) b = advanceMatch(b);
  assert.equal(b.match.minute, 90);
  assert.equal(b.match.complete, true);
  assert.ok(b.match.timeline.length > 1);
  assert.equal(advanceMatch(b), b);
  const c = advanceWeek(b);
  assert.equal(c.week, 1);
  assert.equal(standings(c).find((x) => x.id === c.clubId).played, 1);
  assert.equal(advanceWeek(a), a);
  assert.deepEqual(
    c,
    advanceWeek(
      Array.from({ length: 6 }, (_, i) => i).reduce(
        (s) => advanceMatch(s),
        startMatch(newGame(99)),
      ),
    ),
  );
});

test('transfers and facilities have real budget, squad and development consequences', () => {
  const a = newGame(203);
  const candidate = a.market[0];
  const signed = signPlayer(a, candidate.id);
  assert.equal(signed.budget, a.budget - candidate.price);
  assert.ok(
    signed.players.some(
      (p) => p.id === candidate.id && p.clubId === signed.clubId,
    ),
  );
  assert.ok(!signed.market.some((p) => p.id === candidate.id));
  const reserve = signed.players.find(
    (p) => p.clubId === signed.clubId && !p.starting,
  );
  const sold = sellPlayer(signed, reserve.id);
  assert.ok(sold.budget > signed.budget);
  assert.ok(!sold.players.some((p) => p.id === reserve.id));
  const upgraded = upgradeFacility(sold, 'academy');
  assert.equal(upgraded.academy, sold.academy + 1);
});

test('seasons renew opponents and youth while keeping career progress', () => {
  let state = newGame(888);
  for (let i = 0; i < 18; i++) {
    state = startMatch(state);
    for (let j = 0; j < 6; j++) state = advanceMatch(state);
    state = advanceWeek(state);
  }
  assert.equal(state.season, 2);
  assert.equal(state.week, 0);
  assert.ok(state.history.length >= 1);
  assert.ok(state.players.some((p) => p.academyGraduate));
  assert.equal(standings(state).find((c) => c.id === state.clubId).played, 0);
  assert.ok(Number.isFinite(state.budget));
});

test('a twenty-season career retains a legal squad and exportable save size', () => {
  let state = newGame(1001);
  for (let season = 0; season < 20; season++)
    for (let week = 0; week < 18; week++) {
      state = startMatch(state);
      for (let phase = 0; phase < 6; phase++) state = advanceMatch(state);
      state = advanceWeek(state);
    }
  assert.equal(state.season, 21);
  assert.ok(state.players.length <= 25);
  assert.equal(state.players.filter((p) => p.starting).length, 11);
  assert.ok(JSON.stringify(state).length < 2_000_000);
});

test('high pressing and quick tempo consume more energy during a match', () => {
  const base = newGame(77);
  const intense = advanceMatch(
    startMatch(setTactics(base, { press: 'high', tempo: 'quick' })),
  );
  const patient = advanceMatch(
    startMatch(setTactics(base, { press: 'low', tempo: 'patient' })),
  );
  assert.ok(
    intense.players.find((p) => p.starting).fitness <
      patient.players.find((p) => p.starting).fitness,
  );
});

test('retirement vacancies retain exactly one starting goalkeeper', () => {
  let state = newGame(1);
  for (let week = 0; week < 18 * 20; week++) {
    state = startMatch(state);
    for (let phase = 0; phase < 6; phase++) state = advanceMatch(state);
    state = advanceWeek(state);
    assert.equal(
      state.players.filter((p) => p.starting && p.position === 'GK').length,
      1,
    );
  }
  assert.equal(
    state.players.filter((p) => p.starting && p.position === 'GK').length,
    1,
  );
  assert.ok(state.players.length >= 14);
});

test('selling to the squad minimum remains safe across retirement-heavy seasons', () => {
  let state = newGame(10);
  for (let week = 0; week < 18 * 18; week++) {
    for (const p of [...state.players])
      if (!p.starting) state = sellPlayer(state, p.id);
    state = startMatch(state);
    for (let phase = 0; phase < 6; phase++) state = advanceMatch(state);
    state = advanceWeek(state);
    assert.ok(state.players.length >= 14);
  }
});

test('a same-position reserve replaces an injured starter before a healthy one', () => {
  const state = newGame(1);
  const injured = state.players
    .filter((p) => p.starting && p.position === 'DF')
    .sort((a, b) => b.rating - a.rating)[0];
  injured.injured = 2;
  const reserve = state.players.find((p) => !p.starting && p.position === 'DF');
  const after = toggleStarter(state, reserve.id);
  assert.equal(after.players.find((p) => p.id === injured.id).starting, false);
  assert.equal(after.players.filter((p) => p.starting).length, 11);
});
