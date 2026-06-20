import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { VoteCreate } from './components/VoteCreate';
import { VoteDetail } from './components/VoteDetail';
import { VoteList } from './components/VoteList';
import { socketService } from './services/socketService';
import type { Vote } from './types';

interface VoteContextType {
  votes: Vote[];
  setVotes: (votes: Vote[]) => void;
  addVote: (vote: Vote) => void;
  updateVote: (vote: Vote) => void;
  currentVote: Vote | null;
  setCurrentVote: (vote: Vote | null) => void;
}

const VoteContext = createContext<VoteContextType | undefined>(undefined);

export const useVoteContext = () => {
  const context = useContext(VoteContext);
  if (!context) {
    throw new Error('useVoteContext must be used within VoteProvider');
  }
  return context;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentVote, setCurrentVote] = useState<Vote | null>(null);

  const addVote = useCallback((vote: Vote) => {
    setVotes(prev => [...prev, vote]);
  }, []);

  const updateVote = useCallback((vote: Vote) => {
    setVotes(prev => prev.map(v => (v.id === vote.id ? vote : v)));
    setCurrentVote(prev => (prev && prev.id === vote.id ? vote : prev));
  }, []);

  useEffect(() => {
    socketService.connect();

    const handleVoteUpdate = (data: Vote) => {
      updateVote(data);
    };

    socketService.on('update', handleVoteUpdate);

    return () => {
      socketService.off('update', handleVoteUpdate);
      socketService.disconnect();
    };
  }, [updateVote]);

  return (
    <VoteContext.Provider value={{ votes, setVotes, addVote, updateVote, currentVote, setCurrentVote }}>
      <div className="app">
        <header className="app-header">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">✦</span>
            <span className="logo-text">实时匿名投票平台</span>
          </div>
          <nav className="nav">
            <button className="nav-btn" onClick={() => navigate('/')}>
              首页
            </button>
            <button className="nav-btn" onClick={() => navigate('/create')}>
              创建投票
            </button>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<VoteList />} />
            <Route path="/create" element={<VoteCreate />} />
            <Route path="/vote/:id" element={<VoteDetail />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>© 2024 实时匿名投票平台 · 安全 · 匿名 · 实时</p>
        </footer>
      </div>
    </VoteContext.Provider>
  );
};

export default App;
