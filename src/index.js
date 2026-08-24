import prefs from './prefs.js';
import { build as buildDoc } from './chunker.js';
import { parseFrontMatter } from './frontmatter.js';
import Player from './player.js';
import * as hl from './highlighter.js';
import KeepAlive from './keepalive.js';
import { createWidget } from './widget.js';
import { resolveTheme, watchTheme } from './theme.js';

const DEFAULT_OPTS = { position: 'bottom-right', lang: '', readCode: false };

function currentPath() {
  const h = location.hash || '';
  const p = h.replace(/^#/, '').split('?')[0];
  return p && p !== '/' ? p : '/';
}

function contentEl() {
  return (
    document.querySelector('.markdown-section') ||
    document.querySelector('#main') ||
    document.querySelector('main')
  );
}

function screenreaderPlugin(hook, vm) {
  if (!('speechSynthesis' in window)) return;

  let opts = DEFAULT_OPTS;
  try {
    opts = Object.assign({}, DEFAULT_OPTS, (window.$docsify && window.$docsify.screenreader) || {});
  } catch (e) {}

  let settings;
  let player = null;
  let keepAlive = null;
  let widget = null;
  let doc = null;
  let path = '/';
  let pageMeta = {};
  let pageLang = '';
  let lastSave = 0;
  let inited = false;

  function loadSettings() {
    settings = {
      rate: prefs.read('rate', 1),
      pitch: prefs.read('pitch', 1),
      volume: prefs.read('volume', 1),
      voiceURI: prefs.read('voiceURI', ''),
      highlight: prefs.read('highlight', true),
      autoScroll: prefs.read('autoScroll', true),
      keepAwake: prefs.read('keepAwake', false),
      readCode: prefs.read('readCode', !!opts.readCode),
      enabled: prefs.read('enabled', false),
      hidden: prefs.read('hidden', false),
      pos: prefs.read('pos', null),
      voiceByLang: prefs.read('voiceByLang', {})
    };
  }

  function init() {
    if (inited) return;
    inited = true;
    loadSettings();
    hl.init();
    let lastHlSig = '';
    const applyHlColors = () => {
      const t = resolveTheme();
      const sig = t.vars['--dsr-mark'] + '|' + (t.dark ? 'd' : 'l');
      if (sig === lastHlSig) return;
      lastHlSig = sig;
      hl.setColors(t.vars['--dsr-mark'], t.dark ? '#0f1115' : '#10131a');
    };
    applyHlColors();
    watchTheme(applyHlColors);

    player = new Player();
    player.lang =
      opts.lang ||
      (document.documentElement.getAttribute('lang') || navigator.language || 'en').slice(0, 2);
    player.rate = settings.rate;
    player.pitch = settings.pitch;
    player.volume = settings.volume;
    player.voiceURI = settings.voiceURI;

    keepAlive = new KeepAlive();
    keepAlive.initMediaSession({
      play: () => player.resume(),
      pause: () => player.pause(),
      stop: () => player.stop(),
      previoustrack: () => player.prevSection(),
      nexttrack: () => player.nextSection()
    });

    widget = createWidget({
      settings,
      handlers: {
        onTogglePlay: () => player.toggle(),
        onStop: () => player.stop(),
        onNextSentence: () => player.nextSentence(),
        onPrevSentence: () => player.prevSentence(),
        onNextSection: () => player.nextSection(),
        onPrevSection: () => player.prevSection(),
        onSeek: (i) => player.seek(i),
        onHide: () => {},
        onChange: onChange
      }
    });

    player.on('start', () => {
      widget.updatePlayState('playing');
      keepAlive.setPlaybackState('playing');
      keepAlive.startAudio();
      if (settings.keepAwake) keepAlive.acquireWake();
    });

    player.on('sentence', (i, item, active) => {
      widget.setProgress(i, player.items.length, active);
      widget.setStatus(item.section, item.text.length > 110 ? item.text.slice(0, 110) + '\u2026' : item.text);
      if (active && settings.highlight) {
        hl.show(doc.blocks[item.bi], item, settings.autoScroll);
      }
      savePosition();
      updateMsPosition();
    });

    player.on('boundary', (cursor, absStart, len) => {
      if (!settings.highlight) return;
      const it = player.items[cursor];
      if (it) hl.word(absStart, len, it.end);
    });

    const toIdle = () => {
      widget.updatePlayState(player.state);
      keepAlive.setPlaybackState('none');
      keepAlive.stopAudio();
      keepAlive.releaseWake();
      hl.clearWord();
      savePosition(true);
      updateMsPosition();
    };
    player.on('pause', () => {
      widget.updatePlayState('paused');
      keepAlive.setPlaybackState('paused');
      keepAlive.releaseWake();
    });
    player.on('resume', () => {
      widget.updatePlayState('playing');
      keepAlive.setPlaybackState('playing');
      keepAlive.startAudio();
      if (settings.keepAwake) keepAlive.acquireWake();
    });
    player.on('stop', toIdle);
    player.on('finish', toIdle);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        keepAlive.noteHidden(player.state === 'playing');
      } else {
        const was = keepAlive.takeWasPlaying();
        if (was && player.state === 'playing' && !speechSynthesis.speaking && !speechSynthesis.pending) {
          player.recoverAfterBackground();
        }
        if (settings.keepAwake && player.state !== 'idle') keepAlive.acquireWake();
      }
    });

    window.addEventListener('beforeunload', () => savePosition(true));

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        widget.toggleVisibility();
      }
    });

    document.addEventListener('click', onContentClick);

    refreshVoices();
    if (speechSynthesis.addEventListener) {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    }
    setTimeout(refreshVoices, 500);
    setTimeout(refreshVoices, 2000);
  }

  function refreshVoices() {
    const vs = speechSynthesis.getVoices();
    if (!vs || !vs.length) return;
    const list = vs.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));
    const pref = (player.lang || '').toLowerCase();
    list.sort((a, b) => {
      const am = a.lang.toLowerCase().indexOf(pref) === 0 ? 0 : 1;
      const bm = b.lang.toLowerCase().indexOf(pref) === 0 ? 0 : 1;
      if (am !== bm) return am - bm;
      return a.name.localeCompare(b.name);
    });
    widget.setVoices(list, player.voiceURI);
  }

  function resolveVoiceForLang(lang) {
    const vs = speechSynthesis.getVoices();
    if (!vs || !vs.length) {
      refreshVoices();
      setTimeout(() => resolveVoiceForLang(lang), 600);
      return;
    }
    const norm = (lang || '').toLowerCase().replace('_', '-');
    let pick = null;
    const remembered = settings.voiceByLang[lang];
    if (remembered) pick = vs.find((v) => v.voiceURI === remembered) || null;
    if (!pick && settings.voiceURI) {
      const saved = vs.find((v) => v.voiceURI === settings.voiceURI);
      if (saved && (!norm || saved.lang.toLowerCase().replace('_', '-').indexOf(norm) === 0)) {
        pick = saved;
      }
    }
    if (!pick && norm) {
      const matches = vs.filter((v) => v.lang.toLowerCase().replace('_', '-').indexOf(norm) === 0);
      pick =
        matches.find((v) => v.lang.toLowerCase().replace('_', '-') === norm) ||
        matches.find((v) => v.localService) ||
        matches[0] ||
        null;
    }
    player.setVoice(pick ? pick.voiceURI : '');
    if (pick) {
      settings.voiceByLang[lang] = pick.voiceURI;
      prefs.write('voiceByLang', settings.voiceByLang);
    }
    refreshVoices();
  }

  function updateMsPosition() {
    const t = player.estimateTiming();
    keepAlive.updatePositionState(t.duration, t.position, player.state === 'playing');
  }

  function savePosition(force) {
    if (!player.items.length) return;
    const now = Date.now();
    if (!force && now - lastSave < 700) return;
    lastSave = now;
    prefs.write('lastPosition', { path: path, index: player.cursor });
  }

  function rebuild(preserveFraction) {
    const totalBefore = player.items.length;
    const frac = totalBefore && player.cursor >= 0 ? player.cursor / totalBefore : 0;
    const wasPlaying = player.state === 'playing';
    player.stop(true);
    doc = buildDoc(contentEl(), { readCode: settings.readCode });
    player.setItems(doc.items, path);
    hl.reset();
    widget.setProgress(player.cursor, doc.items.length, false);
    widget.setStatus(doc.title, '');
    keepAlive.updateMetadata(doc.title, '');
    if (doc.items.length && preserveFraction !== undefined) {
      player.seek(Math.round(frac * doc.items.length));
    }
    if (wasPlaying && doc.items.length) {
      player.playFrom(Math.round(frac * Math.max(doc.items.length - 1, 0)));
    }
  }

  function onChange(key, val) {
    prefs.write(key, val);
    switch (key) {
      case 'voiceURI':
        player.setVoice(val);
        if (pageLang) {
          settings.voiceByLang[pageLang] = val;
          prefs.write('voiceByLang', settings.voiceByLang);
        }
        break;
      case 'rate':
      case 'pitch':
      case 'volume':
        player[key] = val;
        updateMsPosition();
        break;
      case 'highlight':
        if (!val) hl.clearWord();
        else if (player.state === 'playing' && player.items[player.cursor]) {
          hl.show(doc.blocks[player.items[player.cursor].bi], player.items[player.cursor], settings.autoScroll);
        }
        break;
      case 'keepAwake':
        if (val && player.state !== 'idle') keepAlive.acquireWake();
        else keepAlive.releaseWake();
        break;
      case 'enabled':
        widget.setEnabled(val);
        if (!val) {
          if (player.state !== 'idle') player.stop();
          hl.reset();
        }
        break;
      case 'readCode':
        rebuild(0);
        break;
      default:
        break;
    }
  }

  function onContentClick(e) {
    if (!inited || !settings.enabled || !doc || !doc.items.length) return;
    if (widget.host.contains(e.target)) return;
    const t = e.target;
    if (t.closest && t.closest('a,button,input,select,textarea,label,summary,details,video,audio,form,.badge,.dsr-ignore')) return;
    const sel = window.getSelection();
    if (sel && String(sel).length > 0) return;
    const rootEl = contentEl();
    if (!rootEl || !rootEl.contains(t)) return;
    const hit = t.closest('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,figcaption,dt,dd');
    if (!hit) return;
    for (let bi = 0; bi < doc.blocks.length; bi++) {
      const b = doc.blocks[bi];
      if (b.el === hit || b.el.contains(hit)) {
        const idx = doc.firstItemOfBlock.get(bi);
        if (idx === undefined) return;
        const curBi = player.items[player.cursor] ? player.items[player.cursor].bi : -1;
        if (player.state === 'playing' && curBi === bi) player.playFrom(idx);
        else player.playFrom(idx);
        return;
      }
    }
  }

  hook.beforeEach((markdown) => {
    pageMeta = parseFrontMatter(markdown);
    return markdown;
  });

  hook.doneEach(() => {
    init();
    path = currentPath();
    player.stop(true);
    keepAlive.stopAudio();
    keepAlive.releaseWake();
    keepAlive.setPlaybackState('none');
    hl.clearWord();

    const fm = Object.assign(
      {},
      (vm && (vm.frontmatter || vm.frontMatter)) || {},
      pageMeta
    );
    pageLang = String(fm.lang || '').trim();
    if (!pageLang) pageLang = opts.lang || '';
    if (!pageLang) pageLang = document.documentElement.getAttribute('lang') || '';
    if (!pageLang) pageLang = (navigator.language || 'en').slice(0, 2);
    player.lang = pageLang;
    resolveVoiceForLang(pageLang);

    doc = buildDoc(contentEl(), { readCode: settings.readCode });
    player.setItems(doc.items, path);
    hl.reset();
    widget.updatePlayState('idle');
    widget.setProgress(player.cursor, doc.items.length, false);
    widget.setStatus(doc.title, '');
    keepAlive.updateMetadata(doc.title, pageLang ? pageLang.toUpperCase() : '');

    const saved = prefs.read('lastPosition', null);
    if (saved && saved.path === path && saved.index > 0 && saved.index < doc.items.length) {
      player.seek(saved.index);
    } else if (doc.items.length) {
      widget.setProgress(0, doc.items.length, false);
      widget.setStatus(doc.blocks[0].section, doc.items[0].text.slice(0, 110));
    }

    window.__dsr = {
      player: player,
      getLang: () => pageLang,
      getDoc: () => doc
    };
  });
}

if (typeof window !== 'undefined') {
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [...(window.$docsify.plugins || []), screenreaderPlugin];
}
