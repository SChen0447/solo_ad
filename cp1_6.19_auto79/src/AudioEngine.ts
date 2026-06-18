import { AudioClip, Track, LevelMeter, MixerState } from './types';

class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private trackGains: Map<string, GainNode> = new Map();
  private trackPanners: Map<string, StereoPannerNode> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private meterInterval: number | null = null;
  private onMeterUpdate: ((levels: LevelMeter) => void) | null = null;
  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private pauseOffset: number = 0;

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 44100 });
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  private setupTrackChain(trackId: string, volume: number, pan: number, mute: boolean): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    if (!this.trackGains.has(trackId)) {
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      gain.connect(panner);
      panner.connect(this.masterGain);
      this.trackGains.set(trackId, gain);
      this.trackPanners.set(trackId, panner);
    }

    const gain = this.trackGains.get(trackId)!;
    const panner = this.trackPanners.get(trackId)!;
    gain.gain.value = mute ? 0 : volume;
    panner.pan.value = pan;
  }

  playTracks(tracks: Track[], mixerState: MixerState, offset: number = 0): void {
    const ctx = this.ensureContext();
    this.stopAll();

    for (const track of tracks) {
      this.setupTrackChain(track.id, track.volume / 100, track.pan, track.mute);
      const gain = this.trackGains.get(track.id)!;

      for (const clip of track.clips) {
        if (!clip.buffer) continue;
        const source = ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.playbackRate.value = clip.speed;

        const clipGain = ctx.createGain();
        clipGain.gain.value = clip.volume / 100;

        if (clip.fadeIn > 0) {
          clipGain.gain.setValueAtTime(0, ctx.currentTime + clip.startTime + offset);
          clipGain.gain.linearRampToValueAtTime(
            clip.volume / 100,
            ctx.currentTime + clip.startTime + offset + clip.fadeIn
          );
        }

        if (clip.fadeOut > 0) {
          const fadeOutStart = clip.startTime + offset + clip.duration - clip.fadeOut;
          clipGain.gain.setValueAtTime(clip.volume / 100, ctx.currentTime + fadeOutStart);
          clipGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutStart + clip.fadeOut);
        }

        source.connect(clipGain);
        clipGain.connect(gain);
        source.start(ctx.currentTime + clip.startTime + offset);
        this.activeSources.set(clip.id, source);
        source.onended = () => this.activeSources.delete(clip.id);
      }
    }

    this.playbackStartTime = ctx.currentTime;
    this.isPlaying = true;
    this.startMetering();
  }

  stopAll(): void {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch {}
    });
    this.activeSources.clear();
    this.isPlaying = false;
    this.stopMetering();
  }

  pause(): void {
    if (!this.ctx || !this.isPlaying) return;
    this.pauseOffset = this.ctx.currentTime - this.playbackStartTime;
    this.stopAll();
  }

  setTrackVolume(trackId: string, volume: number): void {
    const gain = this.trackGains.get(trackId);
    if (gain) {
      gain.gain.setTargetAtTime(volume / 100, this.ensureContext().currentTime, 0.01);
    }
  }

  setTrackPan(trackId: string, pan: number): void {
    const panner = this.trackPanners.get(trackId);
    if (panner) {
      panner.pan.setTargetAtTime(pan, this.ensureContext().currentTime, 0.01);
    }
  }

  setTrackMute(trackId: string, mute: boolean, volume: number): void {
    const gain = this.trackGains.get(trackId);
    if (gain) {
      gain.gain.setTargetAtTime(mute ? 0 : volume / 100, this.ensureContext().currentTime, 0.01);
    }
  }

  setMasterVolume(db: number): void {
    if (!this.masterGain) return;
    const linear = Math.pow(10, db / 20);
    this.masterGain.gain.setTargetAtTime(linear, this.ensureContext().currentTime, 0.01);
  }

  getLevelMeter(): LevelMeter {
    if (!this.analyser) return { left: 0, right: 0 };
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);

    let leftSum = 0;
    let rightSum = 0;
    const half = data.length / 2;

    for (let i = 0; i < half; i++) {
      leftSum += data[i] * data[i];
      rightSum += data[i + half] * data[i + half];
    }

    return {
      left: Math.sqrt(leftSum / half),
      right: Math.sqrt(rightSum / half),
    };
  }

  onLevelMeterUpdate(callback: (levels: LevelMeter) => void): void {
    this.onMeterUpdate = callback;
    if (this.isPlaying) this.startMetering();
  }

  private startMetering(): void {
    if (this.meterInterval) return;
    this.meterInterval = window.setInterval(() => {
      if (this.onMeterUpdate) {
        this.onMeterUpdate(this.getLevelMeter());
      }
    }, 100);
  }

  private stopMetering(): void {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    if (this.onMeterUpdate) {
      this.onMeterUpdate({ left: 0, right: 0 });
    }
  }

  async exportMix(
    tracks: Track[],
    mixerState: MixerState,
    format: 'mp3' | 'wav',
    onProgress: (trackIndex: number, progress: number) => void
  ): Promise<Blob> {
    const ctx = this.ensureContext();
    const sampleRate = 44100;

    let totalDuration = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration / clip.speed;
        if (end > totalDuration) totalDuration = end;
      }
    }

    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples || sampleRate, sampleRate);
    const offlineMaster = offlineCtx.createGain();
    offlineMaster.connect(offlineCtx.destination);

    const db = mixerState.masterVolume;
    offlineMaster.gain.value = Math.pow(10, db / 20);

    for (let t = 0; t < tracks.length; t++) {
      const track = tracks[t];
      const offlineGain = offlineCtx.createGain();
      const offlinePanner = offlineCtx.createStereoPanner();
      offlineGain.connect(offlinePanner);
      offlinePanner.connect(offlineMaster);

      const isSoloActive = tracks.some((tr) => tr.solo);
      const shouldPlay = isSoloActive ? track.solo : !track.mute;
      offlineGain.gain.value = shouldPlay ? track.volume / 100 : 0;
      offlinePanner.pan.value = track.pan;

      for (const clip of track.clips) {
        if (!clip.buffer) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = clip.buffer;
        source.playbackRate.value = clip.speed;

        const clipGain = offlineCtx.createGain();
        clipGain.gain.value = clip.volume / 100;

        if (clip.fadeIn > 0) {
          clipGain.gain.setValueAtTime(0, clip.startTime);
          clipGain.gain.linearRampToValueAtTime(clip.volume / 100, clip.startTime + clip.fadeIn);
        }

        if (clip.fadeOut > 0) {
          const fadeOutStart = clip.startTime + clip.duration / clip.speed - clip.fadeOut;
          if (fadeOutStart > clip.startTime) {
            clipGain.gain.setValueAtTime(clip.volume / 100, fadeOutStart);
            clipGain.gain.linearRampToValueAtTime(0, fadeOutStart + clip.fadeOut);
          }
        }

        source.connect(clipGain);
        clipGain.connect(offlineGain);
        source.start(clip.startTime);
      }

      onProgress(t, (t + 1) / tracks.length * 100);

      await new Promise((r) => setTimeout(r, 0));
    }

    onProgress(tracks.length, 100);

    const renderedBuffer = await offlineCtx.startRendering();
    return this.encodeBuffer(renderedBuffer, format);
  }

  private encodeBuffer(buffer: AudioBuffer, format: 'mp3' | 'wav'): Blob {
    if (format === 'wav') {
      return this.encodeWav(buffer);
    }
    return this.encodeWav(buffer);
  }

  private encodeWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2;
    const dataLength = length * numChannels * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  dispose(): void {
    this.stopAll();
    this.trackGains.clear();
    this.trackPanners.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export default AudioEngine;
