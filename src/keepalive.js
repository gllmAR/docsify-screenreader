let silenceUrl = null;

function makeSilence() {
  if (silenceUrl) return silenceUrl;
  const sr = 8000;
  const n = Math.floor(sr * 0.5);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const wstr = (off, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  wstr(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  wstr(8, 'WAVE');
  wstr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wstr(36, 'data');
  v.setUint32(40, n * 2, true);
  silenceUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  return silenceUrl;
}

function artwork() {
  try {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 192;
    const x = c.getContext('2d');
    if (!x) return undefined;
    const g = x.createLinearGradient(0, 0, 192, 192);
    g.addColorStop(0, '#4f6ef7');
    g.addColorStop(1, '#7a4ff7');
    x.fillStyle = g;
    x.fillRect(0, 0, 192, 192);
    x.fillStyle = '#fff';
    x.beginPath();
    x.moveTo(66, 76);
    x.lineTo(86, 76);
    x.lineTo(112, 52);
    x.lineTo(112, 140);
    x.lineTo(86, 116);
    x.lineTo(66, 116);
    x.closePath();
    x.fill();
    x.lineWidth = 9;
    x.lineCap = 'round';
    x.strokeStyle = '#fff';
    x.beginPath();
    x.arc(124, 96, 26, -Math.PI / 3, Math.PI / 3);
    x.stroke();
    return c.toDataURL('image/png');
  } catch (e) {
    return undefined;
  }
}

export default class KeepAlive {
  constructor() {
    this.audio = null;
    this.wakeLock = null;
    this.wakeWanted = false;
    this._wasPlaying = false;
    this._artwork = artwork();
  }

  get supported() {
    return 'speechSynthesis' in window;
  }

  startAudio() {
    try {
      if (!this.audio) {
        const a = new Audio();
        a.src = makeSilence();
        a.loop = true;
        a.preload = 'auto';
        a.setAttribute('playsinline', '');
        a.setAttribute('x-webkit-airplay', 'deny');
        this.audio = a;
      }
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  stopAudio() {
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (e) {}
    }
  }

  initMediaSession(handlers) {
    if (!('mediaSession' in navigator)) return;
    const actions = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack'];
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handlers[action] || null);
      } catch (e) {}
    }
  }

  updateMetadata(title, artist) {
    if (!('mediaSession' in navigator)) return;
    try {
      const meta = { title: title || '', album: 'Docsify Screen Reader' };
      if (artist) meta.artist = artist;
      if (this._artwork) meta.artwork = [{ src: this._artwork, sizes: '192x192', type: 'image/png' }];
      navigator.mediaSession.metadata = new window.MediaMetadata(meta);
    } catch (e) {}
  }

  setPlaybackState(state) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch (e) {}
  }

  updatePositionState(duration, position, playing) {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      const d = Math.max(Number(duration) || 1, 1);
      const p = Math.min(Math.max(Number(position) || 0, 0), d - 0.01);
      navigator.mediaSession.setPositionState({
        duration: d,
        position: p,
        playbackRate: playing ? 1 : 0
      });
    } catch (e) {}
  }

  async acquireWake() {
    this.wakeWanted = true;
    if (!('wakeLock' in navigator)) return;
    if (this.wakeLock && !this.wakeLock.released) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch (e) {}
  }

  releaseWake() {
    this.wakeWanted = false;
    if (this.wakeLock) {
      const lock = this.wakeLock;
      this.wakeLock = null;
      try {
        const p = lock.release();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
  }

  noteHidden(playing) {
    this._wasPlaying = playing;
  }

  takeWasPlaying() {
    const v = this._wasPlaying;
    this._wasPlaying = false;
    return v;
  }
}
