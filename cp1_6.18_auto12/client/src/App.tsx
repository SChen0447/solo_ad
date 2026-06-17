import { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import Arena from './components/Arena';
import { CharacterCustomization, PlayerInfo } from './types';
import { defaultCustomization } from './customization';

type GameView = 'lobby' | 'arena';

export default function App() {
  const [view, setView] = useState<GameView>('lobby');
  const [nickname, setNickname] = useState('');
  const [customization, setCustomization] = useState<CharacterCustomization>(defaultCustomization);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const savedNickname = localStorage.getItem('arena_nickname');
    if (savedNickname) {
      setNickname(savedNickname);
    }
  }, []);

  const handleJoinRoom = (rid: string, pid: string, playerList: PlayerInfo[], host: boolean) => {
    setRoomId(rid);
    setPlayerId(pid);
    setPlayers(playerList);
    setIsHost(host);
    setView('arena');
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setPlayerId(null);
    setPlayers([]);
    setIsHost(false);
    setView('lobby');
  };

  const handleReturnToLobby = () => {
    setView('lobby');
  };

  const handleNicknameChange = (name: string) => {
    setNickname(name);
    localStorage.setItem('arena_nickname', name);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {view === 'lobby' ? (
        <Lobby
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          customization={customization}
          onCustomizationChange={setCustomization}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <Arena
          roomId={roomId!}
          playerId={playerId!}
          nickname={nickname}
          customization={customization}
          players={players}
          setPlayers={setPlayers}
          isHost={isHost}
          setIsHost={setIsHost}
          onLeaveRoom={handleLeaveRoom}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </div>
  );
}
