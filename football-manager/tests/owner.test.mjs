import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, ownerVoteWeek } from '../src/game.ts';
import { setMode, MODES, canHire, hireManager, managerCandidates, isManagerMode, voteRisk } from '../src/managers.ts';
import { investorWeek } from '../src/investors.ts';
test('owner mode exists, hires freely, gets investor offers, sims matches', () => {
  assert.ok(MODES.some((m) => m.id === 'owner'));
  const s = setMode(newGame(4), 'owner'); assert.equal(s.mode, 'owner'); assert.equal(isManagerMode(s), false);
  s.trust = 5; assert.equal(canHire(s), true); assert.ok(hireManager(s, managerCandidates(s)[0].id).hiredManager);
  let got = false; for (let seed = 1; seed < 60 && !got; seed++) { const t = setMode(newGame(seed), 'owner'); t.week = 10; investorWeek(t); got = !!t.investor?.offer; } assert.ok(got);
});
test('risk is zero when fans are fine and investors small', () => {
  const s = setMode(newGame(4), 'owner'); s.fans = 60; s.trust = 50; assert.equal(voteRisk(s), 0);
  for (let w = 6; w < 40; w++) { s.week = w; ownerVoteWeek(s); } assert.equal(s.sacked, false);
});
test('collapsed fans + big investor stake can force him out (hash-based, sometimes)', () => {
  let out = 0, survived = 0;
  for (let seed = 1; seed < 60; seed++) {
    const s = setMode(newGame(seed), 'owner'); s.fans = 10; s.trust = 10; s.investor = { stakes: 45, raised: 1000 };
    assert.ok(voteRisk(s) > 0); s.week = 8; ownerVoteWeek(s); s.sacked ? out++ : survived++;
  }
  assert.ok(out > 0 && survived > 0, `${out}/${survived}`);
});
test('board collapse alone does not sack the owner', async () => {
  const g = await import('../src/game.ts');
  let s = setMode(newGame(4), 'owner'); s.week = 8;
  for (let i = 0; i < 3; i++) { s.trust = 1; s.fans = 60; s = g.startMatch(s); while (!s.match.complete) s = g.advanceMatch(s); s = g.advanceWeek(s); }
  assert.equal(s.sacked, false);
});
