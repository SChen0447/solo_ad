import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameStoreProvider, useAppStore } from './store/gameStore';
import BattleEditorPage from './pages/BattleEditorPage';
import ReplayPage from './pages/ReplayPage';
import HistoryPage from './pages/HistoryPage';

function AppRoutes() {
  useAppStore();
  
  return (
    <Routes>
      <Route path="/" element={<BattleEditorPage />} />
      <Route path="/replay" element={<ReplayPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <GameStoreProvider>
        <AppRoutes />
      </GameStoreProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
