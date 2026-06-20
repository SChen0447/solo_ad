import React, { lazy, Suspense } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const MaterialBoard = lazy(() => import('./pages/MaterialBoard'));

const App: React.FC = () => {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="logo">社区公益协作平台</div>
          <div className="nav-links">
            <NavLink to="/" className="nav-link" end>
              活动看板
            </NavLink>
            <NavLink to="/materials" className="nav-link">
              物资管理
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Suspense fallback={<div className="loading">加载中...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/materials" element={<MaterialBoard />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default App;
