export interface HistoryEntry {
  content: string;
  timestamp: number;
  authorName: string;
}

export interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  history: HistoryEntry[];
}

export interface Story {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  createdAt: number;
}

export interface OnlineUser {
  id: string;
  name: string;
  storyId: string;
}
