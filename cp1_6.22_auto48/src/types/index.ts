export type NodeColor = '#5A67D8' | '#ED64A6' | '#DD6B20' | '#38A169' | '#ECC94B';

export const NODE_COLORS: NodeColor[] = ['#5A67D8', '#ED64A6', '#DD6B20', '#38A169', '#ECC94B'];

export type RelationshipType = 'causal' | 'parallel';

export interface StoryNode {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  date: string;
  timestamp: number;
  color: NodeColor;
  positionX: number;
  positionY: number;
}

export interface Relationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: RelationshipType;
}

export interface Story {
  id: string;
  title: string;
  themeColor: NodeColor;
  nodes: StoryNode[];
  relationships: Relationship[];
  updatedAt: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  story: Story;
}

export type AppMode = 'edit' | 'preview' | 'share';

export interface StoryState {
  story: Story;
  selectedNodeId: string | null;
  mode: AppMode;
  historySnapshots: HistorySnapshot[];
}

export type StoryAction =
  | { type: 'ADD_NODE'; payload: StoryNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<StoryNode> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'ADD_RELATIONSHIP'; payload: Relationship }
  | { type: 'DELETE_RELATIONSHIP'; payload: string }
  | { type: 'UPDATE_STORY_TITLE'; payload: string }
  | { type: 'UPDATE_THEME_COLOR'; payload: NodeColor }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'LOAD_STORY'; payload: Story }
  | { type: 'SAVE_SNAPSHOT'; payload: HistorySnapshot }
  | { type: 'RESTORE_SNAPSHOT'; payload: Story }
  | { type: 'LOAD_SNAPSHOTS'; payload: HistorySnapshot[] };
