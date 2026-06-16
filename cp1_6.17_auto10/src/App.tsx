import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import { Deck, Card, AppState, ReviewHistory } from './types';
import { loadState, saveState, createNewDeck } from './utils/storage';
import { getDueCards } from './utils/sm2';
import DeckManager from './components/DeckManager';
import ReviewSession from './components/ReviewSession';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function simpleMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(?:<li>.*<\/li>\n?)+/g, (match) => {
    if (/<ul>/.test(match)) return match;
    return `<ol>${match}</ol>`;
  });
  html = html.replace(/^---$/gm, '<hr />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^(.+)$/gm, (m, line) => {
    if (/^<\/?(h\d|ul|ol|li|blockquote|pre|hr|p|a|code|strong|em)/.test(line)) return line;
    if (line.trim() === '') return line;
    return `<p>${line}</p>`;
  });
  return html;
}

export { simpleMarkdown };

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { decks, reviewHistory } = appState;

  const debouncedSave = useMemo(
    () =>
      debounce((state: AppState) => {
        saveState(state);
      }, 200),
    []
  );

  useEffect(() => {
    debouncedSave(appState);
  }, [appState, debouncedSave]);

  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  const updateDecks = useCallback((updater: (decks: Deck[]) => Deck[]) => {
    setAppState((prev) => ({ ...prev, decks: updater(prev.decks) }));
  }, []);

  const addReviewRecord = useCallback((record: ReviewHistory) => {
    setAppState((prev) => ({
      ...prev,
      reviewHistory: [...prev.reviewHistory, record],
    }));
  }, []);

  const updateCardInDeck = useCallback(
    (deckId: string, cardId: string, updater: (card: Card) => Card) => {
      updateDecks((decks) =>
        decks.map((d) =>
          d.id === deckId
            ? {
                ...d,
                cards: d.cards.map((c) =>
                  c.id === cardId ? updater(c) : c
                ),
              }
            : d
        )
      );
    },
    [updateDecks]
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    let totalDue = 0;
    let totalCards = 0;
    let masteredCount = 0;

    for (const deck of decks) {
      for (const card of deck.cards) {
        totalCards++;
        if (card.nextReviewDate <= now) totalDue++;
        if (card.interval >= 21) masteredCount++;
      }
    }

    const reviewedToday = reviewHistory.filter(
      (r) => r.reviewedAt >= todayStart
    ).length;

    const masteryRate = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;

    return {
      totalDue,
      reviewedToday,
      masteryRate,
      totalCards,
      masteredCount,
      totalDecks: decks.length,
    };
  }, [decks, reviewHistory]);

  const dueCountsByDeck = useMemo(() => {
    const now = Date.now();
    const map: Record<string, number> = {};
    for (const deck of decks) {
      map[deck.id] = deck.cards.filter((c) => c.nextReviewDate <= now).length;
    }
    return map;
  }, [decks]);

  const handleCreateDeck = useCallback(
    (name: string, description: string) => {
      const newDeck = createNewDeck(name, description);
      updateDecks((prev) => [...prev, newDeck]);
    },
    [updateDecks]
  );

  const handleUpdateDeck = useCallback(
    (deckId: string, name: string, description: string) => {
      updateDecks((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, name, description } : d
        )
      );
    },
    [updateDecks]
  );

  const handleDeleteDeck = useCallback(
    (deckId: string) => {
      updateDecks((prev) => prev.filter((d) => d.id !== deckId));
      setAppState((prev) => ({
        ...prev,
        reviewHistory: prev.reviewHistory.filter((r) => r.deckId !== deckId),
      }));
    },
    [updateDecks]
  );

  const handleAddCard = useCallback(
    (deckId: string, front: string, back: string) => {
      updateDecks((prev) =>
        prev.map((d) => {
          if (d.id !== deckId) return d;
          const newCard: Card = {
            id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            front,
            back,
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: Date.now(),
            createdAt: Date.now(),
          };
          return { ...d, cards: [...d.cards, newCard] };
        })
      );
    },
    [updateDecks]
  );

  const handleDeleteCard = useCallback(
    (deckId: string, cardId: string) => {
      updateDecks((prev) =>
        prev.map((d) =>
          d.id === deckId
            ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
            : d
        )
      );
      setAppState((prev) => ({
        ...prev,
        reviewHistory: prev.reviewHistory.filter((r) => r.cardId !== cardId),
      }));
    },
    [updateDecks]
  );

  const handleStartReview = (deckId: string) => {
    navigate(`/review/${deckId}`);
    setSidebarOpen(false);
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return '统计仪表盘';
    if (location.pathname.startsWith('/deck/')) return '牌组详情';
    if (location.pathname.startsWith('/review/')) return '复习会话';
    return '闪卡复习';
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">📚</div>
          <div className="sidebar-title">闪卡复习</div>
        </div>
        <nav className="sidebar-nav">
          <div
            className={`sidebar-nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => {
              navigate('/');
              setSidebarOpen(false);
            }}
          >
            <span>📊</span>
            <span>仪表盘</span>
          </div>

          <div className="sidebar-section-title">牌组</div>
          {decks.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              暂无牌组，点击右上角按钮创建
            </div>
          )}
          {decks.map((deck) => (
            <div
              key={deck.id}
              className={`sidebar-nav-item ${location.pathname === `/deck/${deck.id}` ? 'active' : ''}`}
              onClick={() => {
                navigate(`/deck/${deck.id}`);
                setSidebarOpen(false);
              }}
            >
              <span>📁</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deck.name}
              </span>
              {dueCountsByDeck[deck.id] > 0 && (
                <span className="badge">{dueCountsByDeck[deck.id]}</span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div
        className={`backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="菜单"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="topbar-title">{getPageTitle()}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
            ＋ 新建牌组
          </button>
        </div>

        <div className="page-content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  stats={stats}
                  decks={decks}
                  dueCountsByDeck={dueCountsByDeck}
                  onCreateDeck={handleCreateDeck}
                  onStartReview={handleStartReview}
                />
              }
            />
            <Route
              path="/deck/:deckId"
              element={
                <DeckManager
                  decks={decks}
                  onCreateDeck={handleCreateDeck}
                  onUpdateDeck={handleUpdateDeck}
                  onDeleteDeck={handleDeleteDeck}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onStartReview={handleStartReview}
                />
              }
            />
            <Route
              path="/review/:deckId"
              element={
                <ReviewSession
                  decks={decks}
                  onUpdateCard={updateCardInDeck}
                  onAddReviewRecord={addReviewRecord}
                  onNavigateBack={() => navigate(-1)}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  stats,
  decks,
  dueCountsByDeck,
  onCreateDeck,
  onStartReview,
}: {
  stats: {
    totalDue: number;
    reviewedToday: number;
    masteryRate: number;
    totalCards: number;
    masteredCount: number;
    totalDecks: number;
  };
  decks: Deck[];
  dueCountsByDeck: Record<string, number>;
  onCreateDeck: (name: string, desc: string) => void;
  onStartReview: (deckId: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [progressAnimated, setProgressAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProgressAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const dueToday = stats.totalDue;
  const reviewedPct =
    dueToday + stats.reviewedToday > 0
      ? (stats.reviewedToday / Math.max(1, dueToday + stats.reviewedToday)) * 100
      : 0;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreateDeck(name.trim(), description.trim());
    setName('');
    setDescription('');
    setShowCreate(false);
  };

  const DonutChart = () => {
    const masteredPct = progressAnimated ? stats.masteryRate : 0;
    const learningPct = progressAnimated ? (stats.totalCards > 0 ? ((stats.totalCards - stats.masteredCount) / stats.totalCards) * 100 : 0) : 0;
    const radius = 80;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const masteredOffset = circumference - (masteredPct / 100) * circumference;
    const learningOffset = circumference - (learningPct / 100) * circumference;

    return (
      <div className="donut-chart-wrapper">
        <div className="donut-chart">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="gradMastered" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="gradLearning" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#gradMastered)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={masteredOffset}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#gradLearning)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={learningOffset}
              strokeLinecap="round"
              transform={`rotate(-90 100 100) translate(0 ${strokeWidth + 4})`}
              style={{ transition: 'stroke-dashoffset 1.2s ease-out', opacity: 0.0 }}
            />
          </svg>
          <div className="donut-center">
            <div className="donut-center-value">{stats.masteryRate.toFixed(0)}%</div>
            <div className="donut-center-label">掌握率</div>
          </div>
        </div>
        <div className="donut-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} />
            已掌握 {stats.masteredCount}
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }} />
            学习中 {stats.totalCards - stats.masteredCount}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">今日待复习</span>
            <span className="stat-icon blue">📝</span>
          </div>
          <div className="stat-value">{stats.totalDue}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: progressAnimated ? `${Math.min(100, reviewedPct)}%` : '0%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              }}
            />
          </div>
          <div className="stats-row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <span>已复习 {stats.reviewedToday}</span>
            <span>剩余 {Math.max(0, stats.totalDue - stats.reviewedToday)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">总卡片数</span>
            <span className="stat-icon purple">🃏</span>
          </div>
          <div className="stat-value">{stats.totalCards}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: progressAnimated ? `${stats.masteryRate}%` : '0%',
                background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              }}
            />
          </div>
          <div className="stats-row" style={{ marginTop: 10 }}>
            <span>分布于 {stats.totalDecks} 个牌组</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">掌握进度</span>
            <span className="stat-icon green">🎯</span>
          </div>
          <div className="stat-value">
            {stats.masteryRate.toFixed(1)}
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              %
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: progressAnimated ? `${stats.masteryRate}%` : '0%',
              }}
            />
          </div>
          <div className="stats-row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <span>已掌握 {stats.masteredCount}</span>
            <span>学习中 {stats.totalCards - stats.masteredCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">今日复习</span>
            <span className="stat-icon orange">✅</span>
          </div>
          <div className="stat-value">{stats.reviewedToday}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: progressAnimated ? `${Math.min(100, reviewedPct)}%` : '0%',
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
              }}
            />
          </div>
          <div className="stats-row" style={{ marginTop: 10 }}>
            <span>完成度 {reviewedPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <div className="chart-title">📈 掌握度分布</div>
          <DonutChart />
        </div>

        <div className="chart-card">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ fontSize: 16 }}>📁 牌组概览</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              ＋ 新建牌组
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <div className="empty-title">还没有牌组</div>
              <div className="empty-desc">创建第一个牌组，开始你的知识复习之旅</div>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                ＋ 创建牌组
              </button>
            </div>
          ) : (
            <div className="decks-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {decks.map((deck) => {
                const dueCount = dueCountsByDeck[deck.id] || 0;
                return (
                  <div
                    key={deck.id}
                    className="deck-card"
                    onClick={() => onStartReview(deck.id)}
                  >
                    <div className="deck-card-header">
                      <div>
                        <div className="deck-card-title">{deck.name}</div>
                      </div>
                    </div>
                    <div className="deck-card-desc">
                      {deck.description || '暂无描述'}
                    </div>
                    <div className="deck-card-meta">
                      <div className="deck-card-meta-item">
                        🃏 {deck.cards.length} 张
                      </div>
                      {dueCount > 0 && (
                        <div className="deck-card-meta-item" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                          ⏰ {dueCount} 待复习
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">新建牌组</div>
              <button className="icon-btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">牌组名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：英语词汇、React 基础"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述（可选）</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 80 }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述这个牌组的用途"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!name.trim()}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
