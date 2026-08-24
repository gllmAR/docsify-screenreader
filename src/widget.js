import { ICONS, panelHtml, escapeHtml } from './widget-template.js';
import { applyTheme, watchTheme } from './theme.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createWidget(opts) {
  const settings = opts.settings;
  const handlers = opts.handlers || {};

  const host = document.createElement('div');
  host.id = 'dsr-host';
  const root = host.attachShadow({ mode: 'open' });
  const wrap = document.createElement('div');
  wrap.innerHTML = panelHtml();
  root.appendChild(wrap);
  document.body.appendChild(host);

  const $ = (sel) => wrap.querySelector(sel);
  const fab = $('.fab');
  const tab = $('.tab');
  const panel = $('.panel');
  const ptitle = $('.ptitle');
  const bplay = $('.bplay');
  const bstop = $('.bstop');
  const progress = $('.progress input');
  const plabel = $('.plabel');
  const statusEl = $('.status');
  const sRate = $('.s-rate');
  const sPitch = $('.s-pitch');
  const sVol = $('.s-vol');
  const vRate = $('.v-rate');
  const vPitch = $('.v-pitch');
  const vVol = $('.v-vol');
  const voiceSel = $('.voice');

  let playing = false;
  let dragging = false;
  let suppressClick = false;
  let enabled = true;
  let curState = 'idle';
  let count = 0;

  function refreshDisabled() {
    const off = !enabled;
    bplay.disabled = count === 0;
    bstop.disabled = off || (!playing && curState !== 'paused');
    $('.bnext').disabled = off;
    $('.bprev').disabled = off;
    $('.bnextsec').disabled = off;
    $('.bprevsec').disabled = off;
    progress.disabled = off || count === 0;
  }

  function applyFabPos() {
    let p = settings.pos;
    if (!p || typeof p.x !== 'number') {
      p = { x: window.innerWidth - 66, y: window.innerHeight - 96 };
    }
    fab.style.left = clamp(p.x, 4, window.innerWidth - 50) + 'px';
    fab.style.top = clamp(p.y, 4, window.innerHeight - 50) + 'px';
  }

  applyFabPos();
  window.addEventListener('resize', () => {
    if (settings.pos) {
      settings.pos.x = clamp(settings.pos.x, 4, window.innerWidth - 50);
      settings.pos.y = clamp(settings.pos.y, 4, window.innerHeight - 50);
      applyFabPos();
      if (panel.classList.contains('open')) anchorPanel();
    }
  });

  function anchorPanel() {
    if (window.innerWidth <= 480) return;
    const r = fab.getBoundingClientRect();
    const vw = window.innerWidth;
    if (r.left + r.width / 2 > vw / 2) {
      panel.style.left = 'auto';
      panel.style.right = Math.max(6, vw - r.right) + 'px';
    } else {
      panel.style.right = 'auto';
      panel.style.left = Math.max(6, r.left) + 'px';
    }
    if (r.top > window.innerHeight / 2) {
      panel.style.top = 'auto';
      panel.style.bottom = (window.innerHeight - r.top + 12) + 'px';
      panel.style.maxHeight = Math.min(Math.max(window.innerHeight - r.top - 24, 240), 600) + 'px';
    } else {
      panel.style.bottom = 'auto';
      panel.style.top = (r.top + r.height + 12) + 'px';
      panel.style.maxHeight = Math.min(Math.max(window.innerHeight - r.top - 92, 240), 600) + 'px';
    }
  }

  function openPanel() {
    panel.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    anchorPanel();
    if (handlers.onCollapsed) handlers.onCollapsed(false);
  }

  function closePanel() {
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    if (handlers.onCollapsed) handlers.onCollapsed(true);
  }

  function setHidden(h) {
    settings.hidden = !!h;
    fab.style.display = h ? 'none' : 'flex';
    tab.style.display = h ? 'flex' : 'none';
    if (h) closePanel();
  }

  tab.addEventListener('click', () => {
    setHidden(false);
    if (handlers.onChange) handlers.onChange('hidden', false);
    openPanel();
  });

  $('.close').addEventListener('click', closePanel);
  $('.hide').addEventListener('click', () => {
    setHidden(true);
    if (handlers.onHide) handlers.onHide();
  });

  let px = 0;
  let py = 0;
  let movedFar = false;

  fab.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    movedFar = false;
    px = e.clientX;
    py = e.clientY;
    try { fab.setPointerCapture(e.pointerId); } catch (err) {}
  });

  fab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    if (!movedFar && Math.abs(dx) + Math.abs(dy) < 6) return;
    movedFar = true;
    px = e.clientX;
    py = e.clientY;
    if (!settings.pos) {
      settings.pos = { x: parseInt(fab.style.left, 10) || 0, y: parseInt(fab.style.top, 10) || 0 };
    }
    settings.pos.x = clamp(settings.pos.x + dx, 4, window.innerWidth - 50);
    settings.pos.y = clamp(settings.pos.y + dy, 4, window.innerHeight - 50);
    applyFabPos();
  });

  fab.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (movedFar) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 120);
      if (handlers.onChange) handlers.onChange('pos', { x: settings.pos.x, y: settings.pos.y });
      if (panel.classList.contains('open')) anchorPanel();
    }
  });

  fab.addEventListener('pointercancel', () => {
    dragging = false;
  });

  fab.addEventListener('click', () => {
    if (suppressClick || dragging) return;
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });

  function renderPlayIcon() {
    bplay.innerHTML = playing ? ICONS.pause : ICONS.play;
    bplay.title = playing ? 'Pause' : 'Play';
    bplay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  renderPlayIcon();

  bplay.addEventListener('click', () => {
    if (!enabled) {
      setEnabled(true);
      if (handlers.onChange) handlers.onChange('enabled', true);
    }
    handlers.onTogglePlay && handlers.onTogglePlay();
  });
  bstop.addEventListener('click', () => handlers.onStop && handlers.onStop());
  $('.bnext').addEventListener('click', () => handlers.onNextSentence && handlers.onNextSentence());
  $('.bprev').addEventListener('click', () => handlers.onPrevSentence && handlers.onPrevSentence());
  $('.bnextsec').addEventListener('click', () => handlers.onNextSection && handlers.onNextSection());
  $('.bprevsec').addEventListener('click', () => handlers.onPrevSection && handlers.onPrevSection());

  progress.addEventListener('input', () => {
    const i = parseInt(progress.value, 10) || 0;
    const max = parseInt(progress.max, 10) || 0;
    plabel.textContent = max > 0 ? (i + 1) + ' / ' + (max + 1) : '\u2013';
  });
  progress.addEventListener('change', () => {
    if (handlers.onSeek) handlers.onSeek(parseInt(progress.value, 10) || 0);
  });

  function bindRange(input, valEl, fmt, key) {
    input.value = settings[key];
    valEl.textContent = fmt(settings[key]);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valEl.textContent = fmt(v);
      settings[key] = v;
      if (handlers.onChange) handlers.onChange(key, v);
    });
  }
  bindRange(sRate, vRate, (v) => '\u00d7' + v.toFixed(2), 'rate');
  bindRange(sPitch, vPitch, (v) => v.toFixed(2), 'pitch');
  bindRange(sVol, vVol, (v) => Math.round(v * 100) + '%', 'volume');

  voiceSel.addEventListener('change', () => {
    if (handlers.onChange) handlers.onChange('voiceURI', voiceSel.value);
  });

  function bindCheck(input, key) {
    input.checked = !!settings[key];
    input.addEventListener('change', () => {
      settings[key] = input.checked;
      if (handlers.onChange) handlers.onChange(key, input.checked);
    });
  }
  bindCheck($('.c-hl'), 'highlight');
  bindCheck($('.c-scroll'), 'autoScroll');
  bindCheck($('.c-wake'), 'keepAwake');
  bindCheck($('.c-code'), 'readCode');

  function setEnabled(on) {
    enabled = !!on;
    settings.enabled = enabled;
    fab.classList.toggle('off', !enabled);
    ptitle.classList.toggle('off', !enabled);
    ptitle.setAttribute('aria-checked', enabled ? 'true' : 'false');
    refreshDisabled();
  }

  ptitle.addEventListener('click', () => {
    const next = !enabled;
    setEnabled(next);
    if (handlers.onChange) handlers.onChange('enabled', next);
  });

  setHidden(!!settings.hidden);
  setEnabled(!!settings.enabled);
  applyTheme(host);
  watchTheme(() => applyTheme(host));

  return {
    host,
    updatePlayState(state) {
      playing = state === 'playing';
      curState = state;
      renderPlayIcon();
      fab.classList.toggle('playing', playing);
      refreshDisabled();
    },
    setProgress(cursor, total, active) {
      const n = Math.max(total, 0);
      count = n;
      progress.max = String(Math.max(n - 1, 0));
      progress.value = String(clamp(cursor, 0, Math.max(n - 1, 0)));
      plabel.textContent = n ? (cursor + 1) + ' / ' + n : 'nothing to read on this page';
      refreshDisabled();
    },
    setEnabled,
    setStatus(section, snippet) {
      statusEl.innerHTML =
        '<b>' + escapeHtml(section || '\u00a0') + '</b>' + escapeHtml(snippet || '');
    },
    setVoices(list, selected) {
      voiceSel.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = 'System default voice';
      voiceSel.appendChild(def);
      for (const v of list) {
        const o = document.createElement('option');
        o.value = v.uri;
        o.textContent = v.name + ' (' + v.lang + ')';
        voiceSel.appendChild(o);
      }
      voiceSel.value = selected || '';
      if (voiceSel.value !== (selected || '')) voiceSel.value = '';
    },
    setHidden,
    isHidden() {
      return !!settings.hidden;
    },
    toggleVisibility() {
      const h = !settings.hidden;
      setHidden(h);
      if (handlers.onChange) handlers.onChange('hidden', h);
      if (!h) openPanel();
    },
    togglePanel() {
      if (panel.classList.contains('open')) closePanel();
      else openPanel();
    },
    isOpen() {
      return panel.classList.contains('open');
    }
  };
}
