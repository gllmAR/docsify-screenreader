import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://example.test/' });
global.window = dom.window;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ok - ' + msg);
  } else {
    failures++;
    console.error('  FAIL - ' + msg);
  }
}

const { build } = await import('../src/chunker.js');

const html = `
<h1>Getting Started</h1>
<p>Hello world. This is <strong>bold</strong> text! Short.</p>
<ul>
  <li>Item one</li>
  <li>Outer item
    <ul><li>Nested entry</li></ul>
  </li>
</ul>
<pre><code>const x = 1;</code></pre>
<blockquote><p>Quoted wisdom.</p></blockquote>
<table><tr><td>cell alpha</td><td>cell beta</td></tr></table>
<p id="long">${'A very long sentence that keeps going and going. '.repeat(12)}</p>
<nav>Skip me</nav>
`;

document.body.innerHTML = '<main class="markdown-section">' + html + '</main>';
const root = document.querySelector('.markdown-section');

console.log('# chunker: prose mode');
const doc = build(root, { readCode: false });

assert(doc.title === 'Getting Started', 'title extracted from h1');
assert(doc.blocks.some((b) => b.kind === 'heading'), 'heading block present');
assert(!doc.blocks.some((b) => b.el.tagName === 'PRE'), 'pre skipped when readCode off');
assert(!doc.items.some((i) => i.text.includes('Skip me')), 'nav content excluded');
assert(!doc.blocks.some((b) => b.el.tagName === 'BLOCKQUOTE'), 'blockquote itself not a block (its p is)');

const nested = doc.items.filter((i) => i.text.includes('Nested'));
assert(nested.length === 1, 'nested li spoken exactly once (got ' + nested.length + ')');

const hello = doc.items.find((i) => i.text.startsWith('Hello world.'));
assert(!!hello, 'sentence split on period');
const boldSent = doc.items.find((i) => i.text.includes('bold'));
assert(!!boldSent && !boldSent.text.includes('Hello world.'), 'exclamation also splits sentences');

for (const it of doc.items) {
  const b = doc.blocks[it.bi];
  assert(it.start >= 0 && it.end <= b.utt.length, 'item offsets inside block utt [bi=' + it.bi + ']');
}
const longItems = doc.items.filter((i) => i.bi === doc.blocks.length - 2 || true).filter((i) => i.text.startsWith('A very long'));
assert(longItems.every((i) => i.end - i.start <= 240), 'long sentence capped at ~230 chars');
assert(longItems.length > 1, 'long paragraph produced multiple items (' + longItems.length + ')');

console.log('# chunker: readCode mode');
const docCode = build(root, { readCode: true });
assert(docCode.blocks.some((b) => b.kind === 'code'), 'code block included when toggled');
assert(docCode.items.some((i) => i.text.includes('const x = 1;')), 'code text becomes an item');

console.log('# mapping integrity');
for (const it of docCode.items.slice(0, 40)) {
  const b = docCode.blocks[it.bi];
  const slice = b.utt.slice(it.start, it.end).replace(/\s+/g, ' ').trim();
  if (slice !== it.text) {
    failures++;
    console.error('  FAIL - roundtrip slice mismatch: [' + slice + '] vs [' + it.text + ']');
    break;
  }
}
console.log('  ok - first 40 items roundtrip through utt offsets');

console.log('# player state machine');
class FakeSynth {
  constructor() { this.utterances = []; this.speaking = false; this.pending = false; this.paused = false; }
  speak(u) {
    this.utterances.push(u);
    u.text = u.text;
    setTimeout(() => {
      u.onboundary && u.onboundary({ charIndex: 0, charLength: 4, name: 'word' });
      u.onstart && u.onstart();
      setTimeout(() => u.onend && u.onend(), 0);
    }, 0);
  }
  cancel() {}
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  getVoices() { return []; }
}
global.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; }
};
global.speechSynthesis = new FakeSynth();

const { default: Player } = await import('../src/player.js');
{
  const p = new Player();
  const events = [];
  p.on('sentence', (i, it, active) => events.push(['s', i, active]));
  p.on('finish', () => events.push(['finish']));
  const small = build(
    (() => {
      document.body.innerHTML = '<main class="markdown-section"><p>One. Two. Three.</p></main>';
      return document.querySelector('.markdown-section');
    })(),
    { readCode: false }
  );
  p.setItems(small.items, '/test');
  p.playFrom(0);
  await new Promise((r) => setTimeout(r, 30));
  assert(p.state === 'idle', 'player returns to idle after queue drains');
  const sentEvents = events.filter((e) => e[0] === 's');
  assert(sentEvents.map((e) => e[1]).join(',') === '0,1,2', 'chained all three sentences in order (got ' + JSON.stringify(sentEvents.map((e) => e[1])) + ')');
  assert(events.includes('finish') || events.some((e) => e[0] === 'finish'), 'finish event emitted');
}

console.log('# front matter parsing');
const { parseFrontMatter } = await import('../src/frontmatter.js');
const fm1 = parseFrontMatter('---\nlang: fr\ntitle: "Test Page"\n---\n\n# Body');
assert(fm1.lang === 'fr', 'unquoted scalar parsed (lang: fr)');
assert(fm1.title === 'Test Page', 'quoted scalar unquoted');
const fm2 = parseFrontMatter("---\nlang: 'zh-CN'\n---\nbody");
assert(fm2.lang === 'zh-CN', 'single-quoted scalar parsed');
const fm3 = parseFrontMatter('# no front matter here');
assert(Object.keys(fm3).length === 0, 'absent front matter yields empty object');
const fm4 = parseFrontMatter('---\n# a comment\nlang: ja\ninvalid line without colon\n---\nx');
assert(fm4.lang === 'ja' && !fm4['invalid line without colon'], 'comments and malformed lines skipped');

