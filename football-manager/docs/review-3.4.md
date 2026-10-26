# Touchline 3.4: dynamic market value

## Audit (before 3.4)
- `priceFor(rating, age)` was set once when a player was created, using only rating and age.
- Rivals were repriced only at the end of the season (`developRival`).
- The transfer-market refresh multiplied prices by a random ×0.8–1.4.
- **Our own players' value never changed**, so the value-trend chart stayed flat.
- Everything money-related reads `p.price`: asking price, the 68% sale fee, the no-loss `minSaleFee`, `findBuyer`, the release clause (2.2×), loan fees and AI bids. Changing the value therefore keeps all of those rules consistent.

## What real valuations use (research)
- **CIES Football Observatory** uses a regression model trained on thousands of real fees ([method](https://football-observatory.com/IMG/sites/mr/mr53/en/), [MR16](https://football-observatory.com/IMG/pdf/mr16_en.pdf), [paper](https://www.mdpi.com/2227-7099/10/1/4)). Its inputs:
  - contract years left, the strongest driver (about +22% per extra year);
  - age (about +12% per year younger);
  - position;
  - minutes, goals and assists, weighted by the level of the competition;
  - career progression and international status;
  - club and league level, measured both in sport and in money.
- **Transfermarkt** sets values by expert and community judgement, with no single algorithm ([definition](https://www.transfermarkt.com/navigation/mwdefinition)). It weighs:
  - prospects and potential, age and performance;
  - league and club status, reputation and experience;
  - injury susceptibility, number of interested clubs, and market trends.

  Contract length counts only to a limited extent there. Values are updated in season when form is exceptionally good or poor, and young players react fastest to more playing time.
- **Academic work** points the same way:
  - A [systematic review (Franceschi 2024)](https://onlinelibrary.wiley.com/doi/10.1111/joes.12552) finds age has an inverted-U effect on value. Playing time, international status, goals and assists consistently raise it.
  - Peak age is about 25 for forwards, 25–27 for midfielders and later for defenders and keepers, who also decline more slowly ([Sweden study](https://www.ida.liu.se/~patla00/publications/ISACE24-preprint.pdf), [arXiv 2212.11041](https://ar5iv.labs.arxiv.org/html/2212.11041)).
  - Attacking players and players at Champions League or Premier League clubs are valued highest ([MDPI 2020](https://www.mdpi.com/2071-1050/12/9/3709)).
- **FM-style games** combine the same factors: current and potential ability, age, contract, reputation, league, and form or interest. They also add a homegrown premium.

## The 3.4 model (`src/value.ts`)
Value is a set of factors multiplied together, with the same log-linear shape as CIES:
- **Ability:** about £125k at 60, £310k at 70, £760k at 80 and £1.9m at 90. For players under 25, potential is blended in, fading out by age 25.
- **Age:** a flat prime, then a decline each year after the peak:
  - forwards peak at 26 and lose 13% a year;
  - midfielders peak at 27, −11% a year;
  - defenders peak at 28, −9% a year;
  - keepers peak at 30, −7% a year;
  - an extra drop from age 33.
- **Contract:** 1 year left ×0.72, 2 years ×0.9, 3 years ×1, 5 years ×1.1. Free agents ×0.85. The effect is bounded, as Transfermarkt advises.
- **Position:** strikers and attacking midfielders up to ×1.15, keepers ×0.8.
- **Club/league level:** based on the club's strength, from ×0.5 to ×1.8. This separates lower leagues from top clubs.
- **Form:** average match rating, goals and assists per game (a goal from a defender counts more) and share of games played. It is weighted by how many games he has played and ranges from −18% to +48%.
- **Reputation:** man-of-the-match awards, career goals and career appearances, up to +12%.
- **Injuries:** −3% per week out (at most −30%) and up to −12% for injury proneness.
- **Premiums:** wonderkid ×1.2, homegrown/academy ×1.08, protected ×1.06.
- **Demand:** a hash-based ±6% that changes monthly, ×0.9 if listed and ×0.95 if unhappy.
- **Weekly update:** every player moves 35% of the way toward his target value, capped at ±8% a week. Changes are smooth, so no huge swings.
- **Old saves:** they jump onto the model once when loaded (`valueModel`). New games start on it.
- The game has no international caps, so reputation stands in for them.
