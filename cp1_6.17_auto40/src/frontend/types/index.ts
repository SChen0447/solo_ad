export interface StoryOption {
  id: string;
  text: string;
  targetPageIndex: number;
}

export interface StoryPage {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  backgroundImage: string;
  musicUrl: string;
  options: StoryOption[];
}

export interface Story {
  story_id: string;
  title: string;
  pages: StoryPage[];
  created_at?: string;
  updated_at?: string;
}

export interface StorySummary {
  story_id: string;
  title: string;
  cover_color: string;
  cover_image: string;
  description: string;
  total_pages: number;
  created_at: string;
}
