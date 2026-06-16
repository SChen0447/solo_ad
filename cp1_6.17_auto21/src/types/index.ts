export interface User {
  id: string;
  name: string;
  color: string;
  online: boolean;
  cursor: { from: number; to: number } | null;
  editRange: { start: number; end: number } | null;
}

export interface Op {
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  timestamp: number;
  userId: string;
}

export interface HistoryVersion {
  version: number;
  code: string;
  timestamp: number;
  userId: string;
  ops: Op[];
  undo?: boolean;
  redo?: boolean;
}

export interface Snapshot {
  id: string;
  name: string;
  code: string;
  timestamp: number;
  userId: string;
}

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffResult {
  type: DiffType;
  value: string;
  lineNumber: number;
  oldLineNumber?: number;
}

export interface ConflictLog {
  id: string;
  timestamp: number;
  position: number;
  localOp: Op;
  remoteOp: Op;
  resolvedBy: 'local' | 'remote';
}

export interface MergeResult {
  mergedOps: Op[];
  conflicts: ConflictLog[];
  mergedCode: string;
}

export interface SocketState {
  connected: boolean;
  userId: string | null;
  userName: string | null;
  userColor: string | null;
}

export interface EditorProps {
  code: string;
  users: User[];
  currentUserId: string | null;
  onEdit: (ops: Op[]) => void;
  onCursorChange: (from: number, to: number) => void;
  onCodeChange?: (code: string) => void;
}

export interface DiffPanelProps {
  oldCode: string;
  newCode: string;
  onApply: () => void;
  onClose: () => void;
  visible: boolean;
}
