# Touchline 2.5 Implementation Plan

> For agentic workers: use superpowers:executing-plans and test-driven-development. The user approved implementation and release; continue without another approval checkpoint.

**Goal:** Implement the approved club investment and ownership update and release a compatible signed APK.

**Architecture:** New investment model and React hub integrate with the existing weekly simulation and wallet. Club ledgers remain independent; holdings use the existing wallet archive for job compatibility. Read-only views never initialize state during render.

**Tech Stack:** TypeScript, React, Vite, Node test runner, Capacitor, existing GitHub release workflow.

**Spec:** ../specs/2026-10-25-touchline-v2.5-design.md

## Global constraints
- Version 2.5/build16, existing Android package and signing identity.
- No signing secrets in the repository or logs; no changes to Everstead.
- Existing v2.4 cash and holdings preserved, and invalid financial imports rejected.

## Review focus
- Transactions involving multiple clubs must never charge the wrong club or manufacture cash.
- Current-club and archived holdings must agree across job changes and saves.
- Previewed quotes must reject stale prices and availability.
- Dividends and weekly processing must never run twice for the same period.
- Majority control must reflect current ownership after selling or dilution.

### Task 1: Investment model and financial simulation
Create src/investments.ts and tests/investments.test.mjs. Add GameState.investments, weekly and job hooks in game.ts, and validation in save.ts. Public APIs: marketClubs(s), quoteTrade(s,id,side,pct), executeTrade(s,quote), clubDecision(s,id,action,value), fundClub(s,id,amount,kind), repayClubLoan(s,id), clubCandidates(s,id), hireClubManager(s,id,candidateId), investmentWeek(s), validInvestments(s), portfolioSummary(s). APIs return copied GameStates for user actions; investmentWeek mutates an already copied transition state. Write conservation, quote/control, financing, dividend, legacy and isolation tests first, observe RED, implement, then run targeted tests.

### Task 2: Mobile investment experience
Create src/Investments.tsx and src/investments.css. Add Investments to Club subtabs and a wallet entry point. Provide search/filter market, portfolio metrics and histories, selected-club details, quote confirmation, majority decisions, managers, financing, projects and contextual requests. Reuse core APIs without duplicating economic arithmetic. Verify phone, landscape, stale-quote and control-loss flows in the rendered app.

### Task 3: Regression and release
Test real week/season/job transitions and round-trip v2.4 migration; run full npm test and production build. Obtain one fresh independent code review and fix material findings with regressions. Add release notes, bump versions and secret-file ignore rules, commit/push tested source to main through GitHub connector. Follow CI to signed release; download the APK and verify package/version, original certificate and packaged content. Return the installable release link.

## Execution record
- Baseline a86557a: gameplay source unchanged from reviewed/tested 2.4, 241 tests passing; GitHub Verify games passed.

- Implemented the investment model, Club investment hub and existing transfer/wallet/job integrations.
- Independent review found accounting, spending-limit, dividend and job-state issues. Added failing regressions, repaired each integration, and verified the fixes. Additional regressions cover repeat dividends, hostile votes, deferred payments and funded resale commissions.
- Final source verification: 271 tests passed, zero failures; production TypeScript/Vite build passed. The existing bundle-size advisory remains.
- Browser verification at 390×844 portrait and 844×390 landscape: 51% purchase and controls, control-loss sale warning, shareholder-loan account isolation and save/reload passed. No runtime errors or horizontal overflow. Physical Android installation has not been exercised locally.
- Version 2.5/build 16; release notes and signing-file exclusions added. Changed-source secret scan and git diff whitespace checks passed. Signing uses the existing GitHub secrets and original certificate.
