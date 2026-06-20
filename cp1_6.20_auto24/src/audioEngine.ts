export interface FrequencyData {
  timestamp: number;
  low: number;
  mid: number;
  high: number;
}

export type AudioCallback = (data: FrequencyData) => void;
export type ProgressCallback = (progress: number, duration: number) => void;
export type StateChangeCallback = (isPlaying: boolean) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array | null = null;
  
  private startTime: number = 0;
  private pausedAt: number = 0;
  private duration: number = 0;
  private isPlayingState: boolean = false;
  private animationFrameId: number | null = null;
  
  private frequencyCallbacks: AudioCallback[] = [];
  private progressCallbacks: ProgressCallback[] = [];
  private stateChangeCallbacks: StateChangeCallback[] = [];
  
  private readonly FFT_SIZE = 256;
  private readonly LOW_BAND_END = 10;
  private readonly MID_BAND_END = 43;
  private readonly HIGH_BAND_END = 127;

  async loadFile(file: File): Promise<void> {
    this.cleanup();
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.8;
    
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pausedAt = 0;
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.stopSource();
    
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.source.onended = () => {
      if (this.isPlayingState && this.getCurrentTime() >= this.duration - 0.1) {
        this.pause();
        this.pausedAt = 0;
        this.notifyStateChange(false);
      }
    };
    
    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
    this.isPlayingState = true;
    
    this.notifyStateChange(true);
    this.startAnalysisLoop();
  }

  pause(): void {
    if (!this.isPlayingState) return;
    
    this.pausedAt = this.getCurrentTime();
    this.stopSource();
    this.isPlayingState = false;
    this.stopAnalysisLoop();
    this.notifyStateChange(false);
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    this.pausedAt = clampedTime;
    
    if (this.isPlayingState) {
      this.play();
    }
    
    this.notifyProgress();
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    if (!this.audioContext) return this.pausedAt;
    
    if (this.isPlayingState) {
      return this.audioContext.currentTime - this.startTime;
    }
    
    return this.pausedAt;
  }

  isPlaying(): boolean {
    return this.isPlayingState;
  }

  onFrequency(callback: AudioCallback): void {
    this.frequencyCallbacks.push(callback);
  }

  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  destroy(): void {
    this.stopAnalysisLoop();
    this.stopSource();
    this.cleanup();
    
    this.frequencyCallbacks = [];
    this.progressCallbacks = [];
    this.stateChangeCallbacks = [];
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.isPlayingState || !this.analyser || !this.frequencyData) return;
      
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      const low = this.calculateBandAverage(0, this.LOW_BAND_END);
      const mid = this.calculateBandAverage(this.LOW_BAND_END + 1, this.MID_BAND_END);
      const high = this.calculateBandAverage(this.MID_BAND_END + 1, this.HIGH_BAND_END);
      
      const data: FrequencyData = {
        timestamp: this.getCurrentTime(),
        low,
        mid,
        high
      };
      
      this.notifyFrequency(data);
      this.notifyProgress();
      
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    
    analyze();
  }

  private stopAnalysisLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private calculateBandAverage(start: number, end: number): number {
    if (!this.frequencyData) return 0;
    
    let sum = 0;
    const actualEnd = Math.min(end, this.frequencyData.length - 1);
    const count = actualEnd - start + 1;
    
    for (let i = start; i <= actualEnd; i++) {
      sum += this.frequencyData[i];
    }
    
    return Math.round(sum / count);
  }

  private notifyFrequency(data: FrequencyData): void {
    this.frequencyCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('Frequency callback error:', e);
      }
    });
  }

  private notifyProgress(): void {
    const current = this.getCurrentTime();
    this.progressCallbacks.forEach(callback => {
      try {
        callback(current, this.duration);
      } catch (e) {
        console.error('Progress callback error:', e);
      }
    });
  }

  private notifyStateChange(isPlaying: boolean): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(isPlaying);
      } catch (e) {
        console.error('State change callback error:', e);
      }
    });
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // Ignore stop errors
      }
      this.source = null;
    }
  }

  private cleanup(): void {
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
    this.frequencyData = null;
    this.duration = 0;
    this.isPlayingState = false;
    this.pausedAt = 0;
  }
}
