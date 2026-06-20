import React from 'react';
import { Clock } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
  updatedAt: string;
}

interface BookCardProps {
  book: Book;
  onClick?: () => void;
  isNewlyAdded?: boolean;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return '刚刚更新';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, isNewlyAdded = false }) => {
  return (
    <div className={`book-card ${isNewlyAdded ? 'newly-added' : ''}`} onClick={onClick}>
      <img 
        src={book.coverUrl} 
        alt={book.title}
        className="book-card-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/220/300`;
        }}
      />
      <div className="book-card-info">
        <div className="book-card-title">{book.title}</div>
        <div className="book-card-author">{book.author}</div>
        <span className={`book-card-stock ${book.stock <= 5 ? 'low' : ''}`}>
          库存: {book.stock}
        </span>
      </div>
      <div className="book-card-footer">
        <Clock size={12} />
        <span>{getRelativeTime(book.updatedAt)}</span>
      </div>
    </div>
  );
};

export default BookCard;
