import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { closeLedger, ledger } from '../src/finance.ts';
import { decodeSave, encodeSave } from '../src/save.ts';
test('season rollover: new ledger is labelled with the coming season, so each season closes once', () => {
  const s = newGame(3); ledger(s); closeLedger(s); assert.equal(s.ledger.prev.season, s.season); assert.equal(s.ledger.season, s.season + 1);
  s.season += 1; closeLedger(s); assert.equal(s.ledger.prev.season, s.season);
});
test('old saves with a lagging ledger label are repaired', () => {
  const s = newGame(3); s.season = 4; ledger(s); s.ledger.season = 3;
  assert.equal(decodeSave(encodeSave(s)).ledger.season, 4);
});
