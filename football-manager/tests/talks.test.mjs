import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { toneEffect, recommendTalk } from '../src/dressing.ts';
import { saveTacticSet, useTacticSet, deleteTacticSet } from '../src/tacticsets.ts';
import { decodeSave } from '../src/save.ts';
test('team talk effects depend on personality and the assistant recommends the best tone', () => {
  const s = newGame(91); const p = s.players.find((x) => x.clubId === s.clubId);
  assert.ok(toneEffect({ ...p, personality: 'Temperamental' }, 'demand', 0) < toneEffect({ ...p, personality: 'Professional' }, 'demand', 0));
  assert.ok(toneEffect({ ...p, personality: 'Easy-going' }, 'calm', 0) > toneEffect({ ...p, personality: 'Ambitious' }, 'calm', 0));
  assert.ok(toneEffect(p, 'praise', 2) > toneEffect(p, 'praise', -1));
  const r = recommendTalk(s, 0); assert.ok(['encourage', 'demand', 'calm', 'praise'].includes(r.tone) && r.why);
});
test('save up to three tactics and switch between them mid-match', () => {
  let s = newGame(92);
  s = saveTacticSet(s, 'Plan A'); s = { ...s, tactics: { ...s.tactics, formation: '3-5-2', press: 'high' } }; s = saveTacticSet(s, 'Chase');
  s = saveTacticSet(s, 'C'); assert.equal(saveTacticSet(s, 'D').tacticSets.length, 3);
  s = useTacticSet(s, 0); assert.notEqual(s.tactics.formation === '3-5-2' && s.tactics.press === 'high', true);
  s = useTacticSet(s, 1); assert.equal(s.tactics.formation, '3-5-2');
  assert.ok(decodeSave(JSON.stringify(s)));
  assert.equal(decodeSave(JSON.stringify({ ...s, tacticSets: [{ name: 1 }] })), null);
  assert.equal(deleteTacticSet(s, 2).tacticSets.length, 2);
});
