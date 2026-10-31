'use strict';

// Search index tests: one entry per article, honest text, working URLs (so
// search-as-you-type never dead-ends), and the home page wiring that uses it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { freshBuild } = require('./helpers');

function readIndex(r) {
  const raw = fs.readFileSync(path.join(r.outDir, 'assets', 'search-index.js'), 'utf8');
  return JSON.parse(/^window\.SEARCH_INDEX = ([\s\S]+);\n$/.exec(raw)[1]);
}

test('search index covers every article exactly once', () => {
  const r = freshBuild();
  const entries = readIndex(r);
  assert.equal(entries.length, r.posts.length);

  const byUrl = new Map(entries.map(e => [e.url, e]));
  assert.equal(byUrl.size, entries.length, 'no duplicate URLs in the index');

  for (const post of r.posts) {
    const e = byUrl.get(post.url);
    assert.ok(e, `missing index entry for ${post.url}`);
    assert.equal(e.title, post.title);
    assert.equal(e.category, post.category);
    assert.ok(fs.existsSync(path.join(r.outDir, e.url)), `indexed URL does not resolve: ${e.url}`);
  }
});

test('every index entry has searchable text', () => {
  const r = freshBuild();
  for (const e of readIndex(r)) {
    assert.ok(e.title && e.title.length >= 3, `empty title in index: ${e.url}`);
    assert.ok(e.summary && e.summary.length >= 10, `empty summary in index: ${e.url}`);
    assert.ok(e.text && e.text.length >= 40, `index text too thin: ${e.url}`);
    assert.ok(!/<[a-z]+/i.test(e.text), `index text must be plain, not html: ${e.url}`);
  }
});

test('index text is derived from article bodies (spot check)', () => {
  const r = freshBuild();
  const entries = readIndex(r);
  const shipping = entries.find(e => /ship/.test(e.title.toLowerCase()));
  assert.ok(shipping, 'an article about shipping exists in the index');
  assert.ok(
    /carrier|business days|tracking/i.test(shipping.text),
    'shipping entry carries real article words'
  );
});

test('home page wires up search-as-you-type for every page surface', () => {
  const r = freshBuild();
  for (const url of ['index.html', 'contact.html', ...r.posts.map(p => p.url)]) {
    const html = fs.readFileSync(path.join(r.outDir, url), 'utf8');
    assert.ok(html.includes('id="search-input"'), `${url}: search input missing`);
    assert.ok(html.includes('id="search-results"'), `${url}: search results container missing`);
    assert.ok(html.includes('data-prefix'), `${url}: relative prefix hint missing`);
  }
});
