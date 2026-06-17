import React, { useState, useEffect } from 'react';
import { Book, CATEGORIES } from '../types';
import { Socket } from 'socket.io-client';

interface AdminPanelProps {
  socket: Socket;
  books: Book[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ socket, books }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    price: '',
    stock: '',
    description: '',
    category: '小说' as string,
    cover_image: '',
  });

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bookData = {
      title: formData.title,
      author: formData.author,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      description: formData.description,
      category: formData.category,
      cover_image: formData.cover_image,
    };

    if (editingBook) {
      await fetch(`/api/books/${editingBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
    } else {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
    }

    resetForm();
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      price: book.price.toString(),
      stock: book.stock.toString(),
      description: book.description,
      category: book.category,
      cover_image: book.cover_image,
    });
    setShowForm(true);
  };

  const handleDelete = async (bookId: string) => {
    if (window.confirm('确定要删除这本书吗？')) {
      await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      price: '',
      stock: '',
      description: '',
      category: '小说',
      cover_image: '',
    });
    setEditingBook(null);
    setShowForm(false);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '12px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 600,
      color: '#5d4037',
    },
    addButton: {
      backgroundColor: '#2d5a3d',
      color: 'white',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
    },
    searchBox: {
      width: '100%',
      maxWidth: '300px',
      padding: '10px 16px',
      border: '1px solid #d7ccc8',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#faf6f2',
      outline: 'none',
    },
    formContainer: {
      backgroundColor: '#fff9f0',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(93, 64, 55, 0.1)',
    },
    formTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#5d4037',
      marginBottom: '16px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#6d4c41',
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #d7ccc8',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      outline: 'none',
    },
    textarea: {
      padding: '10px 12px',
      border: '1px solid #d7ccc8',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      outline: 'none',
      resize: 'vertical',
      minHeight: '80px',
      gridColumn: '1 / -1',
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      padding: '10px 20px',
      border: '1px solid #d7ccc8',
      borderRadius: '8px',
      backgroundColor: 'white',
      color: '#6d4c41',
      cursor: 'pointer',
      fontSize: '14px',
    },
    submitButton: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: '#2d5a3d',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    bookGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
    },
    bookCard: {
      backgroundColor: '#faf6f0',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 6px rgba(93, 64, 55, 0.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    bookCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 16px rgba(93, 64, 55, 0.15)',
    },
    bookActions: {
      position: 'absolute' as const,
      top: '12px',
      right: '12px',
      display: 'flex',
      gap: '8px',
      opacity: 0,
      transition: 'opacity 0.2s',
    },
    bookActionsVisible: {
      opacity: 1,
    },
    actionButton: {
      width: '32px',
      height: '32px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
    },
    editButton: {
      backgroundColor: '#4a7c59',
      color: 'white',
    },
    deleteButton: {
      backgroundColor: '#c44536',
      color: 'white',
    },
    bookCover: {
      width: '100%',
      height: '160px',
      borderRadius: '8px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center' as const,
      padding: '10px',
    },
    bookTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#5d4037',
      marginBottom: '6px',
    },
    bookAuthor: {
      fontSize: '13px',
      color: '#8d6e63',
      marginBottom: '8px',
    },
    bookMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bookPrice: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#c44536',
    },
    bookStock: {
      fontSize: '12px',
      color: '#8d6e63',
    },
    categoryTag: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 500,
      marginTop: '8px',
    },
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '小说':
        return { bg: '#d4a373', color: '#5c4033' };
      case '科技':
        return { bg: '#7eb8da', color: '#1a3a52' };
      case '艺术':
        return { bg: '#e8a0bf', color: '#5c3a4a' };
      default:
        return { bg: '#bcb8b1', color: '#463f3a' };
    }
  };

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>书店管理面板</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBox}
          />
          <button
            onClick={() => setShowForm(true)}
            style={styles.addButton}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e3f2a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2d5a3d')}
          >
            + 添加书籍
          </button>
        </div>
      </div>

      {showForm && (
        <div style={styles.formContainer}>
          <h3 style={styles.formTitle}>{editingBook ? '编辑书籍' : '添加新书'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>书名</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>作者</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>价格 (¥)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>库存数量</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={styles.input}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>封面图片URL</label>
                <input
                  type="text"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  style={styles.input}
                  placeholder="可选"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>书籍简介</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={resetForm} style={styles.cancelButton}>
                取消
              </button>
              <button type="submit" style={styles.submitButton}>
                {editingBook ? '保存修改' : '添加书籍'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.bookGrid}>
        {filteredBooks.map((book) => {
          const isHovered = hoveredCard === book.id;
          const categoryColor = getCategoryColor(book.category);
          return (
            <div
              key={book.id}
              style={{
                ...styles.bookCard,
                ...(isHovered ? styles.bookCardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(book.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div
                style={{
                  ...styles.bookActions,
                  ...(isHovered ? styles.bookActionsVisible : {}),
                }}
              >
                <button
                  onClick={() => handleEdit(book)}
                  style={{ ...styles.actionButton, ...styles.editButton }}
                  title="编辑"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(book.id)}
                  style={{ ...styles.actionButton, ...styles.deleteButton }}
                  title="删除"
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  ...styles.bookCover,
                  backgroundColor: categoryColor.bg,
                }}
              >
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <span style={{ fontSize: '14px' }}>{book.title}</span>
                )}
              </div>
              <h3 style={styles.bookTitle}>{book.title}</h3>
              <p style={styles.bookAuthor}>{book.author}</p>
              <span
                style={{
                  ...styles.categoryTag,
                  backgroundColor: categoryColor.bg + '40',
                  color: categoryColor.color,
                }}
              >
                {book.category}
              </span>
              <div style={styles.bookMeta}>
                <span style={styles.bookPrice}>¥{book.price.toFixed(2)}</span>
                <span style={styles.bookStock}>库存: {book.stock}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8d6e63' }}>
          暂无书籍
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
