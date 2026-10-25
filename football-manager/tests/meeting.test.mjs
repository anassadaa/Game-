import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { meetingOpen, requestMeeting, MEETING_ASKS, validMeeting } from '../src/meeting.ts';
import { wageLimit } from '../src/budget.ts';
test('meeting window is weeks 4-14, once a season', () => {
  const s = newGame(11); s.week = 2; assert.equal(meetingOpen(s), false);
  s.week = 6; assert.equal(meetingOpen(s), true);
  const b = requestMeeting(s, 'cash'); assert.equal(meetingOpen(b), false); assert.equal(requestMeeting(b, 'wages'), b);
  assert.equal(MEETING_ASKS.length, 3);
});
test('high trust: cash granted; low trust: refused and trust drops', () => {
  const s = newGame(11); s.week = 6; s.trust = 80; const c = s.budget;
  const a = requestMeeting(s, 'cash'); assert.ok(a.budget > c); assert.equal(a.meeting.ok, true);
  const t = newGame(11); t.week = 6; t.trust = 20; const r = requestMeeting(t, 'cash');
  assert.equal(r.budget, t.budget); assert.ok(r.trust < 20); assert.equal(r.meeting.ok, false);
});
test('wage raise sticks for the season; easing target lowers expectation', () => {
  const s = newGame(11); s.week = 6; s.trust = 80; const w = wageLimit(s);
  const a = requestMeeting(s, 'wages'); assert.ok(wageLimit(a) > w);
  const e = newGame(11); e.week = 6; e.trust = 50; const tg = e.board.target;
  const b = requestMeeting(e, 'target'); assert.equal(b.board.target, tg + 1); assert.ok(b.trust < 50);
});
test('validation', () => { assert.ok(validMeeting({})); assert.equal(validMeeting({ meeting: 1 }), false); });
