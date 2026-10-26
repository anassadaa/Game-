# Touchline 3.3 — fair sales and protected players

| # | Change | Commit |
|---|--------|--------|
| 1 | Board-forced sales (`boardRescue`) and the hired manager's sales never sell at a loss. The fee is at least `max(p.price, boughtAt.paid)`; the old fee was 68% of value. A buyer is found by hash; interest drops quickly above his value and for players aged 33+. If nobody pays that fee, he goes on loan until season end and the other club pays his wages. | f603cc4 |
| 2 | The fee and buyer go into the manager's decision log and the headline, e.g. "Board-forced sale: Noah Rowe sold for £1.2m to …". | 2594c1a |
| 3 | A forced or manager sale above your approval line becomes a request (`mgr.asks`, kind `sell`) with three choices: **Approve**, **Block** (he is kept for the rest of the season) or **Pick another player** (block him and move on to the next candidate). The board waits while a request is open. | ff5b96b |
| 4 | A 🛡️ Protected badge (`isProtected`) shows on protected players in the Squad list and in the player profile. | 25eab91, 668e9e4 |
| 5 | Simulation test: a club kept at −£3m or worse for a whole season (chairman, owner and director modes) never sells anyone below value and never sells or loans out a protected player. | 69a261f |

Screenshots: `docs/screenshots/v33-squad-badge-*.png`, `v33-profile-badge-*.png` and `v33-approval-*.png` (393×873, 360×800, landscape).
