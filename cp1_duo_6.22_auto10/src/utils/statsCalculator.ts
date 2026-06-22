import type { Book, ReadingRecord } from './bookStorage';

const PAGES_PER_MINUTE = 2;

export interface DailyData {
  date: string;
  pages: number;
  books: { id: string; title: string; pages: number }[];
}

export interface TrendData {
  labels: string[];
  dailyPages: number[];
  cumulativePages: number[];
  dailyBooks: Map<number, { id: string; title: string; pages: number }[]>;
}

export interface OverallStats {
  totalPages: number;
  avgMinutesPerDay: number;
  readingBooksCount: number;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function buildDailyMap(books: Book[]): Map<string, DailyData> {
  const dailyMap = new Map<string, DailyData>();

  for (const book of books) {
    for (const record of book.records) {
      const existing = dailyMap.get(record.date);
      if (existing) {
        existing.pages += record.pagesRead;
        const bookEntry = existing.books.find(b => b.id === book.id);
        if (bookEntry) {
          bookEntry.pages += record.pagesRead;
        } else {
          existing.books.push({ id: book.id, title: book.title, pages: record.pagesRead });
        }
      } else {
        dailyMap.set(record.date, {
          date: record.date,
          pages: record.pagesRead,
          books: [{ id: book.id, title: book.title, pages: record.pagesRead }]
        });
      }
    }
  }

  return dailyMap;
}

export function getTrendData(books: Book[], days: number): TrendData {
  const labels: string[] = [];
  const dailyPages: number[] = [];
  const cumulativePages: number[] = [];
  const dailyBooks = new Map<number, { id: string; title: string; pages: number }[]>();

  const dailyMap = buildDailyMap(books);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cumulative = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);
    const data = dailyMap.get(dateKey);

    labels.push(formatDisplayDate(dateKey));
    const pages = data?.pages ?? 0;
    dailyPages.push(pages);
    cumulative += pages;
    cumulativePages.push(cumulative);

    if (data && data.books.length > 0) {
      dailyBooks.set(dailyPages.length - 1, data.books);
    }
  }

  return { labels, dailyPages, cumulativePages, dailyBooks };
}

export function downsampleData(data: TrendData, maxPoints: number): TrendData {
  if (data.labels.length <= maxPoints) return data;

  const factor = Math.ceil(data.labels.length / maxPoints);
  const labels: string[] = [];
  const dailyPages: number[] = [];
  const cumulativePages: number[] = [];
  const dailyBooks = new Map<number, { id: string; title: string; pages: number }[]>();

  for (let i = 0; i < data.labels.length; i += factor) {
    const end = Math.min(i + factor, data.labels.length);
    labels.push(data.labels[i]);

    let pages = 0;
    const mergedBooks = new Map<string, { id: string; title: string; pages: number }>();

    for (let j = i; j < end; j++) {
      pages += data.dailyPages[j];
      const booksAt = data.dailyBooks.get(j);
      if (booksAt) {
        for (const b of booksAt) {
          const existing = mergedBooks.get(b.id);
          if (existing) {
            existing.pages += b.pages;
          } else {
            mergedBooks.set(b.id, { ...b });
          }
        }
      }
    }

    dailyPages.push(pages);
    cumulativePages.push(data.cumulativePages[end - 1]);

    const mergedArr = Array.from(mergedBooks.values());
    if (mergedArr.length > 0) {
      dailyBooks.set(dailyPages.length - 1, mergedArr);
    }
  }

  return { labels, dailyPages, cumulativePages, dailyBooks };
}

export function getOverallStats(books: Book[]): OverallStats {
  const totalPages = books.reduce((sum, book) => {
    return sum + book.records.reduce((s, r) => s + r.pagesRead, 0);
  }, 0);

  const dailyMap = buildDailyMap(books);
  const activeDays = dailyMap.size;
  const avgMinutesPerDay = activeDays > 0
    ? Math.round((totalPages / PAGES_PER_MINUTE) / activeDays)
    : 0;

  const readingBooksCount = books.filter(b => b.status === 'reading').length;

  return { totalPages, avgMinutesPerDay, readingBooksCount };
}

export function getDaysWithRecords(books: Book[]): number {
  return buildDailyMap(books).size;
}

export function sortRecordsByDate(records: ReadingRecord[]): ReadingRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

export function todayDateString(): string {
  return formatDateKey(new Date());
}
