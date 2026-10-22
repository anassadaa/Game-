# Release verification — 23 October 2026

- All 17 simulation and save tests pass on Node.js 24.
- Production TypeScript compilation and Vite build pass.
- A 20-season career remains playable; a separate 18-season scenario repeatedly sells down to the squad minimum and survives retirement-heavy seasons.
- Regression tests cover goalkeeper balance, injured-starter replacement, transfer affordability, deterministic outcomes, fatigue costs and malformed imports.
- Browser QA at a 393 × 852 viewport: onboarding, match start, three first-half passages, tactical change at half-time, full-time result, reload/resume, next week and a transfer signing all verified.
- GitHub Actions completed a fresh install, tests and build for the football-manager job successfully at the first release commit. The independent Everstead job failed its tests; its existing source tree was preserved unchanged during the folder reorganization. This football release does not claim that Everstead's separate test suite passes.
- Independent Superpowers code review found rollover, selection and import defects. They were reproduced in failing tests and fixed before publication.

The game uses a simplified seeded simulation. It has finite authored stories and no 3D football, cup competitions, real player database or multiplayer. Long-term entertainment cannot be guaranteed; the implemented progression and trade-offs are documented in the README.
