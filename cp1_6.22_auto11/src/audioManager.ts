export interface BeatData {
  time: number;
  intensity: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array();
  private timeData: Uint8Array = new Uint8Array();
  private lastBeatTime: number = 0;
  private beatThreshold: number = 180;
  private minBeatInterval: number = 200;
  private energyHistory: number[] = [];
  private historySize: number = 43;
  private speedMultiplier: number = 1.0;
  private isPlaying: boolean = false;
  private onBeatCallback: ((beat: BeatData) => void) | null = null;
  private songs: Map<string, string> = new Map();

  constructor() {
    this.initSongs();
  }

  private initSongs(): void {
    this.songs.set('song1', this.generateSongURL(120, '电子'));
    this.songs.set('song2', this.generateSongURL(140, '动感'));
    this.songs.set('song3', this.generateSongURL(128, '活力'));
  }

  private generateSongURL(bpm: number, style: string): string {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 120;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    const beatInterval = 60 / bpm;
    const samplesPerBeat = beatInterval * sampleRate;
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < buffer.length; i++) {
        const beatPosition = (i % samplesPerBeat) / samplesPerBeat;
        const barPosition = Math.floor(i / samplesPerBeat) % 4;
        
        let sample = 0;
        
        if (beatPosition < 0.1) {
          const envelope = 1 - (beatPosition / 0.1);
          const kickFreq = barPosition === 0 ? 60 : 50;
          sample += Math.sin(2 * Math.PI * kickFreq * i / sampleRate) * envelope * 0.5;
        }
        
        if (beatPosition > 0.45 && beatPosition < 0.55 && barPosition % 2 === 1) {
          const env = 1 - Math.abs(beatPosition - 0.5) / 0.05;
          const noise = (Math.random() * 2 - 1) * 0.3;
          sample += noise * env * 0.4;
        }
        
        const bassFreq = style === '电子' ? 80 : style === '动感' ? 90 : 75;
        const bassNote = Math.sin(2 * Math.PI * bassFreq * i / sampleRate);
        sample += bassNote * 0.15;
        
        const melodyFreq = style === '电子' ? 440 : style === '动感' ? 523 : 392;
        const melody = Math.sin(2 * Math.PI * melodyFreq * i / sampleRate * (1 + barPosition * 0.1));
        sample += melody * 0.08;
        
        sample = Math.max(-1, Math.min(1, sample));
        channelData[i] = sample;
      }
    }
    
    const wavBlob = this.bufferToWave(buffer, sampleRate);
    return URL.createObjectURL(wavBlob);
  }

  private bufferToWave(buffer: AudioBuffer, sampleRate: number): Blob {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, length - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length - 44, true);
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel]![i]!));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeData = new Uint8Array(bufferLength);
    
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  public async setSong(songId: string): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    const songUrl = this.songs.get(songId);
    if (!songUrl) {
      throw new Error(`Song not found: ${songId}`);
    }
    
    this.audioElement = new Audio(songUrl);
    this.audioElement.loop = true;
    this.audioElement.crossOrigin = 'anonymous';
    
    if (this.audioContext && this.analyser) {
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
      this.sourceNode.connect(this.analyser);
    }
    
    this.energyHistory = [];
    this.lastBeatTime = 0;
  }

  public play(): void {
    if (!this.audioElement || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.audioElement.playbackRate = this.speedMultiplier;
    this.audioElement.play();
    this.isPlaying = true;
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
    if (this.audioElement) {
      this.audioElement.playbackRate = multiplier;
    }
    this.minBeatInterval = 200 / multiplier;
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setOnBeatCallback(callback: (beat: BeatData) => void): void {
    this.onBeatCallback = callback;
  }

  public update(): BeatData | null {
    if (!this.analyser || !this.isPlaying) return null;
    
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);
    
    const lowFrequencySum = this.frequencyData.slice(0, 20).reduce((a, b) => a + b, 0);
    const currentEnergy = lowFrequencySum / 20;
    
    this.energyHistory.push(currentEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((a, b) => a + Math.pow(b - avgEnergy, 2), 0) / this.energyHistory.length;
    const stdDev = Math.sqrt(variance);
    
    const dynamicThreshold = avgEnergy + stdDev * 1.3;
    const now = performance.now();
    const adjustedInterval = now - this.lastBeatTime;
    
    if (currentEnergy > dynamicThreshold && 
        currentEnergy > this.beatThreshold && 
        adjustedInterval > this.minBeatInterval) {
      
      this.lastBeatTime = now;
      const intensity = Math.min(1, (currentEnergy - dynamicThreshold) / 100);
      
      const beat: BeatData = {
        time: now,
        intensity: intensity
      };
      
      if (this.onBeatCallback) {
        this.onBeatCallback(beat);
      }
      
      return beat;
    }
    
    return null;
  }

  public getFrequencyData(): Uint8Array {
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    return this.timeData;
  }

  public getCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAvailableSongs(): { id: string; name: string }[] {
    return [
      { id: 'song1', name: '电子节拍.mp3' },
      { id: 'song2', name: '动感节奏.mp3' },
      { id: 'song3', name: '活力旋律.mp3' }
    ];
  }

  public destroy(): void {
    this.pause();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.songs.forEach((url) => URL.revokeObjectURL(url));
  }
}
