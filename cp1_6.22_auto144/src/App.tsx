import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ApplicationForm from './components/ApplicationForm';
import PortfolioViewer from './components/PortfolioViewer';
import AdminPanel from './components/AdminPanel';
import RecruitmentList from './components/RecruitmentList';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <div className="page-transition">
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recruitment" element={<RecruitmentList />} />
            <Route path="/apply/:id" element={<ApplicationForm />} />
            <Route path="/portfolios" element={<PortfolioViewer />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
