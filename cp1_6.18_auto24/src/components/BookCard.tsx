import React, { useRef, useState } from 'react'
import { Book, BOOK_TYPE_MAP, BOOK_STATUS_MAP } from '../types'
import './BookCard.css'

interface BookCardProps {
  book: Book
  index: number
  searchKeyword: string
  onDragStart: (e: React.DragEvent, bookId: string) => void
  onDragEnd: () => void
  onDelete: (id: string) => void
}

function highlightText(text: string, keyword: string) {
  if (!keyword) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
  )
}

export function BookCard({ book, index, searchKeyword, onDragStart, onDragEnd, onDelete }: BookCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    onDragStart(e, book.id)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd()
  }

  const typeLabel = BOOK_TYPE_MAP[book.type]
  const statusLabel = BOOK_STATUS_MAP[book.status]

  return (
    <div
      ref={cardRef}
      className={`book-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="book-card-header">
        <span className={`book-type type-${book.type}`}>{typeLabel}</span>
        <button
          className="delete-btn"
          onClick={() => onDelete(book.id)}
          title="删除"
        >
          ×
        </button>
      </div>
      <h3 className="book-title">
        {highlightText(book.title, searchKeyword)}
      </h3>
      <p className="book-author">
        {highlightText(book.author, searchKeyword)}
      </p>
      <div className="book-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= book.rating ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
      {book.note && (
        <p className="book-note">
          {highlightText(book.note, searchKeyword)}
        </p>
      )}
      <span className={`book-status status-${book.status}`}>
        {statusLabel}
      </span>
    </div>
  )
}
