import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, renewContract } from '../src/game.ts';
import { contractRows, earlyRenewYears, wageDemand } from '../src/contracts.ts';
import { SUBTABS } from '../src/subtabs.ts';

test('3.9: Squad has a Contracts page listing every player, soonest expiry first', () => {
  assert.ok(SUBTABS.squad.some((t) => t.id === 'contracts'));
  const s = newGame(5); const rows = contractRows(s);
  assert.equal(rows.length, s.players.filter((p) => p.clubId === s.clubId).length);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].left <= rows[i].left);
  for (const r of rows) assert.ok(r.wage > 0 && r.mv >= 0 && r.ask > 0 && r.name);
});

test('3.9: anyone can be renewed early — always extends, capped at 5 years', () => {
  assert.equal(earlyRenewYears({ age: 22, contract: 1 }), 5);
  assert.equal(earlyRenewYears({ age: 33, contract: 3 }), 4);
  assert.equal(earlyRenewYears({ age: 33, contract: 5 }), 0);
  const s = newGame(5); const p = s.players.find((x) => x.clubId === s.clubId && x.age >= 31) ?? s.players.find((x) => x.clubId === s.clubId);
  p.contract = 3; const y = earlyRenewYears(p); const n = renewContract(s, p.id, y);
  assert.equal(n.players.find((x) => x.id === p.id).contract, y);
});

test('3.9: demand reflects years left — a long deal left means a smaller raise', () => {
  const s = newGame(5); const p = s.players.find((x) => x.clubId === s.clubId);
  p.contract = 0; const hot = wageDemand(s, p, 3).ask; p.contract = 4; const cool = wageDemand(s, p, 3).ask;
  assert.ok(cool < hot, `${cool} < ${hot}`);
});
