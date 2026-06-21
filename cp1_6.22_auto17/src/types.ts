export interface Mood {
  id: string;
  name: string;
  color: string;
  happinessScore: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  userId: string;
  createdAt: string;
  totalPages?: number;
  readPages?: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  pageCount: number;
  moodId: string;
  createdAt: string;
  orderIndex: number;
}

export interface ChapterWithMood extends Chapter {
  mood: Mood;
}

export interface BookWithChapters extends Book {
  chapters: ChapterWithMood[];
}

export interface EmotionDataPoint {
  chapterOrder: number;
  chapterTitle: string;
  moodName: string;
  happinessScore: number;
  color: string;
}

export interface AppContextType {
  books: Book[];
  moods: Mood[];
  currentUser: { id: string; name: string } | null;
  searchQuery: string;
  filterMoodId: string | null;
  setSearchQuery: (query: string) => void;
  setFilterMoodId: (moodId: string | null) => void;
  addBook: (book: Omit<Book, 'id' | 'userId' | 'createdAt'>) => Promise<Book>;
  deleteBook: (bookId: string) => Promise<void>;
  fetchBooks: () => Promise<void>;
  fetchMoods: () => Promise<void>;
}
