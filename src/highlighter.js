const HL_WORD = 'dsr-word';
const HL_SENT = 'dsr-sentence';

let supportsHL = false;
let fbSpans = [];
let curPieces = [];
let curBlockEl = null;

export function init() {
  supportsHL = typeof CSS !== 'undefined' && CSS.highlights && typeof window.Highlight === 'function';
  const style = document.createElement('style');
  style.id = 'dsr-highlight-styles';
  style.textContent =
    '::highlight(' + HL_WORD + '){background-color:#ffd54f;color:#10131a;}\n' +
    '::highlight(' + HL_SENT + '){background-color:rgba(122,162,255,.16);text-decoration:none;}\n' +
    '.markdown-section .dsr-fbs{background:rgba(122,162,255,.16);border-radius:3px;box-shadow:0 0 0 3px rgba(122,162,255,.16);transition:background .2s;}\n' +
    '.dsr-fbw{background:#ffd54f;color:#10131a;border-radius:2px;}';
  document.head.appendChild(style);
}

export function reset() {
  clearFallback();
  if (curBlockEl) {
    curBlockEl.classList.remove('dsr-fbs');
    curBlockEl = null;
  }
  if (supportsHL) {
    CSS.highlights.delete(HL_WORD);
    CSS.highlights.delete(HL_SENT);
  }
  curPieces = [];
  lastBlockKey = -1;
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
      CSS.highlights.set(HL_SENT, new window.Highlight(sentRange));
    } else {
      CSS.highlights.delete(HL_SENT);
    }
    CSS.highlights.delete(HL_WORD);
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
    if (r) CSS.highlights.set(HL_WORD, new window.Highlight(r));
  } else if (curBlockEl && document.contains(curBlockEl)) {
    const r = makeRange(curPieces, s, e);
    if (r && r.startContainer === r.endContainer && r.startContainer.nodeType === 3) {
      try {
        const span = document.createElement('span');
        span.className = 'dsr-fbw';
        r.surroundContents(span);
        fbSpans.push(span);
      } catch (err) {}
    }
  }
}

function clearFallback() {
  for (const s of fbSpans) {
    if (s.parentNode) {
      while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
      s.parentNode.removeChild(s);
    }
  }
  fbSpans = [];
}

export function clearWord() {
  if (supportsHL) CSS.highlights.delete(HL_WORD);
  for (const s of fbSpans) {
    if (s.parentNode) {
      while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
      s.parentNode.removeChild(s);
    }
  }
  fbSpans = [];
}

function makeRange(pieces, start, end) {
  const a = locate(pieces, start);
  const b = locate(pieces, end - 1 >= start ? end : start + 1);
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

function locate(pieces, abs) {
  for (const p of pieces) {
    if (abs >= p.uStart && abs < p.uEnd) {
      return { node: p.node, offset: abs - p.uStart };
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
