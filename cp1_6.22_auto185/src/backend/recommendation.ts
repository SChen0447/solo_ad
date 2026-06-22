import { db } from './database';
import type { User, Book, BookCategory } from '../shared/types';

const calculateTagSimilarity = (userTags: string[], bookTags: string[]): number => {
  if (userTags.length === 0 || bookTags.length === 0) return 0;
  const intersection = userTags.filter(tag => bookTags.includes(tag));
  return intersection.length / Math.sqrt(userTags.length * bookTags.length);
};

const getUserTags = (user: User): string[] => {
  const tags: Set<string> = new Set();
  
  user.browseHistory.forEach(bookId => {
    const book = db.getBookById(bookId);
    if (book) {
      book.tags.forEach(tag => tags.add(tag));
    }
  });
  
  user.exchangeHistory.forEach(record => {
    const book = db.getBookById(record.bookId);
    if (book) {
      book.tags.forEach(tag => tags.add(tag));
    }
  });
  
  return Array.from(tags);
};

const calculateBookScore = (book: Book, user: User, userTags: string[], exchangedBookIds: Set<string>): number => {
  if (book.ownerId === user.id) return -1;
  if (exchangedBookIds.has(book.id)) return -1;
  if (book.status !== 'available') return -1;

  let score = 0;

  if (user.preferences.includes(book.category)) {
    score += 30;
  }

  const tagSimilarity = calculateTagSimilarity(userTags, book.tags);
  score += tagSimilarity * 40;

  score += Math.log1p(book.exchangeCount) * 15;

  const recencyDays = (Date.now() - new Date(book.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (recencyDays < 7) {
    score += 15;
  } else if (recencyDays < 30) {
    score += 8;
  }

  return score;
};

export const getRecommendations = (userId: string, limit: number = 10): Book[] => {
  const user = db.getUserById(userId);
  if (!user) return [];

  const allBooks = db.getAllBooks();
  const userTags = getUserTags(user);
  const exchangedBookIds = new Set(user.exchangeHistory.map(r => r.bookId));

  const scoredBooks = allBooks
    .map(book => ({
      book,
      score: calculateBookScore(book, user, userTags, exchangedBookIds),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const recommendedBooks: Book[] = [];
  const categoriesUsed = new Set<BookCategory>();

  for (const item of scoredBooks) {
    if (recommendedBooks.length >= limit) break;
    
    if (categoriesUsed.size < 3 || categoriesUsed.has(item.book.category)) {
      recommendedBooks.push(item.book);
      categoriesUsed.add(item.book.category);
    }
  }

  if (recommendedBooks.length < limit) {
    const popularBooks = db.getAllBooks()
      .filter(b => b.status === 'available' && b.ownerId !== user.id)
      .filter(b => !recommendedBooks.includes(b))
      .sort((a, b) => b.exchangeCount - a.exchangeCount);

    for (const book of popularBooks) {
      if (recommendedBooks.length >= limit) break;
      recommendedBooks.push(book);
    }
  }

  return recommendedBooks;
};

export const getPopularBooks = (limit: number = 10): Book[] => {
  return db.getAllBooks()
    .filter(b => b.status === 'available')
    .sort((a, b) => b.exchangeCount - a.exchangeCount)
    .slice(0, limit);
};
