import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Book, Users, Edit2, Trash2, Plus, Check, X, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import BookCard from '../components/BookCard';

interface BookType {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
  updatedAt: string;
}

interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  maxMembers: number;
  members: string[];
  pendingMembers: string[];
  status: string;
}

interface AdminPageProps {
  currentUser: any;
}

const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'clubs'>('books');
  const [books, setBooks] = useState<BookType[]>([]);
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    stock: 0,
    coverUrl: ''
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchBooks();
      fetchClubs();
    }
  }, [currentUser, activeTab]);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/clubs');
      const data = await res.json();
      setClubs(data);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setBookForm({ title: '', author: '', isbn: '', category: '', stock: 0, coverUrl: '' });
    setShowBookModal(true);
  };

  const handleEditBook = (book: BookType) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      stock: book.stock,
      coverUrl: book.coverUrl
    });
    setShowBookModal(true);
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('确定要删除这本书吗？')) {
      try {
        const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchBooks();
        }
      } catch (err) {
        console.error('Failed to delete book:', err);
      }
    }
  };

  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        const res = await fetch(`/api/books/${editingBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookForm)
        });
        if (res.ok) {
          setShowBookModal(false);
          setEditingBook(null);
          fetchBooks();
        }
      } else {
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookForm)
        });
        if (res.ok) {
          const createdBook = await res.json();
          setShowBookModal(false);
          setNewlyAddedId(createdBook.id);
          await fetchBooks();
          setTimeout(() => {
            setNewlyAddedId(null);
          }, 500);
        }
      }
    } catch (err) {
      console.error('Failed to submit book:', err);
    }
  };

  const handleApproveMember = async (clubId: string, userId: string) => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchClubs();
      }
    } catch (err) {
      console.error('Failed to approve member:', err);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">管理员面板</h1>

      <div className="category-tabs">
        <span 
          className={`category-tab ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          <Book size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          图书管理
        </span>
        <span 
          className={`category-tab ${activeTab === 'clubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('clubs')}
        >
          <Users size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          读书会审核
        </span>
      </div>

      {activeTab === 'books' && (
        <>
          <div className="admin-actions">
            <button className="btn btn-primary" onClick={handleAddBook}>
              <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              新增图书
            </button>
            <div className="category-tabs" style={{ marginBottom: 0, marginLeft: 'auto' }}>
              <span 
                className={`category-tab ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                卡片视图
              </span>
              <span 
                className={`category-tab ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                表格视图
              </span>
            </div>
          </div>
          
          {viewMode === 'card' ? (
            <div className="book-grid" style={{ justifyContent: 'flex-start' }}>
              {books.map((book, index) => (
                <div 
                  key={book.id} 
                  style={{ position: 'relative' }}
                >
                  <BookCard 
                    book={book} 
                    isNewlyAdded={newlyAddedId === book.id}
                  />
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    padding: '8px 12px 12px', 
                    backgroundColor: 'var(--white)',
                    borderTop: '1px solid #F0E6D2'
                  }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleEditBook(book)}
                    >
                      <Edit2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      编辑
                    </button>
                    <button 
                      className="btn btn-warning" 
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDeleteBook(book.id)}
                    >
                      <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-table">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>封面</th>
                    <th>书名</th>
                    <th>作者</th>
                    <th>分类</th>
                    <th>库存</th>
                    <th>ISBN</th>
                    <th>最近更新</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr 
                      key={book.id}
                      style={{ 
                        backgroundColor: newlyAddedId === book.id ? 'rgba(212, 163, 115, 0.1)' : 'transparent',
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      <td>
                        <img 
                          src={book.coverUrl} 
                          alt={book.title}
                          style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/50/70`;
                          }}
                        />
                      </td>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.category}</td>
                      <td>{book.stock}</td>
                      <td>{book.isbn}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        {new Date(book.updatedAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td>
                        <button 
                          className="icon-btn edit"
                          onClick={() => handleEditBook(book)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="icon-btn delete"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'clubs' && (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>读书会名称</th>
                <th>共读书目</th>
                <th>成员数</th>
                <th>状态</th>
                <th>待审核</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map(club => (
                <tr key={club.id}>
                  <td>{club.name}</td>
                  <td>{club.bookTitle}</td>
                  <td>{club.members.length}/{club.maxMembers}</td>
                  <td>
                    <span className={`club-card-status ${club.status}`}>
                      {club.status === 'recruiting' ? '招募中' : club.status === 'ongoing' ? '进行中' : '已结束'}
                    </span>
                  </td>
                  <td>
                    {club.pendingMembers.length > 0 && (
                      <span className="pending-badge">{club.pendingMembers.length} 人</span>
                    )}
                    {club.pendingMembers.length === 0 && '-'}
                  </td>
                  <td>
                    {club.pendingMembers.map(userId => (
                      <div key={userId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>{userId.slice(0, 8)}</span>
                        <button 
                          className="icon-btn edit"
                          onClick={() => handleApproveMember(club.id, userId)}
                          title="通过"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title={editingBook ? '编辑图书' : '新增图书'}
      >
        <form onSubmit={handleSubmitBook}>
          <div className="form-group">
            <label className="form-label">书名</label>
            <input
              type="text"
              className="form-input"
              value={bookForm.title}
              onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">作者</label>
            <input
              type="text"
              className="form-input"
              value={bookForm.author}
              onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">分类</label>
              <input
                type="text"
                className="form-input"
                value={bookForm.category}
                onChange={e => setBookForm({ ...bookForm, category: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">库存</label>
              <input
                type="number"
                className="form-input"
                value={bookForm.stock}
                onChange={e => setBookForm({ ...bookForm, stock: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ISBN</label>
            <input
              type="text"
              className="form-input"
              value={bookForm.isbn}
              onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">封面URL</label>
            <input
              type="text"
              className="form-input"
              value={bookForm.coverUrl}
              onChange={e => setBookForm({ ...bookForm, coverUrl: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => setShowBookModal(false)}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editingBook ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPage;
