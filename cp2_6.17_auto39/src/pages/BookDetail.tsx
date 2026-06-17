import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NoteCard from '../components/NoteCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Book, Note, NotesResponse, Sentiment } from '../types';
import { analyzeSentiment, getPlaceholderColor, parseMarkdown } from '../utils';

type SentimentFilter = 'all' | Sentiment;

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [currentPageSlider, setCurrentPageSlider] = useState(0);
  const [noteContent, setNoteContent] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');

  useEffect(() => {
    if (id) {
      fetchBook();
      fetchNotes(1, true);
    }
  }, [id]);

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/books/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch book');
      }
      const data: Book = await response.json();
      setBook(data);
      setCurrentPageSlider(data.currentPage);
    } catch (error) {
      console.error('Error fetching book:', error);
    }
  };

  const fetchNotes = async (pageNum: number, reset: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/books/${id}/notes?page=${pageNum}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      const data: NotesResponse = await response.json();
      
      if (reset) {
        setNotes(data.notes);
      } else {
        setNotes((prev) => [...prev, ...data.notes]);
      }
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isFetchingRef.current) {
        fetchNotes(page + 1, false);
      }
    },
    [hasMore, page, id]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [observerCallback]);

  const handleProgressChange = async (value: number) => {
    if (!book) return;
    setCurrentPageSlider(value);
  };

  const handleProgressChangeEnd = async () => {
    if (!book || currentPageSlider === book.currentPage) return;
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPage: currentPageSlider })
      });
      if (response.ok) {
        const updatedBook = await response.json();
        setBook(updatedBook);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;

    try {
      if (editingNote) {
        const response = await fetch(`/api/notes/${editingNote.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: noteContent })
        });
        if (response.ok) {
          const updatedNote = await response.json();
          setNotes((prev) =>
            prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
          );
        }
      } else {
        const response = await fetch(`/api/books/${id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: noteContent })
        });
        if (response.ok) {
          const newNote = await response.json();
          setNotes((prev) => [newNote, ...prev]);
        }
      }
      setNoteContent('');
      setEditingNote(null);
      setEditorMode('edit');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setEditorMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteContent('');
    setEditorMode('edit');
  };

  const filteredNotes = notes.filter((note) => {
    if (sentimentFilter === 'all') return true;
    return analyzeSentiment(note.content) === sentimentFilter;
  });

  const sentimentCounts = notes.reduce(
    (acc, note) => {
      const sentiment = analyzeSentiment(note.content);
      acc[sentiment]++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!book) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">书籍未找到</div>
      </div>
    );
  }

  const placeholderColor = getPlaceholderColor(book.title);
  const coverStyle = book.coverUrl
    ? { backgroundImage: `url(${book.coverUrl})` }
    : { backgroundColor: placeholderColor };
  const progress = book.totalPages > 0 ? Math.round((currentPageSlider / book.totalPages) * 100) : 0;

  const filterButtons: { key: SentimentFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: '全部', count: notes.length, color: '#64ffda' },
    { key: 'positive', label: '正面', count: sentimentCounts.positive, color: '#4caf50' },
    { key: 'neutral', label: '中性', count: sentimentCounts.neutral, color: '#9e9e9e' },
    { key: 'negative', label: '负面', count: sentimentCounts.negative, color: '#f44336' }
  ];

  return (
    <div className="detail-container">
      <div className="back-btn" onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        返回
      </div>

      <div className="book-detail-header">
        <div className="book-detail-cover" style={coverStyle}>
          {!book.coverUrl && (
            <div className="book-cover-placeholder" style={{ height: '100%' }}>
              {book.title.charAt(0)}
            </div>
          )}
        </div>
        <div className="book-detail-info">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">作者：{book.author}</p>
          <div className="progress-slider-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                阅读进度：{progress}%
              </span>
              <span style={{ color: 'var(--primary)', fontSize: '14px' }}>
                {currentPageSlider} / {book.totalPages} 页
              </span>
            </div>
            <div className="progress-slider-container">
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>0</span>
              <input
                type="range"
                className="slider"
                min="0"
                max={book.totalPages}
                value={currentPageSlider}
                onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                onMouseUp={handleProgressChangeEnd}
                onTouchEnd={handleProgressChangeEnd}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {book.totalPages}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="notes-section">
        <h2 className="notes-section-title">
          {editingNote ? '编辑笔记' : '写笔记'}
        </h2>
        <div className="note-editor">
          <div className="editor-tabs">
            <div
              className={`editor-tab ${editorMode === 'edit' ? 'active' : ''}`}
              onClick={() => setEditorMode('edit')}
            >
              编辑
            </div>
            <div
              className={`editor-tab ${editorMode === 'preview' ? 'active' : ''}`}
              onClick={() => setEditorMode('preview')}
            >
              预览
            </div>
          </div>

          {editorMode === 'edit' ? (
            <div style={{ position: 'relative' }}>
              <textarea
                className="editor-textarea"
                placeholder="在这里写下您的读书笔记，支持Markdown格式..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  fontSize: '12px',
                  color: '#8e8e93',
                  pointerEvents: 'none'
                }}
              >
                {noteContent.length} 字
              </div>
            </div>
          ) : (
            <div
              className="editor-preview"
              dangerouslySetInnerHTML={{
                __html: noteContent ? parseMarkdown(noteContent) : '<span style="color: var(--text-muted)">暂无内容</span>'
              }}
            />
          )}

          <div className="editor-actions">
            {editingNote && (
              <button
                className="btn btn-outline"
                style={{ marginRight: '12px' }}
                onClick={handleCancelEdit}
              >
                取消
              </button>
            )}
            <button
              className="btn"
              style={{ width: '120px', height: '40px' }}
              onClick={handleSaveNote}
              disabled={!noteContent.trim()}
            >
              {editingNote ? '更新' : '保存'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="notes-section-title" style={{ marginBottom: 0 }}>
              笔记列表
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'normal', marginLeft: '12px' }}>
                共 {filteredNotes.length} 条
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setSentimentFilter(btn.key)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor:
                      sentimentFilter === btn.key ? btn.color : '#1e1e2f',
                    color: sentimentFilter === btn.key ? '#fff' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: sentimentFilter === btn.key ? 500 : 400,
                    transform: sentimentFilter === btn.key ? 'scale(0.98)' : 'scale(1)'
                  }}
                >
                  {btn.label}
                  <span
                    style={{
                      marginLeft: '6px',
                      opacity: sentimentFilter === btn.key ? 0.9 : 0.7
                    }}
                  >
                    ({btn.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredNotes.length > 0 ? (
            <>
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                />
              ))}
              <div ref={observerRef} className="load-more-container">
                {loadingMore && <LoadingSpinner />}
                {!hasMore && notes.length > 0 && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    没有更多笔记了
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.5, marginBottom: '16px' }}>
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              <div className="empty-state-text">
                {sentimentFilter === 'all' ? '还没有笔记' : `没有${filterButtons.find(b => b.key === sentimentFilter)?.label}笔记`}
              </div>
              <div className="empty-state-subtext">
                {sentimentFilter === 'all' ? '在上方编辑区写下您的第一条笔记吧' : '试试切换其他筛选条件'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
