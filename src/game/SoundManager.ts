class SoundManager {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    freqEnd?: number,
    delay = 0,
  ) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + delay + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  private noise(duration: number, volume: number, delay = 0) {
    const ctx = this.ensureCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime + delay);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
    source.stop(ctx.currentTime + delay + duration);
  }

  shoot() {
    this.tone(800, 'sine', 0.06, 0.08, 500);
  }

  enemyHit() {
    this.tone(140, 'square', 0.08, 0.06, 50);
  }

  pickupXp() {
    this.tone(440, 'sine', 0.06, 0.06, 660);
    this.tone(554, 'sine', 0.06, 0.04, 880, 0.04);
  }

  levelUp() {
    this.tone(523, 'sine', 0.15, 0.1, 523, 0);
    this.tone(659, 'sine', 0.15, 0.08, 659, 0.08);
    this.tone(784, 'sine', 0.18, 0.08, 784, 0.16);
  }

  playerHurt() {
    this.tone(200, 'sawtooth', 0.18, 0.09, 80);
    this.tone(90, 'square', 0.15, 0.05, 40, 0.05);
  }

  bossAppear() {
    for (let i = 0; i < 4; i++) {
      this.tone(i % 2 === 0 ? 440 : 660, 'square', 0.12, 0.07, i % 2 === 0 ? 440 : 660, i * 0.2);
    }
  }

  bossDefeat() {
    this.noise(0.3, 0.12, 0);
    this.tone(60, 'sine', 0.4, 0.1, 20, 0.05);
  }

  dash() {
    this.noise(0.12, 0.06, 0);
  }
}

export const soundManager = new SoundManager();
