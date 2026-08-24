export const ICONS = {
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
  prevSent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h2v12H7zM19 6v12l-8-6z"/></svg>',
  nextSent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6h2v12h-2zM5 6v12l8-6z"/></svg>',
  prevSec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7v10l-7-5zM10 7v10l-7-5z"/></svg>',
  nextSec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7v10l7-5zM14 7v10l7-5z"/></svg>'
};

export const STYLE = `
:host{all:initial}
*{box-sizing:border-box;margin:0;padding:0;font-family:var(--dsr-font,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif);-webkit-tap-highlight-color:transparent}
.fab{position:fixed;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--dsr-accent,#4f6ef7),color-mix(in srgb,var(--dsr-accent,#4f6ef7),#000 28%));color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483000;box-shadow:0 4px 14px var(--dsr-shadow,rgba(0,0,0,.35));border:none;padding:0;touch-action:none;transition:transform .15s ease}
.fab:hover{transform:scale(1.07)}
.fab:active{transform:scale(.96)}
.fab svg{width:22px;height:22px;fill:currentColor;pointer-events:none}
.fab.playing{animation:dsr-pulse 1.6s ease-out infinite}
.fab.off{opacity:.42;filter:grayscale(1);box-shadow:0 4px 14px var(--dsr-shadow,rgba(0,0,0,.22))}
@keyframes dsr-pulse{0%{box-shadow:0 4px 14px var(--dsr-shadow,rgba(0,0,0,.35)),0 0 0 0 color-mix(in srgb,var(--dsr-accent,#4f6ef7),transparent 45%)}70%{box-shadow:0 4px 14px var(--dsr-shadow,rgba(0,0,0,.35)),0 0 0 14px color-mix(in srgb,var(--dsr-accent,#4f6ef7),transparent 100%)}100%{box-shadow:0 4px 14px var(--dsr-shadow,rgba(0,0,0,.35)),0 0 0 0 color-mix(in srgb,var(--dsr-accent,#4f6ef7),transparent 100%)}}
.tab{position:fixed;right:0;top:58%;width:16px;height:68px;background:color-mix(in srgb,var(--dsr-fg,#333),transparent 62%);border-radius:10px 0 0 10px;border:none;cursor:pointer;z-index:2147483000;display:none;align-items:center;justify-content:center;opacity:.5;transition:opacity .2s,width .15s;padding:0}
.tab:hover,.tab:focus-visible{opacity:1;width:20px}
.tab span{color:var(--dsr-bg,#fff);font-size:15px;line-height:1;pointer-events:none}
.panel{position:fixed;width:min(92vw,332px);max-height:min(74vh,600px);overflow-y:auto;overscroll-behavior:contain;background:var(--dsr-panel,color-mix(in srgb,var(--dsr-bg,#fff),transparent 4%));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:var(--dsr-fg,#333);border:1px solid color-mix(in srgb,var(--dsr-fg,#333),var(--dsr-bg,#fff) 90%);border-radius:max(14px,var(--dsr-radius,3px));z-index:2147483001;box-shadow:0 12px 44px var(--dsr-shadow,rgba(0,0,0,.5));padding:14px;display:none;font-size:13px;line-height:1.45}
.panel.open{display:block}
.phead{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.ptitle{font-weight:700;font-size:14px;flex:1;display:flex;align-items:center;gap:7px;color:var(--dsr-fg,#333);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;border:none;background:none;padding:0;text-align:left;font-family:inherit}
.ptitle:focus-visible{outline:2px solid var(--dsr-accent,#4f6ef7);outline-offset:2px;border-radius:4px}
.ptitle.off{color:var(--dsr-muted,#98a0b3);opacity:.6}
.ptitle.off svg{fill:var(--dsr-muted,#98a0b3)}
.ptitle.off span::after{content:" \\00b7 off";font-weight:500}
.ptitle svg{width:16px;height:16px;fill:var(--dsr-accent,#4f6ef7);flex:0 0 auto}
.hbtn{background:var(--dsr-hover,color-mix(in srgb,var(--dsr-fg,#333),transparent 92%));border:none;color:var(--dsr-fg,#333);font-size:11.5px;padding:6px 10px;border-radius:calc(var(--dsr-radius,3px) + 5px);cursor:pointer;font-family:inherit}
.hbtn:hover{background:color-mix(in srgb,var(--dsr-accent,#4f6ef7),transparent 85%)}
.transport{display:flex;gap:7px;justify-content:center;margin:8px 0 4px}
.tbtn{width:40px;height:40px;border-radius:calc(var(--dsr-radius,3px) + 7px);background:var(--dsr-hover,color-mix(in srgb,var(--dsr-fg,#333),transparent 92%));border:none;color:var(--dsr-fg,#333);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s}
.tbtn:hover:not(:disabled){background:color-mix(in srgb,var(--dsr-fg,#333),transparent 84%)}
.tbtn:disabled{opacity:.32;cursor:default}
.tbtn svg{width:20px;height:20px;fill:currentColor;pointer-events:none}
.tbtn.main{width:48px;height:48px;background:linear-gradient(135deg,var(--dsr-accent,#4f6ef7),color-mix(in srgb,var(--dsr-accent,#4f6ef7),#000 22%));color:#fff;box-shadow:0 3px 10px var(--dsr-shadow,rgba(0,0,0,.4))}
.tbtn.main:hover:not(:disabled){filter:brightness(1.12)}
.progress{margin:8px 0 2px}
.progress input{width:100%;accent-color:var(--dsr-accent,#4f6ef7);height:5px;cursor:pointer;margin:0}
.plabel{text-align:center;color:var(--dsr-muted,#98a0b3);font-size:11px;margin-top:3px;font-variant-numeric:tabular-nums}
.status{background:var(--dsr-inset,color-mix(in srgb,var(--dsr-fg,#333),transparent 94%));border-radius:calc(var(--dsr-radius,3px) + 6px);padding:8px 11px;margin:8px 0;min-height:38px;color:var(--dsr-fg,#333);font-size:12px;max-height:66px;overflow:hidden}
.status b{color:var(--dsr-accent,#4f6ef7);font-weight:600;display:block;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.divider{height:1px;background:var(--dsr-border,color-mix(in srgb,var(--dsr-fg,#333),transparent 88%));margin:10px 0}
.setrow{display:flex;align-items:center;gap:9px;margin:8px 0}
.setrow label{flex:0 0 50px;color:var(--dsr-muted,#98a0b3);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.setrow input[type=range]{flex:1;accent-color:var(--dsr-accent,#4f6ef7);height:5px;cursor:pointer;margin:0}
.setrow .val{flex:0 0 36px;text-align:right;color:var(--dsr-muted,#98a0b3);font-size:11px;font-variant-numeric:tabular-nums}
.vlabel{color:var(--dsr-muted,#98a0b3);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;display:block;margin-bottom:4px}
select{width:100%;background:var(--dsr-inset,color-mix(in srgb,var(--dsr-fg,#333),transparent 93%));color:var(--dsr-fg,#333);border:1px solid var(--dsr-border,color-mix(in srgb,var(--dsr-fg,#333),transparent 87%));border-radius:calc(var(--dsr-radius,3px) + 6px);padding:8px 9px;font-size:12.5px;font-family:inherit;cursor:pointer}
select:focus-visible{outline:2px solid var(--dsr-accent,#4f6ef7);outline-offset:-1px}
select option{background:var(--dsr-bg,#fff);color:var(--dsr-fg,#333)}
.toggles{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;margin-top:2px}
.tg{display:flex;align-items:center;gap:7px;color:var(--dsr-fg,#333);font-size:12px;cursor:pointer;user-select:none}
.tg input{accent-color:var(--dsr-accent,#4f6ef7);width:15px;height:15px;cursor:pointer;flex:0 0 auto;margin:0}
.hint{margin-top:10px;color:var(--dsr-muted,#98a0b3);font-size:10.5px;text-align:center;line-height:1.7}
.hint kbd{background:var(--dsr-hover,color-mix(in srgb,var(--dsr-fg,#333),transparent 90%));border-radius:4px;padding:1px 5px;font-family:inherit;font-size:10px}
@media(max-width:480px){.panel{left:8px!important;right:8px!important;top:auto!important;bottom:64px!important;width:auto}}
`;

