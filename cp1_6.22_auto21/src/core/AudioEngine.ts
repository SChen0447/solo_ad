import * as THREE from 'three';

export type InstrumentType = 'violin' | 'cello' | 'flute' | 'trumpet' | 'piano' | 'timpani';

interface InstrumentConfig {
  name: InstrumentType;
  color: number;
  midiNotes: number[];
  baseFrequency: number;
  oscillatorType: OscillatorType;
  filterType: BiquadFilterType;
  filterFrequency: number;
  filterQ: number;
  gain: number;
}

interface InstrumentAudioState {
  id: string;
  type: InstrumentType;
  position: THREE.Vector3;
  oscillator: OscillatorNode | null;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  filterNode: BiquadFilterNode;
  isPlaying: boolean;
  noteInterval: number | null;
  currentNoteIndex: number;
}

const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  violin: {
    name: 'violin',
    color: 0xff6b6b,
    midiNotes: [60, 64, 67, 72, 76, 79],
    baseFrequency: 440,
    oscillatorType: 'sawtooth',
    filterType: 'lowpass',
    filterFrequency: 3500,
    filterQ: 2,
    gain: 0.15
  },
  cello: {
    name: 'cello',
    color: 0xee5a24,
    midiNotes: [36, 40, 43, 48, 52, 55],
    baseFrequency: 220,
    oscillatorType: 'sawtooth',
    filterType: 'lowpass',
    filterFrequency: 1800,
    filterQ: 3,
    gain: 0.2
  },
  flute: {
    name: 'flute',
    color: 0x48dbfb,
    midiNotes: [67, 71, 74, 79, 83, 86],
    baseFrequency: 523,
    oscillatorType: 'sine',
    filterType: 'bandpass',
    filterFrequency: 2500,
    filterQ: 1.5,
    gain: 0.12
  },
  trumpet: {
    name: 'trumpet',
    color: 0xfeca57,
    midiNotes: [58, 62, 65, 70, 74, 77],
    baseFrequency: 466,
    oscillatorType: 'square',
    filterType: 'lowpass',
    filterFrequency: 2200,
    filterQ: 4,
    gain: 0.13
  },
  piano: {
    name: 'piano',
    color: 0xc8d6e5,
    midiNotes: [48, 52, 55, 60, 64, 67],
    baseFrequency: 261,
    oscillatorType: 'triangle',
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 1,
    gain: 0.14
  },
  timpani: {
    name: 'timpani',
    color: 0x5f27cd,
    midiNotes: [28, 31, 35, 40, 43, 47],
    baseFrequency: 65,
    oscillatorType: 'sine',
    filterType: 'lowpass',
    filterFrequency: 300,
    filterQ: 5,
    gain: 0.25
  }
};

