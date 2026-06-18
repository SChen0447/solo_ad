import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../store';

export const Library: React.FC = () => {
  const { reminders, toasts, dismissReminder, removeToast } = useLibraryStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cardFlip, setCardFlip] = useState<{ show: boolean; title: string; dueDate: string }>({
    show: false,
    title: '',
    dueDate: '',
  });

  useEffect(() => {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((data) => useLibraryStore.getState().setReminders(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCardFlip({ show: true, title: detail.title, dueDate: detail.dueDate });
      setTimeout(() => setCardFlip((p) => ({ ...p, show: false })), 2500);
    };
    window.addEventListener('borrow-success', handler);
    return () => window.removeEventListener('borrow-success', handler);
  }, []);

  return (
    <div className="library-root">
      {reminders.length > 0 && (
        <div className="reminder-banner">
          <div className="reminder-content">
            {reminders.map((r) => (
              <span key={r.id} className="reminder-item">
                📖《{r.bookTitle}》应还日期：{new Date(r.dueDate).toLocaleDateString('zh-CN')}，请尽快归还！
                <button className="reminder-close" onClick={() => dismissReminder(r.id)}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <nav className="navbar">
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <span className="navbar-title">智慧图书馆</span>
        </div>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
            图书检索
          </NavLink>
          <NavLink to="/booking" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            预约借书
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            馆内导航
          </NavLink>
        </div>
      </nav>

      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          {sidebarOpen && (
            <div className="sidebar-content">
              <h3 className="sidebar-heading">快捷操作</h3>
              <NavLink to="/" className="sidebar-link" end>🔍 图书搜索</NavLink>
              <NavLink to="/booking" className="sidebar-link">📋 预约借书</NavLink>
              <NavLink to="/map" className="sidebar-link">🗺️ 馆内导航</NavLink>
              <div className="sidebar-divider" />
              <h3 className="sidebar-heading">我的借阅</h3>
              <MyBorrowList />
            </div>
          )}
        </aside>

        <main className="content-area">
          <Outlet />
        </main>
      </div>

      <footer className="footer">
        <span>© 2026 智慧图书馆自助借还书与图书定位导航系统</span>
      </footer>

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>

      {cardFlip.show && (
        <div className="card-flip-overlay">
          <div className="card-flip-inner">
            <div className="card-flip-front">
              <div className="card-flip-icon">📚</div>
              <div className="card-flip-title">借书成功！</div>
              <div className="card-flip-book">{cardFlip.title}</div>
              <div className="card-flip-due">应还日期：{new Date(cardFlip.dueDate).toLocaleDateString('zh-CN')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MyBorrowList: React.FC = () => {
  const [records, setRecords] = useState<Array<{ id: string; bookTitle: string; dueDate: string }>>([]);

  useEffect(() => {
    fetch('/api/borrow-records')
      .then((r) => r.json())
      .then(setRecords)
      .catch(() => {});
  }, []);

  if (records.length === 0) return <div className="sidebar-empty">暂无借阅记录</div>;

  return (
    <div className="sidebar-borrow-list">
      {records.slice(0, 5).map((r) => (
        <div key={r.id} className="sidebar-borrow-item">
          <span className="borrow-item-title">{r.bookTitle}</span>
          <span className="borrow-item-due">还书：{new Date(r.dueDate).toLocaleDateString('zh-CN')}</span>
        </div>
      ))}
    </div>
  );
};
