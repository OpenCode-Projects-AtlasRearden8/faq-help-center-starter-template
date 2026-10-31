'use strict';

// Tiny, dependency-free Markdown subset renderer.
// Supports: front matter is handled elsewhere; headings (#..###), paragraphs,
// bullet/ordered lists (with continuation lines), blockquotes, fenced code
// blocks, horizontal rules, **bold**, *italic*, `code`, [links](targets).
// Any HTML characters in content are escaped; link targets that look like
// scripts are dropped. This is intentionally small — it renders FAQ pages,
// not the whole Markdown spec.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s) {
  const out = String(s).toLowerCase()
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || 'section';
}

const CODE_RE = /`([^`]+)`/g;
const LINK_RE = /\[([^\]]+)\]\(([^()\s]+)\)/g;

function safeHref(href) {
  const h = href.trim();
  if (/^(javascript|data|vbscript):/i.test(h)) return null;
  return h;
}

// Renders bold/italic/links in text that has already been HTML-escaped.
function restInline(escaped) {
  let s = escaped;
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*]+)\*(?![*\w])/g, '$1<em>$2</em>');
  s = s.replace(LINK_RE, (m, label, href) => {
    const ok = safeHref(href);
    if (!ok) return label;
    const ext = /^https?:\/\//i.test(ok);
    return `<a href="${ok}"${ext ? ' rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  return s;
}

// Renders inline Markdown in a raw string (escaping happens inside here).
function firstInline(text) {
  let out = '';
  let last = 0;
  let m;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(text))) {
    out += restInline(escapeHtml(text.slice(last, m.index)));
    out += `<code>${escapeHtml(m[1])}</code>`;
    last = m.index + m[0].length;
  }
  out += restInline(escapeHtml(text.slice(last)));
  return out;
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const BLOCK_START = /^(#{1,3}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|(-{3,}|\*{3,})\s*$)/;

// Renders block-level Markdown from source to an HTML string.
function renderBlocks(src) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^```/.test(line)) {
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence (or run off the end)
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length + 1; // # becomes h2 — page h1 is the question title
      out.push(`<h${level} id="${slugify(h[2])}">${firstInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote>' + renderBlocks(buf.join('\n')) + '</blockquote>');
      continue;
    }

    const lm = LIST_RE.exec(line);
    if (lm) {
      const indent = lm[1].length;
      const ordered = /\d/.test(lm[2][0]);
      const items = [];
      while (i < lines.length) {
        // Skip blank lines between items.
        while (i < lines.length && lines[i].trim() === '' &&
               i + 1 < lines.length) {
          const nm = LIST_RE.exec(lines[i + 1]);
          if (nm && nm[1].length === indent) { i++; } else { break; }
        }
        const m2 = LIST_RE.exec(lines[i]);
        if (!(m2 && m2[1].length === indent)) break;
        let text = m2[3];
        i++;
        // Continuation lines (deeper indent) fold into the item text.
        while (i < lines.length && lines[i].trim() !== '') {
          const cm = LIST_RE.exec(lines[i]);
          if (cm && cm[1].length === indent) break;
          if (cm && cm[1].length > indent) { text += ' ' + cm[3].trim(); i++; continue; }
          if (BLOCK_START.test(lines[i])) break;
          if ((lines[i].length - lines[i].replace(/^\s+/, '').length) > indent) {
            text += ' ' + lines[i].trim();
            i++;
          } else break;
        }
        items.push(text);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map(t => `<li>${firstInline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Paragraph: gather until blank line or a block starts.
    const para = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${firstInline(para.join(' ').trim())}</p>`);
  }
  return out.join('\n');
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  escapeHtml,
  slugify,
  firstInline,
  renderMarkdown: renderBlocks,
  stripHtml
};