export function panelHtml() {
  return (
    '<style>' + STYLE + '</style>' +
    '<button class="fab" part="fab" aria-label="Screen reader" aria-expanded="false">' + ICONS.speaker + '</button>' +
    '<button class="tab" aria-label="Show screen reader"><span>&#127911;</span></button>' +
    '<div class="panel" role="dialog" aria-label="Screen reader controls">' +
      '<div class="phead">' +
        '<button class="ptitle" type="button" role="switch" aria-checked="true" title="Enable or disable the reader">' +
          ICONS.speaker + '<span>Screen Reader</span>' +
        '</button>' +
        '<button class="hbtn hide">Hide</button>' +
        '<button class="hbtn close" aria-label="Close panel">&#10005;</button>' +
      '</div>' +
      '<div class="transport">' +
        '<button class="tbtn bprevsec" title="Previous section">&#171;</button>' +
        '<button class="tbtn bprev" title="Previous sentence">' + ICONS.prevSent + '</button>' +
        '<button class="tbtn main bplay"></button>' +
        '<button class="tbtn bstop" title="Stop">' + ICONS.stop + '</button>' +
        '<button class="tbtn bnext" title="Next sentence">' + ICONS.nextSent + '</button>' +
        '<button class="tbtn bnextsec" title="Next section">&#187;</button>' +
      '</div>' +
      '<div class="progress">' +
        '<input type="range" min="0" max="0" value="0" step="1" aria-label="Reading position">' +
        '<div class="plabel">&#8211;</div>' +
      '</div>' +
      '<div class="status"><b>&nbsp;</b>&nbsp;</div>' +
      '<div class="divider"></div>' +
      '<div class="setrow"><label>Speed</label><input class="s-rate" type="range" min="0.5" max="2" step="0.05"><span class="val v-rate"></span></div>' +
      '<div class="setrow"><label>Pitch</label><input class="s-pitch" type="range" min="0" max="2" step="0.05"><span class="val v-pitch"></span></div>' +
      '<div class="setrow"><label>Volume</label><input class="s-vol" type="range" min="0" max="1" step="0.05"><span class="val v-vol"></span></div>' +
      '<span class="vlabel">Voice</span>' +
      '<select class="voice"></select>' +
      '<div class="divider"></div>' +
      '<div class="toggles">' +
        '<label class="tg"><input type="checkbox" class="c-hl"> Word highlight</label>' +
        '<label class="tg"><input type="checkbox" class="c-scroll"> Auto-scroll</label>' +
        '<label class="tg"><input type="checkbox" class="c-wake"> Keep screen on</label>' +
        '<label class="tg"><input type="checkbox" class="c-code"> Read code blocks</label>' +
      '</div>' +
      '<div class="hint">Tap the header to enable or disable &#183; <kbd>Alt</kbd>+<kbd>R</kbd> show or hide</div>' +
    '</div>'
  );
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
