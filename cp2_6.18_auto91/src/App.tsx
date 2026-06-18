import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type { Card, Category } from './types';
import { CATEGORY_CONFIG } from './types';
import SearchFilter from './SearchFilter';
import CardList from './CardList';
import CardDetail from './CardDetail';
import { getCards, createCard } from './services/cardService';
import { getFavorites, addFavorite, removeFavorite } from './services/favoriteService';

function CreateCardModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (card: Card) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('frontend');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setCategory('frontend');
      setContent('');
      setDifficulty(3);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const card = await createCard({ title, category, content, difficulty });
      onCreated(card);
      onClose();
      navigate(`/card/${card.id}`);
    } catch (err) {
      console.error('Failed to create:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24
        }}
      >
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 20
        }}>
          新建知识卡片
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6
            }}>
              标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这张卡片起个标题"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6
              }}>
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  background: '#fff',
                  outline: 'none'
                }}
              >
                <option value="frontend">前端</option>
                <option value="backend">后端</option>
                <option value="tool">工具</option>
                <option value="pitfall">踩坑</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6
              }}>
                难度星级
              </label>
              <div style={{ display: 'flex', gap: 2, padding: '6px 0' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDifficulty(n as 1 | 2 | 3 | 4 | 5)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 22,
                      color: n <= difficulty ? '#f59e0b' : '#d1d5db',
                      padding: 2
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6
            }}>
              正文内容 (Markdown) *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="支持 Markdown 格式，如 **加粗**、`代码`、# 标题 等"
              required
              style={{
                width: '100%',
                minHeight: 200,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                cursor: title.trim() && content.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 600,
                opacity: title.trim() && content.trim() ? 1 : 0.5
              }}
            >
              {submitting ? '创建中...' : '创建卡片'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cardData, favData] = await Promise.all([getCards(), getFavorites()]);
        setCards(cardData);
        setFavoriteIds(favData.map(f => f.cardId));
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleFavorite = async (cardId: string) => {
    if (favoriteIds.includes(cardId)) {
      try {
        await removeFavorite(cardId);
        setFavoriteIds(prev => prev.filter(id => id !== cardId));
      } catch (err) {
        console.error('Failed to remove favorite:', err);
      }
    } else {
      try {
        await addFavorite(cardId);
        setFavoriteIds(prev => [...prev, cardId]);
      } catch (err) {
        console.error('Failed to add favorite:', err);
      }
    }
  };

  const filteredCards = cards.filter(card => {
    if (categories !== 'all' && !categories.includes(card.category)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        card.title.toLowerCase().includes(q) ||
        card.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <SearchFilter
              categories={categories}
              setCategories={(c) => {
                setCategories(c);
                setMobileOpen(false);
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
            />
            {loading ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af'
              }}>
                加载中...
              </div>
            ) : (
              <CardList
                cards={filteredCards}
                favoriteCardIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onCreateCard={() => setCreateOpen(true)}
              />
            )}
            <CreateCardModal
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              onCreated={(card) => setCards(prev => [card, ...prev])}
            />
          </div>
        }
      />
      <Route path="/card/:id" element={<CardDetail />} />
    </Routes>
  );
}
