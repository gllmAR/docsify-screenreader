const FALLBACK_LIGHT = { bg: '#ffffff', fg: '#333333' };
const FALLBACK_DARK = { bg: '#1f2428', fg: '#dddddd' };

const activeWatchers = [];

function computedVar(el, name) {
  try {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || '';
  } catch (e) {
    return '';
  }
}

function probeColor(varName, fallbackEl, fallbackProp) {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.background = 'var(' + varName + ')';
  document.body.appendChild(probe);
  let c = '';
  try {
    c = getComputedStyle(probe).backgroundColor;
  } catch (e) {}
  document.body.removeChild(probe);
  if (!c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c)) {
    if (fallbackEl) {
      try {
        const fb = getComputedStyle(fallbackEl)[fallbackProp || 'backgroundColor'];
        if (fb && fb !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(fb)) return fb;
      } catch (e) {}
    }
    return '';
  }
  return c;
}

export function parseColorToRgb(str) {
  if (!str) return null;
  const s = str.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?/.exec(s);
  if (m) {
    let a = 1;
    if (m[4] != null) {
      a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    }
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }
  return null;
}

export function luminance(rgb) {
  if (!rgb) return 1;
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

export function resolveTheme() {
  const rootEl = document.documentElement;
  const body = document.body;

  let bg =
    probeColor('--color-bg', body, 'backgroundColor') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? FALLBACK_DARK.bg : FALLBACK_LIGHT.bg);

  let fg = computedVar(rootEl, '--color-text');
  if (!fg) {
    try {
      fg = getComputedStyle(body).color || '';
    } catch (e) {}
  }

  const dark = luminance(parseColorToRgb(bg)) < 0.5;
  const themeColor = computedVar(rootEl, '--theme-color');
  const radius = computedVar(rootEl, '--border-radius');
  const fontFamily = computedVar(rootEl, '--font-family');
  const mono2 = computedVar(rootEl, '--color-mono-2');
  const mono3 = computedVar(rootEl, '--color-mono-3');
  const borderColor = computedVar(rootEl, '--border-color');
  const markBg = computedVar(rootEl, '--mark-bg');

  return {
    dark,
    vars: {
      '--dsr-bg': bg,
      '--dsr-fg': fg,
      '--dsr-accent': themeColor || (dark ? '#7aa2ff' : '#4f6ef7'),
      '--dsr-muted': mono3 || 'color-mix(in srgb, var(--dsr-fg), var(--dsr-bg) 55%)',
      '--dsr-border': borderColor || mono2 || 'color-mix(in srgb, var(--dsr-fg), var(--dsr-bg) 88%)',
      '--dsr-hover': 'color-mix(in srgb, var(--dsr-fg), transparent 90%)',
      '--dsr-panel': 'color-mix(in srgb, var(--dsr-bg), transparent 4%)',
      '--dsr-inset': mono2 || 'color-mix(in srgb, var(--dsr-fg), var(--dsr-bg) 93%)',
      '--dsr-radius': radius || '14px',
      '--dsr-font': fontFamily || "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
      '--dsr-shadow': dark ? 'rgba(0,0,0,.55)' : 'rgba(30,35,60,.22)',
      '--dsr-mark': markBg || '#ffd54f'
    }
  };
}

export function applyTheme(host) {
  const t = resolveTheme();
  for (const k of Object.keys(t.vars)) {
    host.style.setProperty(k, t.vars[k]);
  }
  host.style.setProperty('--dsr-dark', t.dark ? '1' : '0');
  return t.dark;
}

export function watchTheme(onChange) {
  let timer = null;
  let firstSchedule = 0;
  const DEBOUNCE = 120;
  const MAX_WAIT = 700;
  const isOwnStyle = (node) => node && node.id === 'dsr-highlight-styles';
  const schedule = () => {
    const now = Date.now();
    if (!firstSchedule) firstSchedule = now;
    const starved = now - firstSchedule > MAX_WAIT;
    if (timer && !starved) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      firstSchedule = 0;
      try {
        onChange();
      } catch (e) {}
    }, starved ? 0 : DEBOUNCE);
  };

  const mq = matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', schedule);

  const attrObs = new MutationObserver(schedule);
  attrObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode'] });

  const headObs = new MutationObserver((muts) => {
    let relevant = false;
    for (const m of muts) {
      if (isOwnStyle(m.target)) continue;
      if (m.type === 'childList') {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && !isOwnStyle(n)) {
            relevant = true;
            break;
          }
        }
        if (!relevant && m.removedNodes.length) relevant = true;
      } else if (m.type === 'attributes' && /link|style/i.test(m.target.nodeName)) {
        relevant = true;
      }
      if (relevant) break;
    }
    if (relevant) schedule();
  });
  headObs.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });

  const entry = { mq, schedule, attrObs, headObs };
  activeWatchers.push(entry);

  return () => {
    const i = activeWatchers.indexOf(entry);
    if (i !== -1) activeWatchers.splice(i, 1);
    attrObs.disconnect();
    headObs.disconnect();
    if (mq.removeEventListener) mq.removeEventListener('change', schedule);
  };
}
