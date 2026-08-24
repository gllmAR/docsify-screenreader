import { piecesOf } from './chunker.js';

const HL_WORD = 'dsr-word';
const HL_SENT = 'dsr-sentence';

let supportsHL = false;
let fbSpans = [];
let lastFbWord = null;
let curPieces = [];
let curBlockEl = null;
let styleEl = null;

export function init() {
  supportsHL = !!(window.CSS && window.CSS.highlights && typeof window.Highlight === 'function');
  styleEl = document.createElement('style');
  styleEl.id = 'dsr-highlight-styles';
  document.head.appendChild(styleEl);
  setColors('#ffd54f', '#10131a');
}

export function setColors(markBg, markFg) {
  if (!styleEl) return;
  styleEl.textContent =
    '::highlight(' + HL_WORD + '){background-color:' + (markBg || '#ffd54f') + ';color:' + (markFg || '#10131a') + ';}\n' +
    '::highlight(' + HL_SENT + '){background-color:rgba(122,162,255,.16);text-decoration:none;}\n' +
    '.markdown-section .dsr-fbs{background:rgba(122,162,255,.16);border-radius:3px;box-shadow:0 0 0 3px rgba(122,162,255,.16);transition:background .2s;}\n' +
    '.dsr-fbw{background:' + (markBg || '#ffd54f') + ';color:' + (markFg || '#10131a') + ';border-radius:2px;}';
}

export function reset() {
  clearFallback();
  if (curBlockEl) {
    curBlockEl.classList.remove('dsr-fbs');
    curBlockEl = null;
  }
  if (supportsHL) {
    window.CSS.highlights.delete(HL_WORD);
    window.CSS.highlights.delete(HL_SENT);
  }
  curPieces = [];
}

export function show(block, item, autoScroll) {
  if (!block) return;
  if (block.el !== curBlockEl) {
    clearFallback();
    if (curBlockEl) curBlockEl.classList.remove('dsr-fbs');
    curBlockEl = block.el || null;
  }
  curPieces = block.pieces || [];

  if (supportsHL) {
    const sentRange = makeRange(curPieces, item.start, item.end);
    if (sentRange) {
      window.CSS.highlights.set(HL_SENT, new window.Highlight(sentRange));
    } else {
      window.CSS.highlights.delete(HL_SENT);
    }
    window.CSS.highlights.delete(HL_WORD);
  } else if (curBlockEl) {
    curBlockEl.classList.add('dsr-fbs');
  }

  if (autoScroll && block.el && document.contains(block.el)) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      block.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    } catch (e) {
      block.el.scrollIntoView();
    }
  }
}

export function word(absStart, length, sentEnd) {
  let s = absStart;
  let e = absStart + Math.max(1, length);
  if (typeof sentEnd === 'number') e = Math.min(e, sentEnd);
  if (supportsHL) {
    const r = makeRange(curPieces, s, e);
    if (r) window.CSS.highlights.set(HL_WORD, new window.Highlight(r));
  } else if (curBlockEl && document.contains(curBlockEl)) {
    if (lastFbWord) {
      unwrapSpan(lastFbWord);
      lastFbWord = null;
    }
    const r = makeRange(piecesOf(curBlockEl), s, e);
    if (r && r.startContainer === r.endContainer && r.startContainer.nodeType === 3) {
      try {
        const span = document.createElement('span');
        span.className = 'dsr-fbw';
        r.surroundContents(span);
        fbSpans.push(span);
        lastFbWord = span;
      } catch (err) {}
    }
  }
}

function unwrapSpan(span) {
  if (!span || !span.parentNode) return;
  while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
  span.parentNode.removeChild(span);
}

function clearFallback() {
  for (const s of fbSpans) unwrapSpan(s);
  fbSpans = [];
  lastFbWord = null;
}

export function clearWord() {
  if (supportsHL) window.CSS.highlights.delete(HL_WORD);
  for (const s of fbSpans) unwrapSpan(s);
  fbSpans = [];
  lastFbWord = null;
}

function makeRange(pieces, start, end) {
  const hasLen = end - 1 >= start;
  const a = locate(pieces, start, false);
  const b = locate(pieces, hasLen ? end : start + 1, hasLen);
  if (!a || !b) return null;
  if (!a.node.isConnected || !b.node.isConnected) return null;
  try {
    const range = document.createRange();
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
    return range;
  } catch (e) {
    return null;
  }
}

function locate(pieces, abs, atEnd) {
  for (const p of pieces) {
    if (abs >= p.uStart && abs < p.uEnd) {
      return { node: p.node, offset: abs - p.uStart };
    }
    if (atEnd && abs === p.uEnd && p.node.nodeValue != null) {
      return { node: p.node, offset: p.node.nodeValue.length };
    }
  }
  if (pieces.length) {
    const last = pieces[pieces.length - 1];
    if (abs === last.uEnd && last.node.nodeValue != null) {
      return { node: last.node, offset: last.node.nodeValue.length };
    }
  }
  return null;
}
