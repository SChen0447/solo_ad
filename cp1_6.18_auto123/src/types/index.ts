export type ProjectIcon = 'pixel-sword' | 'magic-book' | 'spaceship' | 'shield' | 'dice';

export type VersionItemCategory = 'added' | 'modified' | 'fixed' | 'removed';

export type BugSeverity = 'critical' | 'medium' | 'minor';

export type BugStatus = 'open' | 'in-progress' | 'closed';

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: ProjectIcon;
  createdAt: string;
  updatedAt: string;
}

export interface VersionItem {
  id: string;
  category: VersionItemCategory;
  description: string;
}

export interface Version {
  id: string;
  projectId: string;
  version: string;
  date: string;
  summary: string;
  items: VersionItem[];
  createdAt: string;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  severity: BugSeverity;
  description: string;
  reporter: string;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementData {
  projectId: string;
  versionId: string;
  bugIds: string[];
  itemIds: string[];
}
