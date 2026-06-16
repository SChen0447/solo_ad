export interface Sentence {
  id: string;
  text: string;
  audioBlob?: Blob;
}

export interface Paragraph {
  id: string;
  sentences: Sentence[];
}

export interface TTSSettings {
  speed: number;
  pitch: number;
  voice: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraphIndex: number;
  currentSentenceIndex: number;
}

export type VoiceOption = {
  id: string;
  label: string;
  gender: 'male' | 'female';
};
