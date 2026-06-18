import type { NoteColor, JudgmentType } from './types';
import { NOTE_PITCH } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playHit(color: NoteColor, type: Exclude<JudgmentType, 'miss'>): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const baseFreq = NOTE_PITCH[color];
    const freq = type === 'perfect' ? baseFreq * 1.02 : baseFreq;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    if (type === 'perfect') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.2);
    }
  }

  playMiss(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.2);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    osc.connect(oscGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  trigger(color: NoteColor, judgment: JudgmentType): void {
    if (judgment === 'miss') {
      this.playMiss();
    } else {
      this.playHit(color, judgment);
    }
  }
}
