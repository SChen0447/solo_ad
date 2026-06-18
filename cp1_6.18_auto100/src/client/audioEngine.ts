import { midiToFreq } from './types.js';

type WaveType = 'sine' | 'sawtooth' | 'square' | 'triangle';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();

  private ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getWaveType(trackType: 'piano' | 'strings' | 'drums'): WaveType {
    switch (trackType) {
      case 'piano': return 'sine';
      case 'strings': return 'sawtooth';
      case 'drums': return 'square';
    }
  }

  playNote(midi: number, duration: number = 0.3, trackType: 'piano' | 'strings' | 'drums' = 'piano', startTimeOffset: number = 0) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const id = `${midi}-${Date.now()}-${Math.random()}`;
    const freq = midiToFreq(midi);

    if (trackType === 'drums') {
      this.playDrum(freq, duration, startTimeOffset);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const waveType = this.getWaveType(trackType);

    osc.type = waveType;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime + startTimeOffset;
    const attack = 0.01;
    const release = Math.min(0.15, duration * 0.4);
    const peakVol = trackType === 'strings' ? 0.18 : 0.28;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakVol, now + attack);
    gain.gain.setValueAtTime(peakVol, now + Math.max(0, duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    let filter: BiquadFilterNode | null = null;
    if (trackType === 'strings') {
      filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3500;
      osc.connect(filter);
      filter.connect(gain);
    } else if (trackType === 'piano') {
      filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 8000;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    this.activeOscillators.set(id, { osc, gain });

    osc.onended = () => {
      this.activeOscillators.delete(id);
      try { osc.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
      if (filter) try { filter.disconnect(); } catch {}
    };
  }

  private playDrum(freq: number, duration: number, startTimeOffset: number) {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime + startTimeOffset;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 18);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration * 0.3);

    const mixGain = this.ctx.createGain();
    mixGain.gain.setValueAtTime(0.4, now);
    mixGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.5;

    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.5;

    noise.connect(noiseGain);
    osc.connect(oscGain);
    noiseGain.connect(mixGain);
    oscGain.connect(mixGain);
    mixGain.connect(this.masterGain);

    noise.start(now);
    osc.start(now);
    noise.stop(now + duration);
    osc.stop(now + duration);
  }

  stopAll() {
    this.activeOscillators.forEach(({ osc, gain }) => {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    });
    this.activeOscillators.clear();
  }
}

export const audioEngine = new AudioEngine();
