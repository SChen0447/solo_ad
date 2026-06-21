export interface Project {
  id: number;
  name: string;
  createdAt: string;
  memberCount?: number;
}

export interface Member {
  id: number;
  projectId: number;
  nickname: string;
  email: string;
  themeColor: string;
}

export interface Tag {
  id: number;
  projectId: number;
  name: string;
  color: string;
}

export interface TimeEntry {
  id: number;
  projectId: number;
  memberId: number;
  date: string;
  hours: number;
  description: string;
  tags: Tag[];
  member?: Member;
}

export interface CreateProjectPayload {
  name: string;
  members: Array<{ nickname: string; email: string }>;
}

export interface CreateMemberPayload {
  nickname: string;
  email: string;
}

export interface CreateEntryPayload {
  memberId: number;
  date: string;
  hours: number;
  description: string;
  tagIds: number[];
}

export interface CreateTagPayload {
  name: string;
}

export type Period = 'week' | 'month';
