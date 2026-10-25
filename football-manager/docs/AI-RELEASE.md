# Releasing Touchline (for any AI or human)

Signed Android APKs are built automatically by GitHub Actions (`.github/workflows/touchline-apk.yml`) on every push to `main` that touches `football-manager/**`. You do not need the signing key.

## To ship a new version
1. Make your change; run `npm test` and `npm run build` in `football-manager/`.
2. Bump BOTH:
   - `android/app/build.gradle`: `versionCode` (+1, integer, must always increase) and `versionName` (e.g. `"2.5"`).
   - `package.json`: `"version"` (e.g. `"2.5.0"`).
3. Optional: add release notes at `docs/releases/<versionName>.md`.
4. Commit and push to `main`.

The workflow runs tests, builds, signs with the original key from repository secrets, checks the signer SHA-256 starts with `f00c3412`, and creates GitHub release `v<versionName>` with `Touchline.apk` attached. If that tag already exists it skips the release (so bump the version), but the APK is still available as a workflow artifact.

## Never
- Never create a new keystore or change `signingConfigs` / `applicationId` (`com.anassadaa.touchline`). A different key means users cannot update.
- Never ask for, print, or commit the keystore or its passwords. They live only in repository secrets.
- Never reuse or lower a `versionCode`.