console.log('# CJK sentence splitting');
document.body.innerHTML =
  '<main class="markdown-section">' +
  '<p>\u5E8A\u524D\u660E\u6708\u5149\uFF0C\u7591\u662F\u5730\u4E0A\u971C\u3002\u4E3E\u5934\u671B\u660E\u6708\uFF0C\u4F4E\u5934\u601D\u6545\u4E61\u3002</p>' +
  '<p>\u4ECA\u65E5\u306F\u3044\u3044\u5929\u6C17\u3067\u3059\u306D\uFF01\u516C\u5712\u306B\u884C\u304D\u307E\u305B\u3093\u304B\uFF1F\u4E00\u7DD2\u306B\u6563\u6B69\u3057\u307E\u3057\u3087\u3046\u3002</p>' +
  '</main>';
const cjkDoc = build(document.querySelector('.markdown-section'), { readCode: false });
const zhItems = cjkDoc.items.filter((i) => i.text.includes('\u3002') || !i.text.includes('\uFF0C'));
assert(zhItems.length >= 3, 'Chinese poem split at full stops (got ' + zhItems.length + ' items)');
const zhFirst = cjkDoc.blocks[0].sentences;
assert(zhFirst.length === 2, 'two Chinese sentences from two \u3002 terminators');
const jaPara = cjkDoc.blocks[1];
const jaTexts = jaPara.sentences.map((r) => jaPara.utt.slice(r.start, r.end));
assert(jaTexts.length === 3, 'Japanese split at \uFF01 \uFF1F and \u3002 (got ' + jaTexts.length + ')');
assert(jaTexts[0].endsWith('\uFF01'), 'first Japanese sentence ends with exclamation');

console.log('# highlight support detection with shadowed global CSS');
const hl = await import('../src/highlighter.js');
const cssCalls = [];
global.CSS = '.sidebar-nav li > ul { display: none; }';
window.CSS = { highlights: { set: (k) => cssCalls.push(['set', k]), delete: (k) => cssCalls.push(['del', k]) } };
window.Highlight = class {};
hl.init();
document.body.innerHTML = '<main class="markdown-section"><p>Shadow detection sentence.</p></main>';
{
  const doc = build(document.querySelector('.markdown-section'), { readCode: false });
  hl.show(doc.blocks[0], doc.items[0], false);
  hl.word(doc.items[0].start + 0, 7, doc.items[0].end);
  assert(cssCalls.some((c) => c[0] === 'set' && c[1] === 'dsr-sentence'), 'sentence highlight uses window.CSS.highlights despite shadowed global CSS');
  assert(cssCalls.some((c) => c[0] === 'set' && c[1] === 'dsr-word'), 'word highlight uses window.CSS.highlights despite shadowed global CSS');
  hl.reset();
}

console.log('# fallback word tracking (no Highlight API)');
delete window.CSS;
delete window.Highlight;
hl.init();
document.body.innerHTML = '<main class="markdown-section"><p id="fb">Hello world this is a test sentence.</p></main>';
{
  const doc = build(document.querySelector('.markdown-section'), { readCode: false });
  const blk = doc.blocks[0];
  const item = doc.items[0];
  hl.show(blk, item, false);
  const words = [[0, 5], [6, 5], [12, 4], [17, 2], [20, 1], [22, 4], [27, 9]];
  let allOk = true;
  for (const [idx, len] of words) {
    hl.word(item.start + idx, len, item.end);
    const spans = blk.el.querySelectorAll('.dsr-fbw');
    const expect = item.text.slice(idx, idx + len);
    if (spans.length !== 1 || (spans[0].textContent || '') !== expect) {
      allOk = false;
      console.error('  FAIL - fallback word [' + expect + '] -> ' + spans.length + ' span(s): ' + (spans[0] && spans[0].textContent));
    }
  }
  assert(allOk, 'fallback tracks every word, one span at a time');
  hl.clearWord();
  assert(blk.el.querySelectorAll('.dsr-fbw').length === 0, 'fallback highlight clears on stop');
  hl.reset();
}

console.log('# fallback word ending at a text-node boundary');
{
  document.body.innerHTML = '<main class="markdown-section"><p id="fb2">Mixed <strong>bold</strong> words</p></main>';
  const doc = build(document.querySelector('.markdown-section'), { readCode: false });
  const blk = doc.blocks[0];
  const item = doc.items[0];
  hl.show(blk, item, false);
  const idx = item.text.indexOf('bold');
  hl.word(item.start + idx, 4, item.end);
  const spans = blk.el.querySelectorAll('.dsr-fbw');
  assert(spans.length === 1 && spans[0].textContent === 'bold', 'word ending at a piece boundary still wraps (got ' + (spans[0] && spans[0].textContent) + ')');
  hl.reset();
}

console.log(failures ? ('\n' + failures + ' FAILURE(S)') : '\nAll smoke tests passed');
process.exit(failures ? 1 : 0);
