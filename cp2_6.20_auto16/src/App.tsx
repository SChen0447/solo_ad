import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Resource, ResourceType, ExchangeRequest } from './data/resources';
import {
  searchResources,
  addResource,
  toggleFavorite as toggleFav,
  getFavoriteResources,
  createExchangeRequest,
  getExchangeRequests,
  updateExchangeRequest,
  getResourcesAsync,
} from './data/resources';
import ResourceCard from './components/ResourceCard';
import ResourceForm from './components/ResourceForm';

const RESOURCE_TYPES: (ResourceType | null)[] = [null, '笔记', '习题', '课件', '其他'];

interface Notification {
  id: string;
  message: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | null>(null);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteResources, setFavoriteResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exchangeTarget, setExchangeTarget] = useState<Resource | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [exchangeReqs, setExchangeReqs] = useState<ExchangeRequest[]>([]);
  const [showExchangePanel, setShowExchangePanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [acceptAnimId, setAcceptAnimId] = useState<string | null>(null);
  const [rejectAnimId, setRejectAnimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getResourcesAsync(600).then(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [keyword]);

  useEffect(() => {
    const result = searchResources(debouncedKeyword, filterType);
    setFilteredResources(result);
  }, [debouncedKeyword, filterType]);

  const refreshFavorites = useCallback(() => {
    const favs = getFavoriteResources();
    setFavoriteResources(favs);
    const ids = new Set(favs.map((r) => r.id));
    setFavoriteIds(ids);
  }, []);

  const handleToggleFavorite = useCallback(
    (id: string) => {
      toggleFav(id);
      refreshFavorites();
    },
    [refreshFavorites]
  );

  const handleAddResource = useCallback(
    (data: { title: string; type: ResourceType; description: string }) => {
      addResource({ ...data, author: '当前用户' });
      const result = searchResources(debouncedKeyword, filterType);
      setFilteredResources(result);
    },
    [debouncedKeyword, filterType]
  );

  const handleExchange = useCallback((resource: Resource) => {
    setExchangeTarget(resource);
  }, []);

  const confirmExchange = useCallback(() => {
    if (!exchangeTarget) return;
    const req = createExchangeRequest(exchangeTarget.id, '当前用户', exchangeTarget.author);
    setExchangeReqs(getExchangeRequests());
    setNotifications((prev) => [
      ...prev,
      { id: req.id, message: `已向 ${exchangeTarget.author} 发送交换请求：${exchangeTarget.title}`, timestamp: Date.now() },
    ]);
    setExchangeTarget(null);
  }, [exchangeTarget]);

  const handleAccept = useCallback(
    (reqId: string) => {
      updateExchangeRequest(reqId, 'accepted');
      setExchangeReqs(getExchangeRequests());
      setAcceptAnimId(reqId);
      setTimeout(() => setAcceptAnimId(null), 600);
    },
    []
  );

  const handleReject = useCallback(
    (reqId: string) => {
      updateExchangeRequest(reqId, 'rejected');
      setExchangeReqs(getExchangeRequests());
      setRejectAnimId(reqId);
      setTimeout(() => setRejectAnimId(null), 600);
    },
    []
  );

  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app">
      {window.innerWidth < 768 && (
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>
      )}

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <h2 className="sidebar-title">我的收藏</h2>
        {favoriteResources.length === 0 ? (
          <p className="sidebar-empty">暂无收藏</p>
        ) : (
          <ul className="sidebar-list">
            {favoriteResources.map((r) => (
              <li key={r.id} className="sidebar-item">
                <span className="sidebar-item-type" style={{ color: r.type === '笔记' ? '#4299E1' : r.type === '习题' ? '#48BB78' : r.type === '课件' ? '#ED8936' : '#9F7AEA' }}>
                  [{r.type}]
                </span>
                <span className="sidebar-item-title">{r.title}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="divider" />

      <main className="main-content">
        <header className="top-bar">
          <div className="search-area">
            <input
              type="text"
              className="search-input"
              placeholder="搜索资源..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                className="search-clear-btn"
                onClick={() => setKeyword('')}
                title="清除搜索"
              >
                ✕
              </button>
            )}
          </div>
          <div className="filter-area">
            {RESOURCE_TYPES.map((t) => (
              <button
                key={t ?? 'all'}
                className={`filter-btn ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t ?? '全部'}
              </button>
            ))}
          </div>
          <div className="header-actions">
            <button className="action-btn exchange-panel-btn" onClick={() => setShowExchangePanel(!showExchangePanel)}>
              交换请求
            </button>
            <button className="action-btn publish-btn" onClick={() => setShowForm(true)}>
              + 发布资源
            </button>
          </div>
        </header>

        <div className="resource-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton-title" />
                  <div className="skeleton-badge" />
                </div>
                <div className="skeleton-desc">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
                <div className="skeleton-footer">
                  <div className="skeleton-author" />
                  <div className="skeleton-actions">
                    <div className="skeleton-btn small" />
                    <div className="skeleton-btn" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {filteredResources.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isFavorited={favoriteIds.has(r.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onExchange={handleExchange}
                />
              ))}
              {filteredResources.length === 0 && (
                <p className="empty-text">没有找到匹配的资源</p>
              )}
            </>
          )}
        </div>
      </main>

      {showForm && (
        <ResourceForm onSubmit={handleAddResource} onClose={() => setShowForm(false)} />
      )}

      {exchangeTarget && (
        <div className="confirm-overlay" onClick={() => setExchangeTarget(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>确认向 <strong>{exchangeTarget.author}</strong> 发送交换请求？</p>
            <p className="confirm-resource-name">资源：{exchangeTarget.title}</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setExchangeTarget(null)}>取消</button>
              <button className="btn-submit" onClick={confirmExchange}>确认</button>
            </div>
          </div>
        </div>
      )}

      {showExchangePanel && (
        <div className="exchange-panel">
          <div className="exchange-panel-header">
            <h3>交换请求</h3>
            <button className="close-btn" onClick={() => setShowExchangePanel(false)}>✕</button>
          </div>
          <ul className="exchange-list">
            {exchangeReqs.length === 0 && <p className="sidebar-empty">暂无请求</p>}
            {exchangeReqs.map((req) => {
              const res = filteredResources.find((r) => r.id === req.resourceId);
              return (
                <li
                  key={req.id}
                  className={`exchange-item ${acceptAnimId === req.id ? 'accept-anim' : ''} ${rejectAnimId === req.id ? 'reject-anim' : ''}`}
                >
                  <div className="exchange-item-info">
                    <span className="exchange-from">{req.fromUser}</span>
                    <span className="exchange-arrow">→</span>
                    <span className="exchange-to">{req.toUser}</span>
                    <span className="exchange-res">{res?.title ?? '未知资源'}</span>
                  </div>
                  {req.status === 'pending' && req.toUser === '当前用户' ? (
                    <div className="exchange-item-actions">
                      <button className="btn-accept" onClick={() => handleAccept(req.id)}>接受</button>
                      <button className="btn-reject" onClick={() => handleReject(req.id)}>拒绝</button>
                    </div>
                  ) : (
                    <span className={`exchange-status ${req.status}`}>{req.status === 'accepted' ? '已接受' : req.status === 'rejected' ? '已拒绝' : '等待中'}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="notification-area">
        {notifications.map((n) => (
          <div key={n.id} className="notification-item">
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
