import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomManager from './components/RoomManager';
import GameBoard from './components/GameBoard';

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:3001`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setWs(websocket);
        wsRef.current = websocket;
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
        wsRef.current = null;
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleEnterGame = useCallback((
    _roomId: string,
    code: string,
    pId: string,
    pName: string,
    rName: string
  ) => {
    setPlayerId(pId);
    setPlayerName(pName);
    setRoomCode(code);
    setRoomName(rName);
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <RoomManager
              ws={ws}
              onEnterGame={handleEnterGame}
            />
          }
        />
        <Route
          path="/game"
          element={
            <GameBoard
              ws={ws}
              playerId={playerId}
              playerName={playerName}
              roomName={roomName}
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
