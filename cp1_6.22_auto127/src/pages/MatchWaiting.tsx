import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { connectSocket, joinQueue, leaveQueue, onMatchFound, onBattleStart, disconnectSocket } from '@/modules/battleClient';
import { MatchingUI } from '@/modules/matchingUI';
import type { Socket } from 'socket.io-client';

export default function MatchWaiting() {
  const navigate = useNavigate();
  const {
    playerId, fleetId, fleetPower, fleetShips,
    setMatchStatus, setRoomId, setYourTeam, setBattleSnapshot,
    waitStartTime, matchStatus,
  } = useGameStore();
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matchingUIRef = useRef<MatchingUI | null>(null);

  useEffect(() => {
    if (matchStatus !== 'searching') {
      navigate('/');
      return;
    }

    const socket = connectSocket(playerId);
    setSocketRef(socket);

    socket.on('connect', () => {
      joinQueue(socket, {
        playerId,
        fleetId,
        power: fleetPower,
        ships: fleetShips,
      });
    });

    onMatchFound(socket, (data) => {
      setMatchStatus('found');
      setRoomId(data.roomId);
    });

    onBattleStart(socket, (data) => {
      setYourTeam(data.yourTeam);
      setBattleSnapshot({
        ships: data.ships,
        projectiles: [],
        events: [],
        timeRemaining: 300,
      });
      setMatchStatus('battle');
      navigate('/battle');
    });

    return () => {
      leaveQueue(socket, playerId);
      disconnectSocket(socket);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const mui = new MatchingUI(canvasRef.current);
    matchingUIRef.current = mui;
    mui.start();
    return () => mui.stop();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - waitStartTime) / 1000);
      setWaitSeconds(elapsed);
      matchingUIRef.current?.setWaitTime(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [waitStartTime]);

  const handleCancel = () => {
    if (socketRef) {
      leaveQueue(socketRef, playerId);
      disconnectSocket(socketRef);
    }
    setMatchStatus('idle');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        {matchStatus === 'found' && (
          <div className="text-xl font-bold text-[#22c55e] animate-pulse" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            匹配成功！准备进入战斗...
          </div>
        )}
        <div className="text-slate-400 text-sm">
          队列等待中 · {waitSeconds}秒
        </div>
        <button
          onClick={handleCancel}
          disabled={matchStatus === 'found'}
          className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30"
        >
          取消匹配
        </button>
      </div>
    </div>
  );
}
