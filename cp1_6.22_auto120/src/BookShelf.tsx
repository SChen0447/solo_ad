import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Book, BookList, ReadingStatus } from './types';

interface BookShelfProps {
  books: Book[];
  bookLists: BookList[];
  onAddBook: (book: Omit<Book, 'id' | 'status' | 'bookLists' | 'addedAt'>) => Promise<Book>;
  onUpdateBook: (id: string, updates: Partial<Book>) => Promise<Book>;
  onDeleteBook: (id: string) => Promise<void>;
  onAddBookList: (name: string, coverUrl: string) => Promise<BookList>;
  onUpdateBookList: (id: string, updates: Partial<BookList>) => Promise<BookList>;
  onDeleteBookList: (id: string) => Promise<void>;
  onReorderBookList: (id: string, bookIds: string[]) => Promise<void>;
}

const statusLabels: Record<ReadingStatus, string> = {
  unread: '未读',
  reading: '在读',
  read: '已读',
};

function BookDetailModal({
  book,
  bookLists,
  onClose,
  onUpdateStatus,
  onDelete,
}: {
  book: Book;
  bookLists: BookList[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: ReadingStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<ReadingStatus>(book.status);

  const handleStatusChange = (s: ReadingStatus) => {
    setStatus(s);
    onUpdateStatus(book.id, s);
  };

  const belongingLists = bookLists.filter((l) => l.bookIds.includes(book.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="book-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-book-cover">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} />
          ) : (
            <div className="cover-placeholder">📖</div>
          )}
        </div>
        <div className="modal-book-info">
          <h2 className="modal-book-title">{book.title}</h2>
          <p className="modal-book-author">{book.author}</p>
          {book.isbn && <p className="modal-book-isbn">ISBN: {book.isbn}</p>}
          <div className="modal-status-group">
            <span className="modal-status-label">阅读状态：</span>
            {(['unread', 'reading', 'read'] as ReadingStatus[]).map((s) => (
              <button
                key={s}
                className={`status-btn status-${s} ${status === s ? 'status-active' : ''}`}
                onClick={() => handleStatusChange(s)}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
          {belongingLists.length > 0 && (
            <div className="modal-book-lists">
              <span className="modal-status-label">所属书单：</span>
              <div className="modal-list-tags">
                {belongingLists.map((l) => (
                  <span key={l.id} className="list-tag">{l.name}</span>
                ))}
              </div>
            </div>
          )}
          <button
            className="btn-danger"
            onClick={() => { onDelete(book.id); onClose(); }}
          >
            删除书籍
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBookForm({ onAdd, onClose }: { onAdd: (b: Omit<Book, 'id' | 'status' | 'bookLists' | 'addedAt'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    onAdd({ title: title.trim(), author: author.trim(), isbn: isbn.trim(), coverUrl: coverUrl.trim() });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="add-book-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <h2>添加新书</h2>
        <div className="form-group">
          <label>书名 *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入书名" required />
        </div>
        <div className="form-group">
          <label>作者 *</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="输入作者" required />
        </div>
        <div className="form-group">
          <label>ISBN</label>
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="输入ISBN" />
        </div>
        <div className="form-group">
          <label>封面图URL</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="输入封面图URL" />
        </div>
        <button type="submit" className="btn-primary">确认添加</button>
      </form>
    </div>
  );
}

function BookListPanel({
  bookLists,
  books,
  onAddList,
  onDeleteList,
  onUpdateList,
  onReorder,
}: {
  bookLists: BookList[];
  books: Book[];
  onAddList: (name: string, coverUrl: string) => void;
  onDeleteList: (id: string) => void;
  onUpdateList: (id: string, updates: Partial<BookList>) => void;
  onReorder: (id: string, bookIds: string[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddList(newName.trim(), '');
    setNewName('');
    setShowAdd(false);
  };

  const handleDragStart = (bookId: string) => {
    setDragItem(bookId);
  };

  const handleDragOver = (e: React.DragEvent, bookId: string) => {
    e.preventDefault();
    setDragOverItem(bookId);
  };

  const handleDrop = (listId: string, currentBookIds: string[]) => {
    if (!dragItem || !dragOverItem || dragItem === dragOverItem) return;
    const items = [...currentBookIds];
    const fromIdx = items.indexOf(dragItem);
    const toIdx = items.indexOf(dragOverItem);
    if (fromIdx === -1 || toIdx === -1) return;
    items.splice(fromIdx, 1);
    items.splice(toIdx, 0, dragItem);
    onReorder(listId, items);
    setDragItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="booklist-panel">
      <div className="booklist-header">
        <h2>我的书单</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ 新建书单</button>
      </div>

      {showAdd && (
        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 20))}
            placeholder="书单名称（最多20字）"
            maxLength={20}
          />
          <button type="submit" className="btn-primary btn-sm">创建</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setShowAdd(false); setNewName(''); }}>取消</button>
        </form>
      )}

      <div className="booklist-scroll">
        {bookLists.map((list) => {
          const listBooks = list.bookIds
            .map((id) => books.find((b) => b.id === id))
            .filter(Boolean) as Book[];

          return (
            <div key={list.id} className="booklist-card-wrapper">
              <div
                className="booklist-card"
                onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
              >
                <div className="booklist-cover">
                  {list.coverUrl ? (
                    <img src={list.coverUrl} alt={list.name} />
                  ) : (
                    <div className="cover-placeholder">📋</div>
                  )}
                </div>
                <div className="booklist-info">
                  <h3>{list.name}</h3>
                  <p>{list.bookIds.length} 本书</p>
                </div>
                <button
                  className="btn-ghost btn-xs"
                  onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }}
                >
                  🗑
                </button>
              </div>

              {expandedList === list.id && (
                <div className="booklist-expanded">
                  {listBooks.map((book) => (
                    <div
                      key={book.id}
                      className={`booklist-book-item ${dragOverItem === book.id ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(book.id)}
                      onDragOver={(e) => handleDragOver(e, book.id)}
                      onDrop={() => handleDrop(list.id, list.bookIds)}
                      onDragEnd={() => { setDragItem(null); setDragOverItem(null); }}
                    >
                      <span className="drag-handle">⠿</span>
                      <span className="booklist-book-title">{book.title}</span>
                      <span className="booklist-book-author">{book.author}</span>
                    </div>
                  ))}
                  {listBooks.length === 0 && <p className="empty-hint">暂无书籍</p>}
                </div>
              )}
            </div>
          );
        })}
        {bookLists.length === 0 && <p className="empty-hint">还没有书单，点击上方创建</p>}
      </div>
    </div>
  );
}

export default function BookShelf({
  books,
  bookLists,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onAddBookList,
  onUpdateBookList,
  onDeleteBookList,
  onReorderBookList,
}: BookShelfProps) {
  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      const q = query.toLowerCase();
      const results = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.includes(q)
      ).slice(0, 10);
      setSearchResults(results);
      setShowSearch(true);
    }, 300);
  }, [books]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddBook = async (bookData: Omit<Book, 'id' | 'status' | 'bookLists' | 'addedAt'>) => {
    await onAddBook(bookData);
  };

  const handleUpdateStatus = async (id: string, status: ReadingStatus) => {
    await onUpdateBook(id, { status });
  };

  const handleDeleteBook = async (id: string) => {
    await onDeleteBook(id);
    setSelectedBook(null);
  };

  return (
    <div className="bookshelf-page">
      <div className="page-header">
        <h1 className="page-title">我的书架</h1>
        <div className="page-actions">
          <div className="search-wrapper" ref={searchRef}>
            <input
              className="search-input"
              type="text"
              placeholder="搜索书籍..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setSearchResults.length > 0 && setShowSearch(true)}
            />
            {showSearch && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((book) => (
                  <div
                    key={book.id}
                    className="search-item"
                    onClick={() => {
                      setSelectedBook(book);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <span className="search-item-title">{book.title}</span>
                    <span className="search-item-author">{book.author}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => setShowAddBook(true)}>+ 添加书籍</button>
        </div>
      </div>

      <div className="book-grid">
        {books.map((book) => (
          <div
            key={book.id}
            className="book-card"
            onClick={() => setSelectedBook(book)}
          >
            <div className="book-card-cover">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} loading="lazy" />
              ) : (
                <div className="cover-placeholder">📖</div>
              )}
              <div className="book-card-overlay">
                <p className="book-card-title">{book.title}</p>
                <p className="book-card-author">{book.author}</p>
              </div>
            </div>
            <span className={`book-status-badge status-badge-${book.status}`}>
              {statusLabels[book.status]}
            </span>
          </div>
        ))}
      </div>

      {books.length === 0 && (
        <div className="empty-state">
          <p>书架空空如也，快添加你的第一本书吧！</p>
        </div>
      )}

      <BookListPanel
        bookLists={bookLists}
        books={books}
        onAddList={onAddBookList}
        onDeleteList={onDeleteBookList}
        onUpdateList={onUpdateBookList}
        onReorder={onReorderBookList}
      />

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          bookLists={bookLists}
          onClose={() => setSelectedBook(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteBook}
        />
      )}

      {showAddBook && (
        <AddBookForm
          onAdd={handleAddBook}
          onClose={() => setShowAddBook(false)}
        />
      )}
    </div>
  );
}
