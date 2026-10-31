# FAQ Help Center Starter Template

A static-site starter for small businesses and sellers shipping a **self-serve help center**: plain Markdown questions organized by category, search-as-you-type, print-friendly article pages, and a contact escape on every entry (what to do if the answer fails). The build is fully relative, so it drops onto any custom domain or free static host unchanged.

**Zero dependencies, zero accounts.** The whole thing is Node core modules — `npm install` is unnecessary, and the generated site is plain HTML/CSS/JS with no framework, no tracking, and no runtime calls. Works offline, lives on your own disk.

> Who is this for? A shop owner, a reseller, an author with readers' questions. You write answers the way you'd explain them to a neighbor, and the starter turns them into a tidy help center with search, categories, printable pages, and a polite way for people to reach a human when an article doesn't crack it.

## How it's different from our sister templates

- **`markdown-manual-site-template`** — long-form, chapter-style manuals meant to be read top to bottom. Use that for course handbooks and deep guides.
- **`directory-site-starter-template`** — listings directories: many entries, links out, indexes and filters. Use that for "where do I find X".
- **This template (FAQ)** — short question-and-answer entries, browsable by category, each ending in an escape hatch. Use it when people land here with *one specific problem*.

## Features

- **Plain Markdown entries** — each question is one `.md` file with simple front matter; source folder structure is entirely up to you (categories are metadata, not folders).
- **Categories** — built from the `category:` front matter, with auto-generated category index pages and a browsable home page.
- **Search-as-you-type** — build emits a `search-index.js`; the client filters questions live as you type (title > summary > category/body weighting, AND across words), with `/` to focus and `Esc` to clear. Works on every page.
- **Contact escapes on every entry** — every article and category page ends with a stylable "Didn't find your answer?" block wired to a contact page generated from `site.config.json`. No dead ends, ever.
- **Print-friendly article pages** — a Print button and print CSS turn any article into a clean handout: nav/search/footer dropped, black on white, sensible page breaks.
- **Custom-domain-ready build** — all links are relative, `data-prefix` keeps search links correct at any depth, and setting `canonical_url` emits canonical tags plus a `sitemap.xml`. Deploy the `dist/` folder anywhere: GitHub Pages, Netlify, Cloudflare Pages, a vintage Apache box.
- **Tested** — `npm test` runs build, link-integrity (internal links *and* fragments), and search-index tests using Node's built-in test runner.

## Quick start

Requires Node 18+ (no install step).

```bash
node build.js        # or: npm run build  — builds the site into dist/
node serve.js 8080   # or: npm run serve  — preview at http://localhost:8080
npm test             # build + link integrity + search index tests
```

Sample output for the demo site: 22 HTML pages across 5 categories + 3 pages, plus the search index.

## Writing content

Create `.md` files anywhere under `content/`, one question per file. Front matter comes first:

```markdown
---
title: How do I track my package?
category: Orders & Shipping
order: 2
summary: One line that shows under the title and in search results.
escape: If the carrier's page is down, tell us — we'll pull records from our side.
---

## Step by step

1. Open the shipping confirmation email.
2. Click the tracking link.

See [another question](../other-category/other-question.html).
```

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Question heading, page title, search index |
| `category` | yes | Groups questions; new names create new sections automatically |
| `order` | no | Sort position within the category (numbers, default 999, then alphabetical) |
| `summary` | no | Blurb under the title and in search; derived from body text if omitted |
| `escape` | no | One extra line in the per-article escape block |
| `slug` | no | Overrides the URL; by default the *file name* is the URL |

Rules of the road:

- **Filenames are URLs.** `track-my-package.md` publishes at `orders-shipping/track-my-package.html` (category slug from `category:`). Duplicate URLs make the build fail loudly.
- **Links are relative to the published page**, not the Markdown file. Within a category: `other-question.html`. Across categories: `../other-category/other-question.html`. Or absolute URLs for the web.
- **Markdown subset supported:** headings (see below), paragraphs, bullet/numbered lists, `**bold**`, `*italic*`, `` `code` ``, [links](...), quotes, ` ``` ` code fences, `---` rules. Content is HTML-escaped and script-y link targets are dropped, so even if untrusted text gets pasted in, it stays inert.
- **Headings:** use `##` and `###` inside articles — the article title itself renders as `h1`. Every heading gets an automatic anchor id, so you can link to `article.html#some-heading`.

## Configuration (`site.config.json`)

- `title`, `tagline` — site name and the line under it.
- `contact.email`, `contact.response_time`, `contact.include[]`, `contact.note`, `contact.urgent` — the contact page and every escape block are generated from these. Use a dedicated inbox like `help@example.com`; nothing else in your personal life will thank you more.
- `category_descriptions` — one-liners shown on category pages, keyed by category slug (lowercase, hyphens).
- `footer_text`, `footer_credit` — the sample footer.
- `canonical_url` — empty by default; set to e.g. `https://help.yourbusiness.com` and every page gains a `<link rel="canonical">` and a `sitemap.xml` appears.

## Custom domain notes

The built site is entirely relative, so it works at `yoursite.com/help/`, a GitHub Pages project path, or a bare apex domain with zero changes. When you have the final URL, put it in `canonical_url` and rebuild — that gives you clean canonical tags and a `sitemap.xml`. Search indexes are static JS, so anything that serves files serves search.

## Project layout

```
├── build.js               # the generator (zero deps)
├── lib/
│   ├── markdown.js        # small, safe Markdown renderer
│   └── render.js          # page shell + content templates
├── assets/                # static files copied into the build
│   ├── style.css          # warm, print-aware styles
│   └── search.js          # search-as-you-type + print button + "/" shortcut
├── content/               # ← your questions live here
│   ├── getting-started/
│   ├── orders-shipping/
│   ├── returns-refunds/
│   ├── payments-accounts/
│   └── seller-questions/
├── tests/                 # node --test: build, links, search index
├── serve.js               # tiny preview server for dist/
└── site.config.json       # site-wide settings
```

## Tests

```bash
npm test
```

- **Build tests** — every expected page exists (home, contact, 404, categories, all articles), assets copy, the search index parses, every article carries its escape block + print affordance, canonical tags turn on exactly when configured, and bad config/front matter fails loudly.
- **Link integrity** — every internal `href`/`src` on every generated page resolves to a real file, and every internal fragment anchor points at a real heading id.
- **Search index** — one entry per article, no dupes, URLs resolve, text is real (not empty, not HTML), and the pages are wired for search.

Add tests alongside as you grow the site; they run against a fresh temp build, so they never depend on — or dirty — your `dist/`.

## Customizing beyond config

The templates live in `lib/render.js` (plain functions returning HTML) and the look in `assets/style.css`. The Markdown subset in `lib/markdown.js` grows easily if you need tables or images — but a help center reads best without them.

## Credits & license

Built by [Asdale Dynamics, LLC](https://dylanasdale.github.io) — Dylan Asdale's shop for plain-English AI education, books, and practical small-business/author tools. MIT licensed: see [LICENSE](LICENSE) (`Copyright (c) 2026 Asdale Dynamics, LLC`). Take it, restyle it, ship it.

The demo shop ("Maple Lane Goods") and all sample articles are fictional placeholders — replace everything in `site.config.json` and `content/`, including the `help@example.com` address, with your real details. Please don't put secrets, API keys, or customers' personal data in this repo.
