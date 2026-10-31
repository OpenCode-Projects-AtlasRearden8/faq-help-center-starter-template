'use strict';

// Shared test helper: builds the site once into a fresh temp dir. Each test
// file gets its own temp build so tests never depend on (or pollute) dist/.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('../build');

function freshBuild() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faq-test-'));
  const result = buildSite({ outDir });
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    // The project's own dist build (npm run build) must not collide or confuse
    // tests; they only assert inside outDir.
  }
  return result;
}

module.exports = { freshBuild };
