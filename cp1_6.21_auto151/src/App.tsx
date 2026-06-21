import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PlotPage from './pages/PlotPage';
import Dashboard from './pages/Dashboard';
import ExchangeMarket from './components/ExchangeMarket';
import { useWebSocket } from './hooks/useWebSocket';
import type { User } from './utils/api';
import { api } from './utils/api';

const USERS = [
  { id: 'demo-user-1', username: '小明' },
  { id: 'demo-user-2', username: '小红' },
  { id: 'demo-user-3', username: '小刚' },
];

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { messages, isConnected } = useWebSocket(currentUser?.id || null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const savedUserId = localStorage.getItem('farm_user_id');
    const savedUsername = localStorage.getItem('farm_username');
    
    if (savedUserId && savedUsername) {
      setCurrentUser({ id: savedUserId, username: savedUsername });
    } else {
      setCurrentUser(USERS[0]);
      localStorage.setItem('farm_user_id', USERS[0].id);
      localStorage.setItem('farm_username', USERS[0].username);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setUnreadCount(messages.length);
    }
  }, [messages]);

  const handleUserChange = (userId: string) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('farm_user_id', user.id);
      localStorage.setItem('farm_username', user.username);
      setUnreadCount(0);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🌱 社区农场</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <nav className="nav-tabs">
              <div className="nav-tab-wrapper">
                <NavLink 
                  to="/plots" 
                  className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                >
                  菜地
                </NavLink>
              </div>
              <div className="nav-tab-wrapper">
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                >
                  我的农场
                </NavLink>
              </div>
              <div className="nav-tab-wrapper">
                <NavLink 
                  to="/market" 
                  className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                >
                  交换市场
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </NavLink>
              </div>
            </nav>
            <div className="user-selector">
              <span style={{ fontSize: '0.9rem' }}>👤</span>
              <select 
                value={currentUser?.id || ''}
                onChange={(e) => handleUserChange(e.target.value)}
              >
                {USERS.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/plots" replace />} />
          <Route path="/plots" element={<PlotPage currentUser={currentUser} />} />
          <Route path="/dashboard" element={<Dashboard currentUser={currentUser} />} />
          <Route path="/market" element={<ExchangeMarket currentUser={currentUser} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
