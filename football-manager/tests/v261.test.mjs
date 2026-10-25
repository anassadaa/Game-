import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { setMode } from '../src/managers.ts';
import { wallet } from '../src/wallet.ts';
import { prepareInvestments, investmentTransferBlock } from '../src/investments.ts';
import { offerBlock, wageLimit, wageBill } from '../src/budget.ts';

const setup = () => { const s = setMode(structuredClone(newGame(73)), 'owner'); wallet(s).cash = 100000; return prepareInvestments(s); };

test('main club bid within the real transfer budget is not blocked by a stale owner budget', () => {
  const s = setup(); const b = s.investments.clubs[s.clubId];
  s.budget = 2300; b.transferBudget = 400; // stale investments-side value (the reported bug)
  assert.equal(investmentTransferBlock(s, s.clubId, 1283, 9), null);
  const p = { ...(s.rivals ?? s.players.find(x => x.clubId !== s.clubId)).find?.(x => x.clubId !== s.clubId) ?? s.players.find(x => x.clubId !== s.clubId), wage: 9 };
  const msg = offerBlock(s, p, 1283);
  assert.ok(!msg || !/owner transfer budget/.test(msg), msg);
});

test('main club wage check uses the shown club wage limit, not a stale owner one', () => {
  const s = setup(); const b = s.investments.clubs[s.clubId];
  b.wageLimit = 1; // stale
  s.wageBudget = { limit: wageBill(s) + 26, season: s.season, week: s.week };
  assert.equal(investmentTransferBlock(s, s.clubId, 0, 9), null);
  assert.match(investmentTransferBlock(s, s.clubId, 0, 40), /wage limit/);
  assert.equal(wageLimit(s), wageBill(s) + 26);
});

test('other owned clubs still use their own owner budget', () => {
  const s = setup(); const id = s.clubs.find(c => c.id !== s.clubId).id; const b = s.investments.clubs[id];
  b.transferBudget = 100; b.cash = 100000; b.wageLimit = 100000;
  assert.match(investmentTransferBlock(s, id, 500, 1), /owner transfer budget/);
});

test('owner wage limit for the main club sets the board wage limit used by the check', async () => {
  const { clubDecision } = await import('../src/investments.ts');
  let s = setup(); s = clubDecision(s, s.clubId, 'wages', wageBill(s) + 50);
  assert.equal(wageLimit(s), wageBill(s) + 50);
  assert.equal(investmentTransferBlock(s, s.clubId, 0, 40), null);
  assert.equal(clubDecision(s, s.clubId, 'transfers', 5), s); // main club has no separate owner transfer cap
});

test('investment activity log uses plain sentences, not raw action keys', async () => {
  const { clubDecision, decisionText } = await import('../src/investments.ts');
  assert.equal(decisionText('wages', 120), 'Weekly wage limit set to £120k.');
  let s = setup(); s = clubDecision(s, s.clubId, 'dividend', 'high');
  assert.equal(s.investments.log.at(-1)?.message ?? s.investments.log[0].message, s.investments.log.find(e => /Dividend/.test(e.message)).message);
  assert.ok(!s.investments.log.some(e => /^role|^dividend:/.test(e.message)));
});
