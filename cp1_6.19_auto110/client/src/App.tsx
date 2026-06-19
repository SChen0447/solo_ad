import React, { useState, useEffect } from 'react';
import { api } from './api';
import { User, PageType, Trainer } from './types';
import CalendarView from './CalendarView';
import TrainingRecord from './TrainingRecord';
import TrainerSchedule from './TrainerSchedule';
import AdminPanel from './AdminPanel';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('calendar');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, trainersData] = await Promise.all([
          api.getUsers(),
          api.getTrainers(),
        ]);
        setUsers(usersData);
        setTrainers(trainersData);
        if (usersData.length > 0) {
          setCurrentUser(usersData.find(u => u.role === 'member') || usersData[0]);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setMobileMenuOpen(false);
    }
  };

  const getNavItems = () => {
    const items: { key: PageType; label: string; icon: string }[] = [
      { key: 'calendar', label: '预约课程', icon: '📅' },
      { key: 'records', label: '训练记录', icon: '📊' },
    ];
    if (currentUser?.role === 'trainer') {
      items.push({ key: 'trainer', label: '排班管理', icon: '⏰' });
    }
    items.push({ key: 'admin', label: '数据统计', icon: '📈' });
    return items;
  };

  const renderPage = () => {
    if (!currentUser) return null;

    switch (currentPage) {
      case 'calendar':
        return <CalendarView currentUser={currentUser} trainers={trainers} />;
      case 'records':
        return <TrainingRecord currentUser={currentUser} />;
      case 'trainer':
        return currentUser.role === 'trainer' ? (
          <TrainerSchedule currentUser={currentUser} />
        ) : null;
      case 'admin':
        return <AdminPanel />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">💪</span>
            <h1>FitPro 健身房</h1>
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>

          <nav className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <ul className="nav-list">
              {getNavItems().map(item => (
                <li key={item.key}>
                  <button
                    className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(item.key);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="user-selector">
              <label htmlFor="user-select">当前用户：</label>
              <select
                id="user-select"
                value={currentUser?.id || ''}
                onChange={e => handleUserChange(e.target.value)}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'member' ? '会员' : user.role === 'trainer' ? '教练' : '管理员'})
                  </option>
                ))}
              </select>
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>© 2024 FitPro 健身房预约管理平台</p>
      </footer>
    </div>
  );
};

export default App;
