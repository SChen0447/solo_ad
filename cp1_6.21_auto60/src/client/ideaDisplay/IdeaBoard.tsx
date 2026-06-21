import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Idea,
  IdeaCategory,
  SubmitScoreDTO,
  SortType,
  CATEGORY_COLORS
} from '../../../shared/types';
import ScoringModal from '../scoring/ScoringModal';

const CURRENT_USER_ID = 'user-1';
const CATEGORIES: IdeaCategory[] = ['产品功能', '营销活动', '效率工具', '社交互动', '其他'];
const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'score', label: '综合评分' },
  { value: 'time', label: '最新提交' },
  { value: 'votes', label: '评分人数' }
];

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function truncateDescription(desc: string, maxChars = 80): string {
  if (desc.length <= maxChars) return desc;
  return desc.slice(0, maxChars) + '...';
}

function getRankBadge(index: number): { color: string; label: string } | null {
  const badges = [
    { color: '#FFD700', label: '🥇' },
    { color: '#C0C0C0', label: '🥈' },
    { color: '#CD7F32', label: '🥉' }
  ];
  return index < 3 ? badges[index] : null;
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function IdeaBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sortType, setSortType] = useState<SortType>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newIdeaForm, setNewIdeaForm] = useState({
    title: '',
    description: '',
    category: '产品功能' as IdeaCategory
  });
  const [animatingIdeas, setAnimatingIdeas] = useState(true);
  const [sortTransition, setSortTransition] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);
  const socketRef = useRef<Socket | null>(null);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ideas?sort=${sortType}&search=${encodeURIComponent(debouncedSearch)}`
      );
      const data: Idea[] = await res.json();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    }
  }, [sortType, debouncedSearch]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('rankingUpdate', (rankedIdeas: Idea[]) => {
      setIdeas((prev) => {
        let result: Idea[];
        if (sortType === 'score' && !debouncedSearch) {
          result = rankedIdeas;
        } else {
          const map = new Map(rankedIdeas.map((i) => [i.id, i]));
          result = prev.map((p) => map.get(p.id) || p);
          result.sort((a, b) => {
            if (a.adopted !== b.adopted) return a.adopted ? -1 : 1;
            switch (sortType) {
              case 'time':
                return b.createdAt - a.createdAt;
              case 'votes':
                return b.scores.length - a.scores.length;
              default:
                return b.overallScore - a.overallScore;
            }
          });
          if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            result = result.filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q)
            );
          }
        }
        return result;
      });
    });

    socket.on('newIdea', ({ ideaId }: { ideaId: string }) => {
      if (!prevIdsRef.current.has(ideaId)) {
        setNotif('🎉 有新的创意点子提交！');
        setTimeout(() => setNotif(null), 3000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sortType, debouncedSearch]);

  useEffect(() => {
    const currentIds = new Set(ideas.map((i) => i.id));
    const hasNew = [...currentIds].some((id) => !prevIdsRef.current.has(id));
    if (hasNew) {
      setAnimatingIdeas(true);
      const timer = setTimeout(() => setAnimatingIdeas(false), 800);
      prevIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }
  }, [ideas]);

  useEffect(() => {
    setSortTransition(true);
    const timer = setTimeout(() => setSortTransition(false), 600);
    return () => clearTimeout(timer);
  }, [sortType]);

  const handleOpenScoring = (idea: Idea) => {
    setSelectedIdea(idea);
    setScoringModalOpen(true);
  };

  const handleSubmitScore = async (scores: SubmitScoreDTO) => {
    if (!selectedIdea) return;
    await fetch(`/api/ideas/${selectedIdea.id}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scores)
    });
  };

  const handleOpenDetail = (idea: Idea) => {
    setDetailIdea(idea);
    setDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setDrawerOpen(false);
    setTimeout(() => setDetailIdea(null), 300);
  };

  const handleAdopt = async () => {
    if (!detailIdea) return;
    const res = await fetch(`/api/ideas/${detailIdea.id}/adopt`, { method: 'POST' });
    const updated: Idea = await res.json();
    setDetailIdea(updated);
  };

  const handleCreateIdea = async () => {
    if (!newIdeaForm.title.trim() || !newIdeaForm.description.trim()) return;
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newIdeaForm, authorId: CURRENT_USER_ID })
    });
    setNewIdeaForm({ title: '', description: '', category: '产品功能' });
    setCreateModalOpen(false);
  };

  const chartData = useMemo(() => {
    if (!detailIdea) return [];
    return detailIdea.scores.map((s, idx) => ({
      name: `第${idx + 1}次`,
      创意性: s.creativity,
      可行性: s.feasibility,
      影响力: s.influence,
      time: getRelativeTime(s.timestamp)
    }));
  }, [detailIdea]);

  const renderCard = (idea: Idea, idx: number) => {
    const isNew = animatingIdeas;
    const badge = getRankBadge(idx);

    return (
      <div
        key={idea.id}
        className={`idea-card ${isNew ? 'card-fade-in' : ''} ${
          sortTransition ? 'card-sort-transition' : ''
        }`}
        style={{ animationDelay: `${(idx % 12) * 50}ms` }}
      >
        {badge && (
          <div
            className="rank-badge medal-blink"
            style={{ background: `linear-gradient(135deg, ${badge.color}, ${badge.color}88)` }}
          >
            {badge.label}
          </div>
        )}

        {idea.adopted && <div className="adopted-badge">✓ 已采纳</div>}

        <div className="card-header">
          <span
            className="category-tag"
            style={{ backgroundColor: CATEGORY_COLORS[idea.category] + '33', color: CATEGORY_COLORS[idea.category], borderColor: CATEGORY_COLORS[idea.category] + '66' }}
          >
            {idea.category}
          </span>
          <span className="card-time">{getRelativeTime(idea.createdAt)}</span>
        </div>

        <h3 className="card-title" onClick={() => handleOpenDetail(idea)}>
          {idea.title}
        </h3>

        <p className="card-desc" onClick={() => handleOpenDetail(idea)}>
          {truncateDescription(idea.description)}
        </p>

        <div className="card-footer">
          <div className="score-info">
            <span className="overall-score">{idea.overallScore.toFixed(1)}</span>
            <span className="vote-count">{idea.scores.length} 人评分</span>
          </div>
          <button
            className="btn btn-small btn-score"
            onClick={() => handleOpenScoring(idea)}
          >
            ✍ 打分
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-logo">
            <span className="logo-icon">💡</span>
            创意点子平台
          </h1>
          <p className="app-subtitle">头脑风暴 · 多维度评估 · 实时排名</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={() => setCreateModalOpen(true)}>
          + 发布创意
        </button>
      </header>

      <div className="toolbar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索标题或描述关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sort-wrapper">
          <span className="sort-label">排序：</span>
          <select
            className="sort-select"
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-bar">
        <span>共 <strong>{ideas.length}</strong> 个创意点子</span>
        <span>已采纳 <strong>{ideas.filter((i) => i.adopted).length}</strong> 个</span>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>暂无创意点子，快来发布第一个吧！</p>
        </div>
      ) : (
        <div className="ideas-grid">{ideas.map(renderCard)}</div>
      )}

      <ScoringModal
        isOpen={scoringModalOpen}
        onClose={() => setScoringModalOpen(false)}
        onSubmit={handleSubmitScore}
        ideaTitle={selectedIdea?.title || ''}
      />

      <div className={`drawer-overlay ${drawerOpen ? 'overlay-visible' : ''}`} onClick={handleCloseDetail} />
      <div className={`detail-drawer ${drawerOpen ? 'drawer-open' : ''}`}>
        {detailIdea && (
          <>
            <div className="drawer-header">
              <h2 className="drawer-title">
                {detailIdea.adopted && <span className="adopted-inline">✓ 已采纳</span>}
                {detailIdea.title}
              </h2>
              <button className="modal-close" onClick={handleCloseDetail}>✕</button>
            </div>

            <div className="drawer-body">
              <div className="detail-section">
                <h4 className="section-title">基本信息</h4>
                <div className="detail-meta">
                  <span
                    className="category-tag"
                    style={{ backgroundColor: CATEGORY_COLORS[detailIdea.category] + '33', color: CATEGORY_COLORS[detailIdea.category], borderColor: CATEGORY_COLORS[detailIdea.category] + '66' }}
                  >
                    {detailIdea.category}
                  </span>
                  <span className="detail-time">
                    提交于 {getRelativeTime(detailIdea.createdAt)}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4 className="section-title">完整描述</h4>
                <p className="detail-description">{detailIdea.description}</p>
              </div>

              <div className="detail-section">
                <h4 className="section-title">
                  综合评分：
                  <span className="detail-score">{detailIdea.overallScore.toFixed(1)}</span>
                  <span className="detail-votes">({detailIdea.scores.length} 人)</span>
                </h4>
              </div>

              <div className="detail-section">
                <h4 className="section-title">历史评分趋势</h4>
                {chartData.length === 0 ? (
                  <p className="empty-chart">暂无评分记录</p>
                ) : (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333355" />
                        <XAxis dataKey="name" stroke="#a0a0c0" fontSize={11} />
                        <YAxis stroke="#a0a0c0" fontSize={11} domain={[0, 10]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2a2a40',
                            border: '1px solid #6c63ff',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          labelStyle={{ color: '#a29bfe' }}
                        />
                        <Legend wrapperStyle={{ color: '#a0a0c0', fontSize: 12 }} />
                        <Line type="monotone" dataKey="创意性" stroke="#6c63ff" strokeWidth={2} dot={{ fill: '#6c63ff', r: 3 }} />
                        <Line type="monotone" dataKey="可行性" stroke="#50C878" strokeWidth={2} dot={{ fill: '#50C878', r: 3 }} />
                        <Line type="monotone" dataKey="影响力" stroke="#FF6B9D" strokeWidth={2} dot={{ fill: '#FF6B9D', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4 className="section-title">评分记录明细</h4>
                <div className="score-records">
                  {detailIdea.scores.length === 0 ? (
                    <p className="empty-chart">暂无评分</p>
                  ) : (
                    detailIdea.scores.map((s, idx) => (
                      <div key={s.id} className="score-record">
                        <span className="record-index">#{idx + 1}</span>
                        <span className="record-time">{getRelativeTime(s.timestamp)}</span>
                        <div className="record-scores">
                          <span className="score-pill" style={{ borderColor: '#6c63ff' }}>创意 {s.creativity}</span>
                          <span className="score-pill" style={{ borderColor: '#50C878' }}>可行 {s.feasibility}</span>
                          <span className="score-pill" style={{ borderColor: '#FF6B9D' }}>影响 {s.influence}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-secondary" onClick={handleCloseDetail}>
                关闭
              </button>
              {detailIdea.authorId === CURRENT_USER_ID && !detailIdea.adopted && (
                <button className="btn btn-primary" onClick={handleAdopt}>
                  🎖 标记为已采纳
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className={`modal-overlay ${createModalOpen ? 'overlay-visible' : ''}`}>
        <div className={`create-modal ${createModalOpen ? 'modal-enter' : ''}`}>
          <div className="modal-header">
            <h2 className="modal-title">发布新创意</h2>
            <button className="modal-close" onClick={() => setCreateModalOpen(false)}>✕</button>
          </div>
          <div className="create-form">
            <div className="form-field">
              <label>标题 <span className="char-count">{newIdeaForm.title.length}/50</span></label>
              <input
                type="text"
                maxLength={50}
                placeholder="用一句话描述你的创意..."
                value={newIdeaForm.title}
                onChange={(e) => setNewIdeaForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>描述 <span className="char-count">{newIdeaForm.description.length}/500</span></label>
              <textarea
                maxLength={500}
                rows={5}
                placeholder="详细说明你的创意，包括背景、方案、预期效果..."
                value={newIdeaForm.description}
                onChange={(e) => setNewIdeaForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>类别</label>
              <select
                value={newIdeaForm.category}
                onChange={(e) => setNewIdeaForm((f) => ({ ...f, category: e.target.value as IdeaCategory }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>取消</button>
            <button
              className="btn btn-primary"
              onClick={handleCreateIdea}
              disabled={!newIdeaForm.title.trim() || !newIdeaForm.description.trim()}
            >
              发布
            </button>
          </div>
        </div>
      </div>

      {notif && <div className="notification-toast">{notif}</div>}
    </div>
  );
}

export default IdeaBoard;
