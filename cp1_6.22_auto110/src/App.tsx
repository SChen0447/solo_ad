import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

const Room = lazy(() => import('./pages/Room'));
const CreateTeam = lazy(() => import('./pages/CreateTeam'));

const App: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="skeleton-pulse" style={{ height: '60px', width: '100%', marginBottom: '24px' }}></div>
        <div className="skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card skeleton-pulse"></div>
          ))}
        </div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateTeam />} />
        <Route path="/room/:id" element={<Room />} />
      </Routes>
    </Suspense>
  );
};

export default App;
