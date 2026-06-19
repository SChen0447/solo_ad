import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Calendar from './pages/Calendar';
import Releases from './pages/Releases';
import './styles/layout.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/artists" replace />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
