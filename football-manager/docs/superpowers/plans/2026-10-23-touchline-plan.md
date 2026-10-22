# Touchline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a complete, replayable, mobile-first football management game and push its source to the existing Game- GitHub repository.

**Architecture:** A pure seeded game engine owns all rules and a React interface displays decisions and match progression. Versioned local saves allow offline play and transfer between browsers.

**Tech Stack:** TypeScript, React, Vite, CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-23-touchline-design.md`

## Global Constraints

- Fictional names and original presentation; no licensed media.
- Playable on Android phone in browser with local persistence.
- Stable deterministic state transitions and invalid-action guards.

## Review Focus

- Invalid save: reject safely and offer a new game.
- Unaffordable signing: retain state.
- Duplicate starters: repair to legal eleven.
- Match resumed after reload: retain phase, minute and score.
- Season transition: preserve roster and records while replacing standings.

### Task 1: Simulation

**Files:** `src/game.ts`, `tests/game.test.mjs`

**Interfaces:** `newGame`, `setTactics`, `toggleStarter`, `chooseEvent`, `signPlayer`, `sellPlayer`, `upgradeFacility`, `startMatch`, `advanceMatch`, `advanceWeek`, `standings`.

- [x] Write failing tests for a seeded campaign, legal actions, live match and season rollover.
- [x] Run tests and confirm the missing engine fails.
- [x] Implement the engine with explicit state transitions and seeded randomness.
- [x] Run all tests and commit.

### Task 2: Persistence

**Files:** `src/save.ts`, `tests/save.test.mjs`

- [x] Write failing tests for versioned round-trip and corrupt import rejection.
- [x] Run tests and confirm failure.
- [x] Implement guarded load, import, export and autosave helpers.
- [x] Run all tests and commit.

### Task 3: Mobile game interface

**Files:** `src/main.tsx`, `src/App.tsx`, `src/style.css`, `public/*`

- [x] Implement onboarding, dashboard, squad, tactics, recruitment, club and matchday views against tested engine interfaces.
- [x] Verify on a narrow Android viewport and desktop, including start, decisions, a match and reload.
- [x] Run tests/build and commit.

### Task 4: Release

**Files:** `README.md`, Git metadata

- [x] Document full game rules, controls, limits, research and save portability.
- [x] Run tests and build from a clean install; inspect repository for secrets and generated output.
- [x] Push the full source to Game-/football-manager, preserve Everstead under everstead/, and verify the remote tree.
