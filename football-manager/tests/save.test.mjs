import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch } from '../src/game.ts';
import { decodeSave, encodeSave } from '../src/save.ts';

test('saved career round-trips including match progress', () => {
  const state = advanceMatch(startMatch(newGame(25)));
  assert.deepEqual(decodeSave(encodeSave(state)), state);
});

test('corrupt or forged careers are rejected', () => {
  const state = newGame(25);
  assert.equal(decodeSave('{bad'), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, version: 999 })), null);
  assert.equal(
    decodeSave(JSON.stringify({ ...state, budget: Infinity })),
    null,
  );
  assert.equal(decodeSave(JSON.stringify({ ...state, players: [] })), null);
});

test('malformed nested data cannot break the management views', () => {
  const state = newGame(20);
  assert.equal(decodeSave(JSON.stringify({ ...state, market: [null] })), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, history: [null] })), null);
  assert.equal(
    decodeSave(
      JSON.stringify({
        ...state,
        clubs: state.clubs.map((c, i) => (i ? c : { ...c, form: null })),
      }),
    ),
    null,
  );
});

test('an unknown story cannot replace a playable career', () => {
  const state = newGame(20);
  assert.equal(
    decodeSave(
      JSON.stringify({ ...state, inbox: { ...state.inbox, id: 'unknown' } }),
    ),
    null,
  );
});

test('imports reject invalid render values and a selected transfer candidate', () => {
  const state = newGame(20);
  for (const bad of [
    { ...state, inbox: { ...state.inbox, resolved: true, outcome: {} } },
    { ...state, careerGames: {} },
    { ...state, careerWins: {} },
    {
      ...state,
      market: state.market.map((p, i) => (i ? p : { ...p, starting: true })),
    },
    { ...state, market: [{ ...state.market[0], id: state.players[0].id }] },
  ])
    assert.equal(decodeSave(JSON.stringify(bad)) === null, true);
});

test('all standings fields must be numeric before importing a career', () => {
  for (const key of ['wins', 'draws', 'losses']) {
    const state = newGame(10);
    state.clubs[10][key] = {};
    assert.equal(decodeSave(JSON.stringify(state)) === null, true);
  }
});
