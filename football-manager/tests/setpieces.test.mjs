import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, attributes } from '../src/game.ts';
import { cornerConv, setPieceProfile } from '../src/setpieces.ts';
import { tacticProfile } from '../src/tactics.ts';
import { decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId && p.starting && p.position !== 'GK');
test('corner routine matters: far post rewards one great header, short corners rely on the taker', () => {
  const s = newGame(31), t = own(s)[0], pass = attributes(t).passing;
  const with_ = (sp) => ({ ...s, tactics: { ...s.tactics, sp } });
  const far = cornerConv(with_({ corner: 'far' }), t, pass), near = cornerConv(with_({ corner: 'near' }), t, pass), short = cornerConv(with_({ corner: 'short' }), t, pass);
  assert.ok(far > 0 && near > 0 && short > 0); assert.notEqual(far, short); assert.ok(far >= near, 'best single header ≥ top-3 average');
});
test('staying up trades defence for counter threat; marking is a choice; saves validate', () => {
  const s = newGame(32), w = (sp) => ({ ...s, tactics: { ...s.tactics, sp } });
  const a = setPieceProfile(w({ stayUp: 0 })), b = setPieceProfile(w({ stayUp: 2 }));
  assert.ok(b.att > a.att && b.def < a.def);
  assert.notEqual(setPieceProfile(w({ marking: 'zonal' })).def, setPieceProfile(w({ marking: 'man' })).def);
  assert.ok(tacticProfile(w({ stayUp: 2 }), 'balanced').att > tacticProfile(w({ stayUp: 0 }), 'balanced').att);
  s.tactics.sp = { corner: 'near', marking: 'man', stayUp: 2 }; assert.ok(decodeSave(JSON.stringify(s)));
  s.tactics.sp = { corner: 'sideways' }; assert.equal(decodeSave(JSON.stringify(s)), null);
});
