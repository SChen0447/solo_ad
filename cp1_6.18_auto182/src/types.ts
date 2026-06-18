export interface EQBand {
  frequency: number;
  gain: number;
}

export interface DelayEffect {
  enabled: boolean;
  delayTime: number;
  feedback: number;
}

export interface ReverbEffect {
  enabled: boolean;
  decayTime: number;
}

export interface EffectChain {
  delay: DelayEffect;
  reverb: ReverbEffect;
}

export interface TrackParams {
  id: string;
  name: string;
  volume: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  effects: EffectChain;
}

export interface Track extends TrackParams {
  audioBuffer: AudioBuffer | null;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'initializing';

export interface SyncMessage {
  type: 'PARAM_UPDATE';
  trackId: string;
  params: Partial<TrackParams>;
  senderId: string;
}

export interface ExportState {
  isExporting: boolean;
  progress: number;
}

export interface MixerState {
  tracks: Track[];
  isPlaying: boolean;
  connectionStatus: ConnectionStatus;
  exportState: ExportState;
  currentTime: number;
  userId: string;

  addTrack: (file: File) => Promise<void>;
  removeTrack: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackEQ: (trackId: string, band: 'eqLow' | 'eqMid' | 'eqHigh', value: number) => void;
  setTrackEffect: (trackId: string, effectType: 'delay' | 'reverb', params: Partial<DelayEffect | ReverbEffect>) => void;
  setPlaying: (playing: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setExportState: (state: Partial<ExportState>) => void;
  setCurrentTime: (time: number) => void;
  applyRemoteUpdate: (trackId: string, params: Partial<TrackParams>) => void;
}
