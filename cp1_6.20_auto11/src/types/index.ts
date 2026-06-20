export interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface CursorPosition {
  userId: string;
  line: number;
  column: number;
  selectionStart?: { line: number; column: number };
  selectionEnd?: { line: number; column: number };
}

export interface Comment {
  id: string;
  roomId: string;
  lineNumber: number;
  content: string;
  author: User;
  createdAt: number;
  resolved: boolean;
  resolvedBy?: User;
  resolvedAt?: number;
  replies: Reply[];
  fileName: string;
}

export interface Reply {
  id: string;
  content: string;
  author: User;
  createdAt: number;
}

export interface Proposal {
  id: string;
  roomId: string;
  fileName: string;
  startLine: number;
  endLine: number;
  originalCode: string;
  proposedCode: string;
  author: User;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  likes: string[];
  rejections: string[];
  description: string;
}

export interface Snapshot {
  timestamp: number;
  files: Record<string, string>;
  currentFile: string;
}

export interface CodeFile {
  name: string;
  language: 'javascript' | 'typescript' | 'python';
  content: string;
}

export interface RoomState {
  roomId: string;
  users: User[];
  currentUser: User | null;
  files: Record<string, CodeFile>;
  currentFile: string;
  cursors: Record<string, CursorPosition>;
  comments: Comment[];
  proposals: Proposal[];
  snapshots: Snapshot[];
  currentSnapshotIndex: number;
  showDiffView: boolean;
  activeProposal: Proposal | null;
}
