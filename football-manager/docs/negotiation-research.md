# Negotiation research (v3.9)

Each negotiation type in Touchline has its own factors, patience and reasons. The only things they share are small helpers: a stored counter that can only move toward agreement, round counting and lock-outs (`src/negotiation.ts`).

## 1. Transfer fee: we buy, the selling club decides
- **Contract left is the biggest lever.** CIES models remaining contract on a log scale: going from 4 to 3 years left cuts value by about 13%, and from 2 to 1 by about 29%. A fee is in effect compensation for breaking the contract, and it tends to zero at expiry (Bosman). [Poli et al. 2022, *Economies* 10(1):4](https://www.mdpi.com/2227-7099/10/1/4); [Poli et al. 2024, *IJFS* 12(3):93](https://www.mdpi.com/2227-7072/12/3/93); [CIES MR53](https://football-observatory.com/IMG/pdf/mr53en.pdf)
- **Age and form also count.** Value falls linearly with age (about −44% per 5 years in CIES), and recent minutes and form matter (CIES; [Franceschi 2024 systematic review, *J. Econ. Surveys*](https://onlinelibrary.wiley.com/doi/10.1111/joes.12552)).
- **Both clubs have bargaining power.** Fees fit Nash bargaining between the two clubs ([Carmichael & Thomas 1993, *Applied Economics*](https://doi.org/10.1080/00036849300000150)). A seller that needs money, has a player near expiry, or is short on other buyers has less leverage. A seller with rival bidders, or whose player is a key starter it cannot replace, has more ([game-theory study of bidding strategies](https://www.researchgate.net/publication/394828603)).
- **How this maps to the game:**
  - The seller weighs: squad need (is he a starter, and is there cover in his position), replacement, finances (league level), contract years, other bidders, deadline day, and club temperament.
  - Rounds: 2–4.
  - The counter is stored and only ever comes down toward you. A lowball does not drag it down.

## 2. Transfer fee: we sell, the buying club decides
- The buyer's side matters more to the fee than the seller's: richer, higher-division buyers pay more (Franceschi 2024).
- From FM player observation: AI buyers pay over value only when they need the position or he would be a key player. They stay low when they are covered, cannot afford him, or have alternatives ([SI forum](https://community.sports-interactive.com/forums/topic/396662-what-is-the-logic-behind-these-transfer-negotiations/); [Steam thread](https://steamcommunity.com/app/2252570/discussions/0/603020257754360005/)).
- **How this maps to the game:**
  - The buyer weighs: its need (how good he is compared with the club), budget (division), alternatives (other listed players in his position), and deadline.
  - Rounds: 2–3.
  - Its stored offer only rises, and it pulls out when the gap is too big.
  - The no-loss floor (`minSaleFee`) and wonderkid approval still apply.

## 3. Personal terms with a new signing
- The agent opens high and drops a little after each serious counter. Patience runs out with poor offers ([gamepressure FM22 guide](https://www.gamepressure.com/football-manager-2022/negotiating-contracts/zff1ce)).
- Players judge their likely playing time: a likely starter signs, while a player who expects to be a reserve asks more or refuses ([FM-Online help](https://www.footballmanager-online.fr/help/athlete_teamswitch_contract_negotiation.html)).
- **How this maps to the game:**
  - The player weighs: ambition (personality), step up or down (club rating gap), expected playing time, the agent, and age.
  - Rounds: 2–4.

## 4. Renewals
- Remaining contract length gives the club leverage while the player still has years left. Near expiry, the player holds the leverage ([Gerfin et al., *Economic Inquiry*](https://mgerfin.ch/wp-content/uploads/2021/12/soccer_Economic_Inquiry-1.pdf)).
- **How this maps to the game** (see 3.9 `temperament` in `contracts.ts`): loyalty or personality, status (starter or squad player), age, form, rival interest, morale, the agent, and insults from earlier rounds. Rounds: 1–5.

## 5. Staff and managers
- Coaches' pay rises mostly through renegotiation after success and through outside offers. Renegotiations average +40%, and a move to a bigger job can mean +80% to +287%. Poor results cut outside options ([Evidence on explicit and implicit incentives, *JMAR*](https://doi.org/10.2308/jmar-2023-089)).
- **How this maps to the game:**
  - **Staff:** rating, the club's recent results, and outside offers.
  - **Managers:** trophies, reputation (rating), and the job market.
  - Each has its own counter and rounds.

## 6. Loans
- FIFA RSTP art. 10 requires a written loan agreement with a duration of one year at most and set financial conditions. The wage split is negotiated, from all to part to none ([FIFA RSTP](https://digitalhub.fifa.com/m/54fbb7c414e49237/original/Regulations-on-the-Status-and-Transfer-)).
- A clause that forces a club to field the player breaches art. 18bis, but appearance-based incentives are allowed ([explainer](https://www.socceraddicted.com/en/explainers/loan-with-option-to-buy-what-it-really-means-in-the-transfer-window); [Nogomania](https://en.nogomania.com/read/How-Football-Loan-Agreements-Really-Work); [BBC](https://www.bbc.com/sport/football/articles/cd9j9dgxwp1o)).
- **How this maps to the game:**
  - The parent club weighs: our wage share, expected minutes for the player (a playing-time *expectation*, not a binding guarantee), its plans for him (young or high potential means it wants him developing), and our level.
  - Rounds: 2–3.

## Shared design rules (from all of the above)
- A counter is a stored figure. It only moves toward agreement and never rewards lowballing (FM players complain that offers which are "not remembered" are exploitable).
- Rounds are limited and vary by type and personality. Running out of rounds means a walk-away and a lock-out of a few weeks.
- Every response shows its reasons.
