import type { Bookmark } from '../types/bookmark';

export interface ParsedBookmark {
  title: string;
  url: string;
  timestamp?: number;
  folder?: string;
}

function traverseDL(dlElement: Element, currentFolder: string, bookmarks: ParsedBookmark[]): void {
  const children = dlElement.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.tagName === 'DT') {
      const dtElement = child as HTMLElement;

      const h3 = dtElement.querySelector('h3');
      if (h3) {
        const folderName = h3.textContent?.trim() || '';
        const nextSibling = dtElement.nextElementSibling;
        if (nextSibling && nextSibling.tagName === 'DL') {
          const newFolder = currentFolder ? `${currentFolder}/${folderName}` : folderName;
          traverseDL(nextSibling, newFolder, bookmarks);
        }
        continue;
      }

      const link = dtElement.querySelector('a');
      if (link) {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim() || href || '';
        const addDate = link.getAttribute('add_date');

        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          const bookmark: ParsedBookmark = {
            title: title || href,
            url: href,
          };

          if (addDate) {
            bookmark.timestamp = parseInt(addDate, 10) * 1000;
          }

          if (currentFolder) {
            bookmark.folder = currentFolder;
          }

          bookmarks.push(bookmark);
        }
      }
    }
  }
}

export function parseBookmarksHTML(html: string): ParsedBookmark[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const bookmarks: ParsedBookmark[] = [];

  const dlElements = doc.querySelectorAll('dl');

  if (dlElements.length > 0) {
    traverseDL(dlElements[0], '', bookmarks);
  } else {
    const links = doc.querySelectorAll('a');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      const title = link.textContent?.trim() || href || '';
      const addDate = link.getAttribute('add_date');

      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        const bookmark: ParsedBookmark = {
          title: title || href,
          url: href,
        };

        if (addDate) {
          bookmark.timestamp = parseInt(addDate, 10) * 1000;
        }

        bookmarks.push(bookmark);
      }
    });
  }

  return bookmarks;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getFaviconUrl(url: string): string {
  const domain = getDomainFromUrl(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getTagColor(index: number, total: number): string {
  const startHue = 243;
  const endHue = 300;
  const hue = startHue + (endHue - startHue) * (index / Math.max(total - 1, 1));
  return hslToHex(hue, 100, 65);
}

export function exportToJSON(bookmarks: Bookmark[]): void {
  const dataStr = JSON.stringify(bookmarks, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
