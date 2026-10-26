import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek, migrate } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
import { potentialRange } from '../src/scoutrange.ts';

const allPlayers = (s) => [...s.players, ...(s.market ?? []), ...(s.rivals ?? []), ...(s.youth ?? [])];

test('newGame players have potential in [rating,99] and peakAge set', () => {
  for (const seed of [1, 7, 42, 999]) {
    const s = newGame(seed);
    const players = allPlayers(s);
    assert.ok(players.length > 0, 'players exist');
    for (const p of players) {
      assert.ok(p.potential >= p.rating, `${p.id}: potential ${p.potential} < rating ${p.rating}`);
      assert.ok(p.potential <= 99, `${p.id}: potential ${p.potential} > 99`);
      assert.ok(typeof p.peakAge === 'number', `${p.id}: peakAge not set`);
    }
  }
});

test('potentialRange does not read true potential', () => {
  const s = newGame(11);
  const p = (s.market ?? [])[0];
  assert.ok(p, 'market player exists');
  const before = potentialRange(s, p);
  const orig = p.potential;
  p.potential = orig >= 99 ? 98 : Math.min(99, orig + 10);
  const after = potentialRange(s, p);
  p.potential = orig;
  assert.deepEqual(after, before);
});

test('20 simulated weeks keep potential in [rating,99]', () => {
  let s = newGame(5);
  for (let w = 0; w < 20; w++) {
    if (s.pendingOffers?.length || s.sacked) break;
    s = advanceWeek(simToEnd(startMatch(s)));
    for (const p of allPlayers(s)) {
      if (!p) continue;
      assert.ok(p.potential >= p.rating, `week ${w}: ${p.id} potential ${p.potential} < rating ${p.rating}`);
      assert.ok(p.potential <= 99, `week ${w}: ${p.id} potential ${p.potential} > 99`);
    }
  }
});

test('migrate fills peakAge for old players', () => {
  const s = newGame(3);
  const p = s.players[0];
  delete p.peakAge;
  delete p.bloom;
  migrate(s);
  assert.ok(typeof p.peakAge === 'number', 'peakAge filled by migrate');
  assert.ok(p.peakAge >= 15 && p.peakAge <= 40, `peakAge ${p.peakAge} within [15,40]`);
});

test('encodeSave/decodeSave preserves peakAge', () => {
  const s = newGame(13);
  const expected = s.players.map((p) => ({ id: p.id, peakAge: p.peakAge }));
  const decoded = decodeSave(encodeSave(s));
  for (const { id, peakAge } of expected) {
    const p = decoded.players.find((x) => x.id === id);
    assert.ok(p, `player ${id} preserved`);
    assert.equal(p.peakAge, peakAge, `peakAge preserved for ${id}`);
  }
});
