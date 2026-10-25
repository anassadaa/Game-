import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet } from '../src/wallet.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade } from '../src/investments.ts';

const fixture = newGame(73);
const setup = (mode = 'owner') => { const s = setMode(structuredClone(fixture), mode); wallet(s).cash = 100000; return prepareInvestments(s); };
const buy = (s, id, pct) => executeTrade(s, quoteTrade(s, id, 'buy', pct));
const sell = (s, id, pct) => executeTrade(s, quoteTrade(s, id, 'sell', pct));

test('2.6: buying and immediately selling a distressed club never makes money', () => {
  let s = setup();
  const id = marketClubs(s).find(c => c.id !== s.clubId).id;
  s.investments.clubs[id].cash = 300;
  const start = wallet(s).cash;
  for (let i = 0; i < 10; i++) { s = buy(s, id, 40); s = sell(s, id, 40); }
  assert.ok(wallet(s).cash < start, `wallet grew ${start} -> ${wallet(s).cash}`);
});

import { ownership, clubDecision } from '../src/investments.ts';
test('2.6: cap table always sums to 100% through buys, outside capital and sells', () => {
  let s = setup();
  const id = marketClubs(s).find(c => c.id !== s.clubId && c.available >= 75).id;
  const check = () => { const o = ownership(s, id); assert.equal(o.mine + o.investors + o.owners, 100); assert.ok(o.owners >= 0 && o.investors >= 0); };
  s = buy(s, id, 60); check();
  const liq = marketClubs(s).find(c => c.id === id).liquidity;
  s = clubDecision(s, id, 'outside-capital', Math.min(liq, 2000)); check();
  assert.ok(ownership(s, id).investors > 0);
  s = sell(s, id, 5); check();
  const own = ownership(s, s.clubId); assert.equal(own.mine + own.investors + own.owners, 100);
});
