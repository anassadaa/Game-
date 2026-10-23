import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch } from '../src/game.ts';
import { tacticProfile } from '../src/tactics.ts';
import { decodeSave } from '../src/save.ts';
test('out-of-possession shape changes defence: a 5-3-2 low block defends better than a 4-3-3 press-less shape', () => {
  const s = newGame(5); s.tactics = { ...s.tactics, formation: '4-3-3' };
  const base = tacticProfile(s, 'balanced');
  const block = tacticProfile({ ...s, tactics: { ...s.tactics, oopShape: '5-3-2', oopMode: 'block' } }, 'balanced');
  assert.ok(block.def > base.def + 0.03, `${block.def} vs ${base.def}`); assert.ok(block.att < base.att);
  assert.ok(block.notes.some((n) => /block/i.test(n)));
  const press = tacticProfile({ ...s, tactics: { ...s.tactics, oopMode: 'press' } }, 'balanced');
  assert.ok(press.att > base.att);
});
test('pressing out of possession costs more legs; saves validate the new fields', () => {
  const fit = (mode) => { let s = newGame(8); s.tactics = { ...s.tactics, oopMode: mode }; s = startMatch(s); while (!s.match.complete) s = advanceMatch(s); return s.players.filter((p) => p.clubId === s.clubId && p.starting).reduce((a, p) => a + p.fitness, 0); };
  assert.ok(fit('press') < fit('block'));
  const s = newGame(3); s.tactics.oopShape = '5-3-2'; s.tactics.oopMode = 'block';
  assert.ok(decodeSave(JSON.stringify(s)));
  s.tactics.oopMode = 'nonsense'; assert.equal(decodeSave(JSON.stringify(s)), null);
});
