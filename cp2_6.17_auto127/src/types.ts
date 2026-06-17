export interface User {
  id: string;
  nickname: string;
  color: string;
}

export interface Selection {
  anchorOffset: number;
  focusOffset: number;
  anchorPath: number[];
  focusPath: number[];
}

export interface SerializedSelection {
  anchorPath: number[];
  anchorOffset: number;
  focusPath: number[];
  focusOffset: number;
  isCollapsed: boolean;
}

export interface UserCursor {
  userId: string;
  nickname: string;
  color: string;
  selection: Selection | null;
  position: { top: number; left: number } | null;
  serializedSelection?: SerializedSelection | null;
}

export interface Comment {
  id: string;
  userId: string;
  nickname: string;
  color: string;
  content: string;
  startOffset: number;
  endOffset: number;
  text: string;
  anchorXPath: string;
  focusXPath: string;
  anchorNodeOffset: number;
  focusNodeOffset: number;
  createdAt: number;
}

export interface RoomState {
  roomCode: string;
  content: string;
  users: User[];
  cursors: UserCursor[];
  comments: Comment[];
}

export type WebSocketMessage =
  | { type: 'init'; content: string; comments: Comment[]; users: User[]; cursors: UserCursor[] }
  | { type: 'user-join'; user: User }
  | { type: 'user-leave'; userId: string }
  | { type: 'users-update'; users: User[] }
  | { type: 'content-update'; userId: string; content: string }
  | { type: 'cursor-update'; cursor: UserCursor }
  | { type: 'comment-add'; comment: Comment }
  | { type: 'comment-delete'; commentId: string };

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'
];
