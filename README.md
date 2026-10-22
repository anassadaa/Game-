# Game collection

Two independent browser games, kept in separate folders.

| Game | Folder | Description |
| --- | --- | --- |
| Everstead — A Living Frontier | [everstead/](everstead/) | City, colony and frontier strategy with a shared persistent world. |
| Touchline — Club Architect | [football-manager/](football-manager/) | Football management with squads, tactics, recruitment, youth development and multi-season leagues. |

Each game has its own package manifest, lockfile, tests, source and README. No game source is shared between the folders.

## Run either game

Use Node.js 24. From this repository, enter the game folder, then run:

```sh
npm ci
npm run dev
```

Run the simulation tests with `node --test tests/*.test.mjs` inside either folder. Run `npm run build` inside a game folder to prepare its website.

## Hosting

- Everstead: set the hosting project's root directory to `everstead`. Its build output is `dist/client`. Its Cloudflare configuration remains inside that folder.
- Touchline: set the root directory to `football-manager`, build with `npm run build`, and publish `dist` on a static host.
- The existing live Everstead Site is independent of this GitHub folder reorganization and is not replaced by Touchline.

The repository was reorganized on 23 October 2026. The complete previous root tree, including its latest diplomacy changes, is preserved under `everstead/`. See each game's README for controls, research, limitations and save backup instructions.
