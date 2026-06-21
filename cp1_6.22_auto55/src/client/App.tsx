import React, { useState, useEffect, useCallback } from 'react';
import QRCode from './components/QRCode';
import EventCard from './components/EventCard';

interface Event {
  id: string;
  name: string;
  time: string;
  location: string;
  validUntil: string;
  createdAt: string;
  signInRecords?: SignInRecord[];
  signInTime?: string;
}

interface SignInRecord {
  eventId: string;
  phone: string;
  nickname: string;
  signInTime: string;
}

interface User {
  phone: string;
  nickname: string;
  points: number;
  badges: string[];
}

interface Badge {
  id: string;
  name: string;
  pointsCost: number;
  icon: string;
}

interface LeaderboardItem {
  nickname: string;
  phone: string;
  points: number;
  badgeCount: number;
}

interface Participant {
  nickname: string;
  phone: string;
  signInTime: string;
}

const STORAGE_KEYS = {
  USER: 'signin_user',
  ROUTE: 'signin_route'
};

const App: React.FC = () => {
  const [route, setRoute] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ROUTE) || 'home';
  });
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROUTE, route);
  }, [route]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  const navigate = useCallback((newRoute: string, params: Record<string, string> = {}) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setRoute(newRoute);
      setRouteParams(params);
      setIsTransitioning(false);
    }, 100);
  }, []);

  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a365d 0%, #553c9a 100%);
      color: #fff;
    }

    #root {
      min-height: 100vh;
    }

    .app-container {
      min-height: 100vh;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-enter {
      opacity: 0;
      transform: translateY(10px);
    }

    .page-enter-active {
      opacity: 1;
      transform: translateY(0);
      transition: all 0.2s ease-in-out;
    }

    .glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
    }

    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .nav-btn {
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 14px;
    }

    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .nav-btn:active {
      transform: translateY(1px);
    }

    .nav-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: transparent;
    }

    .card {
      padding: 24px;
      margin-bottom: 20px;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: rgba(255, 255, 255, 0.9);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 15px;
      transition: all 0.2s ease;
    }

    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      background: rgba(255, 255, 255, 0.15);
    }

    .btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      backdrop-filter: blur(10px);
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .btn:active {
      transform: translateY(1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
    }

    .btn-danger {
      background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
    }

    .btn-success {
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .event-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    @media (max-width: 640px) {
      .event-grid {
        grid-template-columns: 1fr;
      }
    }

    .success-animation {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      text-align: center;
      animation: successFadeIn 0.3s ease-out;
    }

    @keyframes successFadeIn {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    .success-check {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(72, 187, 120, 0.5);
    }

    .success-check svg {
      width: 40px;
      height: 40px;
      stroke: #fff;
      stroke-width: 3;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: drawCheck 0.3s ease-out 0.1s forwards;
    }

    @keyframes drawCheck {
      to {
        stroke-dashoffset: 0;
      }
    }

    .success-text {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      animation: slideUp 0.3s ease-out 0.2s both;
    }

    @keyframes slideUp {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(102, 126, 234, 0.3);
      border-radius: 20px;
      font-size: 13px;
    }

    .badge-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .badge-card {
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .badge-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    }

    .badge-card.redeemed {
      opacity: 0.6;
    }

    .badge-icon-large {
      width: 64px;
      height: 64px;
      margin: 0 auto 12px;
      transition: transform 0.6s ease;
      transform-style: preserve-3d;
    }

    .badge-icon-large.flipping {
      animation: flip 0.6s ease-in-out;
    }

    @keyframes flip {
      0% { transform: rotateY(0deg); }
      50% { transform: rotateY(90deg); }
      100% { transform: rotateY(0deg); }
    }

    .badge-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .badge-cost {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 12px;
    }

    .points-display {
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(135deg, #f6e05e 0%, #d69e2e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 8px 0;
    }

    .points-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      height: 300px;
      padding: 20px;
      overflow-x: auto;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
      position: relative;
    }

    .bar {
      width: 50px;
      border-radius: 8px 8px 0 0;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    }

    .bar:hover {
      filter: brightness(1.2);
      transform: scaleY(1.02);
      transform-origin: bottom;
    }

    .bar-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 6px;
      font-size: 13px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10;
    }

    .bar:hover .bar-tooltip {
      opacity: 1;
    }

    .bar-label {
      margin-top: 8px;
      font-size: 12px;
      text-align: center;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bar-rank {
      position: absolute;
      top: -24px;
      font-size: 14px;
      font-weight: 700;
    }

    .rank-1 { color: #f6e05e; }
    .rank-2 { color: #a0aec0; }
    .rank-3 { color: #d69e2e; }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th,
    .table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .table th {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.05);
    }

    .table tr:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .info-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .info-label {
      color: rgba(255, 255, 255, 0.6);
      min-width: 60px;
    }

    .info-value {
      color: rgba(255, 255, 255, 0.9);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }

    .short-link {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      text-align: center;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      z-index: 2000;
      animation: toastIn 0.3s ease-out;
    }

    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    .tab-btn {
      flex: 1;
      min-width: 100px;
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }

    .tab-btn:hover {
      color: #fff;
    }

    .tab-btn.active {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .stat-card {
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1001;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalIn 0.3s ease-out;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: #fff;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="app-container">
        <Nav route={route} navigate={navigate} currentUser={currentUser} setCurrentUser={setCurrentUser} />
        <div className={isTransitioning ? 'page-enter' : 'page-enter-active'}>
          {route === 'home' && <HomePage navigate={navigate} />}
          {route === 'signin' && <SignInPage eventId={routeParams.id} currentUser={currentUser} setCurrentUser={setCurrentUser} navigate={navigate} />}
          {route === 'profile' && <ProfilePage currentUser={currentUser} setCurrentUser={setCurrentUser} navigate={navigate} />}
          {route === 'admin' && <AdminPage navigate={navigate} />}
        </div>
      </div>
    </>
  );
};

const Nav: React.FC<{
  route: string;
  navigate: (r: string) => void;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
}> = ({ route, navigate, currentUser, setCurrentUser }) => {
  const handleLogout = () => {
    setCurrentUser(null);
    navigate('home');
  };

  return (
    <nav className="nav">
      <button className={`nav-btn ${route === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>
        🏠 首页
      </button>
      <button className={`nav-btn ${route === 'profile' ? 'active' : ''}`} onClick={() => navigate('profile')}>
        👤 个人中心
      </button>
      <button className={`nav-btn ${route === 'admin' ? 'active' : ''}`} onClick={() => navigate('admin')}>
        ⚙️ 管理后台
      </button>
      {currentUser && (
        <button className="nav-btn btn-secondary" onClick={handleLogout}>
          退出 ({currentUser.nickname})
        </button>
      )}
    </nav>
  );
};

const HomePage: React.FC<{ navigate: (r: string, p?: Record<string, string>) => void }> = ({ navigate }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    time: '',
    location: '',
    validUntil: ''
  });
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error('加载活动失败', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ name: '', time: '', location: '', validUntil: '' });
        loadEvents();
        setSelectedEvent(data.event);
        setShowQRModal(true);
      }
    } catch (e) {
      console.error('创建活动失败', e);
    }
  };

  const handleShowQR = (event: Event) => {
    setSelectedEvent(event);
    setShowQRModal(true);
  };

  return (
    <div>
      <h1 className="title">🎉 活动签到与积分管理</h1>
      
      <div className="card glass">
        <h2 className="subtitle">创建新活动</h2>
        <form onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label className="form-label">活动名称</label>
            <input
              className="form-input"
              placeholder="请输入活动名称"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">活动时间</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">活动地点</label>
            <input
              className="form-input"
              placeholder="请输入活动地点"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">签到有效期至</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.validUntil}
              onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn">创建活动</button>
        </form>
      </div>

      <div className="card glass">
        <h2 className="subtitle">活动列表</h2>
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>暂无活动，快来创建第一个活动吧！</div>
          </div>
        ) : (
          <div className="event-grid">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onShowQR={() => handleShowQR(event)}
                onSignIn={() => navigate('signin', { id: event.id })}
              />
            ))}
          </div>
        )}
      </div>

      {showQRModal && selectedEvent && (
        <>
          <div className="overlay" onClick={() => setShowQRModal(false)}></div>
          <div className="modal glass card">
            <div className="modal-header">
              <h2 className="subtitle" style={{ marginBottom: 0 }}>{selectedEvent.name} - 签到二维码</h2>
              <button className="close-btn" onClick={() => setShowQRModal(false)}>×</button>
            </div>
            <div className="qr-container">
              <QRCode eventId={selectedEvent.id} />
              <div className="short-link">
                短链接: {window.location.origin}/#/signin/{selectedEvent.id}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#/signin/${selectedEvent.id}`)}
              >
                复制链接
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SignInPage: React.FC<{
  eventId: string;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  navigate: (r: string) => void;
}> = ({ eventId, currentUser, setCurrentUser, navigate }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nickname: currentUser?.nickname || '',
    phone: currentUser?.phone || ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error('加载活动失败', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;

    setSigningIn(true);
    const startTime = Date.now();

    try {
      const res = await fetch(`/api/events/${eventId}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 500 - elapsed);

      setTimeout(() => {
        if (data.success) {
          const user: User = {
            phone: formData.phone,
            nickname: formData.nickname,
            points: data.points,
            badges: []
          };
          setCurrentUser(user);
          setSuccessMessage(data.message);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            navigate('profile');
          }, 1500);
        } else {
          showToast(data.message || '签到失败');
        }
        setSigningIn(false);
      }, delay);
    } catch (e) {
      setSigningIn(false);
      showToast('网络错误，请重试');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!event) {
    return (
      <div className="card glass">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div>活动不存在或已被删除</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="title">📝 活动签到</h1>
      
      <div className="card glass">
        <h2 className="subtitle">{event.name}</h2>
        <div className="info-row">
          <span className="info-label">时间:</span>
          <span className="info-value">{new Date(event.time).toLocaleString('zh-CN')}</span>
        </div>
        <div className="info-row">
          <span className="info-label">地点:</span>
          <span className="info-value">{event.location}</span>
        </div>
        <div className="info-row">
          <span className="info-label">签到截止:</span>
          <span className="info-value">{new Date(event.validUntil).toLocaleString('zh-CN')}</span>
        </div>
      </div>

      <div className="card glass">
        <h2 className="subtitle">填写签到信息</h2>
        <form onSubmit={handleSignIn}>
          <div className="form-group">
            <label className="form-label">昵称</label>
            <input
              className="form-input"
              placeholder="请输入您的昵称"
              value={formData.nickname}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">手机号</label>
            <input
              className="form-input"
              placeholder="请输入您的手机号"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              required
              pattern="[0-9]{11}"
              maxLength={11}
            />
            {currentUser && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                ✓ 系统已识别您的信息，确认无误即可签到
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-success" disabled={signingIn}>
            {signingIn ? '签到中...' : '立即签到'}
          </button>
        </form>
      </div>

      {showSuccess && (
        <>
          <div className="overlay"></div>
          <div className="success-animation">
            <div className="success-check">
              <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="success-text">{successMessage}</div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const ProfilePage: React.FC<{
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  navigate: (r: string) => void;
}> = ({ currentUser, setCurrentUser }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');
  const [flippingBadge, setFlippingBadge] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
    loadBadges();
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      const res = await fetch(`/api/user/${currentUser!.phone}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error('加载用户数据失败', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      if (data.success) {
        setBadges(data.badges);
      }
    } catch (e) {
      console.error('加载奖章失败', e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleRedeem = async (badge: Badge) => {
    if (!currentUser) return;
    if (currentUser.badges.includes(badge.id)) {
      showToast('您已兑换过此奖章');
      return;
    }
    if (currentUser.points < badge.pointsCost) {
      showToast('积分不足');
      return;
    }

    try {
      const res = await fetch(`/api/user/${currentUser.phone}/redeem/${badge.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setFlippingBadge(badge.id);
        setTimeout(() => {
          setFlippingBadge(null);
          setCurrentUser({ ...currentUser, points: data.points, badges: [...currentUser.badges, badge.id] });
          showToast(data.message);
        }, 600);
      } else {
        showToast(data.message);
      }
    } catch (e) {
      showToast('兑换失败，请重试');
    }
  };

  const getBadgeIcon = (iconName: string, size: number = 48) => {
    const icons: Record<string, JSX.Element> = {
      star: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#f6e05e">
          <polygon points="12,2 15,9 22,9.3 17,14.1 18.7,21 12,17.3 5.3,21 7,14.1 2,9.3 9,9" />
        </svg>
      ),
      fire: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fc8181">
          <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.52 1.17-5.06 3.5-7.6C9.83 4.83 12 2 12 2s2.17 2.83 5.5 5.4C19.83 9.94 21 12.48 21 15c0 4.42-4.03 8-9 8zm0-4c1.65 0 3-1.35 3-3 0-1-1-2-2-3 0 1-.5 2-2 2-1.1 0-2-.9-2-2 0 1.5-1 3-3 3 0 2.76 2.24 5 5 5h1z"/>
        </svg>
      ),
      heart: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fc8181">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      crown: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#f6e05e">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
        </svg>
      ),
      diamond: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#667eea">
          <path d="M6 3h12l4 6-10 13L2 9l4-6zm1.41 2L4.53 9h3.38l1.5-4h-2zm3.88 0l-1.5 4h4.42l-1.5-4h-1.42zm5.3 0h-2l1.5 4h3.38l-2.88-4zM18.35 10H5.65l5.65 7.3L18.35 10z"/>
        </svg>
      )
    };
    return icons[iconName] || icons.star;
  };

  if (!currentUser) {
    return (
      <div className="card glass">
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div>请先完成签到活动来注册您的信息</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="title">👤 个人中心</h1>

      <div className="card glass">
        <div className="user-info">
          <div className="user-avatar">{currentUser.nickname[0]}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{currentUser.nickname}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{currentUser.phone}</div>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-card glass">
            <div className="points-display">{currentUser.points}</div>
            <div className="points-label">当前积分</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-value">{events.length}</div>
            <div className="stat-label">参与活动</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-value">{currentUser.badges.length}</div>
            <div className="stat-label">获得奖章</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📋 活动记录
        </button>
        <button
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          🏆 积分商城
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="card glass">
          <h2 className="subtitle">参加过的活动</h2>
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div>还没有参与任何活动</div>
            </div>
          ) : (
            <div className="event-grid">
              {events.map(event => (
                <div
                  key={event.id}
                  className="card glass"
                  style={{
                    background: 'linear-gradient(135deg, rgba(247,250,252,0.15) 0%, rgba(102,126,234,0.25) 100%)',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{event.name}</h3>
                  <div className="info-row">
                    <span className="info-label">时间:</span>
                    <span className="info-value">{new Date(event.time).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">地点:</span>
                    <span className="info-value">{event.location}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">签到:</span>
                    <span className="info-value">{event.signInTime ? new Date(event.signInTime).toLocaleString('zh-CN') : '-'}</span>
                  </div>
                  <span className="badge" style={{ marginTop: 12, display: 'inline-flex' }}>
                    <span>✓</span> +10 积分
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="card glass">
          <h2 className="subtitle">奖章商城</h2>
          <div className="badge-grid">
            {badges.map(badge => {
              const redeemed = currentUser.badges.includes(badge.id);
              const canAfford = currentUser.points >= badge.pointsCost;
              return (
                <div
                  key={badge.id}
                  className={`badge-card glass ${redeemed ? 'redeemed' : ''}`}
                >
                  <div className={`badge-icon-large ${flippingBadge === badge.id ? 'flipping' : ''}`}>
                    {getBadgeIcon(badge.icon, 64)}
                  </div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-cost">{badge.pointsCost} 积分</div>
                  {redeemed ? (
                    <button className="btn btn-secondary" disabled>
                      ✓ 已获得
                    </button>
                  ) : (
                    <button
                      className={`btn ${canAfford ? 'btn-success' : ''}`}
                      disabled={!canAfford}
                      onClick={() => handleRedeem(badge)}
                    >
                      {canAfford ? '立即兑换' : '积分不足'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const AdminPage: React.FC<{ navigate: (r: string, p?: Record<string, string>) => void }> = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadEvents();
    loadLeaderboard();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error('加载活动失败', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/admin/leaderboard');
      const data = await res.json();
      if (data.success) {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1000 - elapsed);
        setTimeout(() => {
          setLeaderboard(data.leaderboard);
          setLeaderboardLoading(false);
        }, delay);
      }
    } catch (e) {
      console.error('加载排行榜失败', e);
      setLeaderboardLoading(false);
    }
  };

  const loadEventDetail = async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedEvent(data.event);
        setParticipants(data.participants);
        setShowEventDetail(true);
      }
    } catch (e) {
      console.error('加载活动详情失败', e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleExportCSV = async (eventId: string) => {
    try {
      window.open(`/api/admin/events/${eventId}/export`, '_blank');
    } catch (e) {
      showToast('导出失败');
    }
  };

  const getBarColor = (index: number) => {
    if (index === 0) return '#f6e05e';
    if (index === 1) return '#a0aec0';
    if (index === 2) return '#d69e2e';
    return '#667eea';
  };

  const maxPoints = leaderboard.length > 0 ? leaderboard[0].points : 1;

  return (
    <div>
      <h1 className="title">⚙️ 管理后台</h1>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📋 活动管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 积分排行榜
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="card glass">
          <h2 className="subtitle">活动列表</h2>
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div>暂无活动</div>
            </div>
          ) : (
            <div className="event-grid">
              {events.map(event => (
                <div key={event.id} className="card glass">
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{event.name}</h3>
                  <div className="info-row">
                    <span className="info-label">时间:</span>
                    <span className="info-value">{new Date(event.time).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">地点:</span>
                    <span className="info-value">{event.location}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">签到人数:</span>
                    <span className="info-value">{event.signInRecords?.length || 0} 人</span>
                  </div>
                  <div className="header-actions" style={{ marginTop: 16 }}>
                    <button className="btn" onClick={() => loadEventDetail(event.id)}>
                      查看详情
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('signin', { id: event.id })}>
                      去签到
                    </button>
                    <button className="btn btn-success" onClick={() => handleExportCSV(event.id)}>
                      导出CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="card glass">
          <h2 className="subtitle">积分排行榜</h2>
          {leaderboardLoading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div>暂无排行数据</div>
            </div>
          ) : (
            <div className="bar-chart">
              {leaderboard.map((item, index) => (
                <div key={item.phone} className="bar-item">
                  <div className={`bar-rank rank-${index + 1}`}>#{index + 1}</div>
                  <div
                    className="bar"
                    style={{
                      height: `${(item.points / maxPoints) * 240 + 20}px`,
                      backgroundColor: getBarColor(index)
                    }}
                  >
                    <div className="bar-tooltip">
                      {item.nickname}: {item.points} 积分
                    </div>
                  </div>
                  <div className="bar-label" title={item.nickname}>
                    {item.nickname}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!leaderboardLoading && leaderboard.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 className="subtitle">详细排名</h3>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>昵称</th>
                      <th>手机号</th>
                      <th>积分</th>
                      <th>奖章数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, index) => (
                      <tr key={item.phone}>
                        <td className={`rank-${index + 1}`} style={{ fontWeight: 600 }}>
                          #{index + 1}
                        </td>
                        <td>{item.nickname}</td>
                        <td>{item.phone}</td>
                        <td style={{ fontWeight: 600 }}>{item.points}</td>
                        <td>{item.badgeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showEventDetail && selectedEvent && (
        <>
          <div className="overlay" onClick={() => setShowEventDetail(false)}></div>
          <div className="modal glass card" style={{ minWidth: '80%' }}>
            <div className="modal-header">
              <h2 className="subtitle" style={{ marginBottom: 0 }}>{selectedEvent.name} - 活动详情</h2>
              <button className="close-btn" onClick={() => setShowEventDetail(false)}>×</button>
            </div>
            
            <div className="stats-row">
              <div className="stat-card glass">
                <div className="stat-value">{participants.length}</div>
                <div className="stat-label">参与人数</div>
              </div>
              <div className="stat-card glass">
                <div className="stat-value">{new Date(selectedEvent.time).toLocaleDateString('zh-CN')}</div>
                <div className="stat-label">活动日期</div>
              </div>
              <div className="stat-card glass">
                <div className="stat-value">{selectedEvent.location}</div>
                <div className="stat-label">活动地点</div>
              </div>
            </div>

            <h3 className="subtitle">签到名单</h3>
            {participants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div>暂无签到记录</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>昵称</th>
                      <th>手机号</th>
                      <th>签到时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={p.phone}>
                        <td>{i + 1}</td>
                        <td>{p.nickname}</td>
                        <td>{p.phone}</td>
                        <td>{new Date(p.signInTime).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn btn-success" onClick={() => handleExportCSV(selectedEvent.id)}>
                📥 导出签到名单 (CSV)
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
