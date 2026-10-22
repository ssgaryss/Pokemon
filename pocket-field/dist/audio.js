// A small, self-contained pocket synth. Nothing starts until the sound switch is used.
export class PocketAudio {
  constructor() {
    this._enabled = false;
    this._destroyed = false;
    this._context = null;
    this._master = null;
    this._voices = new Set();
    this._timer = null;
    this._step = 0;
    this._nextNote = 0;
    this._operation = Promise.resolve(false);
    this._lastMove = 0;
    this._onVisibility = () => this._queueState();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibility);
    }
  }

  get enabled() { return this._enabled; }

  async toggle() {
    if (this._destroyed) return false;
    this._enabled = !this._enabled;
    // Construct and resume inside the click handler, so browsers can unlock audio.
    if (this._enabled) {
      try {
        if (!this._context) {
          const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!AudioContext) { this._enabled = false; return false; }
          this._context = new AudioContext();
          this._master = this._context.createGain();
          this._master.gain.value = 0.34;
          this._master.connect(this._context.destination);
        }
        if (!this._hidden()) {
          const resume = this._context.resume();
          if (resume && typeof resume.catch === 'function') resume.catch(() => {});
        }
      } catch {
        this._enabled = false;
        return false;
      }
    } else {
      this._silence();
    }
    return this._queueState();
  }

  _hidden() { return typeof document !== 'undefined' && document.hidden; }

  _queueState() {
    this._operation = this._operation.catch(() => false).then(async () => {
      const context = this._context;
      if (!context || this._destroyed || context.state === 'closed') return false;
      try {
        if (!this._enabled || this._hidden()) {
          this._silence();
          if (context.state === 'running') await context.suspend();
        } else {
          await context.resume();
          if (this._enabled && !this._hidden() && !this._destroyed) {
            this._master.gain.setValueAtTime(0.34, context.currentTime);
            this._startMusic();
          } else {
            this._silence();
            if (context.state === 'running') await context.suspend();
          }
        }
      } catch {
        this._enabled = false;
        this._silence();
      }
      return this._enabled && !this._destroyed;
    });
    return this._operation;
  }

  _tone(frequency, start, duration, volume = 0.04, type = 'square', endFrequency) {
    const context = this._context;
    if (!context || context.state !== 'running' || this._destroyed) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const attack = Math.min(0.009, duration / 4);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this._master);
    const voice = { oscillator, envelope };
    this._voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this._voices.delete(voice);
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  _startMusic() {
    if (this._timer !== null) return;
    this._step = 0;
    this._nextNote = this._context.currentTime + 0.08;
    // Original two-phrase tune in C, with ample space between its soft notes.
    const melody = [72, 0, 76, 79, 0, 76, 74, 0, 72, 74, 76, 0, 67, 0, 69, 0,
      72, 0, 76, 79, 81, 0, 79, 76, 74, 0, 71, 74, 72, 0, 0, 0];
    const bass = [48, 48, 53, 55, 48, 45, 53, 55];
    const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    const schedule = () => {
      if (!this._enabled || this._destroyed || this._hidden() || this._context.state !== 'running') return;
      const now = this._context.currentTime;
      if (this._nextNote < now - 0.1) this._nextNote = now + 0.04;
      while (this._nextNote < now + 0.32) {
        const note = melody[this._step % melody.length];
        if (note) this._tone(hz(note), this._nextNote, 0.19, 0.019, 'triangle');
        if (this._step % 4 === 0) {
          this._tone(hz(bass[Math.floor(this._step / 4) % bass.length]), this._nextNote, 0.42, 0.015, 'triangle');
        }
        this._step++;
        this._nextNote += 0.285;
      }
    };
    schedule();
    this._timer = setInterval(schedule, 120);
  }

  play(name) {
    if (!this._enabled || this._destroyed || this._hidden() || this._context?.state !== 'running') return;
    const now = this._context.currentTime;
    if (name === 'move') {
      if (now - this._lastMove < 0.075) return;
      this._lastMove = now;
    }
    // Each note is [frequency, delay, length, volume, waveform, optional slide].
    const effects = {
      move: [[180, 0, 0.035, 0.016, 'triangle', 140]],
      confirm: [[523.25, 0, 0.075, 0.038], [783.99, 0.06, 0.1, 0.032]],
      hit: [[170, 0, 0.11, 0.045, 'triangle', 65], [440, 0.015, 0.055, 0.018, 'square', 110]],
      catch: [[523.25, 0, 0.1, 0.035], [659.25, 0.12, 0.1, 0.035], [783.99, 0.24, 0.1, 0.035], [1046.5, 0.36, 0.28, 0.03]],
      win: [[523.25, 0, 0.12, 0.035], [659.25, 0.14, 0.12, 0.035], [783.99, 0.28, 0.12, 0.035], [1046.5, 0.44, 0.38, 0.03], [523.25, 0.44, 0.4, 0.024, 'triangle']],
      heal: [[392, 0, 0.16, 0.03, 'triangle'], [523.25, 0.12, 0.16, 0.03, 'triangle'], [659.25, 0.24, 0.16, 0.03, 'triangle'], [783.99, 0.36, 0.3, 0.025, 'triangle']],
      error: [[196, 0, 0.09, 0.03, 'triangle'], [164.81, 0.12, 0.14, 0.03, 'triangle']],
      encounter: [[261.63, 0, 0.08, 0.035], [329.63, 0.09, 0.08, 0.035], [392, 0.18, 0.08, 0.035], [523.25, 0.28, 0.17, 0.032]],
    };
    for (const [frequency, delay, length, volume, type = 'square', slide] of effects[name] || []) {
      this._tone(frequency, now + delay, length, volume, type, slide);
    }
  }

  _silence() {
    if (this._timer !== null) clearInterval(this._timer);
    this._timer = null;
    if (this._context && this._master && this._context.state !== 'closed') {
      this._master.gain.setValueAtTime(0, this._context.currentTime);
    }
    for (const { oscillator, envelope } of this._voices) {
      try { oscillator.stop(); } catch { /* An already ended note is harmless. */ }
      oscillator.disconnect();
      envelope.disconnect();
    }
    this._voices.clear();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._enabled = false;
    this._silence();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibility);
    }
    if (this._context && this._context.state !== 'closed') {
      const closing = this._context.close();
      if (closing && typeof closing.catch === 'function') closing.catch(() => {});
    }
  }
}
