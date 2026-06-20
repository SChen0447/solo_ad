import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: string;
  returnDate?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
  borrowHistory: BorrowRecord[];
}

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/books/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data);
      }
    } catch (err) {
      console.error('Failed to fetch book:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>图书不存在</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button 
        className="btn btn-outline"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
        返回
      </button>

      <div className="book-detail-container">
        <div>
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="book-detail-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/300/400`;
            }}
          />
        </div>
        <div className="book-detail-info">
          <h1>{book.title}</h1>
          <div className="book-detail-author">作者：{book.author}</div>
          
          <div className="book-detail-meta">
            <div className="book-detail-meta-item">
              <div className="book-detail-meta-label">ISBN</div>
              <div>{book.isbn || '-'}</div>
            </div>
            <div className="book-detail-meta-item">
              <div className="book-detail-meta-label">分类</div>
              <div>{book.category}</div>
            </div>
            <div className="book-detail-meta-item">
              <div className="book-detail-meta-label">当前库存</div>
              <div style={{ color: book.stock <= 5 ? '#C35B4A' : '#3D2C20', fontWeight: 600 }}>
                {book.stock} 本
              </div>
            </div>
            <div className="book-detail-meta-item">
              <div className="book-detail-meta-label">累计借阅</div>
              <div>{book.borrowHistory?.length || 0} 次</div>
            </div>
          </div>

          <div className="borrow-history">
            <h3>借阅历史</h3>
            {book.borrowHistory?.length ? (
              <div className="borrow-timeline">
                {book.borrowHistory.map((record: BorrowRecord) => (
                  <div key={record.id} className="borrow-timeline-item">
                    <div className="borrow-timeline-user">
                      用户 {record.userId.slice(0, 8)}
                    </div>
                    <div className="borrow-timeline-date">
                      {record.borrowDate} ~ {record.returnDate || '借阅中'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#7A6554', fontSize: '14px' }}>暂无借阅记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
