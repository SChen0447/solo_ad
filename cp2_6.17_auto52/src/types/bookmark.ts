export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  timestamp: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface BookmarkDataServiceInterface {
  getAll(): Bookmark[];
  add(bookmark: Omit<Bookmark, 'id'>): Bookmark;
  remove(id: string): boolean;
  getByTimeRange(range: TimeRange): Bookmark[];
  getByTag(tag: string): Bookmark[];
  getAllTags(): string[];
}
