export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pausedAt = 0;
  private frequencyData: Uint8Array;
  private waveformData: Uint8Array;
  private fftSize = 256;
  private smoothingTimeConstant = 0.8;

  constructor() {
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.waveformData = new Uint8Array(this.fftSize);
  }

  async loadAudio(file: File): Promise<void> {
    this.disposeSource();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.pausedAt = 0;
    this.isPlaying = false;
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.disposeSource();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
      }
    };

    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) return;

    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.disposeSource();
    this.isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
    }
    this.disposeSource();
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  private disposeSource(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {}
      this.source = null;
    }
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.isPlaying) {
      (this.analyser as any).getByteFrequencyData(this.frequencyData);
    } else {
      this.frequencyData.fill(0);
    }
    return this.frequencyData;
  }

  getWaveformData(): Uint8Array {
    if (this.analyser && this.isPlaying) {
      (this.analyser as any).getByteTimeDomainData(this.waveformData);
    } else {
      this.waveformData.fill(128);
    }
    return this.waveformData;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  hasAudio(): boolean {
    return this.audioBuffer !== null;
  }

  getAverageVolume(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length / 255;
  }

  getBassVolume(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    const bassEnd = Math.floor(data.length * 0.1);
    for (let i = 0; i < bassEnd; i++) {
      sum += data[i];
    }
    return sum / bassEnd / 255;
  }

  getMidVolume(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    const midStart = Math.floor(data.length * 0.1);
    const midEnd = Math.floor(data.length * 0.5);
    for (let i = midStart; i < midEnd; i++) {
      sum += data[i];
    }
    return sum / (midEnd - midStart) / 255;
  }

  getTrebleVolume(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    const trebleStart = Math.floor(data.length * 0.5);
    for (let i = trebleStart; i < data.length; i++) {
      sum += data[i];
    }
    return sum / (data.length - trebleStart) / 255;
  }

  dispose(): void {
    this.stop();
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}
