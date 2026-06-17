export type EventType = 'main' | 'side' | 'memory' | 'foreshadow';

export interface TimelineEvent {
  id: string;
  name: string;
  date: string;
  time?: string;
  type: EventType;
  characterIds: string[];
  chapterIds: string[];
  description?: string;
}

export type RelationType = 'friendly' | 'hostile' | 'romantic' | 'family';
export type Faction = 'protagonist' | 'antagonist' | 'neutral';

export interface Character {
  id: string;
  name: string;
  faction: Faction;
  description?: string;
}

export interface CharacterRelation {
  id: string;
  characterAId: string;
  characterBId: string;
  type: RelationType;
  frequency: number;
  description?: string;
}

export interface Chapter {
  id: string;
  title: string;
  volumeId: string;
  volumeTitle: string;
  chapterNumber: number;
  content: string;
  progress: number;
  summary?: string;
}

export interface Volume {
  id: string;
  title: string;
  volumeNumber: number;
}
