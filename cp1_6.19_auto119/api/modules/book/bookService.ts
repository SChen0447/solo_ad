import { readJson, writeJson } from '../../utils/jsonStore.js';
import { v4 as uuidv4 } from 'uuid';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  coverUrl: string;
  description: string;
  exchangeType: string;
  ownerId: string;
  status: 'available' | 'swapped';
  createdAt: string;
}

export type { Book };

export async function getAll(search?: string, ownerId?: string): Promise<Book[]> {
  let books = await readJson<Book>('books.json');
  if (ownerId) {
    books = books.filter(b => b.ownerId === ownerId);
  }
  if (search) {
    const q = search.toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  }
  return books;
}

export async function getById(id: string): Promise<Book | undefined> {
  const books = await readJson<Book>('books.json');
  return books.find(b => b.id === id);
}

export async function create(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
  const books = await readJson<Book>('books.json');
  const newBook: Book = {
    ...book,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  books.push(newBook);
  await writeJson('books.json', books);
  return newBook;
}

export async function deleteById(id: string): Promise<void> {
  const books = await readJson<Book>('books.json');
  const filtered = books.filter(b => b.id !== id);
  await writeJson('books.json', filtered);
}

export async function updateStatus(id: string, status: 'available' | 'swapped'): Promise<Book> {
  const books = await readJson<Book>('books.json');
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) {
    throw new Error(`Book with id ${id} not found`);
  }
  books[idx].status = status;
  await writeJson('books.json', books);
  return books[idx];
}
