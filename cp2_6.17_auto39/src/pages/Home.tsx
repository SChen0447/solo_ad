import React, { useEffect, useState } from 'react';
import BookCard from '../components/BookCard';
import BarChart from '../components/BarChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { Book } from '../types';

interface HomeProps {
  onAddBook: () => void;
}

const Home: React.FC<HomeProps> = ({ onAddBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesData, setNotesData] = useState<{ date: Date; count: number }[]>([]);

  useEffect(() => {
    fetchBooks();
    generateNotesData();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const data: Book[] = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNotesData = () => {
    const data: { date: Date; count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      data.push({
        date,
        count: Math.floor(Math.random() * 5) + (i === 0 ? 2 : 0)
      });
    }
    setNotesData(data);
  };

  const totalPages = books.reduce((sum, book) => sum + book.currentPage, 0);
  const completedBooks = books.filter(
    (book) => book.totalPages > 0 && book.currentPage >= book.totalPages
  ).length;
  const recentNotes = notesData.reduce((sum, d) => sum + d.count, 0);

  const recentBooks = [...books]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">阅读概览</h1>
        <button className="btn" onClick={onAddBook}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: '6px' }}>
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          添加书籍
        </button>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-value">{totalPages}</div>
          <div className="stat-label">总阅读页数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedBooks}</div>
          <div className="stat-label">已读完书籍</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{recentNotes}</div>
          <div className="stat-label">近7天笔记</div>
        </div>
      </div>

      <div className="chart-section">
        <h2 className="chart-title">近7天笔记统计</h2>
        <BarChart data={notesData} />
      </div>

      <div className="chart-section">
        <h2 className="chart-title">最近添加</h2>
        {recentBooks.length > 0 ? (
          <div className="books-grid">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
            <div className="empty-state-text">还没有添加任何书籍</div>
            <div className="empty-state-subtext">点击上方按钮开始添加您的第一本书</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
