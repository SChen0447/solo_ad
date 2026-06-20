export type EffectType = 'reverb' | 'delay' | 'lowpass';

export interface Effect {
  id: string;
  type: EffectType;
  params: {
    decayTime?: number;
    feedback?: number;
    cutoff?: number;
  };
  enabled: boolean;
}

export interface Track {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  waveformData: number[];
  volume: number;
  muted: boolean;
  solo: boolean;
  effects: Effect[];
  startTime: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
}

export interface AudioEngineState {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  tracks: Map<string, {
    source: AudioBufferSourceNode | null;
    gainNode: GainNode;
    filterNodes: Map<string, AudioNode>;
  }>;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  fileUrl: string;
}
