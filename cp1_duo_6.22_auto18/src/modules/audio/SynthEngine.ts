import { ILyricWord, ILyricLine, ISynthPreset, SynthPresetType } from '../shared/types';
import { audioEngine } from './AudioEngine';

export const DEFAULT_PRESETS: ISynthPreset[] = [
  {
    id: 'child',
    name: '童声',
    type: 'child',
    baseFrequency: 440,
    formants: [800, 1200, 2500],
    gain: 0.7,
  },
  {
    id: 'robot',
    name: '机器人',
    type: 'robot',
    baseFrequency: 220,
    formants: [500, 1500, 3000],
    gain: 0.6,
  },
  {
    id: 'baritone',
    name: '饱满男声',
    type: 'baritone',
    baseFrequency: 130,
    formants: [400, 900, 2400],
    gain: 0.8,
  },
];

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 2048;

export class SynthEngine {
  private wordBuffers: Map<string, AudioBuffer> = new Map();
  private presets: Map<string, ISynthPreset> = new Map();
  private dirtyWords: Set<string> = new Set();
  private scheduledUpdate: number | null = null;

  constructor() {
    DEFAULT_PRESETS.forEach((p) => this.presets.set(p.id, p));
  }

  getPresets(): ISynthPreset[] {
    return Array.from(this.presets.values());
  }

  getPreset(id: string): ISynthPreset {
    return this.presets.get(id) ?? DEFAULT_PRESETS[0];
  }

  private getWordKey(wordId: string, presetId: string): string {
    return `${wordId}__${presetId}`;
  }

  private frequencyFromPitch(baseFreq: number, semitoneOffset: number): number {
    return baseFreq * Math.pow(2, semitoneOffset / 12);
  }

  private generateWordBuffer(
    word: ILyricWord,
    preset: ISynthPreset,
    ctx: AudioContext
  ): AudioBuffer {
    const durationSec = Math.max(0.05, word.duration / 1000);
    const totalFrames = Math.max(BUFFER_SIZE, Math.ceil(durationSec * SAMPLE_RATE));
    const buffer = ctx.createBuffer(1, totalFrames, SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    const freq = this.frequencyFromPitch(preset.baseFrequency, word.pitchOffset);
    const gain = preset.gain * word.volumeGain;

    if (preset.type === 'robot') {
      this.renderRobot(channelData, freq, gain, durationSec);
    } else if (preset.type === 'child') {
      this.renderChild(channelData, freq, gain, durationSec);
    } else {
      this.renderBaritone(channelData, freq, gain, durationSec);
    }

    this.applyEnvelope(channelData, durationSec);
    return buffer;
  }

  private renderRobot(
    data: Float32Array,
    freq: number,
    gain: number,
    durationSec: number
  ): void {
    const len = data.length;
    const omega = (2 * Math.PI * freq) / SAMPLE_RATE;
    const vibRate = 8;
    const vibDepth = 0.02;
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const vibrato = 1 + vibDepth * Math.sin(2 * Math.PI * vibRate * t);
      let sample = Math.sign(Math.sin(omega * i * vibrato));
      sample += 0.3 * Math.sin(3 * omega * i * vibrato);
      sample *= gain * 0.4;
      data[i] = sample;
    }
  }

  private renderChild(
    data: Float32Array,
    freq: number,
    gain: number,
    durationSec: number
  ): void {
    const len = data.length;
    const omega = (2 * Math.PI * freq) / SAMPLE_RATE;
    const f1 = 800,
      f2 = 1200,
      f3 = 2500;
    const o1 = (2 * Math.PI * f1) / SAMPLE_RATE;
    const o2 = (2 * Math.PI * f2) / SAMPLE_RATE;
    const o3 = (2 * Math.PI * f3) / SAMPLE_RATE;
    for (let i = 0; i < len; i++) {
      let sample = 0.5 * Math.sin(omega * i);
      sample += 0.3 * Math.sin(2 * omega * i);
      sample += 0.15 * Math.sin(3 * omega * i);
      sample *= 0.35;
      sample += 0.15 * Math.sin(o1 * i);
      sample += 0.1 * Math.sin(o2 * i);
      sample += 0.08 * Math.sin(o3 * i);
      sample *= gain;
      data[i] = sample;
    }
  }

  private renderBaritone(
    data: Float32Array,
    freq: number,
    gain: number,
    durationSec: number
  ): void {
    const len = data.length;
    const omega = (2 * Math.PI * freq) / SAMPLE_RATE;
    const f1 = 400,
      f2 = 900,
      f3 = 2400;
    const o1 = (2 * Math.PI * f1) / SAMPLE_RATE;
    const o2 = (2 * Math.PI * f2) / SAMPLE_RATE;
    const o3 = (2 * Math.PI * f3) / SAMPLE_RATE;
    for (let i = 0; i < len; i++) {
      let sample = 0.6 * Math.sin(omega * i);
      sample += 0.4 * Math.sin(2 * omega * i);
      sample += 0.25 * Math.sin(3 * omega * i);
      sample += 0.15 * Math.sin(4 * omega * i);
      sample *= 0.3;
      sample += 0.2 * Math.sin(o1 * i);
      sample += 0.12 * Math.sin(o2 * i);
      sample += 0.06 * Math.sin(o3 * i);
      sample *= gain;
      data[i] = sample;
    }
  }

