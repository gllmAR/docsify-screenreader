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

console.log(failures ? ('\n' + failures + ' FAILURE(S)') : '\nAll smoke tests passed');
process.exit(failures ? 1 : 0);
