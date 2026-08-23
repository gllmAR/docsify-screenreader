# docsify-screenreader

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
- **Zero dependencies**, one file (~31 KB minified), everything scoped in a shadow root

## Widget guide

| Element | Action |
| ------- | ------ |
| Floating button | Tap to expand/collapse the panel; drag to move (position is remembered) |
| « / » | Jump to previous / next heading section |
| ◀ / ▶ | Previous / next sentence |
| Progress bar | Click or drag to seek |
| Hide button | Removes the UI; a slim tab stays docked at the right edge |
| Edge tab or `Alt`+`R` | Bring the widget back |

### Keyboard

| Shortcut | Action |
| -------- | ------ |
| `Alt` + `R` | Toggle widget visibility |

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
5. Preferences live under `localStorage` keys prefixed `docsify-screenreader:`.

## Development

This repository doubles as the test site (GitHub Pages serves the repo root).

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

## License

[MIT](LICENSE)
