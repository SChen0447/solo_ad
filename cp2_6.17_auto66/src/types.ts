export interface AudioData {
  frequencyData: Float32Array;
  timeDomainData: Float32Array;
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  averageSpectrum: number;
}

export type AnalysisCallback = (data: AudioData) => void;

export type VisualizationMode = 'waveform' | 'spectrum' | 'pulse';

export interface ParticleSystemOptions {
  particleCount?: number;
  sphereRadius?: number;
}
