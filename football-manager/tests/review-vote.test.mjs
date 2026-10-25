import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, ownerVoteWeek } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet, myStake, sharePrice } from '../src/wallet.ts';
test('a forced shareholder vote buys you out at a fair price instead of taking the club for nothing', () => {
  let hit = 0;
  for (let seed = 1; seed < 80 && !hit; seed++) {
    const s = structuredClone(setMode(newGame(seed), 'owner')); s.fans = 5; s.trust = 10; s.investor = { stakes: 45, raised: 0 };
    for (const w of [8, 12, 16]) { s.week = w; const stake = myStake(s), price = sharePrice(s), cash = wallet(s).cash; ownerVoteWeek(s);
      if (s.sacked) { hit++; const paid = wallet(s).cash - cash; assert.ok(paid >= Math.round(stake * price * 0.9) - 1, `paid ${paid}`); assert.equal(myStake(s), 0); assert.match(s.headlines.join(' '), /£\d+k/); break; } }
  }
  assert.ok(hit);
});
