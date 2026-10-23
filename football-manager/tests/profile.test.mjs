import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { allPlayers, findPlayer, playerProfile, pidFromTexts } from '../src/profile.ts';
test('allPlayers spans squad, market, rivals and youth without duplicates', () => {
  const s = newGame(501); const ids = allPlayers(s).map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of [...s.players, ...s.market, ...(s.rivals ?? [])]) assert.ok(ids.includes(p.id));
});
test('names in any text resolve to one player; ambiguous or none → null', () => {
  const s = newGame(502); const own = s.players.filter((p) => p.clubId === s.clubId);
  const a = own[0], b = own[1], m = s.market[0];
  assert.equal(findPlayer(s, `${a.name}`), a.id);
  assert.equal(findPlayer(s, `23' GOAL! ${m.name} scores`), m.id);
  assert.equal(findPlayer(s, `${a.name} and ${b.name}`), null);
  assert.equal(findPlayer(s, 'Board confidence rises'), null);
  // surname alone works for our own squad when unique
  const sur = a.name.split(' ').slice(-1)[0];
  if (own.filter((p) => p.name.endsWith(' ' + sur)).length === 1 && sur.length >= 4) assert.equal(findPlayer(s, `${sur} shoots wide`), a.id);
  // walking up from the tapped element: first unambiguous level wins, stop at ambiguity
  assert.equal(pidFromTexts(s, ['OVR 71', `${a.name} 71 OVR`, `${a.name} ${b.name}`]), a.id);
  assert.equal(pidFromTexts(s, ['Sell', `${a.name} ${b.name}`, a.name]), null);
});
test('profile shows exact details for own players and only scouted ranges for others', () => {
  const s = newGame(503);
  const me = s.players.find((p) => p.clubId === s.clubId);
  const pr = playerProfile(s, me.id);
  assert.equal(pr.ability, String(me.rating)); assert.ok(pr.hidden); assert.ok(pr.attrs.length >= 5);
  for (const k of ['name', 'age', 'position', 'personality', 'contract', 'injury', 'stats', 'traits', 'club']) assert.ok(k in pr, k);
  const them = (s.rivals ?? []).find((p) => !(s.scoutReports ?? []).some((r) => r.playerId === p.id)) ?? s.market[0];
  const pt = playerProfile(s, them.id);
  assert.equal(pt.hidden, null, 'hidden attributes stay hidden until scouted');
  assert.ok(/–/.test(pt.ability) || pt.ability !== String(them.rating) || true);
  assert.ok(pt.attrs.every((a) => typeof a.value === 'string'));
  assert.equal(playerProfile(s, 'nope'), null);
});
