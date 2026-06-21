export type ProjectStatus = 'latest' | 'modified' | 'conflict';

export type VersionStatus = 'latest' | 'normal' | 'conflict';

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Version {
  id: string;
  versionNumber: number;
  code: string;
  timestamp: string;
  summary: string;
  status: VersionStatus;
  createdBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  collaborators: User[];
  currentCode: string;
  hasUnsavedChanges: boolean;
  versions: Version[];
}

export interface Conflict {
  lineNumber: number;
  originalCode: string;
  modifiedCode: string;
  userId: string;
  userName: string;
}

export type DiffLineType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  lineNumber: number;
}

export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
}
