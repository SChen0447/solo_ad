export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  id: string;
  author: string;
  timestamp: number;
  message: string;
  files: FileChange[];
  additions: number;
  deletions: number;
}

export interface Contributor {
  name: string;
  color: string;
}

export interface ModuleInfo {
  path: string;
  label: string;
}

export interface FilterState {
  authors: string[];
  dateRange: [number, number];
  modules: string[];
}

export interface Stats {
  totalCommits: number;
  contributorCount: number;
  totalAdditions: number;
  totalDeletions: number;
}
