class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.muted = false;
    this.volume = 0.7;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolume(volNormalized) {
    this.volume = Math.max(0, Math.min(1, volNormalized));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  toggleAudio() {
    this.muted = !this.muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    return !this.muted;
  }

  // 1. Classic Mario 8-Bit Jump / Blip (150Hz -> 600Hz Square Sweep)
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 2. Classic Mario 8-Bit Brick Stomp / Pipe Sound (220Hz -> 55Hz Low Square Drop)
  playPlaceBuilding() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(110, now + 0.04);
    osc.frequency.setValueAtTime(55, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 3. ICONIC SUPER MARIO BROS COIN SOUND (B5 -> E6 8-Bit Square Wave Chime)
  playCollectResource() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    // Note 1: B5 (987.77 Hz) for 0.07 seconds
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(987.77, now);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.setValueAtTime(0.18, now + 0.07);
    gain1.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.08);

    // Note 2: E6 (1318.51 Hz) held for 0.35 seconds
    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1318.51, now + 0.07);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.18, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(now + 0.07);
    osc2.stop(now + 0.38);
  }

  // 4. Classic Mario 8-Bit Fireball Blip (1200Hz -> 300Hz Square Blast)
  playLaserShot() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 5. Classic 8-Bit Retro Noise Explosion (Mario Enemy Stomp / Shell Kick)
  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const bufferSize = this.audioCtx.sampleRate * 0.2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 8-bit stepped quantize noise
      output[i] = Math.floor((Math.random() * 2 - 1) * 8) / 8;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // 6. Iconic Super Mario Stage Clear 8-Bit Triumph Melody
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const notes = [
      { f: 392.00, t: 0, d: 0.1 },     // G4
      { f: 523.25, t: 0.1, d: 0.1 },   // C5
      { f: 659.25, t: 0.2, d: 0.1 },   // E5
      { f: 783.99, t: 0.3, d: 0.1 },   // G5
      { f: 1046.50, t: 0.4, d: 0.1 },  // C6
      { f: 1318.51, t: 0.5, d: 0.35 }  // E6 held!
    ];

    notes.forEach(n => {
      const startTime = this.audioCtx.currentTime + n.t;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.linearRampToValueAtTime(0.001, startTime + n.d);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + n.d);
    });
  }
}

window.soundEngine = new SoundEngine();
