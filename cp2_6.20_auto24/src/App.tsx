import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { resourceStore } from './data/resources';
import type { Resource, ResourceType, Notification, ExchangeRequest, CurrentUser } from './types';
import ResourceCard from './components/ResourceCard';
import ResourceForm from './components/ResourceForm';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import ExchangePanel from './components/ExchangePanel';
import NotificationComponent from './components/Notification';
import './App.css';

const PAGE_SIZE = 10;
const CURRENT_USER: CurrentUser = {
  id: 'user-current',
  name: '当前用户'
};

function Home() {
  const [displayedResources, setDisplayedResources] = useState<Resource[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [favoriteResourceIds, setFavoriteResourceIds] = useState<string[]>([]);
  const [favoriteResources, setFavoriteResources] = useState<Resource[]>([]);
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExchangePanel, setShowExchangePanel] = useState(false);

  const loadResources = useCallback((startIndex: number, keyword: string, filter: ResourceType | 'all', append: boolean) => {
    const result = resourceStore.getFilteredResourcesPaginated(
      startIndex,
      PAGE_SIZE,
      keyword,
      filter
    );
    setDisplayedResources(prev => append ? [...prev, ...result.items] : result.items);
    setTotalCount(result.total);
    setHasMore(result.hasMore);
  }, []);

  useEffect(() => {
    loadResources(0, searchKeyword, typeFilter, false);
  }, [searchKeyword, typeFilter, loadResources]);

  useEffect(() => {
    const ids = resourceStore.getFavoriteResourceIds(CURRENT_USER.id);
    setFavoriteResourceIds(ids);
    setFavoriteResources(resourceStore.getFavoriteResources(CURRENT_USER.id));
  }, []);

  useEffect(() => {
    setExchangeRequests(resourceStore.getExchangeRequestsForUser(CURRENT_USER.id));
  }, []);

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const handleFilter = useCallback((type: ResourceType | 'all') => {
    setTypeFilter(type);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadResources(displayedResources.length, searchKeyword, typeFilter, true);
  }, [displayedResources.length, searchKeyword, typeFilter, loadResources]);

  const handleToggleFavorite = useCallback((resourceId: string) => {
    resourceStore.toggleFavorite(CURRENT_USER.id, resourceId);
    const ids = resourceStore.getFavoriteResourceIds(CURRENT_USER.id);
    setFavoriteResourceIds(ids);
    setFavoriteResources(resourceStore.getFavoriteResources(CURRENT_USER.id));
  }, []);

  const handleExchange = useCallback((resource: Resource) => {
    if (resource.ownerId === CURRENT_USER.id) {
      addNotification('warning', '不能交换自己发布的资源');
      return;
    }
    const request = resourceStore.createExchangeRequest(
      CURRENT_USER.id,
      CURRENT_USER.name,
      resource.ownerId,
      resource.id,
      resource.title
    );
    addNotification('success', `已向 ${resource.ownerName} 发送交换申请`);
    console.log('Exchange request created:', request);
  }, []);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const notif: Notification = {
      id: uuidv4(),
      type,
      message,
      createdAt: new Date()
    };
    setNotifications(prev => [...prev, notif]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 3000);
  }, []);

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handlePublish = useCallback((data: { title: string; type: ResourceType; description: string }) => {
    const newResource = resourceStore.addResource({
      ...data,
      ownerId: CURRENT_USER.id,
      ownerName: CURRENT_USER.name
    });
    setDisplayedResources(prev => [newResource, ...prev].slice(0, PAGE_SIZE));
    setTotalCount(prev => prev + 1);
    setShowForm(false);
    addNotification('success', '资源发布成功');
  }, [addNotification]);

  const handleAcceptExchange = useCallback((requestId: string) => {
    resourceStore.updateExchangeStatus(requestId, 'accepted');
    setExchangeRequests(resourceStore.getExchangeRequestsForUser(CURRENT_USER.id));
    addNotification('success', '已接受交换请求');
  }, [addNotification]);

  const handleRejectExchange = useCallback((requestId: string) => {
    resourceStore.updateExchangeStatus(requestId, 'rejected');
    setExchangeRequests(resourceStore.getExchangeRequestsForUser(CURRENT_USER.id));
    addNotification('info', '已拒绝交换请求');
  }, [addNotification]);

  const handleSidebarResourceClick = useCallback((resourceId: string) => {
    const element = document.getElementById(`resource-${resourceId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const pendingCount = exchangeRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setShowSidebar(!showSidebar)}
          aria-label="菜单"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="mobile-title">学习资源交换</h1>
        <button
          className="exchange-header-btn"
          onClick={() => setShowExchangePanel(true)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
        </button>
      </div>

      <div className="app-layout">
        <Sidebar
          isOpen={showSidebar}
          favoriteResources={favoriteResources}
          onResourceClick={handleSidebarResourceClick}
          onClose={() => setShowSidebar(false)}
        />

        <main className="main-content">
          <div className="content-header">
            <div className="desktop-title">
              <h1>📚 学习资源交换平台</h1>
              <p className="subtitle">发布、搜索、收藏和交换学习资源</p>
            </div>
            <button
              className="exchange-desktop-btn"
              onClick={() => setShowExchangePanel(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              交换管理
              {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </button>
          </div>

          <SearchBar
            onSearch={handleSearch}
            onFilter={handleFilter}
            activeFilter={typeFilter}
            onPublish={() => setShowForm(true)}
          />

          <div className="result-info">
            <span>
              共找到 <strong>{totalCount}</strong> 个资源，当前显示 <strong>{displayedResources.length}</strong> 个
            </span>
          </div>

          {displayedResources.length === 0 ? (
            <div className="empty-resources">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p>暂无符合条件的资源</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                发布第一个资源
              </button>
            </div>
          ) : (
            <>
              <div className="resource-grid">
                {displayedResources.map(resource => (
                  <div key={resource.id} id={`resource-${resource.id}`}>
                    <ResourceCard
                      resource={resource}
                      isFavorite={favoriteResourceIds.includes(resource.id)}
                      onFavorite={handleToggleFavorite}
                      onExchange={handleExchange}
                    />
                  </div>
                ))}
              </div>

              <div className="load-more-container">
                {hasMore ? (
                  <button
                    className="load-more-btn"
                    onClick={handleLoadMore}
                  >
                    加载更多
                  </button>
                ) : (
                  <button
                    className="load-more-btn load-more-disabled"
                    disabled
                  >
                    已加载全部
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {showForm && (
        <ResourceForm
          onSubmit={handlePublish}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showExchangePanel && (
        <ExchangePanel
          requests={exchangeRequests}
          onAccept={handleAcceptExchange}
          onReject={handleRejectExchange}
          onClose={() => setShowExchangePanel(false)}
        />
      )}

      <NotificationComponent
        notifications={notifications}
        onDismiss={handleDismissNotification}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
