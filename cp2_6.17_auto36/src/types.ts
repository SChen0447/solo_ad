export type NoteColor = '#4A90D9' | '#50C878' | '#FF8C42' | '#E573A0';

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
  x: number;
  y: number;
  groupId: string | null;
  createdAt: number;
}

export interface Group {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
}

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: VoteOption[];
  isActive: boolean;
  showResults: boolean;
  totalVotes: number;
  createdAt: number;
}

export interface VoteRecord {
  pollId: string;
  optionId: string;
  voterId: string;
}

export interface AppState {
  notes: Note[];
  groups: Group[];
  polls: Poll[];
  currentVoterId: string;
}
