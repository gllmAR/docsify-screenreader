const EMIT_TAGS = new Set(['P', 'LI', 'TD', 'TH', 'CAPTION', 'FIGCAPTION', 'DT', 'DD', 'SUMMARY']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NAV', 'ASIDE', 'BUTTON', 'SVG', 'IFRAME', 'FORM', 'INPUT', 'SELECT', 'TEXTAREA', 'VIDEO', 'AUDIO', 'CANVAS', 'DATALIST', 'TEMPLATE']);
const MAX_SENT = 230;

function extractMappedText(el) {
  let utt = '';
  const pieces = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement;
    if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) continue;
    const raw = n.nodeValue;
    if (!raw) continue;
    pieces.push({ node: n, uStart: utt.length, uEnd: utt.length + raw.length });
    utt += raw;
  }
  return { utt, pieces };
}

function scanSentenceRanges(text) {
  const ranges = [];
  let start = 0;
  const terminators = '.!?\u2026';
  for (let i = 0; i < text.length; i++) {
    if (terminators.indexOf(text[i]) === -1) continue;
    let j = i + 1;
    while (j < text.length && terminators.indexOf(text[j]) !== -1) j++;
    if (j >= text.length || /\s/.test(text[j])) {
      pushRange(ranges, text, start, j);
      start = j;
      i = j - 1;
    } else {
      i = j - 1;
    }
  }
  pushRange(ranges, text, start, text.length);
  return mergeShort(ranges, text);
}

function pushRange(arr, text, start, end) {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (e - s < 2) return;
  if (arr.length && s < arr[arr.length - 1].end) return;
  arr.push({ start: s, end: e });
}

function mergeShort(ranges, text) {
  const out = [];
  for (const r of ranges) {
    const trimmedLen = text.slice(r.start, r.end).replace(/\s+/g, ' ').length;
    if (trimmedLen < 3 && out.length) {
      out[out.length - 1].end = r.end;
    } else {
      out.push({ start: r.start, end: r.end });
    }
  }
  return splitLong(out, text);
}

function splitLong(ranges, text) {
  const out = [];
  for (const r of ranges) {
    let s = r.start;
    while (r.end - s > MAX_SENT) {
      let cut = text.lastIndexOf(' ', s + MAX_SENT);
      if (cut <= s + 40) cut = s + MAX_SENT;
      out.push({ start: s, end: cut });
      s = cut;
      while (s < r.end && /\s/.test(text[s])) s++;
    }
    if (r.end - s >= 2) {
      if (out.length && s <= out[out.length - 1].end) out[out.length - 1].end = Math.max(out[out.length - 1].end, r.end);
      else out.push({ start: s, end: r.end });
    }
  }
  return out;
}

function collectBlocks(root, readCode) {
  const blocks = [];
  const seen = new Set();

  const emit = (el, kind, level) => {
    if (seen.has(el)) return false;
    seen.add(el);
    blocks.push({ el, kind, level });
    return true;
  };

  const walk = (node) => {
    for (const child of node.children) {
      const t = child.tagName;
      if (SKIP_TAGS.has(t)) continue;
      if (/^H[1-6]$/.test(t)) {
        emit(child, 'heading', parseInt(t[1], 10));
        continue;
      }
      if (t === 'PRE') {
        if (readCode) emit(child, 'code', 0);
        continue;
      }
      if (EMIT_TAGS.has(t)) {
        emit(child, 'text', 0);
        continue;
      }
      walk(child);
    }
  };

  walk(root);
  return blocks;
}

export function build(root, options) {
  const readCode = !!(options && options.readCode);
  const blocks = collectBlocks(root, readCode);
  const items = [];
  let section = '';
  let sectionLevel = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const { utt, pieces } = extractMappedText(b.el);
    b.utt = utt;
    b.pieces = pieces;
    if (b.kind === 'heading') {
      section = utt.replace(/\s+/g, ' ').trim();
      sectionLevel = b.level;
      b.section = section;
    } else {
      b.section = section;
    }
    b.level = b.kind === 'heading' ? b.level : sectionLevel;
    const ranges = b.kind === 'code'
      ? splitCodeRanges(utt)
      : scanSentenceRanges(utt);
    b.sentences = ranges;
    for (const r of ranges) {
      items.push({
        bi,
        start: r.start,
        end: r.end,
        text: utt.slice(r.start, r.end).replace(/\s+/g, ' ').trim(),
        section: b.section,
        heading: b.kind === 'heading'
      });
    }
  }

  let title = '';
  const h1 = root.querySelector('h1');
  if (h1) title = h1.textContent.replace(/\s+/g, ' ').trim();
  if (!title && document.title) title = document.title.trim();

  const firstItemOfBlock = new Map();
  items.forEach((it, i) => {
    if (!firstItemOfBlock.has(it.bi)) firstItemOfBlock.set(it.bi, i);
  });

  return { blocks, items, title, firstItemOfBlock };
}

function splitCodeRanges(text) {
  const out = [];
  let s = 0;
  while (s < text.length) {
    let e = Math.min(s + 180, text.length);
    if (e < text.length) {
      const nl = text.lastIndexOf('\n', e);
      const sp = text.lastIndexOf(' ', e);
      const cut = Math.max(nl, sp);
      if (cut > s + 20) e = cut;
    }
    let a = s;
    let b2 = e;
    while (a < b2 && /\s/.test(text[a])) a++;
    while (b2 > a && /\s/.test(text[b2 - 1])) b2--;
    if (b2 - a >= 1) out.push({ start: a, end: b2 });
    s = e;
    while (s < text.length && /\s/.test(text[s])) s++;
  }
  return out;
}
