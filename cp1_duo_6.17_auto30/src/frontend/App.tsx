import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Forecast from './pages/Forecast';

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/orders', label: '订单处理', icon: '📦' },
  { path: '/forecast', label: '需求预测', icon: '📈' },
];

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
        <nav style={{
          background: '#0f4c81',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}>
          <div style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            marginRight: 40,
            letterSpacing: 1,
          }}>
            库存订单同步管理
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                color: isActive ? '#f07b3f' : '#fff',
                textDecoration: 'none',
                padding: '16px 20px',
                fontSize: 14,
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '3px solid #f07b3f' : '3px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/forecast" element={<Forecast />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
