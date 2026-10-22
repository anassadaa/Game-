import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek } from '../src/game.ts';
import { simToEnd, highlightPath, highlights, avgRating } from '../src/highlights.ts';
import { encodeSave, decodeSave } from '../src/save.ts';

test('sim to result completes the match and records ratings + MOTM', () => {
  let s = simToEnd(startMatch(newGame(11)));
  assert.equal(s.match.complete, true);
  assert.equal(s.match.minute, 90);
  assert.ok(s.match.motm);
  const xi = s.players.filter((p) => p.starting);
  assert.ok(xi.every((p) => p.apps === 1 && avgRating(p) >= 4));
  assert.equal(s.players.filter((p) => p.motm === 1).length, 1);
  for (const [i, e] of highlights(s).entries()) {
    const pts = highlightPath(e, i);
    assert.ok(pts.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
  }
  s = advanceWeek(s);
  const back = decodeSave(encodeSave(s));
  assert.ok(back);
  assert.equal(back.players[0].apps, s.players[0].apps);
});
