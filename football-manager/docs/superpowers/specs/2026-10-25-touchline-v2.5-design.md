# Touchline 2.5: Club Investment & Ownership

Approved by the user in this conversation: the fourteen-part researched proposal, including investment in other clubs, adaptive valuations, 51% strategic control, delegated managers, independent club finances, persistent portfolios, financing and dilution, mobile UI and compatible saves. The user also authorized commit, push and signed APK delivery, and explicitly prohibited uploading signing secrets to GitHub.

## Approach

Use a simulated private-equity market within the existing football world, rather than live financial data or cosmetic prices disconnected from the simulation. Every club has its own operating cash ledger, debt, manager, budgets, strategy and infrastructure. One club remains the player's active football job; other clubs run on the same weekly clock through appointed managers.

## Rules

- Personal wallet cash and club cash are separate. Existing-share purchases pay sellers; equity issues and loans fund the club. Loan principal and distributions are excluded from earned profit.
- Ownership is conserved. 51% is the controlling threshold for whole-percent voting shares; at 50% a proposal requires other shareholders' agreement. Losing control removes decision rights without confiscating shares.
- Values reflect sustainable income, club/squad strength, infrastructure, cash, debt, form, league tier and major season changes. Values change only with game time or genuine financial changes. Trades have explicit fees, availability, liquidity and a control premium, and stale quotes are rejected.
- Every club evolves financially every week; operational outcomes affect football strength and finances. Annual profit-based distributions are paid once per season. A cash injection is not a profit. Reserves and debts constrain dividends.
- Controlled clubs support manager hiring/dismissal, strategy, wage and transfer budgets, ticket pricing, sponsor selection, academy/stadium/scouting projects, shareholder funding and dividend policy. Delegation settings and spending limits determine whether major spending needs approval.
- Employment and ownership remain separate. Existing v2.4 holdings/loans migrate without resetting money; leaving a job preserves assets and each club's own financial position. Switching to a new job does not transfer the old bank balance.
- Portfolio, Market and Controlled Clubs are subpages within Club → Investments. Quotes show old/new holding, fees, cash destination and control changes before confirmation. Clearly distinguish wallet cash, estimated equity and club cash.
- Contextual offers, funding needs and management requests follow actual club conditions; no guaranteed profits or forced weekly interruptions. No unrestricted transfer of other shareholders' money to the player.
- Existing match, squad and career systems stay available. Mobile UI uses the existing design language and no additional top-level navigation item.

## Constraints and delivery

VersionName 2.5, versionCode 16, package com.anassadaa.touchline. Never stage .jks, .keystore or keystore.properties files. Use existing GitHub Actions signing/release automation and compare the final certificate to v2.4. Regression tests must cover conservation, isolation, migrations, control changes, quotes, dividends and long careers. Verify the UI at phone and landscape widths.
