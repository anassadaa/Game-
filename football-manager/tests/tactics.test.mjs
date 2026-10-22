import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTactics, setPlayerTactic, applyScoutSuggestion, opponent, startMatch, advanceMatch } from '../src/game.ts';
import { tacticProfile, scoutReport, FORMATIONS } from '../src/tactics.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('deeper tactics change the engine profile and survive saving', () => {
  let s = newGame(7);
  assert.equal(FORMATIONS.length, 7);
  const opp = opponent(s);
  const base = tacticProfile(s, opp.style);
  s = setTactics(s, { formation: '5-3-2', line: 'deep', width: 'narrow' });
  assert.ok(tacticProfile(s, opp.style).def > base.def);
  assert.equal(setTactics(s, { width: 'huge' }), s);
  const p = s.players.find((x) => x.starting && x.position === 'MF');
  s = setPlayerTactic(s, p.id, { role: 'playmaker', instr: 'roam', taker: 'pens' });
  assert.equal(s.tactics.roles[p.id], 'playmaker');
  assert.equal(s.tactics.pens, p.id);
  assert.equal(setPlayerTactic(s, p.id, { role: 'poacher' }), s);
  assert.ok(scoutReport(s, opp).tips.length >= 3);
  s = applyScoutSuggestion(s);
  s = startMatch(s);
  for (let i = 0; i < 6; i++) s = advanceMatch(s);
  assert.ok(s.match.complete);
  const back = decodeSave(encodeSave(s));
  assert.ok(back);
  assert.deepEqual(back.tactics, s.tactics);
});
