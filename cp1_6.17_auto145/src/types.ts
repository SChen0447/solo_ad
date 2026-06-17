export type SoundSourceType = 'piano' | 'bass' | 'drums' | 'birds' | 'rain' | 'synth';

export interface SoundSourceConfig {
  type: SoundSourceType;
  position: { x: number; y: number; z: number };
  volume: number;
}

export interface SoundscapeConfig {
  version: string;
  timestamp: number;
  masterVolume: number;
  reverbEnabled: boolean;
  sources: SoundSourceConfig[];
}

export interface PresetSoundscape {
  id: string;
  name: string;
  config: SoundscapeConfig;
}

export interface SoundSourceMeta {
  type: SoundSourceType;
  name: string;
  color: string;
  pulseFrequency: number;
}

export interface SoundSourceInstance {
  id: string;
  type: SoundSourceType;
  group: THREE.Group;
  sphere: THREE.Mesh;
  light: THREE.PointLight;
  arrow: THREE.ArrowHelper;
  selectionRing: THREE.LineSegments | null;
  trail: THREE.Line | null;
  trailPositions: THREE.Vector3[];
  isSelected: boolean;
  isHovered: boolean;
  audioNodes: {
    source: AudioBufferSourceNode | OscillatorNode;
    panner: PannerNode;
    gain: GainNode;
    reverbGain: GainNode;
  } | null;
}

export interface AppState {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  convolver: ConvolverNode | null;
  reverbEnabled: boolean;
  masterVolume: number;
  selectedSourceId: string | null;
  hoveredSourceId: string | null;
  sources: Map<string, SoundSourceInstance>;
}
