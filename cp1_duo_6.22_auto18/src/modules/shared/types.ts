export interface ILyricWord {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  pitchOffset: number;
  volumeGain: number;
  synthPresetId: string;
}

export interface ILyricLine {
  id: string;
  lineNumber: number;
  words: ILyricWord[];
}

export interface IPlayState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export type SynthPresetType = 'child' | 'robot' | 'baritone';

export interface ISynthPreset {
  id: string;
  name: string;
  type: SynthPresetType;
  baseFrequency: number;
  formants: number[];
  gain: number;
}

export interface IProjectMetadata {
  title: string;
  bpm: number;
  key: string;
}

export interface IProject {
  version: string;
  metadata: IProjectMetadata;
  lines: ILyricLine[];
  synthPresets: ISynthPreset[];
}

export interface IAudioStateEvent {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export type AudioStateListener = (event: IAudioStateEvent) => void;
