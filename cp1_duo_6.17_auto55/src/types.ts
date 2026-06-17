export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: number;
}

export interface Version {
  id: string;
  versionNumber: number;
  content: string;
  timestamp: string;
  savedBy: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
}

export interface WebSocketMessage {
  type: 'content_update' | 'cursor_update' | 'user_join' | 'user_leave' | 'version_save' | 'conflict' | 'document_sync';
  payload: Record<string, unknown>;
  timestamp: number;
  userId: string;
  docId: string;
}

export interface ContentUpdatePayload {
  content: string;
  cursorPosition: number;
}

export interface CursorUpdatePayload {
  cursorPosition: number;
}
