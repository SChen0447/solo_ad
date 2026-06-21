import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, getTeamTotalHp } from '@/store/gameStore';
import { GameBoard } from '@/modules/gameBoard';
import { connectSocket, onBattleUpdate, onBattleEnd, sendCommand, disconnectSocket } from '@/modules/battleClient';
import type { Socket } from 'socket.io-client';
import type { BattleSnapshot, CommandType } from '../../../shared/types';
import { ChevronRight, Crosshair, RotateCcw, Pause } from 'lucide-react';

export default function Battle() {
  const navigate = useNavigate();
  const {
    playerId, roomId, yourTeam, battleSnapshot,
    setBattleSnapshot, setBattleResult, matchStatus,
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameBoardRef = useRef<GameBoard | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (matchStatus !== 'battle') {
      navigate('/');
      return;
    }

    if (!canvasRef.current) return;
    const gb = new GameBoard(canvasRef.current);
    gameBoardRef.current = gb;

    const socket = connectSocket(playerId);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('ready', { roomId });
    });

    onBattleUpdate(socket, (snapshot: BattleSnapshot) => {
      setBattleSnapshot(snapshot);
      gb.render(snapshot, yourTeam);
    });

    onBattleEnd(socket, (data) => {
      setBattleResult(data);
      navigate('/result');
    });

    return () => {
      gb.destroy();
      disconnectSocket(socket);
    };
  }, []);

  const handleCommand = useCallback((type: CommandType) => {
    if (!socketRef.current || !roomId) return;
    sendCommand(socketRef.current, roomId, { type, targetId: selectedTarget || undefined });
  }, [roomId, selectedTarget]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!battleSnapshot || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const enemyTeam = yourTeam === 'red' ? 'blue' : 'red';
    let closest: string | null = null;
    let closestDist = 40;

    for (const ship of battleSnapshot.ships) {
      if (ship.team !== enemyTeam || ship.hp <= 0) continue;
      const dx = ship.x - x;
      const dy = ship.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) {
        closestDist = d;
        closest = ship.id;
      }
    }

    setSelectedTarget(closest);
    if (closest) {
      handleCommand('focus');
    }
  }, [battleSnapshot, yourTeam, handleCommand]);

  const myHp = battleSnapshot ? getTeamTotalHp(battleSnapshot.ships, yourTeam) : { current: 0, max: 1 };
  const enemyTeam = yourTeam === 'red' ? 'blue' : 'red';
  const enemyHp = battleSnapshot ? getTeamTotalHp(battleSnapshot.ships, enemyTeam) : { current: 0, max: 1 };

  const myHpPercent = myHp.max > 0 ? (myHp.current / myHp.max) * 100 : 0;
  const enemyHpPercent = enemyHp.max > 0 ? (enemyHp.current / enemyHp.max) * 100 : 0;

  const timeRemaining = battleSnapshot?.timeRemaining ?? 300;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);

  const commands: { type: CommandType; icon: React.ReactNode; label: string }[] = [
    { type: 'advance', icon: <ChevronRight className="w-5 h-5" />, label: '前进' },
    { type: 'focus', icon: <Crosshair className="w-5 h-5" />, label: '集火' },
    { type: 'retreat', icon: <RotateCcw className="w-5 h-5" />, label: '撤退' },
    { type: 'stop', icon: <Pause className="w-5 h-5" />, label: '停止' },
  ];

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" onClick={handleCanvasClick} />

      <div className="absolute top-4 left-4 z-10 w-64">
        <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>己方舰队</div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${myHpPercent}%`,
              background: myHpPercent > 60 ? '#22c55e' : myHpPercent > 30 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{Math.max(0, myHp.current)} / {myHp.max}</div>
      </div>

      <div className="absolute top-4 right-4 z-10 w-64 text-right">
        <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>敌方舰队</div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ml-auto"
            style={{
              width: `${enemyHpPercent}%`,
              background: '#ff4545',
            }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{Math.max(0, enemyHp.current)} / {enemyHp.max}</div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center">
        <div
          className="text-2xl font-bold text-white tracking-widest"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-3">
        {commands.map((cmd) => (
          <div key={cmd.type} className="group relative">
            <button
              onClick={() => handleCommand(cmd.type)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {cmd.icon}
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 px-2 py-1 rounded">
              {cmd.label}
            </span>
          </div>
        ))}
      </div>

      {selectedTarget && (
        <div className="absolute bottom-6 right-6 z-10 bg-slate-800/80 px-3 py-2 rounded-lg text-sm">
          <span className="text-slate-400">目标: </span>
          <span className="text-[#f97316]">敌方战舰</span>
          <button
            onClick={() => setSelectedTarget(null)}
            className="ml-2 text-slate-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-slate-500">
        点击敌方战舰选择集火目标
      </div>
    </div>
  );
}
