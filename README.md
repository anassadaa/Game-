# Everstead — A Living Frontier

An original browser strategy game with three equal visual modes: a green riverside town, a navy and amber cutaway colony, and a parchment frontier atlas. They share one deterministic simulation and one save. An additional storm scene supports contextual story events.

## Playing

Start paused on day 1. Build a cottage, assign people, inspect production by tapping the HUD, and choose your first expedition. Next day advances manually; Play supports 1×, 3× and 8×. Events pause time. Closing or hiding the browser does not advance the world.

There are 13 building types, 3 districts with location bonuses and road requirements, 14 technologies across 4 eras, 5 expedition destinations, 3 neighbours, 16 town events, linked story follow-ups and varied expedition encounters, 8 charters and 3 crafting recipes. A Great Beacon unlocks a new frontier with a small legacy bonus. All content is finite and authored, with seeded variation; the simulation has no fixed ending.

Newcomers require housing and morale. Workers gain skills. Expeditions remove their production while they are away. Production chains consume inputs. Winter affects harvests; weather and district location change output. Contracts expire, regional demand shifts over six market phases, rival sales affect prices, and trade spreads prevent immediate buy/sell arbitrage. Renewing seasonal ambitions give concrete goals and claimable rewards. Residents can leave after hardship; emergency gathering offers recovery.

This first version uses illustrated scenes with interactive district/room/location controls. It does not simulate free-form road geometry, 3D construction, individual walking animations or real-time battles. Rival influence is a simplified regional model, not an AI opponent building an independent city. Saves are local to a browser; export/import JSON transfers progress. No accounts, analytics, ads, purchases or external API keys are used by gameplay.

## Development

- `npm ci`
- `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`
- `node --test tests/*.test.mjs` (Node 24 supports the erasable TypeScript engine)
- `npm run build`
- `npm run test:sites`

The Product Design mobile runtime is preserved. App code lives in `src/Prototype.tsx`, `src/prototype.css`, `src/game.ts`, `src/world.ts` and `src/save.ts`. Generated art is in `public/art`. Both iPhone and Pixel preview shells remain supported. A corrupted local save is offered for download before a fresh start; imports are validated and autosave stops when storage fails. No backend persistence or multiplayer is claimed.

## Design and gameplay research

These references informed general mechanics; no franchise artwork or characters are copied:

- Cities: Skylines II — interconnected economy and production: https://www.paradoxinteractive.com/games/cities-skylines-ii/features/economy-production
- Cities: Skylines II — city services: https://www.paradoxinteractive.com/games/cities-skylines-ii/features/city-services-districts-policies
- Age of Empires II — advancing through ages and unlocking technology: https://www.ageofempires.com/learn-to-play/advancing-aoe2/
- Age of Empires II — expansion and worker allocation: https://www.ageofempires.com/learn-to-play/expanding-your-empire-aoe2/
- Fallout Shelter — skill-based crafting and recovered recipes: https://help.bethesda.net/app/answers/detail/a_id/34931/
- Fallout Shelter — quest progression: https://help.bethesda.net/app/answers/detail/a_id/34926/

Research checked 22 October 2026. Fonts: Cinzel and Lora (Fontsource). Icons: Phosphor. Art generated for this game.
