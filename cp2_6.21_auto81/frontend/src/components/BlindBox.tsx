import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import { useBooks } from '../BookContext';

interface BlindBoxProps {
  onClose: () => void;
}

const API_BASE = 'http://localhost:3001/api';

const GiftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const HeartIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
    style={{ marginRight: 6 }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
    style={{ marginRight: 6 }}
  >
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const BlindBox: React.FC<BlindBoxProps> = ({ onClose }) => {
  const { books, getRecentReadTags, addBook } = useBooks();
  const [recommendedBook, setRecommendedBook] = useState<Book | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [isFlipping, setIsFlipping] = useState(true);
  const [phase, setPhase] = useState<'front' | 'switching' | 'back'>('front');

  const performFlip = useCallback(
    async (bookData: Book) => {
      setRecommendedBook(bookData);
      setPhase('front');
      setShowBack(false);
      setIsFlipping(true);

      requestAnimationFrame(() => {
        setShowBack(true);
      });

      setTimeout(() => {
        setPhase('switching');
      }, 500);

      setTimeout(() => {
        setPhase('back');
        setIsFlipping(false);
      }, 1000);
    },
    []
  );

  const fisherYatesShuffle = useCallback(<T,>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  const fetchRecommendation = useCallback(async () => {
    try {
      const tags = getRecentReadTags();
      const existingIds = books.map(b => b.id);

      const query = new URLSearchParams();
      if (tags.length > 0) {
        query.set('tags', tags.join(','));
      }
      if (existingIds.length > 0) {
        query.set('excludeIds', existingIds.join(','));
      }
      const res = await fetch(`${API_BASE}/recommend?${query.toString()}`);

      if (!res.ok) {
        throw new Error(`Recommendation failed: ${res.status}`);
      }

      const data = await res.json();
      const recommended: Book = {
        ...data,
        pagesRead: 0
      };
      await performFlip(recommended);
    } catch (err) {
      console.error('Failed to fetch recommendation:', err);
      try {
        const allRes = await fetch(`${API_BASE}/allbooks`);
        const allBooks: Book[] = await allRes.json();
        const existingIds = books.map(b => b.id);
        const notInShelf = allBooks.filter(b => !existingIds.includes(b.id));
        const candidates = notInShelf.length > 0 ? notInShelf : allBooks;
        const shuffled = fisherYatesShuffle(candidates);
        const fallback: Book = {
          ...shuffled[0],
          pagesRead: 0
        };
        await performFlip(fallback);
      } catch (fallbackErr) {
        const finalFallback: Book = {
          id: `fallback_${Date.now()}`,
          title: '小王子',
          author: '圣埃克苏佩里',
          coverUrl: 'https://picsum.photos/seed/xiaowangzi/400/580',
          totalPages: 120,
          pagesRead: 0,
          tags: ['经典', '治愈'],
          isbn: '9787020042494'
        };
        await performFlip(finalFallback);
      }
    }
  }, [getRecentReadTags, books, performFlip, fisherYatesShuffle]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRecommendation();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleLike = () => {
    if (recommendedBook) {
      addBook(recommendedBook);
    }
    onClose();
  };

  const handleRefresh = async () => {
    if (isFlipping) return;
    setShowBack(false);
    setPhase('front');
    setRecommendedBook(null);
    await new Promise(r => setTimeout(r, 300));
    fetchRecommendation();
  };

  return (
    <div className="blindbox-overlay" onClick={onClose}>
      <button className="close-btn" onClick={onClose} aria-label="关闭">
        <CloseIcon />
      </button>

      <div className="flip-card-container" onClick={e => e.stopPropagation()}>
        <div className={`flip-card ${showBack ? 'flipped' : ''}`}>
          <div className="flip-face flip-front">
            <div className="flip-front-pattern" />
            <div className="flip-front-content">
              <GiftIcon className="gift-icon" />
              <div className="flip-front-title">神秘书籍盲盒</div>
              <div className="flip-front-subtitle">
                {phase === 'front' ? '正在为你匹配最适合的书籍...' : '揭开封印...'}
              </div>
            </div>
          </div>

          <div className="flip-face flip-back">
            {recommendedBook && (
              <>
                <div className="flip-back-cover">
                  <img src={recommendedBook.coverUrl} alt={recommendedBook.title} />
                </div>
                <div className="flip-back-content">
                  <h3 className="flip-back-title">{recommendedBook.title}</h3>
                  <p className="flip-back-author">{recommendedBook.author}</p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {recommendedBook.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#A5B4FC',
                          fontSize: 11
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <p className="flip-back-desc">
                    一本值得深度阅读的佳作。
                    {recommendedBook.totalPages > 500
                      ? '篇幅较长，适合沉浸式阅读体验。'
                      : '篇幅适中，适合快速吸收精华。'}
                    根据你的阅读偏好，这本书在标签匹配度上获得了高分推荐。
                    共 {recommendedBook.totalPages} 页，ISBN: {recommendedBook.isbn}。
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="blindbox-buttons"
        style={{
          opacity: phase === 'back' ? 1 : 0,
          transform: phase === 'back' ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.35s ease 0.1s, transform 0.35s ease 0.1s',
          pointerEvents: phase === 'back' ? 'auto' : 'none'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button className="btn btn-like" onClick={handleLike}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartIcon />喜欢
          </span>
        </button>
        <button
          className="btn btn-refresh"
          onClick={handleRefresh}
          disabled={isFlipping}
          style={{ opacity: isFlipping ? 0.5 : 1 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshIcon />换一本
          </span>
        </button>
      </div>
    </div>
  );
};

export default BlindBox;
