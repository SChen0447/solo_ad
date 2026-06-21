import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';

const SongList = lazy(() => import('./pages/SongList'));
const SongDetail = lazy(() => import('./pages/SongDetail'));
const PlaylistList = lazy(() => import('./pages/PlaylistList'));
const PlaylistCreate = lazy(() => import('./pages/PlaylistCreate'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));

function PageFade({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-fade-in">
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#667eea' }}>
      <div className="spinner" />
    </div>
  );
}

function Navbar() {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-logo">🎵 MusicVault</div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          歌曲
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          歌单
        </NavLink>
        <NavLink to="/playlists/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          创建歌单
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Suspense fallback={<Loading />}>
          <PageFade>
            <Routes>
              <Route path="/" element={<SongList />} />
              <Route path="/songs/:id" element={<SongDetail />} />
              <Route path="/playlists" element={<PlaylistList />} />
              <Route path="/playlists/new" element={<PlaylistCreate />} />
              <Route path="/playlists/:id" element={<PlaylistDetail />} />
            </Routes>
          </PageFade>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