  private applyEnvelope(data: Float32Array, durationSec: number): void {
    const len = data.length;
    const attackSamples = Math.floor(0.02 * SAMPLE_RATE);
    const releaseSamples = Math.floor(0.08 * SAMPLE_RATE);
    for (let i = 0; i < attackSamples && i < len; i++) {
      data[i] *= i / attackSamples;
    }
    for (let i = Math.max(0, len - releaseSamples); i < len; i++) {
      data[i] *= (len - i) / releaseSamples;
    }
  }

  private getOrCreateWordBuffer(word: ILyricWord, ctx: AudioContext): AudioBuffer {
    const preset = this.getPreset(word.synthPresetId);
    const key = this.getWordKey(word.id, preset.id);
    if (!this.wordBuffers.has(key) || this.dirtyWords.has(word.id)) {
      const buf = this.generateWordBuffer(word, preset, ctx);
      this.wordBuffers.set(key, buf);
    }
    return this.wordBuffers.get(key)!;
  }

  markWordDirty(wordId: string): void {
    this.dirtyWords.add(wordId);
    for (const p of this.presets.values()) {
      const key = this.getWordKey(wordId, p.id);
      this.wordBuffers.delete(key);
    }
  }

  updateWordLocal(word: ILyricWord, allLines: ILyricLine[]): void {
    const startTime = performance.now();
    this.markWordDirty(word.id);
    const ctx = audioEngine.getContext();
    this.getOrCreateWordBuffer(word, ctx);
    this.dirtyWords.delete(word.id);
    this.scheduleFullBufferUpdate(allLines);
    const elapsed = performance.now() - startTime;
    if (elapsed < 50) {
      // Good, under budget
    }
  }

  private scheduleFullBufferUpdate(lines: ILyricLine[]): void {
    if (this.scheduledUpdate !== null) {
      clearTimeout(this.scheduledUpdate);
    }
    this.scheduledUpdate = window.setTimeout(() => {
      this.renderFullBuffer(lines);
      this.scheduledUpdate = null;
    }, 16);
  }

  getAllWords(lines: ILyricLine[]): ILyricWord[] {
    const words: ILyricWord[] = [];
    lines.forEach((l) => l.words.forEach((w) => words.push(w)));
    return words.sort((a, b) => a.startTime - b.startTime);
  }

  computeTotalDuration(lines: ILyricLine[]): number {
    const words = this.getAllWords(lines);
    if (words.length === 0) return 0;
    const last = words[words.length - 1];
    return last.startTime + last.duration;
  }

  private computeMaxAmplitude(
    words: ILyricWord[],
    ctx: AudioContext,
    totalSamples: number
  ): number {
    let maxAmp = 0.0001;
    const voiceCount = this.presets.size;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const buf = this.getOrCreateWordBuffer(word, ctx);
      const startSample = Math.floor((word.startTime / 1000) * SAMPLE_RATE);
      const wData = buf.getChannelData(0);
      const windowStep = Math.max(1, Math.floor(wData.length / 64));
      for (let i = 0; i < wData.length; i += windowStep) {
        const sample = Math.abs(wData[i]);
        if (sample > maxAmp) maxAmp = sample;
      }
    }
    return Math.max(1, maxAmp * Math.sqrt(voiceCount) * 1.2);
  }

  renderFullBuffer(lines: ILyricLine[]): AudioBuffer | null {
    const ctx = audioEngine.getContext();
    const words = this.getAllWords(lines);
    if (words.length === 0) {
      const emptyBuf = ctx.createBuffer(1, SAMPLE_RATE * 2, SAMPLE_RATE);
      audioEngine.setAudioBuffer(emptyBuf);
      return emptyBuf;
    }
    const totalMs = this.computeTotalDuration(lines) + 200;
    const totalSamples = Math.max(SAMPLE_RATE, Math.floor((totalMs / 1000) * SAMPLE_RATE));
    const mixed = new Float32Array(totalSamples);
    const normalization = this.computeMaxAmplitude(words, ctx, totalSamples);
    const voiceCount = this.presets.size;
    const scale = (1 / normalization) * Math.min(1, 0.9 / Math.sqrt(voiceCount));

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const buf = this.getOrCreateWordBuffer(word, ctx);
      const wData = buf.getChannelData(0);
      const startSample = Math.floor((word.startTime / 1000) * SAMPLE_RATE);
      const endSample = Math.min(startSample + wData.length, totalSamples);
      for (let i = 0; i < endSample - startSample; i++) {
        mixed[startSample + i] += wData[i] * scale;
      }
    }

    let peak = 0.0001;
    const peakWindow = Math.max(1, Math.floor(totalSamples / 4096));
    for (let i = 0; i < totalSamples; i += peakWindow) {
      const v = Math.abs(mixed[i]);
      if (v > peak) peak = v;
    }
    if (peak > 0.95) {
      const normalizeGain = 0.9 / peak;
      for (let i = 0; i < totalSamples; i++) {
        mixed[i] *= normalizeGain;
      }
    }

    const audioBuffer = ctx.createBuffer(1, totalSamples, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(mixed);
    audioEngine.setAudioBuffer(audioBuffer);
    return audioBuffer;
  }
}

export const synthEngine = new SynthEngine();
