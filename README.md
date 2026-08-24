# docsify-screenreader

[![Deploy to GitHub Pages](https://github.com/gllmAR/docsify-screenreader/actions/workflows/deploy.yml/badge.svg)](https://github.com/gllmAR/docsify-screenreader/actions/workflows/deploy.yml)

A [Docsify 5](https://docsify.js.org) plugin that adds a floating text-to-speech widget to your docs. It reads your pages aloud sentence by sentence, highlights the current word, keeps playing when the phone screen turns off (Android), and puts play/pause controls on the lock screen via the Media Session API. All preferences persist in `localStorage`.

**Live demo & test pages:** https://gllmar.github.io/docsify-screenreader/

## Quick start

Add one line after your docsify script:

```html
<script src="https://cdn.jsdelivr.net/npm/docsify@5"></script>
<script src="https://gllmar.github.io/docsify-screenreader/docsify-screenreader.min.js"></script>
```

That's it. A small floating speaker button appears on every page.

Optional configuration:

```html
<script>
  window.$docsify = {
    screenreader: {
      position: 'bottom-right', // default FAB corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
      lang: 'en',               // voice language hint; falls back to <html lang>, then browser locale
      readCode: false           // speak fenced code blocks by default
    }
  };
</script>
```

## Features

- **Simple collapsible widget** — a draggable floating button expands into a full control panel
- **Reader enable switch** — a prominent "Reader enabled" toggle at the top of the panel; switch the screen reader fully off (no paragraph-click reading, no playback) and back on. The floating button turns grey while the reader is off
- **Sentence-by-sentence reading** with natural chaining across the whole page
- **Current word highlight** — CSS Custom Highlight API where available, mark fallback elsewhere
- **Auto-scroll** to the section being read
- **Click any paragraph** to start reading from there
- **Transport controls** — play/pause/stop, previous/next sentence, previous/next section (« / »)
- **Clickable progress bar** — jump anywhere in the page's reading queue
- **Voice picker** — system voices filtered/sorted for your doc language, plus speed/pitch/volume sliders
- **Media Session integration** — lock screen metadata (page title + current heading) and headset/lock-screen buttons
- **Background playback keep-alive** — silent looping audio keeps the session alive on mobile
- **Keep screen on** option — Screen Wake Lock API while reading
- **Hide the widget** — fully hidden except a small edge tab; restore by tapping it or `Alt`+`R`
- **Position memory** — remembers where you stopped on each route and restores the cursor on return
- **Per-page language override** — front matter `lang:` switches voices automatically; CJK-aware sentence splitting
- **Theme adaptive** — mirrors Docsify 5 design tokens (light/dark) into the widget, live
- **Zero dependencies**, one file (~37 KB minified), everything scoped in a shadow root

## Widget guide

| Element | Action |
| ------- | ------ |
| Floating button | Tap to expand/collapse the panel; drag to move (position is remembered); turns grey while the reader is disabled |
| Reader enabled | Master switch at the top of the panel — uncheck to stop playback and disable paragraph-click reading |
| « / » | Jump to previous / next heading section |
| ◀ / ▶ | Previous / next sentence |
| Progress bar | Click or drag to seek |
| Hide button | Removes the UI; a slim tab stays docked at the right edge |
| Edge tab or `Alt`+`R` | Bring the widget back |

### Keyboard

| Shortcut | Action |
| -------- | ------ |
| `Alt` + `R` | Toggle widget visibility |

## Per-page language override

Any page can declare its own language via YAML front matter. On navigation the reader switches to a matching voice automatically:

```markdown
---
lang: fr
---

# Votre contenu en français
```

- Priority: front matter `lang` → `$docsify.screenreader.lang` → `<html lang>` → browser locale
- Your manual voice pick is remembered **per language** (`voiceByLang` pref): choose an Italian voice on an Italian page and it sticks only for Italian pages
- Sentence splitting understands CJK punctuation (`。` `！` `？`) even without spaces after them; word highlighting works there too
- If no installed voice matches, the system default is used instead of failing

Live examples: [language test pages](https://gllmar.github.io/docsify-screenreader/#/tests/i18n) (French, Italian, Finnish, Spanish, Chinese, Japanese).

## Mobile behavior (honest matrix)

| Capability | Android Chrome | iOS Safari |
| ---------- | -------------- | ---------- |
| Reading with screen on | Yes | Yes |
| Continues when screen locks | Yes (silent-audio + media session keep-alive) | No — iOS suspends JavaScript on lock |
| Lock-screen transport controls | Yes | Partial (metadata shown; buttons work only while active) |
| Resume after unlock | n/a (never stopped) | Yes — resumes from the exact sentence |
| Word highlight | Yes | Yes |
| Keep-screen-on toggle | Yes (Wake Lock API) | Yes (Wake Lock API 16.4+) |

The iOS limitation is a hard platform rule for all web apps; auto-resume is the best achievable without a native wrapper.

## How it works

1. On each Docsify route render (`doneEach`) the content DOM is walked into *blocks* (headings, paragraphs, list items, table cells), then split into sentences.
2. Each block records an exact map of utterance offsets back to its DOM text nodes.
3. The player chains one `SpeechSynthesisUtterance` per sentence. `onboundary` events give the current word offset, which the highlighter maps to a DOM range (CSS Custom Highlight API, falling back to wrapping marks).
4. A generated silent WAV loops in an `<audio>` element during playback, keeping the page's media session alive so Android continues in the background; Media Session handlers route lock-screen buttons to the player; a watchdog recovers from Chrome's speech-freeze bug; `visibilitychange` triggers resume-after-suspend.
5. The widget mirrors the site's Docsify 5 design tokens into its shadow root and re-resolves them when stylesheets or `<html>` classes change, so it always matches light/dark themes.
6. Preferences live under `localStorage` keys prefixed `docsify-screenreader:`.

## Development

Quick start (see **Building `docsify-screenreader.min.js`** above for full details):

```sh
npm install
npm run build     # bundle src/ -> ./docsify-screenreader.min.js
npm test          # jsdom smoke tests for chunker + player
npm run serve     # local server at http://localhost:3000
npm run watch     # rebuild on change
```

Manual device testing checklist lives on the [test pages](tests/long-form.md):

- **Long form** — continuous reading, lock/unlock resume, position memory
- **Structures** — lists, tables, quotes, nested headings read exactly once each
- **Code heavy** — code blocks skipped by default, included when toggled
- **Edge cases** — unicode, entities, abbreviations, empty headings

## Theme adaptation

The widget reads Docsify 5's design tokens (`--color-bg`, `--color-text`, `--theme-color`, `--border-radius`, `--font-family`, `--color-mono-*`, `--mark-bg`) from computed styles and mirrors them into its shadow root, so it matches whatever theme stack the site uses:

- **`dist/themes/core.min.css`** (light) → widget renders light with the site accent
- **core theme + `core-dark.css` addon** or any `:root{--color-bg:…}` override → widget flips dark automatically
- Word highlight follows the site's `--mark-bg`; accent, borders, radii and fonts all derive from site tokens
- Legacy themes without tokens (e.g. classic `vue.css`) fall back to a sensible palette driven by `prefers-color-scheme`
- A debounced MutationObserver on `<html>` attributes and `<head>` re-resolves live when stylesheets change — with a max-wait guard and self-mutation filtering so theme watchers can never starve each other

## Building `docsify-screenreader.min.js`

Prerequisites: Node.js ≥ 18 and npm. The bundle is produced by [esbuild](https://esbuild.github.io) from the ES modules in `src/` — there are no runtime dependencies.

```sh
npm install          # installs esbuild (+ jsdom/playwright for tests)
npm run build        # src/index.js -> ./docsify-screenreader.min.js
```

What `npm run build` does under the hood:

```
esbuild src/index.js --bundle --minify --format=iife --target=es2019 \
  --outfile=docsify-screenreader.min.js
```

| Flag | Why |
| ---- | --- |
| `--bundle` | Inlines `chunker/player/highlighter/keepalive/widget/prefs/frontmatter/theme` into one file |
| `--format=iife` | Immediately-invoked function; registers itself as `window.$docsify.plugins.push(...)` on load |
| `--minify` | Ships ~37 KB; safe for direct hot-linking |
| `--target=es2019` | Transpiles newer syntax down to broadly-supported browsers |

While developing use `npm run watch` (rebuilds on save), then serve locally:

```sh
npm run serve        # http://localhost:3000 — same layout GitHub Pages will serve
```

The built artifact is committed at the repository root, which doubles as the GitHub Pages web root — so users can hot-link `https://gllmar.github.io/docsify-screenreader/docsify-screenreader.min.js` directly from this repo.

## Tests

```sh
npm test               # jsdom unit/smoke tests (chunker, player, front matter, CJK)
npm run test:e2e       # Playwright headless Chromium against a local server
BROWSER=firefox npm run test:e2e   # same suite in Firefox
```

The e2e suite verifies rendering, panel interaction, playback state machine, highlight registry, SPA re-chunking, prefs persistence, language switching and light/dark adaptation.

## Deployment

`.github/workflows/deploy.yml` deploys on every push to `main`:

1. `npm ci` → `npm test` (unit gate)
2. `npm run build`
3. Assembles `_site/` (index.html, markdown, sidebar, fresh bundle, tests/)
4. Uploads via `actions/upload-pages-artifact` → publishes with `actions/deploy-pages`

One-time repo setting: **Settings → Pages → Source: “GitHub Actions”**.

## License

[MIT](LICENSE)
