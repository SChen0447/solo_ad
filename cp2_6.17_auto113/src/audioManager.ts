export class AudioManager {
  private audioContext: AudioContext | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime = 0;
  private pauseTime = 0;
  private isPlaying = false;
  private duration = 0;
  private syntheticOscillators: OscillatorNode[] = [];
  private syntheticGainNodes: GainNode[] = [];
  private sfxGainNode: GainNode | null = null;
  private sfxOscillators: OscillatorNode[] = [];
  private sfxGainNodes: GainNode[] = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.7;

      this.sfxGainNode = this.audioContext.createGain();
      this.sfxGainNode.connect(this.audioContext.destination);
      this.sfxGainNode.gain.value = 0.5;
    }
  }

  public async loadAudio(url: string): Promise<AudioBuffer> {
    this.initAudioContext();
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.currentBuffer = audioBuffer;
    this.duration = audioBuffer.duration * 1000;
    return audioBuffer;
  }

  public generateSyntheticAudio(bpm: number, durationMs: number): AudioBuffer {
    this.initAudioContext();
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = this.audioContext.sampleRate;
    const duration = durationMs / 1000;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const beatInterval = 60 / bpm;

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const time = i / sampleRate;
        const beatTime = time % beatInterval;
        const beatPhase = beatTime / beatInterval;

        const kick = beatPhase < 0.1 ? Math.sin(beatPhase * Math.PI * 10) * Math.exp(-beatPhase * 20) * 0.5 : 0;

        const bassFreq = 55 + Math.sin(time * 2) * 10;
        const bass = Math.sin(time * bassFreq * Math.PI * 2) * 0.2 * Math.exp(-beatPhase * 5);

        const melodyFreq = 220 + Math.sin(time * bpm / 60 * Math.PI * 2) * 110;
        const melody = Math.sin(time * melodyFreq * Math.PI * 2) * 0.15;

        const hihat = beatPhase > 0.45 && beatPhase < 0.55 ? (Math.random() - 0.5) * 0.2 : 0;

        channelData[i] = kick + bass + melody + hihat;
      }
    }

    this.currentBuffer = buffer;
    this.duration = durationMs;
    return buffer;
  }

  public play(buffer?: AudioBuffer, startTime = 0): void {
    this.initAudioContext();
    if (!this.audioContext || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stop();

    const audioBuffer = buffer || this.currentBuffer;
    if (!audioBuffer) return;

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.gainNode);
    this.currentSource.onended = () => {
      this.isPlaying = false;
    };

    this.startTime = this.audioContext.currentTime - startTime / 1000;
    this.currentSource.start(0, startTime / 1000);
    this.isPlaying = true;
  }

  public playSynthetic(bpm: number, durationMs: number, startTime = 0): void {
    this.initAudioContext();
    if (!this.audioContext || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stopSynthetic();

    const beatInterval = 60 / bpm;
    const startBeat = Math.floor(startTime / 1000 / beatInterval);
    const totalBeats = Math.ceil(durationMs / 1000 / beatInterval);

    for (let i = startBeat; i < totalBeats; i++) {
      const beatTime = i * beatInterval - startTime / 1000;
      if (beatTime < 0) continue;

      const kickOsc = this.audioContext.createOscillator();
      const kickGain = this.audioContext.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, this.audioContext.currentTime + beatTime);
      kickOsc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + beatTime + 0.1);
      kickGain.gain.setValueAtTime(0.8, this.audioContext.currentTime + beatTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatTime + 0.2);
      kickOsc.connect(kickGain);
      kickGain.connect(this.gainNode);
      kickOsc.start(this.audioContext.currentTime + beatTime);
      kickOsc.stop(this.audioContext.currentTime + beatTime + 0.2);
      this.syntheticOscillators.push(kickOsc);
      this.syntheticGainNodes.push(kickGain);

      if (i % 2 === 1) {
        const snareOsc = this.audioContext.createOscillator();
        const snareGain = this.audioContext.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.value = 200;
        snareGain.gain.setValueAtTime(0.3, this.audioContext.currentTime + beatTime);
        snareGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatTime + 0.15);
        snareOsc.connect(snareGain);
        snareGain.connect(this.gainNode);
        snareOsc.start(this.audioContext.currentTime + beatTime);
        snareOsc.stop(this.audioContext.currentTime + beatTime + 0.15);
        this.syntheticOscillators.push(snareOsc);
        this.syntheticGainNodes.push(snareGain);
      }

      if (i % 4 === 0) {
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 55 + (i % 8) * 5;
        bassGain.gain.setValueAtTime(0.25, this.audioContext.currentTime + beatTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatTime + beatInterval * 0.8);
        bassOsc.connect(bassGain);
        bassGain.connect(this.gainNode);
        bassOsc.start(this.audioContext.currentTime + beatTime);
        bassOsc.stop(this.audioContext.currentTime + beatTime + beatInterval * 0.8);
        this.syntheticOscillators.push(bassOsc);
        this.syntheticGainNodes.push(bassGain);
      }

      const melodyNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      const melodyFreq = melodyNotes[i % melodyNotes.length];
      const melodyOsc = this.audioContext.createOscillator();
      const melodyGain = this.audioContext.createGain();
      melodyOsc.type = 'square';
      melodyOsc.frequency.value = melodyFreq;
      melodyGain.gain.setValueAtTime(0.1, this.audioContext.currentTime + beatTime);
      melodyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatTime + beatInterval * 0.5);
      melodyOsc.connect(melodyGain);
      melodyGain.connect(this.gainNode);
      melodyOsc.start(this.audioContext.currentTime + beatTime);
      melodyOsc.stop(this.audioContext.currentTime + beatTime + beatInterval * 0.5);
      this.syntheticOscillators.push(melodyOsc);
      this.syntheticGainNodes.push(melodyGain);
    }

    this.startTime = this.audioContext.currentTime - startTime / 1000;
    this.duration = durationMs;
    this.isPlaying = true;
  }

  public pause(): void {
    if (!this.isPlaying || !this.audioContext) return;
    this.pauseTime = this.getCurrentTime();
    this.stop();
  }

  public stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (_e) {
        // ignore
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.stopSynthetic();
    this.isPlaying = false;
  }

  private stopSynthetic(): void {
    this.syntheticOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (_e) {
        // ignore
      }
      osc.disconnect();
    });
    this.syntheticGainNodes.forEach(gain => gain.disconnect());
    this.syntheticOscillators = [];
    this.syntheticGainNodes = [];
  }

  public getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return (this.audioContext.currentTime - this.startTime) * 1000;
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public getDuration(): number {
    return this.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public playSfxPerfect(): void {
    this.playTone(880, 'sine', 0.08, 0.35);
  }

  public playSfxGood(): void {
    this.playTone(440, 'triangle', 0.1, 0.3);
  }

  public playSfxMiss(): void {
    this.playTone(150, 'sawtooth', 0.15, 0.25);
  }

  public playSfxConfirm(): void {
    this.playTone(660, 'sine', 0.06, 0.3);
    setTimeout(() => this.playTone(880, 'sine', 0.06, 0.25), 40);
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, volume: number): void {
    this.initAudioContext();
    if (!this.audioContext || !this.sfxGainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);

    this.sfxOscillators.push(osc);
    this.sfxGainNodes.push(gain);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      const idx = this.sfxOscillators.indexOf(osc);
      if (idx >= 0) {
        this.sfxOscillators.splice(idx, 1);
        this.sfxGainNodes.splice(idx, 1);
      }
    };
  }

  public setSfxVolume(volume: number): void {
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}
