export interface Song {
  _id: string;
  title: string;
  key: string;
  bpm: number;
  difficulty: number;
  parts: SongPart[];
  createdAt: number;
  updatedAt: number;
}

export interface SongPart {
  id: string;
  instrument: string;
  type: 'pdf' | 'tab';
  content: string;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  partId: string;
  measure: number;
  text: string;
  author: string;
  color: string;
  createdAt: number;
}

export interface Rehearsal {
  _id: string;
  title: string;
  date: number;
  duration: number;
  songs: RehearsalSong[];
  goals: string[];
  status: 'scheduled' | 'in_progress' | 'completed';
  currentSongIndex?: number;
  startTime?: number;
  songTimes?: { songId: string; duration: number }[];
  ratings?: { songId: string; score: number; feedback: string }[];
  createdAt: number;
}

export interface RehearsalSong {
  songId: string;
  targetProgress: number;
  actualProgress?: number;
}

export interface Member {
  _id: string;
  name: string;
  instrument: string;
  avatar: string;
  attendance: { rehearsalId: string; present: boolean }[];
  practiceProgress: { songId: string; partId: string; status: 'green' | 'yellow' | 'red' }[];
}

export interface RehearsalReport {
  rehearsalId: string;
  title: string;
  date: number;
  totalDuration: number;
  songs: {
    songId: string;
    title: string;
    targetProgress: number;
    actualProgress: number;
    duration: number;
    score: number;
    feedback: string;
  }[];
  averageScore: number;
  overallProgress: number;
}
