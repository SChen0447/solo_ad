import type { SoundSourceType, SoundSourceInstance } from './types';
import { SOUND_SOURCE_META } from './presets';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbEnabled = false;
  private masterVolume = 0.7;

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.masterVolume;
    
    this.convolver = this.audioContext.createConvolver();
    this.convolver.buffer = this.generateImpulseResponse(2, 2, false);
    
    this.reverbWetGain = this.audioContext.createGain();
    this.reverbWetGain.gain.value = 0;
    
    this.reverbDryGain = this.audioContext.createGain();
    this.reverbDryGain.gain.value = 1;
    
    this.masterGain.connect(this.audioContext.destination);
    this.reverbDryGain.connect(this.masterGain);
    this.convolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.masterGain);
  }

  public resume(): Promise<void> | null {
    return this.audioContext?.resume() || null;
  }

  private generateImpulseResponse(duration: number, decay: number, reverse: boolean): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext!.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      }
    }
    
    return impulse;
  }

  public createAudioNodes(type: SoundSourceType, volume: number = 0.5): {
    source: AudioBufferSourceNode | OscillatorNode;
    panner: PannerNode;
    gain: GainNode;
    reverbGain: GainNode;
  } {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 20;
    panner.rolloffFactor = 1;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.3;

    const source = this.generateSoundSource(type);
    
    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.reverbDryGain!);
    panner.connect(reverbGain);
    reverbGain.connect(this.convolver!);

    if (source.start) {
      source.start();
    }

    return { source, panner, gain, reverbGain };
  }

  private generateSoundSource(type: SoundSourceType): AudioBufferSourceNode | OscillatorNode {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    switch (type) {
      case 'piano':
        return this.createPianoSound();
      case 'bass':
        return this.createBassSound();
      case 'drums':
        return this.createDrumsSound();
      case 'birds':
        return this.createBirdsSound();
      case 'rain':
        return this.createRainSound();
      case 'synth':
        return this.createSynthSound();
      default:
        return this.createPianoSound();
    }
  }

  private createPianoSound(): AudioBufferSourceNode {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const duration = 0.5;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 3);
      const freq = 261.63;
      data[i] = (
        Math.sin(2 * Math.PI * freq * t) * 0.5 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.125 +
        Math.sin(2 * Math.PI * freq * 4 * t) * 0.0625
      ) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = duration;
    return source;
  }

  private createBassSound(): OscillatorNode {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 55;

    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 1;

    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 20;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    
    lfo.start();

    const oscillatorWrapper = Object.create(osc) as OscillatorNode & { connect: typeof osc.connect };
    oscillatorWrapper.connect = (destination: AudioNode) => filter.connect(destination);
    
    return oscillatorWrapper;
  }

  private createDrumsSound(): AudioBufferSourceNode {
    const ctx = this.audioContext!;
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * barDuration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let beat = 0; beat < 4; beat++) {
      const beatStart = Math.floor(beat * beatDuration * sampleRate);
      const kickLength = Math.floor(0.15 * sampleRate);
      
      for (let i = 0; i < kickLength; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 30);
        const freq = 150 * Math.exp(-t * 20) + 50;
        data[beatStart + i] += Math.sin(2 * Math.PI * freq * t) * env * 0.8;
      }

      if (beat === 1 || beat === 3) {
        const snareStart = Math.floor(beat * beatDuration * sampleRate);
        const snareLength = Math.floor(0.2 * sampleRate);
        
        for (let i = 0; i < snareLength; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 15);
          data[snareStart + i] += (Math.random() * 2 - 1) * env * 0.3;
        }
      }

      const hihatStart = Math.floor(beat * beatDuration * sampleRate);
      const hihatLength = Math.floor(0.05 * sampleRate);
      
      for (let i = 0; i < hihatLength; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 80);
        data[hihatStart + i] += (Math.random() * 2 - 1) * env * 0.15;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private createBirdsSound(): AudioBufferSourceNode {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const duration = 3;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let chirpCount = 0;
    let nextChirpTime = 0.3;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (t >= nextChirpTime && chirpCount < 8) {
        const chirpLength = 0.15;
        const chirpStart = nextChirpTime;
        const chirpEnd = chirpStart + chirpLength;
        
        if (t < chirpEnd) {
          const chirpT = t - chirpStart;
          const env = Math.exp(-chirpT * 15);
          const baseFreq = 2000 + Math.random() * 1000;
          const freqMod = Math.sin(chirpT * 20) * 200;
          const freq = baseFreq + freqMod;
          sample = Math.sin(2 * Math.PI * freq * chirpT) * env * 0.3;
        } else {
          chirpCount++;
          nextChirpTime = t + 0.2 + Math.random() * 0.5;
        }
      }

      data[i] = sample;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private createRainSound(): AudioBufferSourceNode {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const duration = 2;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;

      const t = i / sampleRate;
      const modulation = 0.8 + Math.sin(t * 0.3) * 0.2;
      data[i] = pink * modulation * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private createSynthSound(): OscillatorNode {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const envelopeGain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 880;

    filter.type = 'highpass';
    filter.frequency.value = 500;

    lfo.frequency.value = 8;
    lfoGain.gain.value = 100;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(envelopeGain);
    
    lfo.start();

    const now = ctx.currentTime;
    envelopeGain.gain.setValueAtTime(0, now);
    envelopeGain.gain.linearRampToValueAtTime(1, now + 0.01);
    envelopeGain.gain.linearRampToValueAtTime(0.7, now + 0.1);
    envelopeGain.gain.linearRampToValueAtTime(0.7, now + 0.4);
    envelopeGain.gain.linearRampToValueAtTime(0, now + 0.5);

    const oscillatorWrapper = Object.create(osc) as OscillatorNode & { connect: typeof osc.connect };
    oscillatorWrapper.connect = (destination: AudioNode) => envelopeGain.connect(destination);
    
    return oscillatorWrapper;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioContext!.currentTime, 0.01);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setReverbEnabled(enabled: boolean): void {
    this.reverbEnabled = enabled;
    if (this.reverbWetGain && this.reverbDryGain) {
      const time = this.audioContext!.currentTime;
      if (enabled) {
        this.reverbWetGain.gain.setTargetAtTime(0.4, time, 0.1);
        this.reverbDryGain.gain.setTargetAtTime(0.8, time, 0.1);
      } else {
        this.reverbWetGain.gain.setTargetAtTime(0, time, 0.1);
        this.reverbDryGain.gain.setTargetAtTime(1, time, 0.1);
      }
    }
  }

  public isReverbEnabled(): boolean {
    return this.reverbEnabled;
  }

  public updateSourcePosition(source: SoundSourceInstance, x: number, y: number, z: number): void {
    if (source.audioNodes?.panner) {
      source.audioNodes.panner.positionX.setTargetAtTime(x, this.audioContext!.currentTime, 0.02);
      source.audioNodes.panner.positionY.setTargetAtTime(y, this.audioContext!.currentTime, 0.02);
      source.audioNodes.panner.positionZ.setTargetAtTime(z, this.audioContext!.currentTime, 0.02);
    }
  }

  public setSourceVolume(source: SoundSourceInstance, volume: number): void {
    if (source.audioNodes?.gain) {
      source.audioNodes.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.audioContext!.currentTime, 0.01);
    }
  }

  public getSourceVolume(source: SoundSourceInstance): number {
    return source.audioNodes?.gain?.gain.value || 0;
  }

  public disposeSource(source: SoundSourceInstance): void {
    if (source.audioNodes) {
      try {
        source.audioNodes.source.stop();
        source.audioNodes.source.disconnect();
        source.audioNodes.panner.disconnect();
        source.audioNodes.gain.disconnect();
        source.audioNodes.reverbGain.disconnect();
      } catch (e) {
        console.warn('Error disposing audio nodes:', e);
      }
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}
