import React, { useState, useMemo } from 'react';
import ProgressBar from './ProgressBar';
import NoteEditor from './NoteEditor';
import NoteTimeline from './NoteTimeline';
import QuoteCard from './QuoteCard';
import type { Book, Note } from '@/types';
import { calculateReadingProgress, getQuoteNotes } from '@/utils/statsCalculator';

interface BookDetailProps {
  book: Book;
  notes: Note[];
  onBack: () => void;
  onUpdateProgress: (newPage: number) => void;
  onSaveNote: (data: {
    id?: string;
    title: string;
    content: string;
    pageNumber: number;
    isQuote: boolean;
  }) => void;
  onDeleteNote: (noteId: string) => void;
}

const statusLabels: Record<string, string> = {
  reading: '在读',
  completed: '已完成',
  not_started: '未开始',
};

const BookDetail: React.FC<BookDetailProps> = ({
  book,
  notes,
  onBack,
  onUpdateProgress,
  onSaveNote,
  onDeleteNote,
}) => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [progressInput, setProgressInput] = useState<string>(String(book.currentPage));
  const [activeTab, setActiveTab] = useState<'notes' | 'quotes'>('notes');

  const progress = calculateReadingProgress(book);
  const quotes = useMemo(() => getQuoteNotes(notes), [notes]);

  const handleProgressSubmit = () => {
    const newPage = Math.min(book.totalPages, Math.max(0, parseInt(progressInput) || 0));
    onUpdateProgress(newPage);
  };

  const handleSaveNote = (data: Parameters<typeof onSaveNote>[0]) => {
    onSaveNote(data);
    setEditingNote(null);
  };

  return (
    <div className="book-detail-page page-fade-in">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>返回书架</span>
        </button>
      </div>

      <div className="detail-hero">
        <div className="hero-cover-wrapper">
          <img src={book.coverImage} alt={book.title} className="hero-cover-img" />
        </div>
        <div className="hero-info">
          <div className="hero-top-tags">
            <span className={`detail-status-tag status-${book.status}`}>
              {statusLabels[book.status]}
            </span>
            <span className="detail-genre-tag">{book.genre}</span>
          </div>
          <h1 className="hero-title">{book.title}</h1>
          <p className="hero-author">作者：{book.author}</p>
          <div className="hero-meta-row">
            <span className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              开始于 {new Date(book.startDate).toLocaleDateString('zh-CN')}
            </span>
            <span className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {book.totalPages} 页
            </span>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-title">阅读进度</span>
              <span className="progress-big-num">{progress}%</span>
            </div>
            <ProgressBar book={book} showLabel={false} />
            <div className="progress-controls">
              <div className="progress-input-group">
                <input
                  type="number"
                  min="0"
                  max={book.totalPages}
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                />
                <span>/ {book.totalPages} 页</span>
              </div>
              <button className="btn-secondary update-progress-btn" onClick={handleProgressSubmit}>
                更新进度
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          笔记
          <span className="tab-count">{notes.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'quotes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotes')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
          摘抄
          <span className="tab-count">{quotes.length}</span>
        </button>
      </div>

      {activeTab === 'notes' && (
        <div className="notes-section">
          <div className="editor-layout">
            <NoteEditor
              bookId={book.id}
              totalPages={book.totalPages}
              currentPage={book.currentPage}
              editingNote={editingNote}
              onCancelEdit={() => setEditingNote(null)}
              onSaveNote={handleSaveNote}
            />
            <NoteTimeline
              notes={notes}
              onEdit={(n) => {
                setEditingNote(n);
                document.querySelector('.editor-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              onDelete={onDeleteNote}
            />
          </div>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="quotes-section">
          {quotes.length === 0 ? (
            <div className="empty-state small">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              </svg>
              <h3>还没有摘抄</h3>
              <p>在记录笔记时勾选「标记为摘抄」即可添加到这里</p>
            </div>
          ) : (
            <div className="quotes-grid">
              {quotes.map((q, idx) => (
                <div style={{ animationDelay: `${idx * 100}ms` }} key={q.id}>
                  <QuoteCard note={q} onDelete={onDeleteNote} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookDetail;
