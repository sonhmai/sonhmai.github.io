# Migration report

The baseline is `7a1cd79` on `master`. The working tree was clean before creating `migrate-astro-paper`. No earlier migration branch or uncommitted migration work was present.

## Content and URLs

The complete inventory in `migration-inventory.json` records 39 source documents and 95 static assets. This includes five articles, three paper notes, 19 pages, 11 sample collection entries, and one draft. Static assets include 50 content images, three PDFs, old fonts, scripts, style files, and map assets.

All five published article URLs remain available. The four `/software/*` articles keep their original canonical URLs. `/TwoPhaseCommit/` retains its capitalization. GitHub Pages serves their generated directory indexes for requests with or without a trailing slash. Redirect pages preserve `/software/`, `/year-archive/`, `/wordpress/blog-posts/`, `/resume`, `/about.html`, `/md/`, `/markdown.html`, `/nmp/`, `/nmp.html`, and the old feed and sitemap URLs. These are static HTML redirects because GitHub Pages has no server redirect configuration.

The paper notes were not a Jekyll collection and were previously unpublished. They are now linked from Writing under `/papers/`. Their images are served under `/papers-assets/`. Their displayed date is labeled as a source update.

The original sources remain in the repository. Sample AcademicPages biographies, publications, teaching records, talks, and portfolio entries are retained as plain-text source downloads behind explanatory archive pages at their old URLs. They are not presented as the author's career. Drafts remain only in the repository. The Projects page links only the sample-code repository already cited in the original Monix article.

## Content repairs

The S3 notes referenced `building_s3_running_time_txns.png`. The migration points that reference to the existing `table3_building_s3_running_time_txns.png`.

The Spark article's images are available at `/SparkCRC/`. The original article-relative references were rewritten to that path.

Two Phase Commit references five figures missing from the baseline repository. They appear as labeled unavailable figures. No substitute images were invented. The original references remain in `_posts/2024-08-23-TwoPhaseCommit.md`. Mermaid source blocks render as diagrams, and ordinary code blocks retain syntax highlighting and horizontal scrolling.

## Verification

`npm run build` runs the content schema and type checks, builds the static pages, and generates Pagefind's search index. `npm run audit` compares original source hashes with the baseline commit, compares article bodies with the documented reference rewrites, checks static asset bytes, and checks published URLs, redirects, and internal links in built pages.

`node scripts/migrate-content.mjs` regenerates content and inventory from the original source folders. This is a migration tool, not part of the production build. It overwrites migrated article copies, so do not run it after editing current articles unless that reset is intended.

The original source directories and build output are separate. Keeping the original sources permits a direct audit without requiring the Ruby toolchain.

## Publishing and analytics

Publishing remains on GitHub Pages through the supplied Actions workflow. Repository Pages settings use GitHub Actions for the static build. Pull requests validate the build, and only the `master` branch can deploy.

The analytics token is intentionally blank. Set the documented public token in the repository Actions variable when available. The beacon is included only in production builds with a valid token. Local development never includes it. No browser dashboard setup is required to build the site.

## Decisions and evidence

Model the Domain shaped the explicit article route registry. Build the Lever led to the repeatable inventory and content audit. Prove It Works required browser checks against the built site and deliberate corruptions to verify the audit detects errors.

The workflow was inventory, static migration, analytics and hosting configuration, content audit, browser checks, and independent review. The separate local decision trail is `.audit/migration.tsv`.

## Initial local verification

The production build and type check passed with zero type errors, warnings, or hints. The build emits a size warning for Mermaid's diagram dependency, which is loaded only when an article contains Mermaid blocks. Pagefind indexed all eight articles and paper notes.

The content audit verified 39 source documents, 95 assets, and 19 redirects. Deliberate article, PDF, and redirect mutations were detected and restored by the audit test. Browser verification covered the complete historical URL inventory and redirect map, navigation, search, dark-mode persistence, mobile menu and layout, image loading, code scrolling, three diagrams, the feed alias, and unknown-route 404 behavior. No browser JavaScript errors were recorded.

Analytics tests confirmed that a dummy token adds the beacon in production, a blank token omits it, and development mode omits it even when the token is set. Live analytics collection remains unverified because the real site token is not configured.

Independent review found no blocker for the initial local handoff. Deployment was not tested at that handoff. Supply the analytics variable if tracking is desired.

The initial preview ran at `http://127.0.0.1:4323/`. Local screenshots and test logs are under `.audit/`. The migration was prepared on a separate branch.
