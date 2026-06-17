import React, { useState } from 'react'
import { Book, BookStatus, BOOK_STATUS_MAP } from '../types'
import { BookCard } from './BookCard'
import './Column.css'

interface ColumnProps {
  status: BookStatus
  books: Book[]
  searchKeyword: string
  onDragStart: (e: React.DragEvent, bookId: string) => void
  onDragEnd: () => void
  onDrop: (bookId: string, targetStatus: BookStatus) => void
  onDeleteBook: (id: string) => void
}

export function Column({ status, books, searchKeyword, onDragStart, onDragEnd, onDrop, onDeleteBook }: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const bookId = e.dataTransfer.getData('bookId')
    if (bookId) {
      onDrop(bookId, status)
    }
  }

  const statusLabel = BOOK_STATUS_MAP[status]

  return (
    <div className={`column column-${status} ${isDragOver ? 'drag-over' : ''}`}>
      <div className="column-header">
        <h2 className="column-title">
          <span className={`column-accent accent-${status}`}></span>
          {statusLabel}
          <span className="column-count">{books.length}</span>
        </h2>
      </div>
      <div
        className="column-content"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {books.length === 0 ? (
          <div className="empty-state">
            <p>暂无{statusLabel}的书籍</p>
          </div>
        ) : (
          <div className="cards-container">
            {books.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                searchKeyword={searchKeyword}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDelete={onDeleteBook}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
