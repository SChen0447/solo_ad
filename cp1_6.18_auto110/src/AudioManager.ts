export class AudioManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();

  init() {
    this.audioContext = new AudioContext();
    this.generateSounds();
  }

  private generateSounds() {
    if (!this.audioContext) return;
    this.generateSummonSound();
    this.generateAttackSound();
    this.generateGoldSound();
    this.generateWaveSound();
    this.generateHitSound();
    this.generateHealSound();
  }

  private generateSummonSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.6;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 5) * 0.4;
      const freq = 400 + 600 * t;
      data[i] = env * Math.sin(2 * Math.PI * freq * t) * 0.5;
      data[i] += env * 0.3 * Math.sin(2 * Math.PI * freq * 1.5 * t);
    }
    this.buffers.set('summon', buf);
  }

  private generateAttackSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.15;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 20) * 0.3;
      data[i] = env * (Math.random() * 2 - 1);
      data[i] += env * Math.sin(2 * Math.PI * 200 * t) * 0.5;
    }
    this.buffers.set('attack', buf);
  }

  private generateGoldSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.3;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 8) * 0.3;
      data[i] = env * Math.sin(2 * Math.PI * 1200 * t);
      data[i] += env * 0.5 * Math.sin(2 * Math.PI * 1800 * t);
    }
    this.buffers.set('gold', buf);
  }

  private generateWaveSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.8;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 3) * 0.4;
      data[i] = env * Math.sin(2 * Math.PI * 150 * t);
      data[i] += env * 0.5 * Math.sin(2 * Math.PI * 220 * t);
      data[i] += env * 0.3 * Math.sin(2 * Math.PI * 330 * t);
    }
    this.buffers.set('wave', buf);
  }

  private generateHitSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.1;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 30) * 0.25;
      data[i] = env * (Math.random() * 2 - 1);
    }
    this.buffers.set('hit', buf);
  }

  private generateHealSound() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const sr = ctx.sampleRate;
    const duration = 0.4;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 5) * 0.3;
      data[i] = env * Math.sin(2 * Math.PI * 600 * t);
      data[i] += env * 0.4 * Math.sin(2 * Math.PI * 900 * t);
    }
    this.buffers.set('heal', buf);
  }

  play(name: string, volume: number = 1.0) {
    if (!this.audioContext) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = buf;
    const gain = this.audioContext.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start(0);
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
