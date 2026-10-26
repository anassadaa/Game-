# Touchline 3.2 — adversarial review

The devil's-advocate review before 3.2 found the problems below. Each was fixed test-first and pushed in its own commit (rows 3 and 4 share one). 3.2 also adds a new feature: squad view from the league table.

## Findings and fixes
| # | Area | Finding | Fix | Commit |
|---|------|---------|-----|--------|
| 1 | Hired manager / contracts | The manager could let wonderkids and young high-potential players run down their contracts or leave. | `isProtected()` (wonderkid, or under 23 with potential ≥ 65 and at least 10 above rating). These players are always renewed, and if the renewal is over the wage budget the manager asks you (Approve/Refuse in the manager's office). | 65f836a |
| 2 | Sales | The manager's sales and board-forced rescue sales could sell protected prospects. | Protected players are excluded from both. | a496301 |
| 3 | Boardroom deals | Clubs you own bought and sold players every 4 weeks, even outside transfer windows. | Deals only happen in a window (weeks 2 and 10) and only with ≥ £500k in the bank. | c450f6f |
| 4 | Boardroom requests | Star sales could go through without you, and requests stayed open after the window shut. | Star sales always need your approval. Requests lapse, with a log entry, when the window closes, and an approval outside the window does nothing. | c450f6f |
| 5 | Owner pay | Owner/chairman pay and bonuses kept being paid while the club was in the red. | Pay is deferred while the club is in the red (`owed`). Back pay starts once it recovers: at most half the bank per week, and never in the same week as a deferral. | 11c3afa |
| 6 | Red check | "In the red" ignored staff, manager, upkeep and owner pay, so a club could go broke without the board noticing. | `weeklyCosts`/`weeksUntilBroke`: a runway under 4 weeks counts as in the red. Outside a window, an overdrawn club loans out its top earner who isn't a starter or protected. | f09558f |
| 7 | Finance UX | You couldn't see how long the money would last, and there was no quick way to fix it. | The Finance tab shows the weeks-until-broke runway and a one-tap rescue loan from your wallet. | 2133c16 |
| 8 | Overdraft | Overdraft interest was about 1% a week (more than 50% a year). | About 8% a year, plus an overdrawn warning log entry and headline. | a2ddec6 |
| 9 | Board | A failed no-confidence motion reset trust to 35, which could even raise it. | Trust is left unchanged, with a 6-week cooldown before another motion. | 6255884 |
| 10 | Ledger | Sales and staff/scout wages were booked in the wrong ledger lines. | Sales are booked as `sales`, and staff and scouts as `wages`. | e122907 |
| 11 | Finance tab | The manager's "budget left" used its own maths and could show money while in the red. | Uses `budgetLeft()` and shows £0 (frozen) in the red. | 7a45d81 |
| 12 | Manager exit | The exit penalty was capped and too cheap, and fired even for very short tenures. | All remaining wages plus a premium scaled by rating and overperformance, paid to your club. Nothing is due inside 9 weeks (about 6 months). | a16fff5 |
| 13 | Director mode | You weren't warned when the hired manager's results put your own job at risk. | A headline and note every 3 weeks while trust is under 30, plus a banner in the manager's office. | 7920407 |

## New feature: club squads
Tap any club in the league table (Club → Fixtures) to see its squad, sorted by position and rating. Tap a player for wage, contract and potential, then use **Make transfer offer**, which opens the normal negotiation. Outside a transfer window (weeks 1–3 and 9–10) the button is disabled and shows why. Embargo, a full squad and your own players are blocked the same way. — 9f23c7a

Screenshots (393×873, 360×800, landscape) are in `docs/screenshots/v32-*.png`: squad, offer, squad-closed, finance and approval.
