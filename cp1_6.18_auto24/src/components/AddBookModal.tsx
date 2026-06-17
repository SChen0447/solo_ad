import React, { useState, useEffect } from 'react'
import { BookType, BookStatus } from '../types'
import './AddBookModal.css'

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (book: {
    title: string
    author: string
    type: BookType
    status: BookStatus
    rating: number
    note: string
  }) => void
}

export function AddBookModal({ isOpen, onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [type, setType] = useState<BookType>('book')
  const [status, setStatus] = useState<BookStatus>('wishlist')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setAuthor('')
      setType('book')
      setStatus('wishlist')
      setRating(0)
      setNote('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    onAdd({ title: title.trim(), author: author.trim(), type, status, rating, note })
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className={`modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`modal-content ${isOpen ? 'open' : ''}`}>
        <div className="modal-header">
          <h2>添加阅读条目</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">标题 *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入标题"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="author">作者 *</label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入作者"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>类型</label>
              <div className="radio-group">
                {(['book', 'article', 'paper'] as BookType[]).map((t) => (
                  <label key={t} className={`radio-item ${type === t ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                    />
                    <span>
                      {t === 'book' ? '书' : t === 'article' ? '文章' : '论文'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>状态</label>
              <div className="radio-group">
                {(['wishlist', 'reading', 'finished'] as BookStatus[]).map((s) => (
                  <label key={s} className={`radio-item status-${s} ${status === s ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                    />
                    <span>
                      {s === 'wishlist' ? '想读' : s === 'reading' ? '在读' : '读完'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>评分</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`rating-star ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star === rating ? 0 : star)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="note">摘要笔记</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录你的想法..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || !author.trim()}>
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
