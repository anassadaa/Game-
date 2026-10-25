# Touchline 3.1 — adversarial review

Devil's-advocate pass over the whole game before 3.1. Each finding is fixed test-first in its own commit.

## Reported bugs (fixed first)
1. **Hired manager vanished.** Season-end board review and the mid-season low-trust check called `sack()`, which in owner/chairman mode silently dismissed the hired manager. Early exits also fired far too often (up to 35% every 4 weeks, even in season 1). → He now stays unless a headlined/logged event removes him; exits are rare, never in season 1, and pay a real release fee booked as income. Old saves get a caretaker notice.
2. **Negative budget / overspend.** Auto wage budget could exceed the wage limit and the transfer budget ignored committed wages. → Budgets from real cash and income, wage plan capped at the limit, board freeze + forced sales in the red, display clamped ("Overspent £X").
3. **£14m staff churn.** A 5★ manager sacked "weak" staff every week, paying full-contract compensation each time (booked as upkeep). → At most one change per window, only for a clearly better candidate, never when the payoff is >10% of the bank or the bank is negative; logged.

## Findings from the review
| # | Area | Finding | Fix |
|---|------|---------|-----|
| R1 | Season rollover / dividends | The new season's ledger was labelled with the *old* season, so season 2 closed as "season 1" again: Finance showed the wrong season and boardroom dividends (`lastDividend >= prev.season`) were skipped every other season. | New ledger is labelled `season + 1`; old saves relabelled on load. |
| R2 | Hired manager / staff | After 3.1 limited staff changes to one per window, refilling vacancies counted as that change (and needed rating ≥ bar−3), so expired staff left roles empty for seasons (audit runs ended with 0 staff). | Filling a vacancy is not churn: one fill per week while not in the red, rating floor relaxed; only payoff sacks are limited. |
| R3 | Ownership / investors vote | When a shareholder vote forced an owner to "sell the club", you received nothing and kept the shares on paper (they followed you to the next job). | Forced sale buys your stake out at the market bid (90% of share price); the amount is in the headline and your stake drops to 0. |
| R4 | Hired manager budget | The auto transfer budget only subtracted a wage shortfall based on last season's income (which includes TV/prize money paid at season end), and the +% modifier could lift it above the free cash. A +100% manager spent £806k of £1,089k in week 1 and the club was £1.3m overdrawn by week 17. | Budget now subtracts the real weekly burn (recent weekly cash flow) to season end, and the modifier can never exceed free cash. |
| R5 | Transfers (money printing) | Free agents cost no fee, but could be benched and instantly sold for 68% of value (6 signings flipped = +£800k), and season-loan players could be sold too (pay 15%, receive 68%). | A quick sale within a season of signing returns at most what we paid; loanees can't be sold; the Sell button shows the real fee. |
| R6 | Hired manager budget | The automatic player-wage budget ignored the manager's own salary and the staff wages, which come out of the same income. A 4★ manager at a small club (35% of weekly income) left a structural deficit: the bank fell to −£3.4m over three seasons at the default budget. | The wage budget now leaves room for the manager and staff salaries, so renewals and signings stop once the bill no longer fits. (In the same scenario the low point improves to about −£2.8m; the rest comes from choosing a manager the club can't afford.) |
| R7 | Manager contracts (money printing) | The early-exit release fee was "remaining wages × 1.5, at least a year's wages", so a manager who quit or was poached paid the club up to £2.6m (more than the whole bank at a small club). Hiring an expensive manager and letting trust drop was a cash machine. | Fee is about a quarter of his remaining wages (more for top-rated or overperforming managers), at least 8 weeks' wages, and never more than 26 weeks' wages or what he was still owed. |

## Checked, no change needed
- Share market (boardroom): buy → inject equity → sell round trips lose money (buy/sell spread, 1% fee, block liquidity limits); a club loan repaid right away is cash-neutral.
- Instalments are cleared when you move to a new club (outside boardroom mode) and carried with the club in boardroom mode.
- Funding (loans/equity) is not counted as earned income; dividends are capped by the bank.
- Multi-season simulation (tests/seasons-sanity.test.mjs): 3 seasons with a hired manager at +100% budget, saving and loading every week, keeps the bank above −£1.5m, his spendable budget never above the bank, and staff in post.
