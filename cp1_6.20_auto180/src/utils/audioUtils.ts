export const getNoteColor = (track: number): string => {
  const lowColor = { r: 74, g: 144, b: 217 };
  const highColor = { r: 245, g: 166, b: 35 };
  const ratio = track / 15;
  
  const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * ratio);
  const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * ratio);
  const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const getNoteFrequency = (track: number): number => {
  const baseFrequency = 65.41;
  return baseFrequency * Math.pow(2, track / 4);
};

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playPiano(frequency: number, duration: number = 0.5) {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    const harmonic1 = this.audioContext.createOscillator();
    harmonic1.type = 'sine';
    harmonic1.frequency.value = frequency * 2;
    
    const harmonic2 = this.audioContext.createOscillator();
    harmonic2.type = 'sine';
    harmonic2.frequency.value = frequency * 3;
    
    const harmonicGain1 = this.audioContext.createGain();
    harmonicGain1.gain.value = 0.15;
    
    const harmonicGain2 = this.audioContext.createGain();
    harmonicGain2.gain.value = 0.05;
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    harmonic1.connect(harmonicGain1);
    harmonicGain1.connect(gainNode);
    harmonic2.connect(harmonicGain2);
    harmonicGain2.connect(gainNode);
    
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    harmonic1.start();
    harmonic2.start();
    
    oscillator.stop(this.audioContext.currentTime + duration);
    harmonic1.stop(this.audioContext.currentTime + duration);
    harmonic2.stop(this.audioContext.currentTime + duration);
  }

  playDrum(frequency: number = 200, duration: number = 0.1) {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.5;
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noise.start();
  }

  playBass(frequency: number, duration: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playLead(frequency: number, duration: number = 0.4) {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getBandLevels(): { low: number; mid: number; high: number } {
    const data = this.getFrequencyData();
    if (data.length === 0) return { low: 0, mid: 0, high: 0 };
    
    const lowFreqStart = Math.floor(60 / (this.audioContext?.sampleRate || 44100) * 2 * data.length);
    const lowFreqEnd = Math.floor(250 / (this.audioContext?.sampleRate || 44100) * 2 * data.length);
    const midFreqStart = lowFreqEnd;
    const midFreqEnd = Math.floor(2000 / (this.audioContext?.sampleRate || 44100) * 2 * data.length);
    const highFreqStart = midFreqEnd;
    const highFreqEnd = Math.floor(8000 / (this.audioContext?.sampleRate || 44100) * 2 * data.length);
    
    const sum = (arr: Uint8Array, start: number, end: number) => {
      let s = 0;
      for (let i = start; i < end && i < arr.length; i++) s += arr[i];
      return s / (end - start);
    };
    
    return {
      low: sum(data, lowFreqStart, lowFreqEnd) / 255,
      mid: sum(data, midFreqStart, midFreqEnd) / 255,
      high: sum(data, highFreqStart, highFreqEnd) / 255
    };
  }

  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioEngine = new AudioEngine();
