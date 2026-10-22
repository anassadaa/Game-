# Touchline on Cloudflare

Touchline has its own Cloudflare Pages project named `touchline`. It is independent of the Everstead project.

## Build a direct-upload release

```sh
npm ci
npm test
npm run build:cloudflare
```

The packager reads the normal Vite build and creates `cloudflare-dist/index.html` and `cloudflare-dist/_worker.js`. The HTML includes the game JavaScript, styles and bundled fonts, so the Pages advanced-mode Worker can serve the complete game without asset-upload credentials or external asset requests. Gameplay and the save format are unchanged. The standard `dist/` build remains available for ordinary static hosting.

From an environment signed into the correct Cloudflare account, deploy with:

```sh
npx wrangler@4.152.0 pages deploy cloudflare-dist --project-name touchline
```

The initial deployment uses the Cloudflare plugin's Pages deployment API with an empty asset manifest and the generated `_worker.js` module. This is a direct-upload project; commits to GitHub do not automatically redeploy it. Cloudflare rejected creation through its GitHub integration because of an installation error.

The Worker serves GET/HEAD requests to `/` and `/index.html`, returns a release identifier at `/health`, and rejects unsupported methods. Browser saves remain local to each URL. Use Club → Export save on the previous site and Club → Import save on Cloudflare to move progress.

Do not commit account tokens or upload credentials. Generated release output is ignored by Git.
