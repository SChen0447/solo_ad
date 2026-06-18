export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;
  duration: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  speed: number;
  filePath?: string;
  buffer?: AudioBuffer;
  color: string;
  editedBy?: string;
}

export interface Track {
  id: string;
  name: string;
  instrument: string;
  clips: AudioClip[];
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  collaborators: CollaboratorInfo[];
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
  role: 'owner' | 'collaborator';
}

export interface MixerState {
  masterVolume: number;
  masterMute: boolean;
  trackVolumes: Record<string, number>;
  trackPans: Record<string, number>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;
}

export interface LevelMeter {
  left: number;
  right: number;
}

export type EditOperation =
  | { type: 'ADD_CLIP'; trackId: string; clip: AudioClip; userId: string }
  | { type: 'MOVE_CLIP'; clipId: string; trackId: string; startTime: number; userId: string }
  | { type: 'DELETE_CLIP'; clipId: string; trackId: string; userId: string }
  | { type: 'UPDATE_CLIP'; clipId: string; trackId: string; changes: Partial<AudioClip>; userId: string }
  | { type: 'ADD_TRACK'; track: Track; userId: string }
  | { type: 'DELETE_TRACK'; trackId: string; userId: string }
  | { type: 'RENAME_TRACK'; trackId: string; name: string; userId: string }
  | { type: 'UPDATE_MIXER'; mixerState: Partial<MixerState>; userId: string };

export interface HistoryEntry {
  operation: EditOperation;
  inverse: EditOperation;
  timestamp: number;
}

export const INSTRUMENT_COLORS: Record<string, string> = {
  piano: '#6c5ce7',
  drums: '#e17055',
  bass: '#00b894',
  strings: '#fdcb6e',
};

export const DEFAULT_INSTRUMENTS = ['piano', 'drums', 'bass', 'strings'] as const;

export const USER_COLORS = {
  owner: '#4a7cff',
  collaboratorA: '#ff6b6b',
  collaboratorB: '#2ed573',
} as const;

export const THEME = {
  bg: '#1a1a2e',
  componentBg: '#16213e',
  border: '#0f3460',
  highlight: '#e94560',
  snapLine: '#406080',
  exportProgressFrom: '#1e3a5f',
  exportProgressTo: '#7ec8e3',
} as const;
