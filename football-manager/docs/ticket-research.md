# Ticket pricing & attendance research (v3.9)

How Touchline models match-by-match demand (`src/tickets.ts`).

## Findings
- **Demand is price-inelastic** (|elasticity| < 1). That holds in English clubs, the NFL and La Liga. Casual fans react more to price than season-ticket holders do. → `ELASTICITY = 0.6`, so a higher price fills fewer seats but usually earns more, unless the fans are angry.
  - Dobson & Goddard / Simmons, *The demand for English league football*, Applied Economics 1996. https://doi.org/10.1080/000368496328777
  - García & Rodríguez, *Determinants of football match attendance revisited*, JSE 2002 (mean elasticity ≈ −0.97 after endogeneity). https://econ-papers.upf.edu/papers/555.pdf
  - Welki & Zlatoper 1994, NFL game-day attendance. https://doi.org/10.1002/mde.4090150510
- **Match quality and stakes** matter. League position, goals and promotion/relegation all drive crowds, and the most important variables are ex-ante quality ones. → Reasons cover opponent strength, title race, promotion chase, relegation fight, form and star players.
- **EPL clubs price by opponent.** Prices rise for "big six" visitors, for derbies, with local earnings, and with last season's capacity use. Above about 90% utilisation, prices rise at an increasing rate. → Opponent and derby reasons. Auto pricing never prices out a sell-out. City size stands in for local income.
  - *Determining the price of football: matchday ticket prices in the EPL*, ESMQ 2023. https://www.tandfonline.com/doi/full/10.1080/16184742.2023.2191633
- **Derbies** add a lot: about 70% in one club study, and the effect is larger in lower divisions. Midweek games cost about 6.4% in Div 1 and 2.8% in Div 2. → Derby +25%, midweek −7%, cup ties −10%.
  - Lancaster Univ., *Attendance, scheduling and cross-subsidisation*. https://www.lancaster.ac.uk/media/lancaster-university/content-assets/documents/lums/economics/working-papers/AttendanceDemand.pdf
  - FK Pelhřimov study. http://nusl.cz/ntk/nusl-125198
- **Weather:** rain cuts attendance (6 of 11 studies) and warmth raises it. → Hash-based weather per matchday, with rain more likely in winter weeks.
  - Illmer, Klöcker & Daumann 2024, systematic review. https://zs.thulb.uni-jena.de/receive/jportal_jparticle_01374493
  - Scottish study. https://osti.gov/etdeweb/biblio/6943450
- **Real price levels (2025/26):**
  - Championship cheapest adult season tickets run from £262 (QPR) to £567.50 (Norwich). Yorkshire Post: https://app.yorkshirepost.co.uk/story/5188237/content.html
  - The Premier League caps away tickets at £30. The Championship away average is £33.29. https://www.leaderlive.co.uk/sport/25668670.wrexhams-away-ticket-price-cheapest-championship/
  - Leicester uses Category A–D match-by-match pricing, with adult tickets from £26–£30. https://www.lcfc.com/media-article/leicester-city-lcfc-match-by-match-pricing-confirmed-for-2025-26-championship-season
  - West Brom match tickets start at £32, and a £439 season ticket works out at about £19 a game. https://www.wba.co.uk/news/albion-confirm-202526-match-ticket-prices
- **Dynamic pricing and fans:** Man City froze, then cut, 2025/26 prices after protests. Fans objected to resale and dynamic pricing. → Auto pricing weighs fan mood: unhappy fans get cheaper seats.
  - BBC: https://www.bbc.com/sport/football/articles/cj9ee2xj0zdo
  - The Athletic: https://www.nytimes.com/athletic/6423752/2025/06/13/manchester-city-tickets-premier-league/

## Model
1. Base demand is 62% of capacity, plus the reason modifiers: tier, city size, fans, opponent, derby, table race, form, stars, midweek/cup, weather, opening day and run-in.
2. Price effect: `demand × mult^−0.6`.
3. Fill is capped at 100% (a sell-out). Season-ticket holders always count.
4. Capacity comes from stadium level, tier and city size. This replaces the flat £30k-per-level stadium bonus.
5. Gate = paying crowd × yield.
6. Auto mode: the hired manager (in delegated careers) or the board picks the level that maximises gate plus fan goodwill. The goodwill weight is bigger when fans are unhappy.
7. Season-ticket uptake adapts to fans, city, tier, discount and base price.
