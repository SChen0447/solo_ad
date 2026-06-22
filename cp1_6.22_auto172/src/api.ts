export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  cover: string;
  currentPage: number;
}

export interface Comment {
  id: string;
  user: string;
  content: string;
}

export interface Excerpt {
  id: string;
  bookId: string;
  bookTitle: string;
  page: number;
  text: string;
  note: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  createdAt: string;
}

const API_BASE = '/api';

export async function searchBooks(query: string = ''): Promise<Book[]> {
  const url = query
    ? `${API_BASE}/books?q=${encodeURIComponent(query)}`
    : `${API_BASE}/books`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getBook(id: string): Promise<Book> {
  const res = await fetch(`${API_BASE}/books/${id}`);
  if (!res.ok) throw new Error('Failed to fetch book');
  return res.json();
}

export async function updateProgress(
  bookId: string,
  currentPage: number
): Promise<Book> {
  const res = await fetch(`${API_BASE}/books/${bookId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPage }),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

export async function getExcerpts(): Promise<Excerpt[]> {
  const res = await fetch(`${API_BASE}/excerpts`);
  if (!res.ok) throw new Error('Failed to fetch excerpts');
  return res.json();
}

export async function createExcerpt(data: {
  bookId: string;
  bookTitle: string;
  page: number;
  text: string;
  note: string;
}): Promise<Excerpt> {
  const res = await fetch(`${API_BASE}/excerpts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create excerpt');
  return res.json();
}

export async function toggleLike(excerptId: string): Promise<Excerpt> {
  const res = await fetch(`${API_BASE}/excerpts/${excerptId}/like`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to toggle like');
  return res.json();
}

export async function addComment(
  excerptId: string,
  user: string,
  content: string
): Promise<Comment> {
  const res = await fetch(`${API_BASE}/excerpts/${excerptId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, content }),
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}
