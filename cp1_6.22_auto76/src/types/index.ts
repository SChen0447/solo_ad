export interface StorySummary {
  id: string;
  title: string;
  description: string;
  chapterCount: number;
}

export interface Chapter {
  id: string;
  content: string;
  author: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: number;
}

export interface StoryDetail {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
  createdAt: number;
}

export interface CreateStoryRequest {
  title: string;
  description: string;
  initialContent: string;
}

export interface AddChapterRequest {
  content: string;
  author: string;
}

export interface UpdateChapterStatusRequest {
  status: 'approved' | 'rejected';
}
