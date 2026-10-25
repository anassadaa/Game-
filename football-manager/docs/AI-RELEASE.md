# Releasing Touchline (for any AI assistant: Codex, Claude, ChatGPT, etc.)

Releases are fully automated by CI (`.github/workflows/touchline-apk.yml`).
To ship a new Android version you only:

1. Make and test your change (`npm test` in `football-manager/`).
2. Bump the version in BOTH places:
   - `football-manager/android/app/build.gradle`: `versionCode` (+1, never reuse) and `versionName` (e.g. `2.5`).
   - `football-manager/package.json`: `version`.
3. Optional: add release notes at `football-manager/docs/releases/<versionName>.md`.
4. Commit and push to `main`.

CI then runs tests, builds, signs the APK with the repo secrets, verifies the
signer certificate, uploads the APK artifact and creates GitHub release
`v<versionName>` (skipped if that tag already exists).

Rules:
- Never create a new signing key and never ask for, add or commit a keystore,
  passwords or `keystore.properties`. Signing exists only in GitHub secrets.
- Never reuse a `versionCode`; Android rejects updates otherwise.
- Do not create releases manually; let CI do it.
