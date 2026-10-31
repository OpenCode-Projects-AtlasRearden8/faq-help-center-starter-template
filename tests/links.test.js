'use strict';

// Link integrity tests: every internal link (and fragment) in every generated
// page must resolve to a real file / real heading. External links and
// system-ish schemes are skipped by design.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { freshBuild } = require('./helpers');

test('all internal links resolve to real files (and real fragments)', () => {
  const r = freshBuild();
  const dist = r.outDir;
  const htmlFiles = [];
  (function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  })(dist);
  assert.ok(htmlFiles.length > 0, 'found generated pages to scan');

  const missing = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const links = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    for (const rawHref of links) {
      const href = rawHref.trim();
      // skip anything that is not a project-relative link
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // http:, mailto:, etc.
      if (href.startsWith('//')) continue;
      if (href.startsWith('#')) continue; // in-page anchor: checked separately
      const [filePart, frag] = href.split('#');
      if (!filePart) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(filePart));
      if (!fs.existsSync(target)) {
        missing.push(`${path.relative(dist, file)} -> ${rawHref}`);
        continue;
      }
      if (frag && target.endsWith('.html')) {
        const targetHtml = fs.readFileSync(target, 'utf8');
        const ids = new Set([...targetHtml.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
        if (!ids.has(frag)) {
          missing.push(`${path.relative(dist, file)} -> ${rawHref} (fragment not found)`);
        }
      }
    }
  }
  assert.deepEqual(missing, [], 'all internal links must resolve');
});

test('sample content contains cross-links so integrity is exercised', () => {
  const r = freshBuild();
  assert.ok(r.posts.length >= 10, 'enough sample articles to be meaningful');
  const withLinks = r.posts.filter(p => /<a href="\.\.\//.test(p.html) || /<a href="[a-z]/.test(p.html));
  assert.ok(withLinks.length >= 3, 'at least three articles cross-link to others');
});

test('the known-good fragment anchors used by sample content exist', () => {
  const r = freshBuild();
  const example = fs.readFileSync(
    path.join(r.outDir, 'returns-refunds/return-policy.html'),
    'utf8'
  );
  assert.ok(example.includes('id="the-short-version"'));
});
