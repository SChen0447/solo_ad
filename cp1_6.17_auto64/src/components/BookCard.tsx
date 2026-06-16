import { motion, AnimatePresence } from 'framer-motion';
import { Book } from '../api';

interface BookCardProps {
  book: Book;
  inList?: boolean;
  onClick?: () => void;
  onAdd?: () => void;
  showBadge?: boolean;
}

export default function BookCard({ book, inList, onClick, onAdd, showBadge = true }: BookCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -8, transition: { duration: 0.25, ease: 'easeOut' } }}
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative'
      }}
      onClick={onClick}
    >
      <motion.div
        whileHover={{ boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
        transition={{ duration: 0.25 }}
        style={{ height: '100%' }}
      >
        <AnimatePresence>
          {inList && showBadge && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #52c41a, #73d13d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(82,196,26,0.4)',
                zIndex: 10
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ aspectRatio: '3 / 4.2', overflow: 'hidden', background: '#f5f0e6' }}>
          <img
            src={book.cover}
            alt={book.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/book${book.id}/300/420`;
            }}
          />
        </div>

        <div style={{ padding: '16px 18px 18px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#222',
              marginBottom: '6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {book.title}
          </h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
            {book.author}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5A623">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#F5A623' }}>{book.rating}</span>
            </div>
            {onAdd && !inList && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F5A623, #F7B94F)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                + 加入
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
