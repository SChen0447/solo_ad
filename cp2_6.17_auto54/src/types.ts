export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'excited' | 'tired';

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumCover: string;
  genre: string;
  moods: MoodType[];
  gradient: [string, string];
  reason: string;
}

export interface Favorite {
  id: string;
  song: Song;
  addedAt: number;
  order: number;
  gradient: [string, string];
}

export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}
