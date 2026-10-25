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
