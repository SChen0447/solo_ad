export type PetType = 'cat' | 'dog' | 'dragon' | 'rabbit' | 'fox' | 'bird';

export type PetColorVariant = 0 | 1 | 2;

export type PetAnimationState =
  | 'idle'
  | 'walking'
  | 'eating'
  | 'sleeping'
  | 'sad'
  | 'dirty'
  | 'playing';

export type ActionType = 'feed' | 'play' | 'clean';

export interface PetStats {
  hunger: number;
  happiness: number;
  cleanliness: number;
}

export interface Pet {
  id: string;
  type: PetType;
  colorVariant: PetColorVariant;
  name: string;
  stats: PetStats;
  animationState: PetAnimationState;
  createdAt: number;
}

export type LogEventType =
  | 'feed'
  | 'play'
  | 'clean'
  | 'decay'
  | 'adopt'
  | 'status';

export interface LogEntry {
  id: string;
  timestamp: number;
  eventType: LogEventType;
  message: string;
}

export interface StatPopup {
  id: string;
  stat: keyof PetStats;
  value: number;
  isPositive: boolean;
}
