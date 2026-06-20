export type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  socketId?: string;
}

export interface WorkspaceMember {
  userId: string;
  role: UserRole;
  joinedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  members: WorkspaceMember[];
  documentIds: string[];
  inviteCode: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  delta: any;
  createdAt: number;
  updatedAt: number;
  lastEditorId: string;
  version: number;
}

export interface Version {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  delta: any;
  createdBy: string;
  createdAt: number;
  message: string;
  changes?: string;
}

export interface CommentReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  position?: number;
  createdAt: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  replies: CommentReply[];
}

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  type: 'edit' | 'comment' | 'version' | 'rollback' | 'permission';
  documentId?: string;
  content?: string;
  position?: number;
  createdAt: number;
}

export interface CursorPosition {
  userId: string;
  documentId: string;
  index: number;
  length: number;
  timestamp: number;
}

export interface CursorWithUser {
  cursor: CursorPosition;
  user: User;
}

export interface ConflictData {
  id: string;
  documentId: string;
  user1Id: string;
  user2Id: string;
  baseContent: string;
  user1Content: string;
  user2Content: string;
  rangeStart: number;
  rangeEnd: number;
  createdAt: number;
}

export interface WorkspaceMemberWithUser {
  user: User;
  role: UserRole;
  joinedAt: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  message: string;
}

export type View =
  | { name: 'login' }
  | { name: 'workspace'; workspaceId: string }
  | { name: 'document'; workspaceId: string; documentId: string };
