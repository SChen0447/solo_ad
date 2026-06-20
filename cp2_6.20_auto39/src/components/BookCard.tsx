import React from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
}

interface BookCardProps {
  book: Book;
  onClick?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <div className="book-card" onClick={onClick}>
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
    </div>
  );
};

export default BookCard;
