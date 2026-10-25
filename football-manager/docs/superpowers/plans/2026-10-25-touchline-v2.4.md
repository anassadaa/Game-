# Touchline 2.4 Implementation Plan

> For agentic workers: use superpowers:executing-plans with test-driven-development.

**Goal:** Fix the six finance issues reproduced in the v2.3 review and prepare an Android 2.4 update.

**Architecture:** Keep the existing simulation, distinguish financing cash flows from earnings, enforce a conserved cap table, and archive club-specific investments on job changes. Preserve valid v2.3 careers and personal cash. Fail closed for malformed optional wallet data.

**Tech stack:** React, TypeScript, Node tests, Capacitor Android.

**Spec:** The user's approved v2.3 review and request to fix, commit, push and deliver v2.4.

## Global constraints
- Android package stays com.anassadaa.touchline, versionName 2.4, versionCode 15.
- An update must use the original v2.3 signing certificate; never substitute a new identity silently.
- Do not modify Everstead or deploy the web version.
- Preserve real cash-flow reconciliation and prevent financing from affecting operating profit.

## Review focus
- Legacy saves with missing fields must remain playable.
- Existing investor offers must not survive changes to the cap table.
- Repeated equity injections must conserve ownership.
- A new club must not pay an old club's shareholder loan.
- Malformed nested wallet history must never reach rendering.

## Tasks
1. [x] Add failing regression tests for funding/dividend accounting, ownership, investor buyback, job changes and malformed imports. Run them and confirm each expected failure.
2. [x] Implement financing ledger categories and retain season-end transfer profit. Fix cap-table dilution, invalidate stale offers, and replace unconditional investor payments with profit-based distributions. Run targeted tests.
3. [x] Archive old-club shares and loans against their original club before switching; preserve personal cash, clear the old appointment's contract and financing state, validate all wallet fields, and test legacy imports.
4. [x] Update the Android version and release notes. Run the full suite and production build. Have a fresh reviewer inspect the final changes and fix material findings.
5. [ ] Build and inspect the APK. Verify version, signature identity and packaged assets. Commit and push the tested changes. Publish a signed v2.4 APK when the original key is available; otherwise provide the concrete unsigned build and identify the signing blocker.

## Execution record
- Baseline: v2.3 commit 9721701, 229 tests passing, production build passing (verified in this conversation).
- Original keystore is absent at the path configured by v2.3; no matching Library backup found.

- Regression proof: 11 failures reproduced before the fix; all 12 new regression tests now pass. Full suite: 241/241, no failures. Production build passes.
- Fresh independent review: no Critical or Important findings; minor plan wording and weekly-dividend label corrected.
- APK: web-only update packaged from the SHA256-pinned v2.3 native shell, with version 2.4/build15; native code/dependencies unchanged. Original signing key is still required.
