import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { disconnectSocket } from './socket';

type AppView = 'lobby' | 'game';

function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');

  const handleGameStart = useCallback((rid: string, pid: string) => {
    setRoomId(rid);
    setPlayerId(pid);
    setView('game');
  }, []);

  const handleExit = useCallback(() => {
    disconnectSocket();
    setView('lobby');
    setRoomId('');
    setPlayerId('');
  }, []);

  if (view === 'game' && roomId && playerId) {
    return <GamePage roomId={roomId} playerId={playerId} onExit={handleExit} />;
  }

  return <LobbyPage onGameStart={handleGameStart} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
