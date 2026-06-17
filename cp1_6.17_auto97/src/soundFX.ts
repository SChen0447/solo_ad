export class SoundFX {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.audioCtx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private ensureContext(): boolean {
    if (!this.initialized) this.init();
    if (!this.audioCtx || !this.masterGain) return false;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return true;
  }

  public playCollect(pitchVariant: number = 0): void {
    if (!this.ensureContext() || !this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const baseFreq = 880 + pitchVariant * 60;

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.1);

    filter.type = 'highpass';
    filter.frequency.value = 500;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);

    const shimmerOsc = this.audioCtx.createOscillator();
    const shimmerGain = this.audioCtx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(baseFreq * 3, now + 0.05);
    shimmerOsc.frequency.exponentialRampToValueAtTime(baseFreq * 4, now + 0.2);
    shimmerGain.gain.setValueAtTime(0, now + 0.05);
    shimmerGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);
    shimmerOsc.start(now + 0.05);
    shimmerOsc.stop(now + 0.4);
  }

  public playHit(): void {
    if (!this.ensureContext() || !this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    const distortion = this.audioCtx.createWaveShaper();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 256) * 2 - 1;
      curve[i] = Math.tanh(x * 3);
    }
    distortion.curve = curve;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.3);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);

    const noiseBuf = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.15, this.audioCtx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  public playPlatform(): void {
    if (!this.ensureContext() || !this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.45);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(70, now);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.setValueAtTime(0.4, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);

    const thumpBuf = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.08, this.audioCtx.sampleRate);
    const thumpData = thumpBuf.getChannelData(0);
    for (let i = 0; i < thumpData.length; i++) {
      thumpData[i] = Math.sin(i / thumpData.length * Math.PI) * Math.sin(i * 0.3);
    }
    const thump = this.audioCtx.createBufferSource();
    thump.buffer = thumpBuf;
    const thumpGain = this.audioCtx.createGain();
    thumpGain.gain.value = 0.5;
    const thumpFilter = this.audioCtx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.value = 200;
    thump.connect(thumpFilter);
    thumpFilter.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thump.start(now);
  }

  public playRoll(intensity: number = 0.1): void {
    if (!this.ensureContext() || !this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;

    const noiseBuf = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.05, this.audioCtx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = this.audioCtx.createGain();
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 1;
    noiseGain.gain.setValueAtTime(intensity * 0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  public playWin(): void {
    if (!this.ensureContext() || !this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      const t = now + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }
}
