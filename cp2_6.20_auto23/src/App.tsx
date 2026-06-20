import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import ArtistsPage from './pages/ArtistsPage';
import CalendarPage from './pages/CalendarPage';
import ArtistDetailPage from './pages/ArtistDetailPage';
import ReleasesPage from './pages/ReleasesPage';
import { useAppContext } from './context/AppContext';
import { ArtistsGridSkeleton } from './components/Skeleton';

const App: React.FC = () => {
  const { fetchAllData, loading } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/artists/')) return '艺术家详情';
    if (location.pathname === '/calendar') return '演出日历';
    if (location.pathname === '/releases') return '作品发布';
    return '艺术家管理';
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <SearchBar pageTitle={getPageTitle()} />
        </div>
        <div className="content-area">
          {loading ? (
            <ArtistsGridSkeleton />
          ) : (
            <Routes>
              <Route path="/" element={<ArtistsPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/artists/:id" element={<ArtistDetailPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/releases" element={<ReleasesPage />} />
            </Routes>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
