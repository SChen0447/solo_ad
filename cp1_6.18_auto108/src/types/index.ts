export interface Character {
  id: string;
  name: string;
  color: string;
  eventCount: number;
}

export interface EventNode {
  id: string;
  title: string;
  description: string;
  timestamp: string | null;
  order: number;
  characterIds: string[];
  location: string | null;
  type: 'default' | 'meeting' | 'conflict' | 'turning' | 'ending';
}

export interface Relationship {
  characterId1: string;
  characterId2: string;
  eventCount: number;
}

export interface TimelineConfig {
  scale: number;
  panX: number;
  panY: number;
  viewMode: 'timeline' | 'relationship';
  highlightedCharacterId: string | null;
  selectedEventId: string | null;
  nodeSpacing: number;
}

export interface ParseResult {
  events: EventNode[];
  characters: Character[];
  relationships: Relationship[];
}

export interface MetaState {
  rawText: string;
  events: EventNode[];
  characters: Character[];
  relationships: Relationship[];
  config: TimelineConfig;
  isParsing: boolean;
  parseError: string | null;
  showEditModal: boolean;
  editingEventId: string | null;
  showConfirmModal: boolean;
  confirmModalType: 'reset' | 'delete' | null;
  isLeftPanelCollapsed: boolean;
  isRightPanelOpen: boolean;
}

export interface MetaActions {
  setRawText: (text: string) => void;
  parseText: () => void;
  addEvent: (event: Omit<EventNode, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<EventNode>) => void;
  deleteEvent: (id: string) => void;
  moveEvent: (id: string, newOrder: number) => void;
  addCharacter: (name: string) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  setScale: (scale: number) => void;
  setPan: (x: number, y: number) => void;
  setViewMode: (mode: 'timeline' | 'relationship') => void;
  setHighlightedCharacter: (id: string | null) => void;
  setSelectedEvent: (id: string | null) => void;
  setNodeSpacing: (spacing: number) => void;
  setShowEditModal: (show: boolean, eventId?: string | null) => void;
  setShowConfirmModal: (show: boolean, type?: 'reset' | 'delete' | null) => void;
  setIsLeftPanelCollapsed: (collapsed: boolean) => void;
  setIsRightPanelOpen: (open: boolean) => void;
  exportSVG: () => void;
  reset: () => void;
}

export type UseMetaStore = MetaState & MetaActions;
