const TERMINAL_ERRORS = ['canceled', 'interrupted'];

export default class Player {
  constructor() {
    this._l = {};
    this.items = [];
    this.cursor = -1;
    this.state = 'idle';
    this._token = 0;
    this._retries = 0;
    this._resumeAtStart = false;
    this._lastActivity = 0;
    this._watchdog = null;
    this.voiceURI = '';
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.path = '/';
    this.prefix = [];
  }

  on(ev, fn) {
    (this._l[ev] = this._l[ev] || []).push(fn);
    return this;
  }

  emit(ev) {
    const fns = this._l[ev] || [];
    for (let i = 0; i < fns.length; i++) {
      try {
        fns[i].apply(null, Array.prototype.slice.call(arguments, 1));
      } catch (e) {
        console.error('[docsify-screenreader]', e);
      }
    }
  }

  setItems(items, path) {
    this.stop(true);
    this.items = items || [];
    if (path) this.path = path;
    this.cursor = this.items.length ? 0 : -1;
    this.prefix = [];
    let acc = 0;
    for (const it of this.items) {
      this.prefix.push(acc);
      acc += it.text.length;
    }
  }

  setVoice(uri) {
    this.voiceURI = uri || '';
  }

  _voice() {
    if (!this.voiceURI) return null;
    const voices = speechSynthesis.getVoices();
    for (const v of voices) {
      if (v.voiceURI === this.voiceURI) return v;
    }
    return null;
  }

  playFrom(index) {
    if (!this.items.length) return;
    this.cancelSpeech();
    this._token++;
    this._retries = 0;
    this._resumeAtStart = false;
    this.state = 'playing';
    this.cursor = Math.max(0, Math.min(index, this.items.length - 1));
    this.emit('start', this.cursor);
    this._speakCurrent();
  }

  seek(index) {
    if (!this.items.length) return;
    const i = Math.max(0, Math.min(index, this.items.length - 1));
    this.cursor = i;
    this._retries = 0;
    if (this.state === 'playing') {
      this.cancelSpeech();
      this._token++;
      this._speakCurrent();
    }
    this.emit('sentence', this.cursor, this.items[this.cursor], this.state === 'playing');
  }

  nextSentence() {
    this.seek(this.cursor + 1);
  }

  prevSentence() {
    this.seek(this.cursor - 1);
  }

  jumpSection(dir) {
    const anchors = [];
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].heading) anchors.push(i);
    }
    if (!anchors.length) {
      this.seek(this.cursor + dir * 5);
      return;
    }
    let target;
    if (dir > 0) {
      target = anchors.find((a) => a > this.cursor);
      if (target === undefined) {
        this.seek(this.items.length - 1);
        return;
      }
    } else {
      const before = anchors.filter((a) => a < this.cursor);
      if (!before.length) {
        this.seek(0);
        return;
      }
      target = before[before.length - 1];
      if (this.cursor - target <= 1 && before.length > 1) target = before[before.length - 2];
    }
    this.seek(target);
  }

  nextSection() {
    this.jumpSection(1);
  }

  prevSection() {
    this.jumpSection(-1);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.emit('pause', this.cursor);
    try {
      speechSynthesis.pause();
    } catch (e) {}
    setTimeout(() => {
      if (this.state !== 'paused') return;
      if (!speechSynthesis.paused && !this._resumeAtStart) {
        this._resumeAtStart = true;
        this.cancelSpeech();
      }
    }, 300);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.emit('resume', this.cursor);
    if (this._resumeAtStart) {
      this._resumeAtStart = false;
      this._token++;
      this._speakCurrent();
    } else {
      try {
        speechSynthesis.resume();
      } catch (e) {}
    }
  }

  toggle() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
    else this.playFrom(Math.max(0, this.cursor));
  }

  stop(silent) {
    const wasActive = this.state !== 'idle';
    this.state = 'idle';
    this._resumeAtStart = false;
    this.cancelSpeech();
    this._stopWatchdog();
    if (wasActive && !silent) this.emit('stop');
  }

  cancelSpeech() {
    try {
      speechSynthesis.cancel();
    } catch (e) {}
  }

  recoverAfterBackground() {
    if (this.state !== 'playing') return;
    this._token++;
    this._retries = 0;
    this._speakCurrent();
  }

  estimateTiming() {
    const cps = 13 * this.rate;
    const total = this.items.length
      ? this.prefix[this.prefix.length - 1] + (this.items[this.items.length - 1].text.length || 1)
      : 0;
    let position = this.cursor >= 0 && this.cursor < this.prefix.length ? this.prefix[this.cursor] : 0;
    position = position / cps;
    return { duration: total / cps, position };
  }

  _speakCurrent() {
    const it = this.items[this.cursor];
    if (!it) {
      this._finish();
      return;
    }
    const token = this._token;
    const u = new SpeechSynthesisUtterance(it.text);
    const v = this._voice();
    if (v) u.voice = v;
    if (this.lang) u.lang = this.lang;
    u.rate = this.rate;
    u.pitch = this.pitch;
    u.volume = this.volume;

    u.onstart = () => {
      if (token !== this._token) return;
      this._lastActivity = Date.now();
      this._retries = 0;
      this._startWatchdog();
      this.emit('sentence', this.cursor, it, true);
    };
    u.onboundary = (e) => {
      if (token !== this._token) return;
      this._lastActivity = Date.now();
      if (e.name && e.name !== 'word') return;
      const idx = typeof e.charIndex === 'number' ? e.charIndex : 0;
      let len = typeof e.charLength === 'number' && e.charLength > 0 ? e.charLength : 0;
      if (!len) len = guessWordLength(it.text, idx);
      this.emit('boundary', this.cursor, it.start + idx, len);
    };
    u.onend = () => {
      if (token !== this._token) return;
      this._lastActivity = Date.now();
      if (this.state !== 'playing') return;
      this.cursor++;
      if (this.cursor >= this.items.length) {
        this._finish();
        return;
      }
      this._speakCurrent();
    };
    u.onerror = (e) => {
      if (token !== this._token) return;
      const err = e && (e.error || e.reason);
      if (TERMINAL_ERRORS.indexOf(err) !== -1) return;
      if (this.state !== 'playing') return;
      this._retries++;
      if (this._retries > 2) {
        this._retries = 0;
        this.cursor++;
        if (this.cursor >= this.items.length) {
          this._finish();
          return;
        }
        this._speakCurrent();
      } else {
        setTimeout(() => {
          if (token === this._token && this.state === 'playing') this._speakCurrent();
        }, 200);
      }
    };

    this._lastActivity = Date.now();
    speechSynthesis.speak(u);
  }

  _finish() {
    this.state = 'idle';
    this.cursor = Math.max(0, Math.min(this.cursor, this.items.length - 1));
    this._stopWatchdog();
    this.emit('finish');
  }

  _startWatchdog() {
    if (this._watchdog) return;
    this._watchdog = setInterval(() => {
      if (this.state !== 'playing') return;
      if (speechSynthesis.speaking || speechSynthesis.pending) return;
      if (Date.now() - this._lastActivity < 5000) return;
      this._token++;
      this._retries = 0;
      this._speakCurrent();
    }, 4000);
  }

  _stopWatchdog() {
    if (this._watchdog) {
      clearInterval(this._watchdog);
      this._watchdog = null;
    }
  }
}

function guessWordLength(text, idx) {
  let i = idx;
  while (i < text.length && !/[\s.,!?;:)\]}"\u2019\u201d]/.test(text[i])) i++;
  return Math.max(i - idx, 1);
}
