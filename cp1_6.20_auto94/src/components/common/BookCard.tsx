import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Book } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { CONDITION_DESCRIPTIONS } from '@/types';

interface BookCardProps {
  book: Book;
  showBid?: boolean;
}

export default function BookCard({ book, showBid = false }: BookCardProps) {
  const navigate = useNavigate();
  const getHighestBidForBook = useAppStore(s => s.getHighestBidForBook);
  const highestBid = showBid ? getHighestBidForBook(book.id) : null;

  const handleClick = () => {
    navigate(`/books/${book.id}`);
  };

  const conditionShort = ['极差', '较差', '一般', '良好', '极佳'][book.condition - 1];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="book-card"
      onClick={handleClick}
    >
      {book.coverImage ? (
        <img
          src={book.coverImage}
          alt={book.title}
          className="book-card-cover"
          loading="lazy"
        />
      ) : (
        <div className="book-card-cover" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          background: 'linear-gradient(135deg, #e8e0d0, #d0c8b8)'
        }}>
          📖
        </div>
      )}

      <div className="book-card-title" title={book.title}>
        {book.title}
      </div>

      <div className="book-card-meta">
        <span style={{ fontSize: 13 }}>{book.author}</span>
        <span className={`condition-badge condition-${book.condition}`}>
          品相{book.condition}·{conditionShort}
        </span>
      </div>

      <div className="book-card-meta">
        <span className={`status-tag status-${book.status}`}>{book.status}</span>
        {highestBid && (
          <span className="bid-amount">¥{highestBid.amount.toFixed(2)}</span>
        )}
        {!highestBid && book.valuationMax && book.status !== '待估值' && (
          <span style={{ fontSize: 13, color: '#27ae60', fontWeight: 600 }}>
            估值 ¥{book.valuationMin}-{book.valuationMax}
          </span>
        )}
      </div>

      {highestBid && (
        <div style={{ fontSize: 12, color: '#888' }}>
          最高出价者：{highestBid.recyclerName}
        </div>
      )}
    </motion.div>
  );
}
