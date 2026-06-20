import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../apiClient';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  file_type: string;
  read_progress: number;
  last_read_page: number;
  created_at: string;
}

interface Note {
  id: number;
  highlighted_text: string;
  note_content: string;
  page_number: number;
  created_at: string;
}

const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="absolute top-2 right-2">
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="rgba(0,0,0,0.3)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="#4a90d9"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontSize="12"
        fill="#333"
        fontWeight="600"
        style={{ fill: '#e0e0e0' }}
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
};

const BookDetail: React.FC<{ book: Book; onClose: () => void; onContinue: () => void }> = ({
  book,
  onClose,
  onContinue
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoadingNotes(true);
      try {
        const response = await apiClient.get(`/notes/${book.id}`);
        setNotes(response.data);
      } catch (err) {
        console.error('Failed to fetch notes');
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [book.id]);

  const handleExportNotes = async () => {
    try {
      const response = await apiClient.get(`/notes/export/${book.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${book.title}-notes.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export notes');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-32 h-44 object-cover rounded-lg"
                style={{ borderRadius: '8px' }}
              />
            ) : (
              <div className="w-32 h-44 bg-gradient-to-br from-primary/30 to-primary-dark/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-light mb-1">{book.title}</h2>
            <p className="text-text-light/70 mb-3">作者：{book.author}</p>
            <p className="text-sm text-text-light/60 mb-4">
              阅读进度：{Math.round(book.read_progress)}%
            </p>
            <div className="flex gap-3">
              <button onClick={onContinue} className="btn-primary px-5 py-2 rounded-lg text-sm font-medium">
                继续阅读
              </button>
              <button
                onClick={handleExportNotes}
                className="px-5 py-2 rounded-lg border border-stroke text-text-light hover:bg-white/5 text-sm"
              >
                导出笔记
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-text-light mb-4">我的笔记</h3>
          {loadingNotes ? (
            <p className="text-text-light/60">加载中...</p>
          ) : notes.length === 0 ? (
            <p className="text-text-light/60">暂无笔记</p>
          ) : (
            <div className="space-y-3" style={{ gap: '12px' }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="glass-card rounded-lg p-4 border-l-4"
                  style={{ borderLeftColor: '#f1c40f' }}
                >
                  <p className="text-sm text-text-light/80 bg-white/5 rounded px-3 py-2 mb-2 italic">
                    "{note.highlighted_text}"
                  </p>
                  <p className="text-sm text-text-light mb-2">{note.note_content}</p>
                  <p className="text-xs text-text-light/50">
                    第 {note.page_number} 页 · {new Date(note.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-lg border border-stroke text-text-light/70 hover:bg-white/5"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

const BookShelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBooks(filtered);
  }, [searchQuery, books]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/books');
      setBooks(response.data);
      setFilteredBooks(response.data);
    } catch (err) {
      console.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过50MB');
      return;
    }

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'epub') {
      alert('只支持PDF和EPUB格式');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post('/books/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchBooks();
    } catch (err) {
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleContinueReading = (bookId: number) => {
    navigate(`/reader/${bookId}`);
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-light">我的书架</h1>
            <p className="text-sm text-text-light/60 mt-1">
              {user?.email} · 共 {books.length} 本图书
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {uploading ? '上传中...' : '+ 上传书籍'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-lg border border-stroke text-text-light/70 hover:bg-white/5 text-sm"
            >
              退出
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索书名或作者..."
            className="search-input w-full px-6 py-3 rounded-full bg-white/10 border border-stroke text-text-light placeholder-text-light/40 text-sm"
            style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.1)' }}
          />
          <svg
            className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-text-light/60">加载中...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <span className="text-6xl mb-4">📖</span>
            <p className="text-text-light/60 mb-4">
              {searchQuery ? '未找到相关书籍' : '书架空空如也，上传一本书开始阅读吧'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="book-card glass-card rounded-xl p-4 cursor-pointer relative"
                style={{ borderRadius: '8px' }}
                onClick={() => setSelectedBook(book)}
              >
                <ProgressRing progress={book.read_progress} />
                <div className="aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary-dark/20">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '8px' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-text-light text-sm truncate mb-1">{book.title}</h3>
                <p className="text-xs text-text-light/60 truncate mb-3">{book.author}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContinueReading(book.id);
                  }}
                  className="btn-primary w-full py-2 rounded-lg text-xs font-medium"
                >
                  继续阅读
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onContinue={() => {
            setSelectedBook(null);
            handleContinueReading(selectedBook.id);
          }}
        />
      )}
    </div>
  );
};

export default BookShelf;
