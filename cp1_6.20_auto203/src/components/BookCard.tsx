import React from 'react'
import { motion } from 'framer-motion'
import { Book, getCategoryColor, formatDate } from '../api'

interface BookCardProps {
  book: Book
  onClick?: (book: Book) => void
  index?: number
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, index = 0 }) => {
  const color = getCategoryColor(book.category)
  const initial = book.title.charAt(0)

  return (
    <motion.div
      className="book-card"
      onClick={() => onClick?.(book)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
      whileHover={{ y: -3 }}
    >
      <div className="book-card-bar" style={{ background: color }} />
      <div className="book-card-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 52,
              height: 70,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${color}, ${color}99)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 22,
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="book-card-title" title={book.title}>
              {book.title}
            </div>
            <div className="book-card-author">{book.author}</div>
          </div>
        </div>
        {book.description && (
          <div
            style={{
              fontSize: 12,
              color: '#777',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 8
            }}
          >
            {book.description}
          </div>
        )}
        <div className="book-card-tags">
          <span className="tag-mini" style={{ background: `${color}15`, color }}>
            {book.category}
          </span>
          <span className="tag-mini">{book.subtag}</span>
        </div>
        <div className="book-card-meta">
          <span>ISBN: {book.isbn || '-'}</span>
          <span>{book.year}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default BookCard
