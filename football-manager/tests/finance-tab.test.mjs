import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { setMode, managerCandidates, hireManager, fireManager, compensation } from '../src/managers.ts';
import { SUBTABS } from '../src/subtabs.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
test('Finance tab data: manager wages and compensation are tracked this season and survive save/load', () => {
  let s = setMode(newGame(9), 'owner'); s = hireManager(s, managerCandidates(s).find(m => m.rating >= 3).id, 2);
  const wage = s.hiredManager.wage;
  for (let i = 0; i < 2; i++) s = advanceWeek(simToEnd(startMatch(s)));
  assert.equal(s.mgrBook.wages, wage * 2);
  const pay = compensation(s, s.hiredManager); s = fireManager(s);
  assert.equal(s.mgrBook.comp, pay);
  s = decodeSave(encodeSave(s)); assert.equal(s.mgrBook.comp, pay);
});
test('the duplicate Transfers → Money subtab is gone (it lives in the Finance tab)', () => {
  assert.ok(!SUBTABS.transfers.some((t) => t.id === 'money'));
});
