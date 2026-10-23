import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceMatch, advanceWeek } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { autoPick, layout } from '../src/lineup.ts';
import { makeSub, subsBench } from '../src/subs.ts';
import { INJURIES, injuryRisk, injure, recoveryWeeks, rushBack, injuryWeek, injuryProne, matchInjury, injuryNews } from '../src/injuries.ts';
import { sharpness } from '../src/training.ts';
import { encodeSave, decodeSave } from '../src/save.ts';
const own = (s) => s.players.filter((p) => p.clubId === s.clubId);
const game = (seed = 21) => autoPick(newGame(seed, 'arsenal', 60));

test('injury table has named types with FM-style ranges', () => {
  const t = Object.fromEntries(INJURIES.map((i) => [i.id, i]));
  assert.deepEqual([t.knock.min, t.knock.max], [0, 1]);
  assert.deepEqual([t.hamstring.min, t.hamstring.max], [2, 4]);
  assert.deepEqual([t.ankle.min, t.ankle.max], [3, 6]);
  assert.ok(t.groin);
  assert.deepEqual([t.broken.min, t.broken.max], [6, 12]);
  assert.deepEqual([t.acl.min, t.acl.max], [26, 40]);
});
test('risk rises with low fitness, age, poor natural fitness, heavy schedule, tackling, proneness and rushing', () => {
  const s = game(), p = { ...own(s)[3], age: 25, fitness: 90, attrs: undefined };
  const base = injuryRisk(s, p);
  assert.ok(injuryRisk(s, { ...p, fitness: 40 }) > base);
  assert.ok(injuryRisk(s, { ...p, age: 34 }) > base);
  assert.ok(injuryRisk(s, p, { heavy: true }) > base);
  assert.ok(injuryRisk(s, p, { tackle: 'high' }) > injuryRisk(s, p, { tackle: 'low' }));
  assert.ok(injuryRisk(s, { ...p, injuries: 4 }) > base);
  assert.ok(injuryRisk(s, { ...p, rushed: 4 }) > base);
  const sl = injuryRisk(s, { ...p, attrs: { ...(p.attrs ?? {}), stamina: -25 } }), st = injuryRisk(s, { ...p, attrs: { ...(p.attrs ?? {}), stamina: 5 } });
  assert.ok(sl > st);
});
test('injure sets a typed injury in range, counts it, and posts news', () => {
  const s = game(), p = own(s)[4];
  injure(s, p, 'ankle');
  assert.equal(p.injury.type, 'ankle');
  assert.ok(p.injured >= 1 && p.injured <= 6);
  assert.equal(p.injuries, 1);
  assert.ok(injuryNews(s).some((n) => n.text.includes(p.name) && /ankle/i.test(n.text)));
});
test('physio and medical centre shorten recovery', () => {
  const s = game();
  const plain = recoveryWeeks(s, 20);
  s.facilities = { training: 1, medical: 5, stadium: 1 };
  assert.ok(recoveryWeeks(s, 20) < plain);
});
test('rush back only past halfway; raises re-injury risk and leaves low sharpness', () => {
  const s = game(), p = own(s)[5];
  injure(s, p, 'broken');
  p.injured = p.injury.total; 
  const [same] = rushBack(s, p.id); assert.equal(same, s);
  p.injured = Math.max(1, Math.floor(p.injury.total / 2));
  const [b] = rushBack(s, p.id), q = own(b).find((x) => x.id === p.id);
  assert.ok(!q.injured); assert.ok(q.rushed > 0); assert.ok(sharpness(q) <= 45);
});
test('returning players have low sharpness and news; 3+ injuries makes a player injury prone', () => {
  const s = game(), p = own(s)[6];
  injure(s, p, 'knock'); p.injured = 1; p.sharp = 90;
  injuryWeek(s);
  assert.ok(!p.injured); assert.ok(sharpness(p) <= 45);
  assert.ok(injuryNews(s).some((n) => /back/i.test(n.text) && n.text.includes(p.name)));
  injure(s, p, 'knock'); injure(s, p, 'knock');
  assert.ok(injuryProne(p));
});
test('in-match injury: player goes down in the feed; with no subs left the team plays on with 10', () => {
  let s = advanceMatch(startMatch(game(22)));
  const victim = layout(s)[4];
  s.match.subs = Array.from({ length: 5 }, (_, i) => ({ off: 'x' + i, on: 'y' + i, minute: 15 }));
  matchInjury(s, own(s).find((p) => p.id === victim.id));
  assert.ok(s.match.timeline.some((e) => /🚑/.test(e.text) && e.text.includes(victim.name)));
  s = advanceMatch(s);
  assert.equal(own(s).filter((p) => p.starting).length, 10);
});
test('simulate auto-subs an injured player even without the auto-subs setting', () => {
  let s = advanceMatch(startMatch(game(23)));
  const victim = layout(s)[6];
  matchInjury(s, own(s).find((p) => p.id === victim.id));
  const f = simToEnd(s);
  assert.ok(f.match.subs.some((x) => x.off === victim.id));
});
test('old saves: injured number converts to a typed injury', () => {
  const s = game(); const raw = JSON.parse(encodeSave(s));
  const pl = raw.players.find((p) => p.clubId === s.clubId && !p.starting); pl.injured = 3; delete pl.injury;
  const d = decodeSave(JSON.stringify(raw));
  const q = d.players.find((p) => p.id === pl.id);
  assert.equal(q.injured, 3); assert.ok(q.injury && q.injury.type && q.injury.total >= 3);
});
test('a season of weeks keeps saves valid with injuries happening', () => {
  let s = game(24), seen = 0;
  for (let w = 0; w < 10 && !s.sacked; w++) { s = advanceWeek(simToEnd(startMatch(s))); seen += own(s).filter((p) => p.injury).length; }
  assert.ok(decodeSave(encodeSave(s)));
});
