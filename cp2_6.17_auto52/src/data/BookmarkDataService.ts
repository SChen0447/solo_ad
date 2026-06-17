import { v4 as uuidv4 } from 'uuid';
import type { Bookmark, TimeRange, BookmarkDataServiceInterface } from '../types/bookmark';

class BookmarkDataService implements BookmarkDataServiceInterface {
  private bookmarks: Bookmark[] = [];

  getAll(): Bookmark[] {
    return [...this.bookmarks].sort((a, b) => a.timestamp - b.timestamp);
  }

  add(bookmark: Omit<Bookmark, 'id'>): Bookmark {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: uuidv4(),
    };
    this.bookmarks.push(newBookmark);
    return newBookmark;
  }

  remove(id: string): boolean {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bookmarks.splice(index, 1);
      return true;
    }
    return false;
  }

  getByTimeRange(range: TimeRange): Bookmark[] {
    return this.bookmarks
      .filter(b => b.timestamp >= range.start && b.timestamp <= range.end)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getByTag(tag: string): Bookmark[] {
    if (!tag) return this.getAll();
    return this.bookmarks
      .filter(b => b.tags.includes(tag))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.bookmarks.forEach(b => {
      b.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }
}

export const bookmarkDataService = new BookmarkDataService();
