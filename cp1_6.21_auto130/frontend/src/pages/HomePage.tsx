import { useState, useEffect } from 'react';
import RecommendCard from '../components/RecommendCard';
import type { Book } from '../types';
import { booksApi } from '../api';
import './HomePage.css';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const response = await booksApi.getBooks();
        setBooks(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="page-title">📚 为你推荐</h1>
        <p className="page-subtitle">精选好书，开启你的阅读之旅</p>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>加载失败: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="books-grid">
          {books.map((book) => (
            <RecommendCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
