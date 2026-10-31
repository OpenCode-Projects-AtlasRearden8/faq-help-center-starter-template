'use strict';

// Zero-dependency static site generator for the FAQ / help-center starter.
// Reads site.config.json + content/**/*.md (Markdown subset) and writes a
// fully relative, custom-domain-ready static site into dist/.
//
// Usage: node build.js            -> builds into ./dist
//        buildSite({ outDir })    -> used by tests

const fs = require('fs');
const path = require('path');
const { slugify, renderMarkdown, stripHtml } = require('./lib/markdown');
const render = require('./lib/render');

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'site.config.json');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Simple `key: value` front matter delimited by --- lines. Values are plain
// strings (quotes stripped); a `summary` may contain most characters.
function parseFrontMatter(raw, label) {
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  if (lines[0].trim() !== '---') throw new Error(`${label}: first line must be "---" front matter`);
  let i = 1;
  const fm = {};
  while (i < lines.length && lines[i].trim() !== '---') {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`${label}: bad front matter line ${JSON.stringify(line)}`);
    fm[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    i++;
  }
  if (i >= lines.length) throw new Error(`${label}: front matter not closed with "---"`);
  return { fm, body: lines.slice(i + 1).join('\n') };
}

function loadConfig(p) {
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const key of ['title', 'tagline', 'footer_text', 'footer_credit']) {
    if (typeof cfg[key] !== 'string' || !cfg[key].trim()) {
      throw new Error(`site.config.json: missing "${key}"`);
    }
  }
  if (!cfg.contact || typeof cfg.contact.email !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(cfg.contact.email)) {
    throw new Error('site.config.json: missing valid "contact.email"');
  }
  return cfg;
}

function collectPosts(cfg) {
  const files = walk(CONTENT_DIR);
  if (files.length === 0) throw new Error('no .md articles found under content/');
  const cats = new Map();
  const posts = [];
  const rank = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 999;
  };
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const { fm, body } = parseFrontMatter(fs.readFileSync(file, 'utf8'), rel);
    for (const key of ['title', 'category']) {
      if (!fm[key]) throw new Error(`${rel}: front matter missing "${key}"`);
    }
    const categorySlug = slugify(fm.category);
    // Rule: the file name is the URL. `slug:` front matter overrides it.
    const slug = fm.slug ? slugify(fm.slug) : slugify(path.basename(file, '.md'));
    if (!slug) throw new Error(`${rel}: article has an empty slug`);
    const url = `${categorySlug}/${slug}.html`;
    if (posts.some(q => q.url === url)) throw new Error(`${rel}: duplicate article URL ${url}`);
    let cat = cats.get(categorySlug);
    if (!cat) { cat = { name: fm.category, slug: categorySlug, posts: [] }; cats.set(categorySlug, cat); }
    const html = renderMarkdown(body);
    const post = {
      fm,
      slug,
      category: fm.category,
      categorySlug,
      title: fm.title,
      summary: fm.summary || stripHtml(html).slice(0, 160),
      escape: fm.escape || '',
      html,
      url,
      order: rank(fm.order)
    };
    cat.posts.push(post);
    posts.push(post);
  }
  for (const cat of cats.values()) {
    cat.posts.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }
  return { categories: [...cats.values()], posts };
}

function canonicalFor(cfg, url) {
  const base = String(cfg.canonical_url || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return base + '/' + url;
}

function writeSearchIndexJs(outDir, posts) {
  const entries = posts.map(p => ({
    title: p.title,
    category: p.category,
    url: p.url,
    summary: p.summary,
    text: stripHtml(p.html).slice(0, 4000)
  }));
  const json = JSON.stringify(entries).replace(/</g, '\\u003c');
  fs.writeFileSync(path.join(outDir, 'assets', 'search-index.js'),
    `window.SEARCH_INDEX = ${json};\n`);
}

function buildSite(opts = {}) {
  const outDir = opts.outDir || path.join(ROOT, 'dist');
  const cfg = loadConfig(opts.configPath || CONFIG_PATH);
  const { categories, posts } = collectPosts(cfg);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  fs.cpSync(ASSETS_DIR, path.join(outDir, 'assets'), { recursive: true });
  writeSearchIndexJs(outDir, posts);

  const navLinks = [
    { href: 'index.html', label: 'Home' },
    ...categories.map(c => ({ href: `${c.slug}/index.html`, label: c.name }))
  ];
  let pages = 0;

  const writePage = (relUrl, opts) => {
    const abs = path.join(outDir, relUrl);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, render.htmlPage(opts));
    pages++;
  };

  // Home
  writePage('index.html', {
    title: `${cfg.title} — Help Center`,
    description: cfg.tagline,
    url: '',
    canonical: canonicalFor(cfg, ''),
    navLinks,
    activeNav: 'index.html',
    cfg,
    content: render.indexContent(categories, cfg, '')
  });

  // Contact escape page
  writePage('contact.html', {
    title: `Contact us — ${cfg.title}`,
    description: `How to reach a real person at ${cfg.title}.`,
    url: 'contact.html',
    canonical: canonicalFor(cfg, 'contact.html'),
    navLinks,
    activeNav: '__contact__',
    cfg,
    content: render.contactContent(cfg, '')
  });

  // 404
  writePage('404.html', {
    title: `Page not found — ${cfg.title}`,
    description: 'That page does not exist.',
    url: '404.html',
    canonical: '',
    navLinks,
    activeNav: '',
    cfg,
    content: render.notFoundContent(cfg, '')
  });

  // Category pages
  for (const cat of categories) {
    writePage(path.join(cat.slug, 'index.html'), {
      title: `${cat.name} — ${cfg.title}`,
      description: (cfg.category_descriptions || {})[cat.slug] || `Questions about ${cat.name}.`,
      url: `${cat.slug}/index.html`,
      canonical: canonicalFor(cfg, `${cat.slug}/index.html`),
      navLinks,
      activeNav: `${cat.slug}/index.html`,
      cfg,
      content: render.categoryContent(cat, cfg, '../')
    });
  }

  // Article pages (one level down)
  for (const post of posts) {
    const cat = categories.find(c => c.slug === post.categorySlug);
    if (!cat) throw new Error(`internal: no category object for ${post.categorySlug}`);
    writePage(post.url, {
      title: `${post.title} — ${cfg.title}`,
      description: post.summary,
      url: post.url,
      canonical: canonicalFor(cfg, post.url),
      navLinks,
      activeNav: `${post.categorySlug}/index.html`,
      cfg,
      content: render.articleContent(post, cat, cfg, '../')
    });
  }

  return { outDir, cfg, categories, posts, pages };
}

module.exports = { buildSite, parseFrontMatter, loadConfig, collectPosts };

if (require.main === module) {
  try {
    const r = buildSite();
    console.log(`Built ${r.pages + 1} files (incl. search index) into dist/`);
    console.log(`  categories: ${r.categories.length} (${r.categories.map(c => c.name).join(', ')})`);
    console.log(`  articles:   ${r.posts.length}`);
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}