const STAGE_RADIUS = 8;
const MAX_ATTENUATION_DB = -30;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private clickOscillator: OscillatorNode | null = null;
  private clickGain: GainNode | null = null;
  
  private instruments: Map<string, InstrumentAudioState> = new Map();
  private listenerPosition: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  private globalVolumeDb: number = 0;
  private reverbIntensity: number = 0.3;
  
  private isInitialized: boolean = false;
  
  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    this.masterGain = this.audioContext.createGain();
    this.dryGain = this.audioContext.createGain();
    this.wetGain = this.audioContext.createGain();
    this.convolverNode = this.audioContext.createConvolver();
    
    this.convolverNode.buffer = this.generateImpulseResponse(8, 2.0);
    
    this.dryGain.gain.value = 1 - this.reverbIntensity;
    this.wetGain.gain.value = this.reverbIntensity;
    this.masterGain.gain.value = this.dbToLinear(this.globalVolumeDb);
    
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);
    this.convolverNode.connect(this.wetGain);
    this.masterGain.connect(this.audioContext.destination);
    
    this.clickOscillator = this.audioContext.createOscillator();
    this.clickGain = this.audioContext.createGain();
    this.clickOscillator.type = 'sine';
    this.clickOscillator.frequency.value = 1200;
    this.clickGain.gain.value = 0;
    this.clickOscillator.connect(this.clickGain);
    this.clickGain.connect(this.masterGain);
    this.clickOscillator.start();
    
    this.isInitialized = true;
  }
  
  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const envelope = Math.exp(-i / (sampleRate * decay));
        channelData[i] = (Math.random() * 2 - 1) * envelope * 0.5;
      }
    }
    
    return impulse;
  }
  
  addInstrument(id: string, type: InstrumentType, position: THREE.Vector3): void {
    if (!this.audioContext || !this.dryGain || !this.convolverNode) {
      throw new Error('AudioEngine not initialized');
    }
    
    const config = INSTRUMENT_CONFIGS[type];
    
    const gainNode = this.audioContext.createGain();
    const pannerNode = this.audioContext.createStereoPanner();
    const filterNode = this.audioContext.createBiquadFilter();
    
    filterNode.type = config.filterType;
    filterNode.frequency.value = config.filterFrequency;
    filterNode.Q.value = config.filterQ;
    
    gainNode.gain.value = 0;
    
    filterNode.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.dryGain);
    pannerNode.connect(this.convolverNode);
    
    const state: InstrumentAudioState = {
      id,
      type,
      position: position.clone(),
      oscillator: null,
      gainNode,
      pannerNode,
      filterNode,
      isPlaying: false,
      noteInterval: null,
      currentNoteIndex: 0
    };
    
    this.instruments.set(id, state);
    this.updateInstrumentAudioParams(id);
  }
  
  removeInstrument(id: string): void {
    const state = this.instruments.get(id);
    if (state) {
      this.stopNote(id);
      state.gainNode.disconnect();
      state.pannerNode.disconnect();
      state.filterNode.disconnect();
      this.instruments.delete(id);
    }
  }
  
  playNote(id: string): void {
    const state = this.instruments.get(id);
    if (!state || !this.audioContext) return;
    
    this.stopNote(id);
    
    const config = INSTRUMENT_CONFIGS[state.type];
    
    state.oscillator = this.audioContext.createOscillator();
    state.oscillator.type = config.oscillatorType;
    state.oscillator.connect(state.filterNode);
    state.oscillator.start();
    
    state.isPlaying = true;
    
    const playNextNote = () => {
      if (!state.oscillator || !this.audioContext) return;
      
      const midiNote = config.midiNotes[state.currentNoteIndex];
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      state.oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      
      state.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      state.gainNode.gain.linearRampToValueAtTime(
        config.gain,
        this.audioContext.currentTime + 0.05
      );
      state.gainNode.gain.linearRampToValueAtTime(
        config.gain * 0.7,
        this.audioContext.currentTime + 0.4
      );
      state.gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + 0.5
      );
      
      state.currentNoteIndex = (state.currentNoteIndex + 1) % config.midiNotes.length;
    };
    
    playNextNote();
    state.noteInterval = window.setInterval(playNextNote, 600);
  }
  
  stopNote(id: string): void {
    const state = this.instruments.get(id);
    if (!state) return;
    
    if (state.noteInterval !== null) {
      clearInterval(state.noteInterval);
      state.noteInterval = null;
    }
    
    if (state.oscillator) {
      try {
        state.oscillator.stop();
        state.oscillator.disconnect();
      } catch (e) {
        // Ignore stop errors
      }
      state.oscillator = null;
    }
    
    state.isPlaying = false;
  }
  
  updatePosition(id: string, position: THREE.Vector3): void {
    const state = this.instruments.get(id);
    if (!state) return;
    
    state.position.copy(position);
    this.updateInstrumentAudioParams(id);
  }
  
  private updateInstrumentAudioParams(id: string): void {
    const state = this.instruments.get(id);
    if (!state || !this.audioContext) return;
    
    const dx = state.position.x - this.listenerPosition.x;
    const dz = state.position.z - this.listenerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    const attenuation = this.calculateDistanceAttenuation(distance);
    const pan = this.calculateStereoPan(dx, dz);
    
    state.gainNode.gain.setTargetAtTime(
      attenuation,
      this.audioContext.currentTime,
      0.02
    );
    
    state.pannerNode.pan.setTargetAtTime(
      pan,
      this.audioContext.currentTime,
      0.02
    );
  }
  
  private calculateDistanceAttenuation(distance: number): number {
    const normalizedDistance = Math.min(distance / STAGE_RADIUS, 1);
    const attenuationDb = MAX_ATTENUATION_DB * normalizedDistance;
    return this.dbToLinear(attenuationDb);
  }
  
  private calculateStereoPan(dx: number, dz: number): number {
    const angle = Math.atan2(dx, -dz) * (180 / Math.PI);
    const roundedAngle = Math.round(angle * 2) / 2;
    const normalizedAngle = ((roundedAngle + 180) % 360) - 180;
    return Math.max(-1, Math.min(1, normalizedAngle / 90));
  }
  
  setListenerPosition(position: THREE.Vector3, animate: boolean = false): void {
    if (animate) {
      const startPos = this.listenerPosition.clone();
      const endPos = position.clone();
      const duration = 500;
      const startTime = performance.now();
      
      const animateStep = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easedT = this.easeInOutCubic(t);
        
        this.listenerPosition.lerpVectors(startPos, endPos, easedT);
        this.updateAllInstruments();
        
        if (t < 1) {
          requestAnimationFrame(animateStep);
        }
      };
      
      animateStep();
    } else {
      this.listenerPosition.copy(position);
      this.updateAllInstruments();
    }
  }
  
  private updateAllInstruments(): void {
    for (const id of this.instruments.keys()) {
      this.updateInstrumentAudioParams(id);
    }
  }
  
  setGlobalVolume(db: number): void {
    this.globalVolumeDb = db;
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setTargetAtTime(
        this.dbToLinear(db),
        this.audioContext.currentTime,
        0.02
      );
    }
  }
  
  setReverb(intensity: number): void {
    this.reverbIntensity = Math.max(0, Math.min(1, intensity));
    if (this.dryGain && this.wetGain && this.audioContext) {
      this.dryGain.gain.setTargetAtTime(
        1 - this.reverbIntensity,
        this.audioContext.currentTime,
        0.05
      );
      this.wetGain.gain.setTargetAtTime(
        this.reverbIntensity,
        this.audioContext.currentTime,
        0.05
      );
    }
  }
  
  playClickSound(): void {
    if (!this.clickGain || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    this.clickGain.gain.setValueAtTime(0, now);
    this.clickGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
    this.clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  }
  
  getVolumeAtPoint(point: THREE.Vector3): number {
    let totalVolumeDb = -Infinity;
    
    for (const state of this.instruments.values()) {
      if (!state.isPlaying) continue;
      
      const dx = state.position.x - point.x;
      const dz = state.position.z - point.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const attenuationDb = MAX_ATTENUATION_DB * Math.min(distance / STAGE_RADIUS, 1);
      
      const config = INSTRUMENT_CONFIGS[state.type];
      const baseDb = this.linearToDb(config.gain);
      const instrumentDb = baseDb + attenuationDb;
      
      totalVolumeDb = this.dbAdd(totalVolumeDb, instrumentDb);
    }
    
    return totalVolumeDb;
  }
  
  getInstrumentPositions(): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    for (const [id, state] of this.instruments) {
      positions.set(id, state.position.clone());
    }
    return positions;
  }
  
  getListenerPosition(): THREE.Vector3 {
    return this.listenerPosition.clone();
  }
  
  isInstrumentPlaying(id: string): boolean {
    const state = this.instruments.get(id);
    return state?.isPlaying ?? false;
  }
  
  getInstrumentConfig(type: InstrumentType): InstrumentConfig {
    return INSTRUMENT_CONFIGS[type];
  }
  
  getAllInstrumentConfigs(): Record<InstrumentType, InstrumentConfig> {
    return INSTRUMENT_CONFIGS;
  }
  
  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }
  
  private linearToDb(linear: number): number {
    return 20 * Math.log10(Math.max(linear, 0.00001));
  }
  
  private dbAdd(db1: number, db2: number): number {
    const lin1 = this.dbToLinear(db1);
    const lin2 = this.dbToLinear(db2);
    return this.linearToDb(lin1 + lin2);
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }
  
  destroy(): void {
    for (const id of this.instruments.keys()) {
      this.removeInstrument(id);
    }
    
    if (this.clickOscillator) {
      try {
        this.clickOscillator.stop();
        this.clickOscillator.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
