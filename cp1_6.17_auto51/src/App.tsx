import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import VoteCreator from './components/VoteCreator';
import VotePage from './components/VotePage';
import History from './pages/History';
import Admin from './pages/Admin';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<VoteCreator />} />
      <Route path="/vote/:id" element={<VotePage />} />
      <Route path="/history" element={<History />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
