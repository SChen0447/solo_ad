export interface WaveformData {
  peaks: number[];
  rms: number[];
}

export interface TrackEQ {
  low: number;
  mid: number;
  high: number;
}

export interface TrackAudioNodes {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  lowFilter: BiquadFilterNode;
  midFilter: BiquadFilterNode;
  highFilter: BiquadFilterNode;
}

export type ExportProgressCallback = (progress: number) => void;

const SAMPLE_RATE = 44100;
const MIN_SAMPLES = 200;
const MAX_SAMPLES = 1000;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackNodes: Map<string, TrackAudioNodes> = new Map();
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentDuration = 0;

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  getContext(): AudioContext {
    if (!this.audioContext) {
      this.init();
    }
    return this.audioContext!;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume / 100));
    }
  }

  async decodeAudioFile(file: File): Promise<AudioBuffer> {
    this.init();
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
  }

  computeWaveform(audioBuffer: AudioBuffer): WaveformData {
    const duration = audioBuffer.duration;
    const numSamples = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.floor(duration * 100)));
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBin = Math.floor(channelData.length / numSamples);

    const peaks: number[] = [];
    const rms: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      const start = i * samplesPerBin;
      const end = Math.min(start + samplesPerBin, channelData.length);
      let peak = 0;
      let sumSq = 0;

      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > peak) peak = val;
        sumSq += channelData[j] * channelData[j];
      }

      peaks.push(peak);
      rms.push(Math.sqrt(sumSq / Math.max(1, end - start)));
    }

    return { peaks, rms };
  }

  createTrackNodes(trackId: string, eq: TrackEQ, volume: number): TrackAudioNodes {
    this.init();
    const ctx = this.audioContext!;

    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 80;
    lowFilter.gain.value = eq.low;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;
    midFilter.gain.value = eq.mid;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 8000;
    highFilter.gain.value = eq.high;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume / 100;

    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(gainNode);
    gainNode.connect(this.masterGain!);

    const nodes: TrackAudioNodes = {
      source: null,
      gainNode,
      lowFilter,
      midFilter,
      highFilter,
    };

    this.trackNodes.set(trackId, nodes);
    return nodes;
  }

  updateTrackVolume(trackId: string, volume: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gainNode.gain.value = volume / 100;
    }
  }

  updateTrackEQ(trackId: string, band: 'low' | 'mid' | 'high', value: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      if (band === 'low') nodes.lowFilter.gain.value = value;
      else if (band === 'mid') nodes.midFilter.gain.value = value;
      else nodes.highFilter.gain.value = value;
    }
  }

  setTrackMuted(trackId: string, muted: boolean): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gainNode.gain.value = muted ? 0 : nodes.gainNode.gain.value;
    }
  }

  disconnectTrack(trackId: string): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      if (nodes.source) {
        try { nodes.source.stop(); } catch {}
        nodes.source.disconnect();
      }
      nodes.lowFilter.disconnect();
      nodes.midFilter.disconnect();
      nodes.highFilter.disconnect();
      nodes.gainNode.disconnect();
      this.trackNodes.delete(trackId);
    }
  }

  playTracks(
    tracks: Array<{
      id: string;
      audioBuffer: AudioBuffer | null;
      volume: number;
      muted: boolean;
      solo: boolean;
      eq: TrackEQ;
    }>,
    offset: number = 0
  ): void {
    this.init();
    this.stopAll();
    const ctx = this.audioContext!;

    const hasSolo = tracks.some(t => t.solo);

    this.currentDuration = 0;
    tracks.forEach(t => {
      if (t.audioBuffer && t.audioBuffer.duration > this.currentDuration) {
        this.currentDuration = t.audioBuffer.duration;
      }
    });

    tracks.forEach(track => {
      if (!track.audioBuffer) return;

      const shouldPlay = hasSolo ? track.solo : !track.muted;
      if (!shouldPlay) return;

      let nodes = this.trackNodes.get(track.id);
      if (!nodes) {
        nodes = this.createTrackNodes(track.id, track.eq, track.muted ? 0 : track.volume);
      } else {
        this.updateTrackVolume(track.id, track.muted ? 0 : track.volume);
        this.updateTrackEQ(track.id, 'low', track.eq.low);
        this.updateTrackEQ(track.id, 'mid', track.eq.mid);
        this.updateTrackEQ(track.id, 'high', track.eq.high);
      }

      const source = ctx.createBufferSource();
      source.buffer = track.audioBuffer;
      source.connect(nodes.lowFilter);
      nodes.source = source;

      const startOffset = Math.min(offset, track.audioBuffer.duration);
      source.start(0, startOffset);
    });

    this.startTime = ctx.currentTime - offset;
    this.isPlaying = true;
  }

  pause(): void {
    if (this.isPlaying && this.audioContext) {
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.stopAll();
      this.isPlaying = false;
    }
  }

  stopAll(): void {
    this.trackNodes.forEach(nodes => {
      if (nodes.source) {
        try { nodes.source.stop(); } catch {}
        nodes.source.disconnect();
        nodes.source = null;
      }
    });
    this.isPlaying = false;
  }

  reset(): void {
    this.stopAll();
    this.pauseTime = 0;
    this.startTime = 0;
    this.trackNodes.forEach((_, id) => this.disconnectTrack(id));
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlaying) {
      return Math.min(this.currentDuration, this.audioContext.currentTime - this.startTime);
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.currentDuration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  async exportMix(
    tracks: Array<{
      audioBuffer: AudioBuffer | null;
      volume: number;
      muted: boolean;
      solo: boolean;
      eq: TrackEQ;
    }>,
    progressCallback?: ExportProgressCallback
  ): Promise<Blob> {
    const validTracks = tracks.filter(t => t.audioBuffer !== null);
    if (validTracks.length === 0) {
      throw new Error('没有可导出的音频');
    }

    let duration = 0;
    validTracks.forEach(t => {
      if (t.audioBuffer && t.audioBuffer.duration > duration) {
        duration = t.audioBuffer.duration;
      }
    });

    const hasSolo = validTracks.some(t => t.solo);

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(offlineCtx.destination);

    let processed = 0;
    const total = validTracks.length;

    validTracks.forEach(track => {
      const shouldPlay = hasSolo ? track.solo : !track.muted;
      if (!shouldPlay || !track.audioBuffer) {
        processed++;
        if (progressCallback) progressCallback(processed / (total + 1));
        return;
      }

      const lowFilter = offlineCtx.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 80;
      lowFilter.gain.value = track.eq.low;

      const midFilter = offlineCtx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = track.eq.mid;

      const highFilter = offlineCtx.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 8000;
      highFilter.gain.value = track.eq.high;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = track.volume / 100;

      const source = offlineCtx.createBufferSource();
      source.buffer = track.audioBuffer;

      source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(gainNode);
      gainNode.connect(masterGain);

      source.start(0);
      processed++;
      if (progressCallback) progressCallback(processed / (total + 1));
    });

    if (progressCallback) progressCallback((total + 0.5) / (total + 1));
    const renderedBuffer = await offlineCtx.startRendering();
    if (progressCallback) progressCallback(1);

    return this.audioBufferToWav(renderedBuffer);
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}

export const audioEngine = new AudioEngine();
