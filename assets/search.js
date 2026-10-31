'use strict';

// Client-side search-as-you-type + small page behaviors (print button, "/ to
// focus search"). Hydrated from window.SEARCH_INDEX, which the build writes
// to assets/search-index.js. Every link is prefixed by data-prefix so pages
// work unchanged at any subpath or custom domain.
(function () {
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-print]');
    if (t) { e.preventDefault(); window.print(); }
  });

  var index = window.SEARCH_INDEX || [];
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var allQuestions = document.getElementById('all-questions');
  if (!input || !results) return;
  var prefix = document.body.getAttribute('data-prefix') || '';

  function score(entry, terms) {
    var title = (entry.title + ' ').toLowerCase();
    var summary = (entry.summary + ' ').toLowerCase();
    var cat = (entry.category + ' ').toLowerCase();
    var text = (entry.text + ' ').toLowerCase();
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var s = 0;
      if (title.indexOf(term) !== -1) s += 5;
      if (summary.indexOf(term) !== -1) s += 3;
      if (cat.indexOf(term) !== -1) s += 1;
      if (text.indexOf(term) !== -1) s += 1;
      if (s === 0) return 0; // every term must appear somewhere (AND)
      total += s;
    }
    return total;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function emphasize(s, terms) {
    var escaped = esc(s);
    if (!terms.length) return escaped;
    var re = new RegExp('(' + terms.map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|') + ')', 'gi');
    return escaped.replace(re, '<em>$&</em>');
  }

  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], terms);
      if (s > 0) hits.push({ e: index[i], s: s });
    }
    hits.sort(function (a, b) { return b.s - a.s || a.e.title.localeCompare(b.e.title); });
    return hits.map(function (h) { return h.e; });
  }

  function render(matches, terms) {
    if (!matches.length) {
      results.innerHTML = '<p class="search-empty">No matches here. Try fewer or shorter words &#8212; or use the contact link below; all answers have an escape hatch.</p>';
      allQuestions && (allQuestions.hidden = true);
      results.hidden = false;
      return;
    }
    var items = matches.slice(0, 12).map(function (m) {
      var cat = terms.length ? '<span class="result-cat">' + esc(m.category) + '</span>' : '';
      return '<li><a href="' + prefix + m.url + '"><span class="result-title">' +
        emphasize(m.title, terms) + '</span>' + cat + '</a></li>';
    });
    results.innerHTML = '<ul class="result-list">' + items.join('') + '</ul>';
    allQuestions && (allQuestions.hidden = true);
    results.hidden = false;
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    if (!q) {
      results.hidden = true;
      results.innerHTML = '';
      allQuestions && (allQuestions.hidden = false);
      return;
    }
    render(search(q), q.toLowerCase().split(/\s+/).filter(Boolean));
  });

  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if (e.key === '/' && !typing) {
      e.preventDefault();
      input.focus();
    } else if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.blur();
    }
  });
})();
