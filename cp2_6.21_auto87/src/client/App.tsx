import { useState, useEffect } from 'react';
import type { CurrentUser } from '@/types';
import { api } from '@/client/services/api';
import TaskBoard from '@/client/components/TaskBoard';
import ToolShelf from '@/client/components/ToolShelf';
import GardenRank from '@/client/components/GardenRank';

const LOGIN_USER_NAME = '陈静';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const member = await api.getCurrentUser(LOGIN_USER_NAME);
        if (mounted) {
          setCurrentUser({ id: member.id, name: member.name });
          setUserPoints(member.points);
        }
      } catch {
        if (mounted) {
          setCurrentUser({ id: 'unknown', name: LOGIN_USER_NAME });
        }
      }
    }
    fetchUser();
    const interval = setInterval(async () => {
      try {
        const member = await api.getCurrentUser(LOGIN_USER_NAME);
        if (mounted) setUserPoints(member.points);
      } catch {}
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!currentUser) {
    return (
      <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="empty-state">加载中...</div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7 18.5c1.5-1 2.5-.5 4 0s3 1 4.5 0l1.27 3.5 1.89-.66C16.1 16.17 13.9 10.09 5 8c0 0 4-4 12-4s12 4 12 4c-2.13.53-3.85 1.34-5.32 2.34C22.18 8.94 20 8 17 8z"/>
          </svg>
          <span>社区花园</span>
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-points">{userPoints} 分</span>
            <div className="avatar avatar-sm">{currentUser.name.charAt(0)}</div>
          </div>
        </div>
      </header>

      <main className="main-grid">
        <TaskBoard currentUser={currentUser} />
        <ToolShelf currentUser={currentUser} />
        <GardenRank currentUser={currentUser} />
      </main>

      <footer className="app-footer">社区花园 v1.0</footer>
    </div>
  );
}
