# Everstead completion design

## Authority and scope
Continue the user's approved Everstead design: Town, Colony and Frontier have equal status and share one world and save. The user asked to complete the game, research Cities: Skylines, Age of Empires and Fallout Shelter, use Product Design and obra Superpowers, and push to their supplied repository anassadaa/Game-. Reuse this repository instead of creating an unnecessary duplicate. Preserve the existing mobile runtime and original illustrated assets.

## Finished experience
Retain 13 buildings, worker skills, four eras, 14 technologies, expeditions, crafting, districts, diplomacy, local saves and legacy restarts. Add a living economy with six non-linear phases, independently changing resource-sector demand, meaningful rival competition, delayed consequences from selected story choices, several expedition encounter variants and two renewable seasonal ambitions. Show new conditions in existing trade/chronicle views and a compact contextual status strip; retain the three distinct palettes and primary navigation.

## Simulation contract
- Identical seed and decisions reproduce the world. No offline punishment or real-money mechanics.
- Market phases last 9–16 simulated days; transitions may skip phases and cannot repeat the current phase. Sector demand can diverge from the economy.
- Rival influence lowers sale proceeds by at most 12%; stronger relations offset that penalty. Buy/sell spreads always prevent instant arbitrage.
- Six authored follow-up stories are scheduled by specific choices and appear after 4–7 days, retaining a free option. The pending queue is bounded at 12. Normal stories are selected using situation filters and an eight-event cooldown, with intervals of 4–7 days. Expedition encounters vary by destination and journey.
- Two ambitions per 12-day season measure new trading, crafting, building or expedition completion since issuance. Rewards can be claimed once and goals renew each season.
- Existing version-1 saves migrate without losing prior progress. Validate new state and reject malformed event effects, duplicate assignments and inconsistent expedition membership before import. Failed imports must not overwrite the current settlement.
- Keep all resources finite/nonnegative. A scripted legal campaign must reach the Great Beacon; adverse multi-seed simulations must remain recoverable.

## Research
Reviewed 22 October 2026: Paradox Economy & Production (https://www.paradoxinteractive.com/games/cities-skylines-ii/features/economy-production), World's Edge Advancing to the Next Age (https://www.ageofempires.com/learn-to-play/advancing-aoe2/), Bethesda Crafting (https://help.bethesda.net/app/answers/detail/a_id/34931/) and Fallout Shelter quests (https://bethesda.net/en/article/61nbzA11y86ck6Isw4a4ic/fallout-shelter-quests-and-pc-version-now-available). Borrow general interactions: economic interdependence, progression tradeoffs, matching workers to jobs and bringing discoveries home. Use original names and artwork.

## Delivery and limits
Run simulation tests, type/build/runtime checks, Worker route tests and cloud-browser interaction/visual QA. Publish the private playable Site and push a sanitized complete source snapshot with assets and docs to the supplied public GitHub repository. No credentials, customer data, saved games or generated QA screenshots are part of the public source. This is a complete illustrated browser game with finite authored stories and variable systems; it does not claim AAA-scale 3D simulation, multiplayer or limitless unique content.
