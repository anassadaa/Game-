# 3.5 — League stats: research & design

## How the big sites show league leaderboards
| Source | What it shows | Mobile layout |
|---|---|---|
| [FotMob – Premier League stats](https://www.fotmob.com/en-GB/leagues/47/stats/premier-league) | Top scorer, assists, goals + assists, FotMob rating, MOTM-style "top rated", clean sheets, yellow/red cards, plus team stats (goals for, goals conceded, clean sheets) | One card per category with the top 3 and "see all"; a Players/Teams switch; a season picker |
| [Premier League – top players](https://www.premierleague.com/en/stats/top/players) | Goals, assists, clean sheets and more, with a season filter | Ranked list with rank, player, club and value; the leader is highlighted |
| [FBref – standard stats](https://fbref.com/en/comps/9/stats/Premier-League-Stats) · [league page](https://fbref.com/en/comps/9/Premier-League-Stats) | A full table: MP, Starts, Min, Gls, Ast, G+A, CrdY, CrdR, per-90, squad, age, position; the league page has "Most goals / assists / clean sheets" boxes | A wide, sortable table (it scrolls sideways on phones) |
| Transfermarkt – top scorers (torschuetzenliste) | Goals with apps, plus **club, age, position and market value** on each row | A compact ranked list |
| Football Manager – Competition › Stats | Players/Clubs tabs, ranked lists for every category, a **minimum-appearances filter** on averages | Ranked list per category; tapping opens the player profile |

## What we took
- FotMob: category chips (they scroll sideways), the Players/Teams split (Team GF / Team GA), and the season picker.
- Transfermarkt: each row shows club, age, position and MV.
- FM: average rating needs at least 2 apps and at least 40% of the leader's apps. Tapping a row opens the profile, which has a **Make an offer** button.
- Premier League site: the leader's rank badge is highlighted; your own players are tinted.

## Tracking
- Before 3.5 only our players had per-player stats; AI-vs-AI games kept just the score.
- `src/leaguestats.ts` now gives every league game per-player apps, goals, assists, ratings, MOTM, clean sheets and cards. It is hash-based (FNV and avalanche), so it uses no game RNG and the same seed gives the same result.
- Goal shares are weighted by position and the square of rating. 75% of goals get an assist.
- Our players keep their real match numbers. Clean sheets and cards come from the match itself.
- Saves: `s.lstats` is created in `migrate()`, so old saves keep working. At season end the top 20 of every category in every league is archived in `s.lstatsHist`, which keeps the last 3 seasons.
- Speed: one club→squad map per week. A full season sim is about 175 ms per week, including the rest of the game.

## Screens
`docs/screenshots/v35-*` at 393x873, 360x800 and landscape: stats (goals, all-leagues rating, last season, teams), profile with offer, offer dialog, Home shortcut.
