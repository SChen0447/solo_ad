export class SpectrumAnalyzer {
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array;
  private readonly fftSize: number = 256;
  private readonly sampleRate: number = 44100;

  constructor(audioContext: AudioContext) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getAnalyserNode(): AnalyserNode {
    return this.analyser;
  }

  getSpectrum(): number[] {
    this.analyser.getByteFrequencyData(this.frequencyData);
    
    const spectrum: number[] = [];
    const binCount = this.frequencyData.length;
    const targetBins = 64;
    const binsPerTarget = Math.floor(binCount / targetBins);

    for (let i = 0; i < targetBins; i++) {
      let sum = 0;
      const start = i * binsPerTarget;
      const end = Math.min(start + binsPerTarget, binCount);
      
      for (let j = start; j < end; j++) {
        sum += this.frequencyData[j];
      }
      
      spectrum.push(sum / (end - start) / 255);
    }

    return spectrum;
  }

  getWaveform(): number[] {
    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);
    
    const waveform: number[] = [];
    for (let i = 0; i < timeData.length; i++) {
      waveform.push((timeData[i] - 128) / 128);
    }
    
    return waveform;
  }

  getLowFrequencyEnergy(): number {
    this.analyser.getByteFrequencyData(this.frequencyData);
    const lowBinCount = Math.floor(this.frequencyData.length * 0.1);
    let sum = 0;
    
    for (let i = 0; i < lowBinCount; i++) {
      sum += this.frequencyData[i];
    }
    
    return sum / lowBinCount / 255;
  }

  getMidHighFrequencyEnergy(): number {
    this.analyser.getByteFrequencyData(this.frequencyData);
    const startBin = Math.floor(this.frequencyData.length * 0.3);
    const endBin = Math.floor(this.frequencyData.length * 0.9);
    let sum = 0;
    
    for (let i = startBin; i < endBin; i++) {
      sum += this.frequencyData[i];
    }
    
    return sum / (endBin - startBin) / 255;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getFftSize(): number {
    return this.fftSize;
  }
}
