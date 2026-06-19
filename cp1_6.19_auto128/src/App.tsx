import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import type { User, LocationWithJournal, Photo, TravelLocation, Journal } from './types';
import { login as loginApi, register as registerApi, getLocations, getJournals } from './services/api';
import MapView from './components/MapView';
import Timeline from './components/Timeline';
import JournalEditor from './components/JournalEditor';
import type { LatLngTuple } from 'leaflet';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<LocationWithJournal[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [editingLocation, setEditingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewingJournalLocation, setViewingJournalLocation] = useState<LocationWithJournal | null>(null);
  const [flyingTo, setFlyingTo] = useState<LatLngTuple | null>(null);
  const [lightboxImages, setLightboxImages] = useState<Photo[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('travel_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const loadData = useCallback(async (user: User) => {
    try {
      const [locs, journals] = await Promise.all([
        getLocations(user.id),
        getJournals(user.id),
      ]);
      const merged = locs.map((loc) => {
        const journal = journals.find((j) => j.locationId === loc.id);
        return { ...loc, journal };
      });
      setLocations(merged);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData(currentUser);
    }
  }, [currentUser, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthLoading(true);
    try {
      const user = isRegisterMode
        ? await registerApi(loginForm)
        : await loginApi(loginForm);
      localStorage.setItem('travel_user', JSON.stringify(user));
      setCurrentUser(user);
      setLoginForm({ username: '', password: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      setLoginError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('travel_user');
    setCurrentUser(null);
    setLocations([]);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setEditingLocation({ lat, lng });
  };

  const handleLocationCreated = (newLoc: TravelLocation) => {
    setLocations((prev) => [...prev, { ...newLoc }].sort(
      (a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    ));
    setEditingLocation(null);
  };

  const handleLocationUpdated = (updatedLoc: TravelLocation) => {
    setLocations((prev) => prev.map((l) => (l.id === updatedLoc.id ? { ...l, ...updatedLoc } : l)));
  };

  const handleLocationDeleted = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleJournalSaved = (locId: string, journal: Journal) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === locId ? { ...l, journal } : l))
    );
    setViewingJournalLocation(null);
  };

  const handleTimelineCardClick = (loc: LocationWithJournal) => {
    setFlyingTo([loc.lat, loc.lng]);
    setTimeout(() => setFlyingTo(null), 1500);
  };

  const handleOpenPhotos = (photos: Photo[], startIndex: number) => {
    setLightboxImages(photos);
    setLightboxIndex(startIndex);
  };

  const handleLightboxClose = () => {
    setLightboxImages(null);
  };

  const handleLightboxPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lightboxImages) return;
    setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const handleLightboxNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lightboxImages) return;
    setLightboxIndex((i) => (i + 1) % lightboxImages.length);
  };

  if (!currentUser) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">🌍 旅行足迹</h1>
          <p className="auth-subtitle">记录你的每一段旅程</p>
          {loginError && <div className="auth-error">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="auth-form-group">
              <label className="auth-label">用户名</label>
              <input
                type="text"
                className="auth-input"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="请输入用户名"
                required
              />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">密码</label>
              <input
                type="password"
                className="auth-input"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="请输入密码"
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={authLoading}>
              {authLoading ? '处理中...' : isRegisterMode ? '注 册' : '登 录'}
            </button>
          </form>
          <p className="auth-switch">
            {isRegisterMode ? '已有账号？' : '还没有账号？'}
            <span
              className="auth-switch-link"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginError('');
              }}
            >
              {isRegisterMode ? '去登录' : '去注册'}
            </span>
          </p>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#aaa' }}>
            演示账号: demo / 123456
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header-bar">
        <div className="header-title">🌍 旅行足迹记忆地图</div>
        <div className="header-user">
          <span className="header-username">你好，{currentUser.username}</span>
          <button className="header-logout" onClick={handleLogout}>退出</button>
        </div>
      </div>

      <div className="main-content">
        <div className="map-container">
          <MapView
            locations={locations}
            onMapClick={handleMapClick}
            onViewJournal={(loc) => setViewingJournalLocation(loc)}
            onAddJournal={(loc) => setViewingJournalLocation(loc)}
            flyingTo={flyingTo}
            onLocationDeleted={handleLocationDeleted}
            onLocationUpdated={handleLocationUpdated}
          />
        </div>

        <button
          className={`toggle-sidebar-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? '展开时间线' : '收起时间线'}
        >
          {sidebarCollapsed ? '◀' : '▶'}
        </button>

        <div className={`sidebar-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Timeline
            locations={locations}
            onCardClick={handleTimelineCardClick}
            onViewJournal={(loc) => setViewingJournalLocation(loc)}
          />
        </div>
      </div>

      {editingLocation && (
        <JournalEditor
          mode="create-location"
          userId={currentUser.id}
          latlng={editingLocation}
          onClose={() => setEditingLocation(null)}
          onLocationCreated={handleLocationCreated}
        />
      )}

      {viewingJournalLocation && (
        <JournalEditor
          mode="edit-journal"
          userId={currentUser.id}
          location={viewingJournalLocation}
          journal={viewingJournalLocation.journal}
          onClose={() => setViewingJournalLocation(null)}
          onJournalSaved={(journal) => handleJournalSaved(viewingJournalLocation.id, journal)}
          onOpenPhotos={handleOpenPhotos}
        />
      )}

      {lightboxImages && lightboxImages.length > 0 && (
        <div className="lightbox-overlay" onClick={handleLightboxClose}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={handleLightboxClose}>×</button>
            {lightboxImages.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={handleLightboxPrev}>‹</button>
            )}
            <img
              src={lightboxImages[lightboxIndex].url}
              alt={lightboxImages[lightboxIndex].title}
              loading="lazy"
            />
            {lightboxImages.length > 1 && (
              <button className="lightbox-nav lightbox-next" onClick={handleLightboxNext}>›</button>
            )}
            {lightboxImages[lightboxIndex].title && (
              <div className="lightbox-caption">{lightboxImages[lightboxIndex].title}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
