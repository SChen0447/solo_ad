export interface Track {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
  audioBuffer: AudioBuffer | null;
}

export interface Note {
  id: string;
  trackId: string;
  time: number;
  text: string;
  createdAt: number;
}

export interface Review {
  id: string;
  title: string;
  content: string;
  trackId: string | null;
  noteIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type Theme = 'dark' | 'light';

export interface AppState {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  notes: Note[];
  reviews: Review[];
  currentReviewId: string | null;
  theme: Theme;
}

export type ActionType =
  | { type: 'ADD_TRACK'; payload: Track }
  | { type: 'SET_CURRENT_TRACK'; payload: string | null }
  | { type: 'SET_AUDIO_BUFFER'; payload: { trackId: string; buffer: AudioBuffer } }
  | { type: 'TOGGLE_PLAY'; payload?: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'ADD_REVIEW'; payload: Review }
  | { type: 'UPDATE_REVIEW'; payload: Review }
  | { type: 'DELETE_REVIEW'; payload: string }
  | { type: 'SET_CURRENT_REVIEW'; payload: string | null }
  | { type: 'SET_THEME'; payload: Theme };
