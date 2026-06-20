export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private maxFileSize: number = 20 * 1024 * 1024;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    this.frequencyData = new Uint8Array(128);
  }

  setOnEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  async loadFile(file: File): Promise<void> {
    if (file.size > this.maxFileSize) {
      throw new Error('文件大小超过 20MB 限制');
    }

    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    const validExts = ['.wav', '.mp3'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.includes(file.type) || validExts.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      throw new Error('仅支持 WAV 和 MP3 格式');
    }

    this.ensureContext();

    if (this.isPlaying || this.isPaused) {
      this.stop();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
    this.pauseTime = 0;
  }

  play(): void {
    if (!this.audioBuffer || !this.audioContext || !this.analyser) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.isPaused) {
      this.createAndStartSource(this.pauseTime);
      this.isPaused = false;
      this.isPlaying = true;
      return;
    }

    if (this.isPlaying) {
      return;
    }

    this.createAndStartSource(0);
    this.isPlaying = true;
  }

  private createAndStartSource(offset: number): void {
    if (!this.audioBuffer || !this.audioContext || !this.analyser) {
      return;
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.onended = () => {
      if (this.isPlaying && !this.isPaused) {
        this.isPlaying = false;
        this.pauseTime = 0;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
  }

  pause(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) {
      return;
    }

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.onended = null;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
    this.isPaused = true;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
        this.source.disconnect();
      } catch (_e) {
        // ignore
      }
      this.source = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    } else {
      this.frequencyData.fill(0);
    }
    return this.frequencyData;
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  hasAudio(): boolean {
    return this.audioBuffer !== null;
  }
}
