# Everstead Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Finish, verify, publish and push the existing Everstead game.
**Architecture:** Preserve the deterministic engine and protected Product Design runtime. A separate world module owns market phases, story follow-ups and seasonal goals; game.ts integrates it, Prototype.tsx exposes it.
**Tech Stack:** TypeScript, React, Vite, Node test runner, Cloudflare Worker.
**Spec:** docs/superpowers/specs/2026-10-22-everstead-completion-design.md

## Global Constraints
- Preserve all three visual themes and mobile runtime.
- Seeded randomness only; keep version-1 saves compatible.
- No real-money mechanics, external AI keys or copied franchise assets.
- Keep user save data and credentials out of public GitHub.

## Review Focus
- Corrupted saves and invalid pending story effects must fail without overwriting a live save.
- Event cooldown and due follow-ups must not lose choices when multiple systems trigger.
- Economy phases and rival modifiers must never permit instant arbitrage.
- Seasonal rewards must not be claimed twice or use activity before issuance.
- A legitimate campaign must progress through all eras without injected resources.

### Task 1: Replayable living world
Files: src/world.ts, src/game.ts, src/Prototype.tsx, src/prototype.css, tests/world.test.mjs.
Interfaces: newWorld(day,stats,completed), tickWorld(game,rng), marketFactor(game,resource), saleFactor(game), queueFollowup(game,key), seasonalGoals(game), claimSeasonGoal(game,id), encounter(game,trip,siteName,rng).
- [ ] Write failing behavior tests for market changes, sector divergence, rival prices, follow-up delivery, cooldown, seasonal claims and legacy-save migration.
- [ ] Run node --test tests/world.test.mjs and confirm failures describe missing behavior.
- [ ] Implement the module, engine integration, save validation and existing-screen controls.
- [ ] Run node --test tests/game.test.mjs tests/world.test.mjs; all pass.
- [ ] Commit replayability implementation.

### Task 2: Playability and persistence
Files: tests/campaign.test.mjs, src/game.ts, src/Prototype.tsx, src/save.ts as needed.
Interfaces: existing action functions and restore(text): Game; pure save loader preserving unreadable raw saves.
- [ ] Exercise a legal campaign, adverse long runs and corrupt-save recovery.
- [ ] For each observed failure, add a reproducer, observe failure, repair root cause, confirm green suite.
- [ ] Browser-test Town building, Colony assignment, Frontier departure, Research, story choices, seasonal goals and save persistence on both device presets.
- [ ] Run npm run build, npm run check:runtime, npm run test:sites. Expected: successful build and all checks passing.
- [ ] Commit verified fixes and update README/design-qa.md.

### Task 3: Delivery
Files: README.md, CHANGELOG.md, docs/release-validation.md.
- [ ] Fresh review of completed changes; fix important findings with failing tests first.
- [ ] Package unchanged verified source with the Sites helper and publish privately.
- [ ] Push complete sanitized source and assets to anassadaa/Game-, retaining its README history and verifying returned main tree/commit.
- [ ] Return working URL, repository link, tested scope and finite-content limitation.
