# STATUS

Date: 2026-10-31 · Status: complete and verified · Aisle: FAQ help-center starter (static site)

## What was built

A self-contained static-site starter for small-business/self-serve help centers, plus a polished demo site (fictional "Maple Lane Goods") that doubles as sample content:

- **Generator** (`build.js`, zero dependencies, Node core only): reads `site.config.json` and `content/**/*.md`, renders a small safe Markdown subset (`lib/markdown.js`), and outputs a fully relative site into `dist/` — home, contact page, 404, one index per category, one page per question, copied assets, and a client-side `assets/search-index.js`.
- **Categories**: derived from `category:` front matter; new category names create new sections automatically; `order:` controls position; duplicate URLs fail the build loudly; file name = URL by default.
- **Search-as-you-type** (`assets/search.js`): live filtering on every page, weighted title > summary > category/body matching with AND logic across words, result highlighting, `/` focuses search, `Esc` clears, `data-prefix` keeps results correct from any depth.
- **Contact escapes on every entry**: every article and category page ends with a "Didn't find your answer?" block (`data-escape`) wired to a generated contact page; per-article `escape:` lines add specifics. Print-friendly: print button + print CSS (nav/search/footer hidden, black-on-white, page-break rules).
- **Custom-domain-ready**: everything relative; optional `canonical_url` emits canonical tags and a `sitemap.xml` (verified by test). Preview served with `serve.js`, a 404-aware mini static server.
- **Sample content**: 12 articles + escape/content docs across 5 categories (orders & shipping, returns & refunds, payments & accounts, seller questions, getting started), written in plain, honest English with deliberate internal cross-links and fragment links.
- **Tests** (`node --test tests/`): build (pages exist, assets copied, index parses, escapes/print present, canonical on/off behavior, bad config fails loudly), link integrity (every internal href/src and fragment on every page resolves), search index (one entry per article, no dupes, URLs resolve, real text, pages wired for search). Tests build into fresh temp dirs, never touching `dist/`.
- **Docs**: README (usage, authoring guide, config reference, deployment notes, credits) and MIT `LICENSE` (`Copyright (c) 2026 Asdale Dynamics, LLC`).

## How to run

```bash
node build.js        # build demo site into dist/   (or: npm run build)
node serve.js 8080   # preview http://localhost:8080 (or: npm run serve)
npm test             # 13 tests               (Node 18+ required, nothing to install)
```

Tests alone: `node --test tests/`. Building with a custom location: `node -e "require('./build').buildSite({outDir:'...'})"` (used by tests).

## Verification results (run 2026-10-31)

- `node build.js` — build succeeds: 22 HTML files (13 articles, 5 category pages, home, contact, 404) + 2 asset files + search index.
- `npm test` — **13/13 pass, 0 fail, 0 skipped** (~0.15s).
- HTTP smoke test via `serve.js`: home 200, article 200, category 200, `assets/search-index.js` 200, unknown URL 404 (fallback page served).
- Manual checks: escape block + contact email present on every article; `data-print` present; heading anchors resolvable (e.g. `returns-refunds/return-policy.html#the-short-version`); search index contains no unescaped `<`.
- Bugs found and fixed during verification (worth knowing, they shaped the design): page prefix depth was wrong for root-level extras and articles (now derived from URL depth by slash-counting); slugs initially derived from titles (now from filenames, `slug:` overrides); link-integrity test caught one bad cross-category fragment link in sample content; search text now decodes HTML entities.

## Known gaps (deliberate, not bugs)

- **Markdown subset**: no tables, images (standalone), nested lists, or definition lists — self-serve help centers read best without them, but `lib/markdown.js` is small and easy to extend.
- **Search is client-side and literal**: substring AND matching, not fuzzy/typo-tolerant; the whole index (~a few hundred entries scale) ships as one JS file. Very large sites would want a different approach.
- **No sitemap without a domain**: `sitemap.xml` and canonical tags appear only when `canonical_url` is set (by design — keeps subpath deploys clean).
- **No RSS/feeds, no analytics**: intentional "{} keep-it-static" choice for this starter; both are easy to bolt on.
- **Print styling covers articles/categories**; the home page prints acceptably but isn't tuned for it.
- Sample content references a fictional shop and placeholder email (`help@example.com`) — replace before any real use; no secrets, API keys, or personal data should ever go in this repo.
