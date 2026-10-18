# Son's blog

A static Astro site based on AstroPaper, published to GitHub Pages.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run build
npm run audit
npm run preview -- --host 127.0.0.1
```

The build runs type checks and creates the Pagefind search index. Use the built preview to test search. `npm run dev` starts the development server. Search needs an existing production index.

## Verify behavior

With the preview running, use `PREVIEW_URL=http://127.0.0.1:4323 npm run test:browser`. The test uses Chromium. Run `npx playwright install chromium` once if needed. It checks navigation, search, theme persistence, mobile layouts, article images, code scrolling, diagrams, and old URLs.

`node scripts/test-audit.mjs` verifies that the migration audit detects content, asset, and redirect corruption, then restores the files. `node scripts/test-analytics.mjs` tests the production gate with a dummy token and stops its temporary development server.

## Write content

Articles and paper notes live in `src/content/posts/`. Front matter contains `title`, `pubDatetime`, `description`, and `tags`. Paper notes set `note: true`. Their date reflects the last source commit, not a publication date.

Register the public URL in `src/data/post-routes.json`. Keep published URLs stable. Add changed URLs to `src/data/redirects.json`. Static assets live in `public/` and keep their original public paths.

The original Jekyll sources remain in the underscore directories for comparison and recovery. Astro does not build them. See [the migration report](docs/migration.md) and [the complete inventory](docs/migration-inventory.json).

## Analytics

Copy `.env.example` to `.env` and set `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` to the 32-character token from the website snippet. The token is a public site identifier, not an API key. A blank or invalid token omits the beacon. Development mode always omits it. A production preview includes it if configured.

To obtain the token, open Cloudflare Web Analytics, select Add a site, and enter `sonhmai.github.io`. Copy the token from the JavaScript snippet. See [the setup instructions](https://developers.cloudflare.com/web-analytics/get-started/).

For production builds, set the repository Actions variable `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. The workflow passes it into the build. No token is configured in this migration. The old empty Universal Analytics integration has been removed.

## Publish

The workflow in `.github/workflows/pages.yml` builds on pushes to `master` or a manual run. It uploads `dist/` and deploys through GitHub Pages. Use GitHub Actions as the repository's Pages build source. Keep the repository URL `https://sonhmai.github.io/`; no base path is needed.

Pull requests run the build and migration audit. Deployment runs only from `master`. Review changes before merging. A manual run on `master` also publishes the site.

## Theme source

The theme source is [AstroPaper](https://github.com/satnaing/astro-paper), revision `35cfa7fbe0b897306d27670d3819e55d5205f3dd`. Its license is retained in `LICENSE-AstroPaper`. The original theme license remains in `LICENSE`.
