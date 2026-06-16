import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import VoteList from './components/VoteList';
import VoteDetail from './components/VoteDetail';
import { Vote } from './types';

function getUserId(): string {
  let uid = localStorage.getItem('vote_user_id');
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem('vote_user_id', uid);
  }
  return uid;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string>(getUserId());
  const socketRef = useRef<Socket | null>(null);

  const fetchVotes = useCallback(async () => {
    try {
      const res = await axios.get<Vote[]>('/api/votes');
      setVotes(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVotes();
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('vote_created', (vote: Vote) => {
      setVotes(prev => [vote, ...prev]);
    });

    socket.on('vote_list_updated', (data: { id: string; total_voters: number }) => {
      setVotes(prev => prev.map(v => v.id === data.id ? { ...v, total_voters: data.total_voters } : v));
    });

    socket.on('vote_deleted', (data: { id: string }) => {
      setVotes(prev => prev.filter(v => v.id !== data.id));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchVotes]);

  const handleSelectVote = (id: string) => {
    setSelectedVoteId(id);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setSelectedVoteId(null);
    setCurrentView('list');
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#3B82F6' }}>加载中...</div>;
  }

  return (
    <div>
      {currentView === 'list' && (
        <VoteList
          votes={votes}
          userId={userIdRef.current}
          onSelectVote={handleSelectVote}
          onRefresh={fetchVotes}
        />
      )}
      {currentView === 'detail' && selectedVoteId && (
        <VoteDetail
          voteId={selectedVoteId}
          userId={userIdRef.current}
          socket={socketRef.current}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
}
