export type InstrumentType = 'piano' | 'strings' | 'guitar' | 'synth';

export type DurationType = 'whole' | 'half' | 'quarter' | 'eighth';

export interface MusicSymbol {
  id: string;
  instrument: InstrumentType;
  beat: number;
  pitch: number;
  duration: DurationType;
  linePosition: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentBeat: number;
  speed: number;
}

export const INSTRUMENT_CONFIG: Record<InstrumentType, {
  label: string;
  description: string;
  color: string;
  shape: 'circle' | 'triangle' | 'square' | 'wave';
}> = {
  piano: {
    label: '钢琴',
    description: '温暖的钢琴音色',
    color: '#F39C12',
    shape: 'circle',
  },
  strings: {
    label: '弦乐',
    description: '悠扬的弦乐音色',
    color: '#8E44AD',
    shape: 'triangle',
  },
  guitar: {
    label: '吉他',
    description: '清脆的吉他音色',
    color: '#27AE60',
    shape: 'square',
  },
  synth: {
    label: '电子',
    description: '电子合成音色',
    color: '#3498DB',
    shape: 'wave',
  },
};

export const DURATION_CONFIG: Record<DurationType, {
  beats: number;
  color: string;
  label: string;
}> = {
  whole: { beats: 4, color: '#E74C3C', label: '全音符' },
  half: { beats: 2, color: '#3498DB', label: '二分音符' },
  quarter: { beats: 1, color: '#27AE60', label: '四分音符' },
  eighth: { beats: 0.5, color: '#9B59B6', label: '八分音符' },
};

export const DURATION_ORDER: DurationType[] = ['whole', 'half', 'quarter', 'eighth'];

export const TOTAL_BEATS = 32;
export const TOTAL_MEASURES = 8;
export const BEATS_PER_MEASURE = 4;
export const STAFF_LINE_COUNT = 5;

export const PITCH_NAMES = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'];

export function pitchToName(pitch: number): string {
  const idx = Math.round(pitch);
  if (idx >= 0 && idx < PITCH_NAMES.length) return PITCH_NAMES[idx];
  return PITCH_NAMES[12];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
