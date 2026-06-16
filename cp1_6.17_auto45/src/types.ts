export interface BubbleStyle {
  id: 'oval' | 'rounded' | 'shout' | 'thought';
  name: string;
}

export interface SpeechBubble {
  id: string;
  text: string;
  style: BubbleStyle['id'];
  x: number;
  y: number;
}

export interface Narration {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface ComicCard {
  id: string;
  prompt: string;
  imageData: string | null;
  speechBubbles: SpeechBubble[];
  narration: Narration | null;
  status: 'idle' | 'loading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface GenerateImageResponse {
  success: boolean;
  image: string;
  cached: boolean;
  generation_time: number;
  prompt: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  cache_size: number;
}
