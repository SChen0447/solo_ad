export type TransitionType = 'fadeInOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'zoom';

export interface StoryCardData {
  id: string;
  title: string;
  content: string;
  bgColor: string;
  imageUrl: string;
  transition: TransitionType;
  duration: number;
  order: number;
}

export interface AudioState {
  src: string;
  fileName: string;
  volume: number;
  isPlaying: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  isPreviewOpen: boolean;
  currentIndex: number;
  elapsedTime: number;
  totalDuration: number;
}
