export type ExcerptType = 'text' | 'image' | 'video';

export type TagColor = 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'gray';

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

export interface Annotation {
  id: string;
  content: string;
  createdAt: number;
}

export interface Excerpt {
  id: string;
  type: ExcerptType;
  title: string;
  content: string;
  sourceUrl: string;
  createdAt: number;
  tags: Tag[];
  annotations: Annotation[];
  relatedCardIds: string[];
}

export type ColumnType = 'todo' | 'processing' | 'done';

export interface BoardColumn {
  id: ColumnType;
  title: string;
  cardIds: string[];
}

export interface Workbench {
  id: string;
  name: string;
  columns: BoardColumn[];
}

export interface AppState {
  excerpts: Excerpt[];
  workbenches: Workbench[];
  activeWorkbenchId: string | null;
  searchQuery: string;
  selectedTagId: string | null;
  expandedCardId: string | null;
}

export type AppAction =
  | { type: 'ADD_EXCERPT'; payload: Excerpt }
  | { type: 'DELETE_EXCERPT'; payload: string }
  | { type: 'UPDATE_EXCERPT'; payload: Excerpt }
  | { type: 'ADD_TAG_TO_EXCERPT'; payload: { excerptId: string; tag: Tag } }
  | { type: 'REMOVE_TAG_FROM_EXCERPT'; payload: { excerptId: string; tagId: string } }
  | { type: 'ADD_ANNOTATION'; payload: { excerptId: string; annotation: Annotation } }
  | { type: 'ADD_RELATED_CARD'; payload: { excerptId: string; relatedCardId: string } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_TAG'; payload: string | null }
  | { type: 'SET_EXPANDED_CARD'; payload: string | null }
  | { type: 'ADD_WORKBENCH'; payload: Workbench }
  | { type: 'SET_ACTIVE_WORKBENCH'; payload: string }
  | { type: 'MOVE_CARD'; payload: { cardId: string; fromColumn: ColumnType; toColumn: ColumnType; toIndex: number } }
  | { type: 'ADD_CARD_TO_COLUMN'; payload: { excerptId: string; columnId: ColumnType } };
