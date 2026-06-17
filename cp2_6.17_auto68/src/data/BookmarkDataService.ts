import { v4 as uuidv4 } from 'uuid';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  createdAt: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

class BookmarkDataService {
  private bookmarks: Bookmark[] = [];

  getAll(): Bookmark[] {
    return [...this.bookmarks].sort((a, b) => a.createdAt - b.createdAt);
  }

  add(input: { title: string; url: string; tags: string[] }): Bookmark {
    const bookmark: Bookmark = {
      id: uuidv4(),
      title: input.title,
      url: input.url,
      tags: input.tags.slice(0, 5),
      createdAt: Date.now(),
    };
    this.bookmarks.push(bookmark);
    return bookmark;
  }

  remove(id: string): void {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
  }

  getByTimeRange(range: TimeRange): Bookmark[] {
    return this.bookmarks
      .filter((b) => b.createdAt >= range.start && b.createdAt <= range.end)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  getByTag(tag: string): Bookmark[] {
    return this.bookmarks
      .filter((b) => b.tags.includes(tag))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.bookmarks.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  importFromHtml(html: string): Bookmark[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a');
    const imported: Bookmark[] = [];

    links.forEach((link) => {
      const title = link.textContent?.trim() || '';
      const url = link.getAttribute('href') || '';
      if (!url || url.startsWith('javascript:') || url.startsWith('place:')) return;

      const bookmark: Bookmark = {
        id: uuidv4(),
        title: title || url,
        url,
        tags: [],
        createdAt: link.getAttribute('add_date')
          ? parseInt(link.getAttribute('add_date')!, 10) * 1000
          : Date.now(),
      };
      this.bookmarks.push(bookmark);
      imported.push(bookmark);
    });

    return imported;
  }

  getTimeRange(): TimeRange {
    if (this.bookmarks.length === 0) {
      const now = Date.now();
      return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
    }
    const times = this.bookmarks.map((b) => b.createdAt);
    return { start: Math.min(...times), end: Math.max(...times) };
  }
}

export const bookmarkDataService = new BookmarkDataService();
