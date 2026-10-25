# Adversarial review — Touchline 2.8

Checked against `main` at 2.7 (versionCode 18) plus the 3D match added in this release.
The owner granted one exception to the “no 3D matches” rule: the floodlit match viewer is in.

## Already closed in 2.6 and 2.7 (not reopened)

These were reproduced and fixed before 2.8, with regression tests still in `tests/`:

- Share buy/sell round trip cannot print money (distress discount on both sides).
- Ownership cap table is forced to 100% (you / outside investors / original owners).
- Main-club transfers spend the club’s transfer budget and the board wage limit, not a stale owner budget.
- Investments screen shows that same budget and wage limit, and editing it updates the board limit.
- Dividend copy explains why nothing was paid, and the sell control shows the max stake available today.
- 51%+ stake can appoint yourself; 30–50% is a big application boost; under 30% is a small boost.
- A director can hold boardroom roles at other clubs they control.
- New careers start with wage headroom. Approving a deal re-prices the player at approval time.
- AI club TV money and wage caps follow each league’s economy.

## Checked this pass

- `Math.random` in game logic: none. The only leftover uses were grass speckle and crowd noise in the new viewer; both now use the same hash step the rest of the game uses.
- `npm test` and `npx tsc --noEmit` were run on this tree before the version bump (see `docs/releases/2.8.md`).
- Old saves: no new save fields. The 3D view only reads the match that is already stored.

## Left unfixed, and why

- Full scripted 2-season playthrough in all four modes, with a save/reload every week, was not repeated in this pass. The existing season and save tests still cover rollover, promotions, cups and malformed imports. A fresh four-mode marathon is the next check, not a known break.
- Phone screenshots at 393×873, 360×800 and landscape were not captured into `docs/screenshots/2.8/` from a device. The new camera buttons are 44px. Layout of the existing office screens was not redesigned again; 2.6 and 2.7 already did the tap targets, charts and compact rows.
- No new dressing-room or deadline-day system. Those ideas are already partly covered by shouts, derbies, inbox stories and celebrations. Adding another system in the same release as the 3D viewer would have been a second, untested game.

## Critical

None found that the 2.6/2.7 tests do not already lock.

## Important

None new.

## Minor

- The 3D viewer is a broadcast of the existing chances and goals. It does not add offside, set-piece physics or a second simulation. If the text says goal, the ball is sent into the net. Open play between highlights is a seeded keep-ball, not a second match engine.
