export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
  notes: string;
}

export interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  targetY: number;
  settled: boolean;
}

export interface CardState {
  poem: Poem;
  position: CardPosition;
  opacity: number;
  isExpanded: boolean;
  speed: number;
}

export interface Ripple {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

export interface AppState {
  searchQuery: string;
  selectedDynasty: string;
  isMusicPlaying: boolean;
  cardStates: CardState[];
  isLoading: boolean;
}

export type Dynasty = '' | '唐' | '宋' | '元' | '明' | '清';
