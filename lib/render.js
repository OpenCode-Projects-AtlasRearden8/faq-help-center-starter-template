'use strict';

const { escapeHtml, firstInline } = require('./markdown');

function prefixFor(depth) {
  return depth === 0 ? '' : '../'.repeat(depth);
}

// Shared page shell: header with site title, search-as-you-type box, section
// nav; main content; footer. The relative prefix is derived from the page's
// own URL depth, so every link stays relative and the built site works on any
// host or subpath.
function htmlPage(o) {
  // Depth = how many directory levels down the page lives (slashes in its URL).
  const depth = (o.url || '').split('/').length - 1;
  const p = prefixFor(depth);
  const navLinks = o.navLinks || [];
  const nav = navLinks.map(l =>
    `<a href="${p}${l.href}"${l.href === o.activeNav ? ' class="active" aria-current="page"' : ''}>${escapeHtml(l.label)}</a>`
  ).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(o.title)}</title>
<meta name="description" content="${escapeHtml(o.description || '')}">
${o.canonical ? `<link rel="canonical" href="${escapeHtml(o.canonical)}">\n` : ''}<link rel="stylesheet" href="${p}assets/style.css">
<script src="${p}assets/search-index.js" defer></script>
<script src="${p}assets/search.js" defer></script>
</head>
<body data-prefix="${p}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="site-title" href="${p}index.html">${escapeHtml(o.cfg.title)}</a>
    <p class="tagline">${escapeHtml(o.cfg.tagline)}</p>
  </div>
  <div class="wrap search-zone">
    <label class="sr-only" for="search-input">Search the help center</label>
    <input id="search-input" type="search" autocomplete="off" spellcheck="false"
      placeholder="Search questions&#8230; (press / to focus)">
    <div id="search-results" class="search-results" hidden></div>
  </div>
  <nav class="wrap site-nav" aria-label="Help sections">
${nav}
    <a href="${p}contact.html"${o.activeNav === '__contact__' ? ' class="active" aria-current="page"' : ''}>Contact us</a>
  </nav>
</header>
<main id="main" class="wrap">
${o.content}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>${escapeHtml(o.cfg.footer_text)}</p>
    <p class="credit">${escapeHtml(o.cfg.footer_credit)}</p>
  </div>
</footer>
</body>
</html>
`;
}

// The "contact escape" that ships on every entry: what to do when the answer
// fails. `extra` is a per-article line from the article's front matter.
function escapeAside(p, cat, cfg, extra) {
  const c = cfg.contact;
  const moreIn = cat
    ? `<p class="escape-more">Trying to solve it yourself first? See <a href="${p}${cat.slug}/index.html">${escapeHtml(cat.name)}</a>.</p>`
    : '';
  return `<aside class="escape" data-escape>
<h2>Didn't find your answer?</h2>
<p>This is on us, not you. Email <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a> and say which article you were on and what didn't work. ${escapeHtml(c.response_time)}</p>
${extra ? `<p>${firstInline(extra)}</p>` : ''}
${moreIn}</aside>`;
}

function articleContent(post, cat, cfg, p) {
  return `<article class="article">
<p class="crumb"><a href="${p}${cat.slug}/index.html">${escapeHtml(cat.name)}</a></p>
<h1>${firstInline(post.title)}</h1>
<p class="summary">${firstInline(post.summary)}</p>
<div class="article-body">
${post.html}
</div>
${escapeAside(p, cat, cfg, post.escape)}
<p class="article-actions">
  <a href="#" data-print>Print this page</a>
  <span aria-hidden="true">&middot;</span>
  <a href="${p}index.html">All questions</a>
  <span aria-hidden="true">&middot;</span>
  <a href="${p}contact.html">Contact us</a>
</p>
</article>`;
}

function indexContent(categories, cfg, p) {
  const cards = categories.map(c => {
    const desc = (cfg.category_descriptions || {})[c.slug] || '';
    return `<a class="cat-card" href="${p}${c.slug}/index.html">
  <h2>${escapeHtml(c.name)}</h2>
  <p class="cat-card-count">${c.posts.length} question${c.posts.length === 1 ? '' : 's'}</p>
  <p class="cat-card-desc">${escapeHtml(desc)}</p>
</a>`;
  }).join('\n');
  const groups = categories.map(c =>
    `<div class="q-group">
<h3 id="${c.slug}">${escapeHtml(c.name)}</h3>
<ul>
${c.posts.map(post => `  <li><a href="${p}${post.url}">${firstInline(post.title)}</a></li>`).join('\n')}
</ul>
</div>`
  ).join('\n');
  return `<section class="hero">
<h1>How can we help?</h1>
<p class="lede">${escapeHtml(cfg.tagline)}</p>
</section>
<section aria-label="Browse by category">
<h2 class="small-heading">Browse by category</h2>
<div class="cat-cards">
${cards}
</div>
</section>
<section id="all-questions" aria-label="All questions">
<h2 class="small-heading">All questions</h2>
${groups}
</section>`;
}

function categoryContent(cat, cfg, p) {
  const desc = (cfg.category_descriptions || {})[cat.slug] || '';
  const items = cat.posts.map(post =>
    `  <li><a href="${p}${post.url}">${firstInline(post.title)}</a><br><span class="q-sum">${firstInline(post.summary)}</span></li>`
  ).join('\n');
  return `<article class="article">
<p class="crumb"><a href="${p}index.html">Home</a></p>
<h1>${escapeHtml(cat.name)}</h1>
<p class="summary">${escapeHtml(desc)}</p>
<ul class="q-list">
${items}
</ul>
${escapeAside(p, null, cfg, '')}
</article>`;
}

function contactContent(cfg, p) {
  const c = cfg.contact;
  return `<article class="article">
<p class="crumb"><a href="${p}index.html">Home</a></p>
<h1>Didn't find your answer?</h1>
<p class="lede">No need to be embarrassed or to write a long explanation &mdash; a short note is plenty. ${escapeHtml(c.response_time)}</p>
<div class="article-body">
<p>Email us at <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>.</p>
<h2>What to include</h2>
<ul>
${c.include.map(li => `<li>${firstInline(li)}</li>`).join('\n')}
</ul>
<h2>What happens next</h2>
<p>${firstInline(c.note)}</p>
<p>${firstInline(c.urgent)}</p>
</div>
${escapeAside(p, null, cfg, '')}
</article>`;
}

function notFoundContent(cfg, p) {
  return `<article class="article">
<h1>That page ran off</h1>
<p class="lede">The link you followed doesn't point anywhere we can find &mdash; the page may have been renamed.</p>
<p>Try the <a href="${p}index.html">help center home</a>, search from the box above, or <a href="${p}contact.html">get in touch</a> and we'll send you the right page.</p>
</article>`;
}

module.exports = {
  prefixFor,
  htmlPage,
  escapeAside,
  articleContent,
  indexContent,
  categoryContent,
  contactContent,
  notFoundContent
};
