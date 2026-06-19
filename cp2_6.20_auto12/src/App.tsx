import React, { useState, useEffect, useCallback } from 'react';
import RoomManager from './components/RoomManager';
import GameBoard from './components/GameBoard';

interface GameSession {
  roomId: string;
  playerId: string;
  players: { id: string; name: string }[];
}

const WS_URL = 'ws://localhost:3001';

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      setConnected(true);
      setWs(socket);
    };

    socket.onclose = () => {
      setConnected(false);
      setWs(null);
    };

    socket.onerror = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleGameStart = useCallback((roomId: string, playerId: string, players: { id: string; name: string }[]) => {
    setGameSession({ roomId, playerId, players });
  }, []);

  if (!connected) {
    return (
      <div style={styles.connecting}>
        <div style={styles.connectingDot}>●</div>
        <div>连接服务器中...</div>
        <div style={styles.connectingHint}>请确保WebSocket服务器已在端口3001上运行</div>
      </div>
    );
  }

  if (gameSession) {
    return <GameBoard ws={ws} roomId={gameSession.roomId} playerId={gameSession.playerId} players={gameSession.players} />;
  }

  return <RoomManager ws={ws} onGameStart={handleGameStart} />;
};

const styles: Record<string, React.CSSProperties> = {
  connecting: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#888',
    fontSize: 18,
    gap: 12,
  },
  connectingDot: {
    fontSize: 32,
    color: '#ffd700',
    animation: 'pulse 1.2s infinite',
  },
  connectingHint: {
    fontSize: 13,
    color: '#555',
  },
};

export default App;
