import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Result from './components/Result';
import {
  GamePhase,
  PlayerInfo,
  RoomSettings,
  Instruction,
  RankingEntry,
  PlayerState,
  PlayerResult,
} from './types';

const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '';

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [nickname, setNickname] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [settings, setSettings] = useState<RoomSettings>({ round_duration: 5, total_rounds: 10 });
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [prepTime, setPrepTime] = useState(0.5);
  const [roundResults, setRoundResults] = useState<Record<string, PlayerResult>>({});
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [playersState, setPlayersState] = useState<Record<string, PlayerState>>({});
  const [replayId, setReplayId] = useState<string>('');
  const [replayData, setReplayData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('room_joined', (data) => {
      setPlayerId(data.player_id);
      setNickname(data.nickname);
      setIsHost(data.is_host);
      setRoomCode(data.room_code);
      setSettings(data.settings);
      const pMap: Record<string, PlayerInfo> = {};
      for (const [pid, info] of Object.entries(data.players as any)) {
        pMap[pid] = {
          player_id: pid,
          nickname: (info as any).nickname,
          is_host: (info as any).is_host,
          color: (info as any).color || '#888',
        };
      }
      setPlayers(pMap);
    });

    socket.on('player_joined', (data) => {
      const pMap: Record<string, PlayerInfo> = {};
      for (const [pid, info] of Object.entries(data.players as any)) {
        pMap[pid] = {
          player_id: pid,
          nickname: (info as any).nickname,
          is_host: (info as any).is_host,
          color: (info as any).color || '#888',
        };
      }
      setPlayers(pMap);
    });

    socket.on('player_left', (data) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[data.player_id];
        return next;
      });
    });

    socket.on('settings_updated', (data) => {
      setSettings(data as RoomSettings);
    });

    socket.on('game_started', (data) => {
      const pMap: Record<string, PlayerInfo> = {};
      for (const [pid, info] of Object.entries(data.players as any)) {
        pMap[pid] = {
          player_id: pid,
          nickname: (info as any).nickname,
          is_host: pid === Object.keys(data.players)[0],
          color: (info as any).color || '#888',
        };
      }
      setPlayers(pMap);
      setPhase('game');
    });

    socket.on('round_start', (data) => {
      setInstruction(data.instruction as Instruction);
      setCurrentRound(data.round);
      setPrepTime(data.prep_time || 0.5);
      setAnswered(false);
      setRoundResults({});
    });

    socket.on('player_answered', () => {});

    socket.on('round_end', (data) => {
      setRoundResults(data.results || {});
      setRankings(data.rankings || []);
      setPlayersState(data.players_state || {});
    });

    socket.on('game_over', (data) => {
      setRankings(data.rankings || []);
      setPlayersState(data.players_state || {});
      setReplayId(data.replay_id || '');
      setReplayData(data.replay_data || []);
      setPhase('result');
    });

    socket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitJoin = useCallback((room: string, nick: string) => {
    socketRef.current?.emit('join_room', { room_code: room, nickname: nick });
  }, []);

  const emitStart = useCallback(() => {
    socketRef.current?.emit('start_game', { room_code: roomCode });
  }, [roomCode]);

  const emitUpdateSettings = useCallback((newSettings: RoomSettings) => {
    socketRef.current?.emit('update_settings', { room_code: roomCode, ...newSettings });
  }, [roomCode]);

  const emitSubmitAnswer = useCallback((success: boolean, reactionTime: number | null) => {
    if (answered) return;
    setAnswered(true);
    socketRef.current?.emit('submit_answer', {
      room_code: roomCode,
      success,
      reaction_time: reactionTime,
    });
  }, [roomCode, answered]);

  const createRoom = useCallback(async (nick: string, dur: number, rounds: number) => {
    try {
      const resp = await fetch(`${SOCKET_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick, round_duration: dur, total_rounds: rounds }),
      });
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setRoomCode(data.room_code);
      emitJoin(data.room_code, nick);
    } catch {
      setError('无法连接服务器');
      setTimeout(() => setError(''), 3000);
    }
  }, [emitJoin]);

  const joinRoom = useCallback((room: string, nick: string) => {
    emitJoin(room, nick);
  }, [emitJoin]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #0f1a3a 100%)',
      color: '#fff',
      position: 'relative',
    }}>
      {error && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(231,76,60,0.9)', padding: '10px 24px', borderRadius: 8,
          zIndex: 9999, fontSize: 14, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {phase === 'lobby' && (
        <Lobby
          nickname={nickname}
          roomCode={roomCode}
          isHost={isHost}
          players={players}
          settings={settings}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onStart={emitStart}
          onUpdateSettings={emitUpdateSettings}
        />
      )}

      {phase === 'game' && instruction && (
        <Game
          playerId={playerId}
          nickname={nickname}
          instruction={instruction}
          currentRound={currentRound}
          totalRounds={settings.total_rounds}
          prepTime={prepTime}
          rankings={rankings}
          playersState={playersState}
          roundResults={roundResults}
          onSubmitAnswer={emitSubmitAnswer}
        />
      )}

      {phase === 'result' && (
        <Result
          rankings={rankings}
          playersState={playersState}
          replayId={replayId}
          replayData={replayData}
          isHost={isHost}
        />
      )}
    </div>
  );
}
