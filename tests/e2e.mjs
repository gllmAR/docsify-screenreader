import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { chromium, firefox } from 'playwright';

const ENGINE = process.env.BROWSER === 'firefox' ? firefox : chromium;

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = 4173;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.md': 'text/markdown', '.json': 'application/json', '.svg': 'image/svg+xml'
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/' || p === '') p = '/index.html';
    const fp = normalize(join(ROOT, p));
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('nf');
  }
});

let failures = 0;
const assert = (c, m) => { console.log((c ? '  ok - ' : '  FAIL - ') + m); if (!c) failures++; };

await new Promise((r) => server.listen(PORT, r));

const browser = await ENGINE.launch();
const page = await browser.newPage();

const consoleErrors = [];
const NOISE = /Failed to load resource|language.*required dependencies|downloadable font|XML Parsing Error/i;
page.on('console', (msg) => {
  if ((msg.type() === 'error' || msg.type() === 'warning') && !NOISE.test(msg.text())) {
    consoleErrors.push(msg.type() + ': ' + msg.text());
  }
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

console.log('# load & render');
assert(consoleErrors.length === 0, 'no console/page errors on load ' + JSON.stringify(consoleErrors.slice(0, 3)));

const contentLen = await page.evaluate(() => (document.querySelector('.markdown-section') || { innerHTML: '' }).innerHTML.length);
assert(contentLen > 100, 'docsify rendered markdown content (' + contentLen + ' chars)');

const fab = page.locator('#dsr-host');
assert(await fab.count() === 1, 'widget host injected');

console.log('# panel interaction');
await page.locator('#dsr-host .fab').click();
await page.waitForTimeout(200);
const panelOpen = await page.locator('#dsr-host .panel.open').count();
assert(panelOpen === 1, 'panel opens on FAB tap');

const progressLabel = await page.locator('#dsr-host .plabel').textContent();
assert(/\/\s*\d+/.test(progressLabel) && !/nothing to read/.test(progressLabel), 'progress shows sentence count ("' + progressLabel.trim() + '")');

const voiceOpts = await page.locator('#dsr-host .voice option').count();
console.log('  info - voice options: ' + voiceOpts);

console.log('# playback');
await page.locator('#dsr-host .bplay').click();
await page.waitForTimeout(1200);
const playingClass = await page.locator('#dsr-host .fab.playing').count();
const statusText = await page.locator('#dsr-host .status').textContent();
assert(playingClass === 1, 'FAB enters playing state');
assert(statusText.trim().length > 5, 'status shows current sentence ("' + statusText.trim().slice(0, 60) + '...")');

await page.locator('#dsr-host .bnext').click();
await page.waitForTimeout(400);
const label2 = await page.locator('#dsr-host .plabel').textContent();
assert(!/^1 \//.test(label2.trim()), 'next-sentence advances cursor ("' + label2.trim() + '")');

await page.locator('#dsr-host .bstop').click();
await page.waitForTimeout(300);

console.log('# highlight');
await page.locator('#dsr-host .bplay').click();
await page.waitForTimeout(1000);
const hlCount = await page.evaluate(() =>
  window.CSS && CSS.highlights ? Array.from(CSS.highlights.keys()).length : -1
);
console.log('  info - CSS.highlights entries while playing: ' + hlCount);
await page.locator('#dsr-host .bstop').click();

console.log('# SPA navigation');
await page.click('a[href="#/tests/structures"]');
await page.waitForTimeout(900);
const labelNav = await page.locator('#dsr-host .plabel').textContent();
assert(!/nothing to read/.test(labelNav), 're-chunked after route change ("' + labelNav.trim() + '")');

console.log('# theme adaptation');
const bgVar = await page.evaluate(() => document.getElementById('dsr-host').style.getPropertyValue('--dsr-bg'));
assert(!!bgVar && bgVar.trim().length > 0, '--dsr-bg resolved from site theme ("' + bgVar.trim() + '")');
await page.evaluate(() => {
  const s = document.createElement('style');
  s.id = 'dsr-dark-test';
  s.textContent = ':root{--color-bg:#1f2428;--color-text:#ddd;}';
  document.head.appendChild(s);
});
await page.waitForTimeout(500);
const darkState = await page.evaluate(() => ({
  dark: document.getElementById('dsr-host').style.getPropertyValue('--dsr-dark'),
  bg: document.getElementById('dsr-host').style.getPropertyValue('--dsr-bg')
}));
assert(darkState.dark === '1', 'widget flips to dark when site tokens change (' + darkState.bg.trim() + ')');
assert(darkState.bg.toLowerCase().includes('31') || darkState.bg.toLowerCase().includes('1f2428'), 'dark background picked up');
await page.evaluate(() => document.getElementById('dsr-dark-test').remove());
await page.waitForTimeout(400);

console.log('# prefs persistence');
await page.locator('#dsr-host .s-rate').fill('1.5');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const rateVal = await page.locator('#dsr-host .s-rate').inputValue();
assert(rateVal === '1.5', 'rate persisted across reload');

console.log('# language override (front matter)');
await page.goto(`http://127.0.0.1:${PORT}/#/tests/i18n/french`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
let dsr = await page.evaluate(() => ({ lang: window.__dsr && window.__dsr.getLang(), voice: window.__dsr.player.voiceURI, voices: speechSynthesis.getVoices().length }));
assert(dsr.lang === 'fr', 'front matter lang applied (' + dsr.lang + ')');
assert(dsr.voice && dsr.voices > 0 && (dsr.voice.toLowerCase().includes('fr') || (() => { const v = speechSynthesis.getVoices().find((x) => x.voiceURI === dsr.voice); return v && v.lang.toLowerCase().startsWith('fr'); })()), 'french voice auto-selected (' + dsr.voice + ')');

await page.goto(`http://127.0.0.1:${PORT}/#/tests/i18n/japanese`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
dsr = await page.evaluate(() => ({ lang: window.__dsr.getLang(), voice: window.__dsr.player.voiceURI }));
assert(dsr.lang === 'ja', 'lang switches per page (' + dsr.lang + ')');
const jaVoiceOk = await page.evaluate(() => {
  const v = speechSynthesis.getVoices().find((x) => x.voiceURI === window.__dsr.player.voiceURI);
  return !v || v.lang.toLowerCase().startsWith('ja');
});
assert(jaVoiceOk, 'japanese-compatible voice selected');

await page.goto(`http://127.0.0.1:${PORT}/#/tests/i18n/chinese`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
dsr = await page.evaluate(() => ({ lang: window.__dsr.getLang(), n: window.__dsr.getDoc().items.length }));
assert(dsr.lang === 'zh', 'chinese lang applied');
assert(dsr.n >= 8, 'chinese page chunked into sentences without spaces (' + dsr.n + ' items)');

await page.goto(`http://127.0.0.1:${PORT}/#/tests/long-form`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
dsr = await page.evaluate(() => window.__dsr.getLang());
assert(dsr === 'en', 'falls back to en on pages without front matter (' + dsr + ')');

console.log('');
if (consoleErrors.length) {
  console.log('captured console output:');
  for (const c of consoleErrors.slice(0, 10)) console.log('  ' + c.slice(0, 200));
}
console.log(failures ? failures + ' FAILURE(S)' : 'All e2e checks passed');
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
