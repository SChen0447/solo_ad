import { useState, useEffect, useCallback, useRef } from 'react';
import ProposalList from './components/ProposalList';
import ScoringPanel from './components/ScoringPanel';
import Leaderboard from './components/Leaderboard';
import type { ProposalListItem, Proposal, LeaderboardItem, Rating } from './types';
import './App.css';

type Page = 'list' | 'detail' | 'leaderboard' | 'submit';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [stats, setStats] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prevRatingIds, setPrevRatingIds] = useState<Set<string>>(new Set());
  const [newRatingId, setNewRatingId] = useState<string | null>(null);
  const newRatingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [submitForm, setSubmitForm] = useState({
    title: '',
    author: '',
    summary: '',
    content: ''
  });

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch('/api/proposals');
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  }, []);

  const fetchProposalDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/proposals/${id}`);
      const data: Proposal = await res.json();
      const newIds = new Set(data.ratings.map(r => r.id));
      const diff = [...newIds].filter(x => !prevRatingIds.has(x));
      if (diff.length > 0) {
        setNewRatingId(diff[0]);
        if (newRatingTimeoutRef.current) {
          clearTimeout(newRatingTimeoutRef.current);
        }
        newRatingTimeoutRef.current = setTimeout(() => {
          setNewRatingId(null);
        }, 400);
      }
      setPrevRatingIds(newIds);
      setCurrentProposal(data);
    } catch (err) {
      console.error('Failed to fetch proposal detail:', err);
    }
  }, [prevRatingIds]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/statistics');
      const data = await res.json();
      setStats(data.distribution);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchProposals(),
      fetchLeaderboard(),
      fetchStats()
    ]);
    setIsLoading(false);
  }, [fetchProposals, fetchLeaderboard, fetchStats]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 2000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (currentPage === 'detail' && selectedId) {
      fetchProposalDetail(selectedId);
      interval = setInterval(() => {
        fetchProposalDetail(selectedId);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentPage, selectedId, fetchProposalDetail]);

  const handleSelectProposal = (id: string) => {
    setSelectedId(id);
    setPrevRatingIds(new Set());
    setCurrentPage('detail');
    setIsMenuOpen(false);
  };

  const handleBack = () => {
    setSelectedId(null);
    setCurrentProposal(null);
    setPrevRatingIds(new Set());
    setCurrentPage('list');
  };

  const handleSubmitRating = async (score: number, comment: string): Promise<void> => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/proposals/${selectedId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment })
      });
      const data: Proposal = await res.json();
      setCurrentProposal(data);
      const ratingsRes = await fetch(`/api/proposals/${selectedId}/ratings`);
      const ratingsData = await ratingsRes.json();
      setCurrentProposal(prev => prev ? {
        ...prev,
        ratings: ratingsData.ratings,
        averageScore: ratingsData.averageScore,
        ratingCount: ratingsData.ratingCount
      } : prev);
      await refreshAll();
    } catch (err) {
      console.error('Failed to submit rating:', err);
      throw err;
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitForm)
      });
      const data = await res.json();
      setSubmitForm({ title: '', author: '', summary: '', content: '' });
      setSelectedId(data.id);
      setPrevRatingIds(new Set());
      setCurrentPage('detail');
      await refreshAll();
    } catch (err) {
      console.error('Failed to submit proposal:', err);
    }
  };

  const handleNavClick = (page: Page) => {
    setCurrentPage(page);
    setSelectedId(null);
    setCurrentProposal(null);
    setPrevRatingIds(new Set());
    setIsMenuOpen(false);
  };

  const renderStars = (score: number, size: number = 16) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={s <= score ? '#f59e0b' : 'none'}
          stroke={s <= score ? '#f59e0b' : '#d1d5db'}
          strokeWidth="2"
          style={{ transition: 'all 0.2s ease' }}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );

  const renderMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return <span style={{ color: '#6b7280', fontWeight: 600 }}>{rank}</span>;
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag key={`list-${elements.length}`}>
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={index}>{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={index}>{line.slice(3)}</h2>);
      } else if (/^\d+\.\s/.test(line)) {
        if (listType !== 'ol') flushList();
        listType = 'ol';
        listItems.push(line.replace(/^\d+\.\s/, ''));
      } else if (line.startsWith('- ')) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        listItems.push(line.slice(2));
      } else if (line.trim() === '') {
        flushList();
      } else {
        flushList();
        elements.push(<p key={index}>{line}</p>);
      }
    });
    flushList();

    return <div className="markdown-content">{elements}</div>;
  };

  const navItems = [
    { key: 'list' as Page, label: '提案列表' },
    { key: 'leaderboard' as Page, label: '排行榜' },
    { key: 'submit' as Page, label: '提交分享' }
  ];

  return (
    <div className="app-container">
      <nav className="navbar">
        <div
          className="navbar-logo"
          onClick={() => handleNavClick('list')}
        >
          TechShare
        </div>
        <div className="navbar-spacer" />
        <div className="navbar-links">
          {navItems.map((item) => (
            <div
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`nav-link ${currentPage === item.key ? 'active' : ''}`}
            >
              {item.label}
            </div>
          ))}
        </div>
        <div
          className={`hamburger ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span />
          <span />
          <span />
        </div>
        <div className={`nav-mobile ${isMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <div
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`nav-mobile-link ${currentPage === item.key ? 'active' : ''}`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </nav>

      <main className="main-content fade-in">
        {currentPage === 'list' && (
          <ProposalList
            proposals={proposals}
            onSelect={handleSelectProposal}
            isLoading={isLoading}
            renderStars={renderStars}
          />
        )}

        {currentPage === 'detail' && currentProposal && (
          <div className="detail-container">
            <button
              onClick={handleBack}
              className="btn-back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              返回列表
            </button>

            <div className="detail-grid">
              <div>
                <div className="card detail-card">
                  <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                    {currentProposal.title}
                  </h1>
                  <div className="detail-meta">
                    <span>作者：{currentProposal.author}</span>
                    <span>提交时间：{currentProposal.createdAt}</span>
                    <div className="detail-score">
                      {renderStars(Math.round(currentProposal.averageScore))}
                      <span style={{ fontWeight: 600, color: '#111827' }}>
                        {currentProposal.averageScore.toFixed(1)}
                      </span>
                      <span style={{ color: '#9ca3af' }}>
                        ({currentProposal.ratingCount} 人评分)
                      </span>
                    </div>
                  </div>

                  <div className="detail-content">
                    {renderMarkdown(currentProposal.content)}
                  </div>
                </div>

                <ScoringPanel onSubmit={handleSubmitRating} />
              </div>

              <div>
                <div className="card comments-card">
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    评论列表 ({currentProposal.ratings.length})
                  </h3>
                  <div className="comments-list">
                    {currentProposal.ratings.length === 0 ? (
                      <p className="comments-empty">
                        暂无评论
                      </p>
                    ) : (
                      currentProposal.ratings.map((rating: Rating, index: number) => (
                        <div
                          key={rating.id}
                          className={`comment-item ${newRatingId === rating.id ? 'new-comment' : ''}`}
                          style={{
                            borderBottom: index < currentProposal.ratings.length - 1 ? '1px solid #f3f4f6' : 'none'
                          }}
                        >
                          <div className="comment-header">
                            {renderStars(rating.score, 14)}
                            <span className="comment-time">
                              {rating.createdAt}
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="comment-text">
                              {rating.comment}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'leaderboard' && (
          <Leaderboard
            leaderboard={leaderboard}
            stats={stats}
            isLoading={isLoading}
            renderStars={renderStars}
            renderMedal={renderMedal}
          />
        )}

        {currentPage === 'submit' && (
          <div className="submit-container">
            <div className="card submit-card">
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
                提交分享提案
              </h1>
              <form onSubmit={handleSubmitProposal}>
                <div className="form-group">
                  <label className="form-label">分享标题</label>
                  <input
                    type="text"
                    value={submitForm.title}
                    onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                    required
                    className="form-input"
                    placeholder="请输入分享标题"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">作者</label>
                  <input
                    type="text"
                    value={submitForm.author}
                    onChange={(e) => setSubmitForm({ ...submitForm, author: e.target.value })}
                    required
                    className="form-input"
                    placeholder="请输入作者姓名"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">简介</label>
                  <textarea
                    value={submitForm.summary}
                    onChange={(e) => setSubmitForm({ ...submitForm, summary: e.target.value })}
                    required
                    rows={3}
                    className="form-textarea"
                    placeholder="请简要描述分享内容（100字以内）"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">分享内容（支持 Markdown）</label>
                  <textarea
                    value={submitForm.content}
                    onChange={(e) => setSubmitForm({ ...submitForm, content: e.target.value })}
                    required
                    rows={10}
                    className="form-textarea"
                    placeholder="# 标题&#10;&#10;## 小标题&#10;&#10;内容..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-block"
                >
                  提交提案
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
