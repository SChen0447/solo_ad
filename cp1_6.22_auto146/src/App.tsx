import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DeviceManager from './pages/DeviceManager';
import SceneEditor from './pages/SceneEditor';
import { useWebSocket } from './hooks/useWebSocket';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const location = useLocation();
  const { devices, updatedDeviceIds, connected } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

  const onlineCount = devices.filter((d) => d.online).length;
  const onCount = devices.filter((d) => d.status === 'on' || d.status === 'open').length;

  const isDevicePage = location.pathname === '/' || location.pathname === '/devices';
  const isScenePage = location.pathname === '/scenes';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 100,
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          border: '2px dashed rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#6b7280',
            }}
          />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            {connected ? '已连接' : '连接中...'}
          </span>
        </div>
        <div style={{ width: 1, height: 20, background: '#334155' }} />
        <div style={{ fontSize: 13, color: '#e2e8f0' }}>
          设备 <span style={{ color: '#22c55e', fontWeight: 600 }}>{onlineCount}</span>
          <span style={{ color: '#64748b' }}>/{devices.length}</span>
        </div>
        <div style={{ fontSize: 13, color: '#e2e8f0' }}>
          开启 <span style={{ color: '#3b82f6', fontWeight: 600 }}>{onCount}</span>
        </div>
      </div>

      {notifications.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 420,
            width: 'calc(100% - 32px)',
          }}
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              className="slide-down"
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background:
                  n.type === 'success'
                    ? '#065f46'
                    : n.type === 'error'
                    ? '#7f1d1d'
                    : '#1e40af',
                color: '#ffffff',
                fontSize: 14,
                boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
              }}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      <header
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #334155',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🏠</span>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              智能家居管理中心
            </h1>
          </div>

          <nav style={{ display: 'flex', gap: 4 }}>
            <Link
              to="/"
              className="btn-pulse"
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 200ms',
                background: isDevicePage
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'transparent',
                color: isDevicePage ? '#ffffff' : '#94a3b8',
              }}
              onMouseEnter={(e) => {
                if (!isDevicePage) e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                if (!isDevicePage) e.currentTarget.style.color = '#94a3b8';
              }}
            >
              设备管理
            </Link>
            <Link
              to="/scenes"
              className="btn-pulse"
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 200ms',
                background: isScenePage
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'transparent',
                color: isScenePage ? '#ffffff' : '#94a3b8',
              }}
              onMouseEnter={(e) => {
                if (!isScenePage) e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                if (!isScenePage) e.currentTarget.style.color = '#94a3b8';
              }}
            >
              场景编辑
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        <Routes>
          <Route
            path="/"
            element={
              <DeviceManager
                devices={devices}
                updatedDeviceIds={updatedDeviceIds}
                addNotification={addNotification}
              />
            }
          />
          <Route
            path="/devices"
            element={
              <DeviceManager
                devices={devices}
                updatedDeviceIds={updatedDeviceIds}
                addNotification={addNotification}
              />
            }
          />
          <Route
            path="/scenes"
            element={<SceneEditor addNotification={addNotification} />}
        </Routes>
      </main>
    </div>
  );
}

export default App;
