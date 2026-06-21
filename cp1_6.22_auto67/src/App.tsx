import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import ParticipantDashboard from './pages/ParticipantDashboard';
import Assignment from './pages/Assignment';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join/:roomCode" element={<JoinRoom />} />
      <Route path="/participant/:id" element={<ParticipantDashboard />} />
      <Route path="/assignment/:id" element={<Assignment />} />
    </Routes>
  );
};

export default App;
