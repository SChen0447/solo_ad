import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
}

const BooksPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [selectedCategory]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books?category=${selectedCategory}`);
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/books/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">图书市场</h1>
      
      <div className="category-tabs">
        <span 
          className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          全部
        </span>
        {categories.map(cat => (
          <span 
            key={cat}
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7A6554' }}>
          加载中...
        </div>
      ) : (
        <div className="book-grid">
          {books.map((book, index) => (
            <div 
              key={book.id}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <BookCard 
                book={book} 
                onClick={() => navigate(`/books/${book.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BooksPage;
