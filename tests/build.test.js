'use strict';

// Build tests: the metadata-driven build must produce every expected page,
// copy assets, and read config + front matter without surprises.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { freshBuild } = require('./helpers');

test('build produces all expected pages', () => {
  const r = freshBuild();
  const files = r.posts.map(p => p.url);
  const pages = [
    'index.html',
    'contact.html',
    '404.html',
    ...r.categories.map(c => `${c.slug}/index.html`),
    ...files
  ];
  for (const rel of pages) {
    assert.ok(
      fs.existsSync(path.join(r.outDir, rel)),
      `missing generated page: ${rel}`
    );
  }
  assert.equal(r.pages, pages.length, 'page count matches expected set');
});

test('build copies assets and emits a parseable search index', () => {
  const r = freshBuild();
  for (const asset of ['assets/style.css', 'assets/search.js', 'assets/search-index.js']) {
    assert.ok(fs.existsSync(path.join(r.outDir, asset)), `missing asset: ${asset}`);
  }
  const raw = fs.readFileSync(path.join(r.outDir, 'assets', 'search-index.js'), 'utf8');
  const m = /^window\.SEARCH_INDEX = ([\s\S]+);\n$/.exec(raw);
  assert.ok(m, 'search-index.js has the expected shape');
  const entries = JSON.parse(m[1]);
  assert.ok(Array.isArray(entries) && entries.length === r.posts.length);
});

test('search index URLs point at files that exist', () => {
  const r = freshBuild();
  const raw = fs.readFileSync(path.join(r.outDir, 'assets', 'search-index.js'), 'utf8');
  const entries = JSON.parse(/^window\.SEARCH_INDEX = ([\s\S]+);\n$/.exec(raw)[1]);
  for (const e of entries) {
    assert.ok(
      fs.existsSync(path.join(r.outDir, e.url)),
      `search index URL does not resolve: ${e.url}`
    );
  }
});

test('every article page renders the contact escape block with the mail address', () => {
  const r = freshBuild();
  const email = r.cfg.contact.email;
  for (const post of r.posts) {
    const html = fs.readFileSync(path.join(r.outDir, post.url), 'utf8');
    assert.ok(html.includes('data-escape'), `${post.url}: escape block missing`);
    assert.ok(html.includes(email), `${post.url}: contact email missing from escape`);
    assert.ok(html.includes('data-print'), `${post.url}: print affordance missing`);
    assert.ok(html.includes(searchIndexTag), `${post.url}: search-index.js not included`);
    assert.ok(html.includes(searchJsTag), `${post.url}: search.js not included`);
  }
});

test('canonical link renders exactly when canonical_url is set', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.config.json'), 'utf8'));

  // without canonical_url: no canonical tag anywhere
  const noCanonical = freshBuild();
  const homeHtml = fs.readFileSync(path.join(noCanonical.outDir, 'index.html'), 'utf8');
  assert.ok(!homeHtml.includes('rel="canonical"'));

  // with canonical_url set: every page gets one, prefixed and slash-safe
  const cfg = JSON.parse(JSON.stringify(base));
  cfg.canonical_url = 'https://help.example.com/';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faq-canon-'));
  const { buildSite } = require('../build');
  const withCanonical = buildSite({ outDir: dir, configPath: writeConfig(cfg) });
  for (const url of ['', 'contact.html', ...withCanonical.posts.map(p => p.url)]) {
    const file = path.join(withCanonical.outDir, url || 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes(`href="https://help.example.com/${url}"`), `canonical wrong on ${url || 'index.html'}`);
  }
});

function writeConfig(cfg) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'faq-cfg-')), 'site.config.json');
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  return file;
}

test('bad front matter and bad config fail loudly', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { buildSite, parseFrontMatter } = require('../build');
  assert.throws(() => parseFrontMatter('body only, no front matter', 'x.md'));
  assert.throws(() =>
    buildSite({
      outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'faq-badcfg-')),
      configPath: writeConfig({ title: '', tagline: 'x', footer_text: 'x', footer_credit: 'x', contact: { email: 'ok@example.com' } })
    }),
    /title/
  );
});

const searchIndexTag = 'assets/search-index.js';
const searchJsTag = 'assets/search.js';
