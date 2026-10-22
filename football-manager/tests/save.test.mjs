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
