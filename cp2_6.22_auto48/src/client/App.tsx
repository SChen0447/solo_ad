import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import Member from './Member';
import Schedule from './Schedule';
import CoachSchedule from './CoachSchedule';

const API_BASE = '/api';

type Page = 'dashboard' | 'members' | 'schedule' | 'coach';

const navItems: { key: Page; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '📊', label: '仪表盘' },
  { key: 'members', icon: '👥', label: '会员管理' },
  { key: 'schedule', icon: '📅', label: '课程预约' },
  { key: 'coach', icon: '🏋️', label: '教练排班' },
];

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const { signal, ...rest } = options || {};
  const res = await fetch(`${API_BASE}${url}`, { headers: { 'Content-Type': 'application/json' }, signal, ...rest });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export { apiFetch };

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [transitioning, setTransitioning] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
        setMobileOverlay(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigate = useCallback((p: Page) => {
    if (p === currentPage) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentPage(p);
      setTransitioning(false);
    }, 300);
    setPage(p);
    setMobileOverlay(false);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'members': return <Member />;
      case 'schedule': return <Schedule />;
      case 'coach': return <CoachSchedule />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <nav style={{
        width: sidebarCollapsed ? 30 : 220,
        minWidth: sidebarCollapsed ? 30 : 220,
        background: '#0F172A',
        borderRight: '1px solid #1E293B',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: mobileOverlay ? 100 : 10,
        overflow: mobileOverlay ? 'visible' : 'hidden',
      }}>
        {navItems.map(item => {
          const isActive = page === item.key;
          return (
            <div
              key={item.key}
              onClick={() => {
                if (sidebarCollapsed && window.innerWidth < 768) {
                  setMobileOverlay(true);
                }
                navigate(item.key);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 48,
                cursor: 'pointer',
                borderLeft: isActive ? '4px solid #3B82F6' : '4px solid transparent',
                background: isActive ? '#1E293B' : 'transparent',
                transition: 'all 0.2s',
                paddingLeft: sidebarCollapsed ? 5 : 16,
                transform: 'translateX(0)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.background = '#334155';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                }
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && (
                <span style={{ marginLeft: 12, fontSize: 14, color: '#E2E8F0' }}>{item.label}</span>
              )}
            </div>
          );
        })}
        {mobileOverlay && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 30,
              width: 220,
              height: '100vh',
              background: '#0F172A',
              zIndex: 99,
              paddingTop: 8,
            }}
          >
            {navItems.map(item => {
              const isActive = page === item.key;
              return (
                <div
                  key={item.key + '-overlay'}
                  onClick={() => navigate(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 48,
                    cursor: 'pointer',
                    borderLeft: isActive ? '4px solid #3B82F6' : '4px solid transparent',
                    background: isActive ? '#1E293B' : 'transparent',
                    paddingLeft: 16,
                    color: '#E2E8F0',
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ marginLeft: 12 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
        {mobileOverlay && (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }}
            onClick={() => setMobileOverlay(false)}
          />
        )}
      </nav>
      <main style={{
        flex: 1,
        background: '#0F172A',
        overflow: 'auto',
        padding: 24,
        opacity: transitioning ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}>
        {renderPage()}
      </main>
    </div>
  );
}
