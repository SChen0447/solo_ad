import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './global.css';
import MeetingRoomPage from './pages/MeetingRoomPage';
import DeviceMonitorPage from './pages/DeviceMonitorPage';

const navItems = [
  { path: '/', label: '会议室预订' },
  { path: '/devices', label: '设备监控' },
];

const Nav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      style={{
        background: '#16213e',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          color: '#4fc3f7',
          fontSize: 18,
          fontWeight: 700,
          marginRight: 40,
          letterSpacing: 1,
        }}
      >
        MeetHub
      </div>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          style={{
            color: location.pathname === item.path ? '#4fc3f7' : 'rgba(255,255,255,0.65)',
            textDecoration: 'none',
            padding: '16px 20px',
            fontSize: 14,
            fontWeight: 500,
            borderBottom: location.pathname === item.path ? '2px solid #4fc3f7' : '2px solid transparent',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1a1a2e',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<MeetingRoomPage />} />
            <Route path="/devices" element={<DeviceMonitorPage />} />
          </Routes>
        </main>
      </div>
      </AntApp>
    </ConfigProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
