# Supporters mood — research notes

The old mood only moved ±2 per result and a price swing, so it parked at a level (e.g. 44 "Content") while protests kept firing. Mood now **drifts every week toward a target** (about a fifth of the gap, at least 1 point), plus the per-match nudges. The target is built from the factors below, and every factor is shown as a reason chip on the Supporters card.

## What moves the target (src/fans.ts `fanTarget`)
| Factor | Effect | Why |
|---|---|---|
| Recent form (last 5) | (ppg − 1.3) × 9 | Identification and mood follow results ("basking in reflected glory" / "cutting off reflected failure") — Wann & Branscombe 1990, doi:10.1177/019372359001400203; Wann 1994, doi:10.1123/jsep.16.4.347 |
| League position vs expectation (from week 3) | ±2 per place, max ±12 | Satisfaction is relative to expectations; fan surveys rank team performance as the main attendance driver (YouGov attendance drivers) |
| Title race / relegation fight | +5 / −6 | Outcome uncertainty and stakes drive engagement (Dobson & Goddard, *The Economics of Football*) |
| Ticket price vs fair level for league and city | (fair − price) × 4, −10…+8 | FSA National Supporters' Survey 2023: 30.3% attend less because of prices (thefsa.org.uk/news/national-supporters-survey-2023-more-stats/) ; Man City fan protests over prices (BBC) |
| Exciting signings (last 8 weeks) | +3 each, max 9 | Transfer activity is a visible sign of ambition |
| Selling a star / fan favourite | −10, fading over 8 weeks | Same mechanism in reverse |
| Derby win / defeat | ±8 memory + ±4 instant | Rivalry results carry extra identity weight (Wann 1994) |
| Promise kept / broken | +2 / −4 | Trust in the club's word |
| Stadium investment, building work | up to +3 each | Visible investment |
| Attacking / cautious football | +4 / −4 | Entertainment value |
| Youngsters starting (≤20) | +2 each, max 6 | Academy pride |
| Recent trophies, cup runs | +6 each, up to +6 per run | |
| Protest fatigue | +3 per protest this season, max 10 | Anger burns out; mobilisation drops after repeated action |

Event "memories" (derby, sales, promises) fade linearly over 8 weeks.

## What the mood does (`fanEffects`)
- **Match demand**: (fans − 50) × 0.5 % (tickets.ts).
- **Merchandise**: £(4 + fans × 0.25)k per week, booked under sponsorship. Premier League National Fan Survey: merch spend £109–£117 per fan per season, higher among engaged fans.
- **Sponsor value**: about ±15% (sponsors.ts).
- **Home advantage**: win edge at home 0.02 + fans/2500 (0.04 at 50). A systematic review of games without crowds found home advantage fell in 72% of professional-league studies (e-balonmano 2024, doi:10.17398/1885-7019.20.169).
- **Board confidence**: slowly rises when fans ≥ 75, slips below 30; protests −4, chants +1.
- **Club valuation**: (fans − 50)/10 % (wallet.ts).
- **Protests**: certain below 20; between 20 and 32 the weekly chance is (32 − fans) × 6 %, minus 8 points per protest this season. 5-week cooldown, hash-based roll.
- **Squad morale**: ±1 every other week at the extremes.
- **Signing appeal**: players ask ~4% less when fans ≥ 75 and 6% more in a toxic atmosphere (negotiation.ts).
