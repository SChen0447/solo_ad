import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import CardList from './components/CardList';
import TagManager from './components/TagManager';
import ExplorePanel from './components/ExplorePanel';
import { getAllCards, addCard, deleteCard, filterByTag } from './services/cardService';
import type { FlashCardData } from './services/cardService';
import './styles/global.css';

const App: React.FC = () => {
  const [cards, setCards] = useState<FlashCardData[]>(() => getAllCards());
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);

  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState<'book' | 'article'>('book');
  const [excerpt, setExcerpt] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const refreshCards = useCallback(() => {
    setCards(getAllCards());
  }, []);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  const filteredCards = activeTag ? filterByTag(cards, activeTag) : cards;

  const handleAddCard = () => {
    if (!source.trim() || !excerpt.trim()) return;

    const newCard = addCard({
      source: source.trim(),
      sourceType,
      excerpt: excerpt.trim(),
      annotation: annotation.trim().slice(0, 100),
      tags: selectedTags.slice(0, 3),
    });

    setCards(getAllCards());
    setNewCardId(newCard.id);
    setSource('');
    setExcerpt('');
    setAnnotation('');
    setSelectedTags([]);

    setTimeout(() => setNewCardId(null), 500);
  };

  const handleDeleteCard = (id: string) => {
    deleteCard(id);
    refreshCards();
  };

  const handleTagSelect = (tag: string | null) => {
    setActiveTag(tag);
  };

  const handleTagFromCard = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">知识碎片</h1>
        <span className="card-count">{cards.length} 条碎片</span>
      </header>

      <div className="add-form">
        <div className="add-form-row">
          <input
            className="add-form-input"
            type="text"
            placeholder="来源（书名 / 文章链接）"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <div className="source-toggle">
            <button
              className={`source-toggle-btn ${sourceType === 'book' ? 'active' : ''}`}
              onClick={() => setSourceType('book')}
            >
              📖 书籍
            </button>
            <button
              className={`source-toggle-btn ${sourceType === 'article' ? 'active' : ''}`}
              onClick={() => setSourceType('article')}
            >
              📄 文章
            </button>
          </div>
        </div>

        <div className="add-form-row">
          <textarea
            className="add-form-textarea"
            placeholder="原文片段..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="add-form-row">
          <input
            className="add-form-input"
            type="text"
            placeholder="个人批注（不超过100字）"
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value.slice(0, 100))}
            maxLength={100}
          />
        </div>

        <div className="add-form-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
            {selectedTags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {tag}
                <span
                  style={{ cursor: 'pointer', opacity: 0.7 }}
                  onClick={() => toggleTag(tag)}
                >
                  ✕
                </span>
              </span>
            ))}
            {selectedTags.length < 3 && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '28px' }}>
                在下方标签区点选（最多3个）
              </span>
            )}
          </div>
          <button
            className="add-btn"
            onClick={handleAddCard}
            disabled={!source.trim() || !excerpt.trim()}
            style={{
              opacity: !source.trim() || !excerpt.trim() ? 0.5 : 1,
            }}
          >
            添加碎片
          </button>
        </div>
      </div>

      <TagManager
        activeTag={activeTag}
        onTagSelect={handleTagSelect}
        onTagsChange={refreshCards}
      />

      <div style={{ marginTop: '20px' }}>
        <CardList
          cards={filteredCards}
          newCardId={newCardId}
          activeTag={activeTag}
          onTagClick={handleTagFromCard}
          onDelete={handleDeleteCard}
        />
      </div>

      <ExplorePanel cards={cards} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
