import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../store';
import type { Book } from '../store';

export const BookSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<Book[]>([]);
  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const { addToast } = useLibraryStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (kw: string, p: number = 1) => {
    if (!kw.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?keyword=${encodeURIComponent(kw)}&page=${p}&pageSize=20`);
      const data = await res.json();
      setResults(p === 1 ? data.data : [...results, ...data.data]);
      setTotal(data.total);
      setPage(p);
    } catch {
      addToast('error', '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const doDropdownSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) {
      setDropdownItems([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await fetch(`/api/books/search?keyword=${encodeURIComponent(kw)}&page=1&pageSize=8`);
      const data = await res.json();
      setDropdownItems(data.data);
      setShowDropdown(true);
    } catch {
      setDropdownItems([]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doDropdownSearch(val), 200);
  };

  const handleSearch = () => {
    setShowDropdown(false);
    doSearch(keyword, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const loadMore = () => doSearch(keyword, page + 1);

  const openDetail = async (bookId: string) => {
    setDetailLoading(true);
    setShowDropdown(false);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      const data = await res.json();
      setDetailBook(data);
    } catch {
      addToast('error', '获取图书详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="book-search-page">
      <div className="search-bar-wrapper">
        <div className="search-bar" ref={dropdownRef}>
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8d6e63" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="输入书名或作者搜索馆藏图书..."
            value={keyword}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => dropdownItems.length > 0 && setShowDropdown(true)}
          />
          <button className="search-btn" onClick={handleSearch}>搜索</button>
          {showDropdown && dropdownItems.length > 0 && (
            <div className="search-dropdown">
              {dropdownItems.map((book) => (
                <div key={book.id} className="dropdown-item" onClick={() => openDetail(book.id)}>
                  <span className="dropdown-title">{book.title}</span>
                  <span className="dropdown-author">{book.author}</span>
                  <span className={`dropdown-status ${book.status}`}>
                    {book.status === 'available' ? '在馆' : '借出'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-info">
          共找到 <strong>{total}</strong> 本相关图书
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="loading-state">
          <div className="spinner" />
          <span>搜索中...</span>
        </div>
      )}

      {!loading && keyword && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div>未找到相关图书，试试其他关键词</div>
        </div>
      )}

      <div className="book-grid">
        {results.map((book) => (
          <div key={book.id} className="book-card" onClick={() => openDetail(book.id)}>
            <div className="book-cover">
              <img src={book.cover} alt={book.title} width={80} height={120} loading="lazy" />
            </div>
            <div className="book-info">
              <h3 className="book-title">{book.title}</h3>
              <p className="book-author">{book.author}</p>
              <p className="book-call">{book.callNumber}</p>
              <span className={`book-status ${book.status}`}>
                {book.status === 'available' ? '在馆' : '借出'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && results.length < total && (
        <div className="load-more-wrapper">
          <button className="load-more-btn" onClick={loadMore} disabled={loading}>
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {detailBook && (
        <div className="modal-overlay" onClick={() => setDetailBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailBook(null)}>✕</button>
            <div className="modal-body">
              <div className="modal-cover">
                <img src={detailBook.cover} alt={detailBook.title} width={120} height={180} />
              </div>
              <div className="modal-details">
                <h2>{detailBook.title}</h2>
                <div className="detail-row"><span className="detail-label">作者</span><span>{detailBook.author}</span></div>
                <div className="detail-row"><span className="detail-label">ISBN</span><span>{detailBook.isbn}</span></div>
                <div className="detail-row"><span className="detail-label">出版社</span><span>{detailBook.publisher}</span></div>
                <div className="detail-row"><span className="detail-label">索书号</span><span>{detailBook.callNumber}</span></div>
                <div className="detail-row">
                  <span className="detail-label">状态</span>
                  <span className={`book-status ${detailBook.status}`}>
                    {detailBook.status === 'available' ? '在馆' : '借出'}
                  </span>
                </div>
                <div className="detail-row"><span className="detail-label">书架</span><span>{detailBook.shelf}</span></div>
                <div className="detail-desc">
                  <span className="detail-label">简介</span>
                  <p>{detailBook.description}</p>
                </div>
                <div className="detail-actions">
                  {detailBook.status === 'available' && (
                    <button className="action-btn book-btn" onClick={() => { setDetailBook(null); navigate('/booking'); }}>
                      预约借书
                    </button>
                  )}
                  <button className="action-btn map-btn" onClick={() => { setDetailBook(null); navigate(`/map/${detailBook.id}`); }}>
                    查看位置
                  </button>
                </div>
              </div>
            </div>
            {detailBook.shelfInfo && (
              <div className="detail-shelf-preview">
                <h4>书架位置示意图</h4>
                <svg width="780" height="100" viewBox="0 0 780 100">
                  {['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6'].map((id, i) => {
                    const col = i % 6;
                    const row = Math.floor(i / 6);
                    const x = col * 130 + 10;
                    const y = row * 45 + 5;
                    const isHighlight = id === detailBook.shelf;
                    return (
                      <g key={id}>
                        <rect x={x} y={y} width={120} height={38} rx={4}
                          fill={isHighlight ? '#42a5f5' : '#fff9c4'} stroke={isHighlight ? '#1565c0' : '#9e9e9e'} strokeWidth={1.5} />
                        <text x={x + 60} y={y + 23} textAnchor="middle" fontSize={12} fill={isHighlight ? '#fff' : '#333'}>
                          {id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
