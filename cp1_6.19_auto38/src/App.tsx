import React, { useEffect, useRef } from 'react';
import { Swords, Shield, Zap, RotateCcw, User, Bot } from 'lucide-react';
import { Board } from './Board';
import { MiniCard } from './Card';
import { useGameStore, LogEntry } from './GameState';
import { executeAITurn } from './AIPlayer';

const App: React.FC = () => {
  const logRef = useRef<HTMLDivElement>(null);

  const {
    turn,
    currentPlayer,
    phase,
    cards,
    logs,
    hasMoved,
    hasAttacked,
    winner,
    initializeGame,
    nextTurn,
  } = useGameStore();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (phase === 'ai' && !winner) {
      const timer = setTimeout(() => {
        executeAITurn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, winner]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const playerCards = cards.filter(
    (c) => c.faction === 'player' && c.type !== 'obstacle'
  );
  const enemyCards = cards.filter(
    (c) => c.faction === 'enemy' && c.type !== 'obstacle'
  );

  const canEndTurn = currentPlayer === 'player' && (hasMoved || hasAttacked) && phase !== 'aim';

  const getLogStyle = (log: LogEntry): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 8px',
      marginBottom: '4px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      color: '#bdc3c7',
      lineHeight: '1.4',
    };

    if (log.type === 'damage') {
      return { ...base, backgroundColor: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c' };
    }
    if (log.type === 'death') {
      return {
        ...base,
        backgroundColor: 'rgba(192, 57, 43, 0.3)',
        color: '#c0392b',
        textDecoration: 'line-through',
        animation: 'deathFlash 0.5s ease-out',
      };
    }
    if (log.type === 'turn') {
      return { ...base, backgroundColor: 'rgba(52, 152, 219, 0.2)', color: '#3498db', fontWeight: 'bold' };
    }
    return base;
  };

  return (
    <div className="w-screen h-screen flex bg-gray-900 overflow-hidden">
      <div className="flex-1 relative">
        <Board width={window.innerWidth - 240} height={window.innerHeight} />
      </div>

      <div
        className="w-[240px] flex flex-col text-white p-4 gap-4"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px 0 0 12px',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-1">
            光痕对决
          </h1>
          <div
            className="text-xs px-3 py-1 rounded-full inline-block"
            style={{
              background: currentPlayer === 'player' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(231, 76, 60, 0.3)',
              border: `1px solid ${currentPlayer === 'player' ? '#3498db' : '#e74c3c'}`,
            }}
          >
            第 {turn} 回合
          </div>
        </div>

        <div
          className="flex items-center justify-center gap-2 py-3 rounded-lg"
          style={{
            background:
              currentPlayer === 'player'
                ? 'linear-gradient(135deg, rgba(52, 152, 219, 0.3) 0%, rgba(52, 152, 219, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(231, 76, 60, 0.3) 0%, rgba(231, 76, 60, 0.1) 100%)',
            border: `2px solid ${currentPlayer === 'player' ? '#3498db' : '#e74c3c'}`,
          }}
        >
          {currentPlayer === 'player' ? (
            <User size={20} className="text-blue-400" />
          ) : (
            <Bot size={20} className="text-red-400" />
          )}
          <span className="font-bold">
            {currentPlayer === 'player' ? '玩家回合' : 'AI 回合'}
          </span>
          {phase === 'aim' && (
            <span className="text-xs text-cyan-400 ml-2">瞄准中...</span>
          )}
          {phase === 'ai' && (
            <span className="text-xs text-red-400 ml-2 animate-pulse">思考中...</span>
          )}
        </div>

        <div className="flex gap-2 text-xs">
          <div
            className={`flex-1 text-center py-2 rounded-lg ${
              hasMoved ? 'opacity-50' : ''
            }`}
            style={{
              background: hasMoved ? 'rgba(46, 204, 113, 0.2)' : 'rgba(46, 204, 113, 0.3)',
              border: `1px solid ${hasMoved ? '#27ae60' : '#2ecc71'}`,
            }}
          >
            <Swords size={14} className="inline mr-1" />
            {hasMoved ? '已移动' : '可移动'}
          </div>
          <div
            className={`flex-1 text-center py-2 rounded-lg ${
              hasAttacked ? 'opacity-50' : ''
            }`}
            style={{
              background: hasAttacked ? 'rgba(231, 76, 60, 0.2)' : 'rgba(231, 76, 60, 0.3)',
              border: `1px solid ${hasAttacked ? '#c0392b' : '#e74c3c'}`,
            }}
          >
            <Zap size={14} className="inline mr-1" />
            {hasAttacked ? '已攻击' : '可攻击'}
          </div>
        </div>

        {canEndTurn && (
          <button
            onClick={nextTurn}
            className="w-full py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)',
            }}
          >
            结束回合
          </button>
        )}

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm">
              <Shield size={14} className="text-blue-400" />
              <span className="text-blue-400 font-bold">我方单位</span>
              <span className="text-xs text-gray-500">({playerCards.length})</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {playerCards.map((card) => (
                <MiniCard key={card.id} card={card} />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 text-sm">
              <Shield size={14} className="text-red-400" />
              <span className="text-red-400 font-bold">敌方单位</span>
              <span className="text-xs text-gray-500">({enemyCards.length})</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {enemyCards.map((card) => (
                <MiniCard key={card.id} card={card} />
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2 text-sm flex-shrink-0">
              <RotateCcw size={14} className="text-gray-400" />
              <span className="text-gray-400 font-bold">战斗日志</span>
            </div>
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto pr-1 space-y-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#555 transparent',
              }}
            >
              {logs.map((log) => (
                <div key={log.id} style={getLogStyle(log)}>
                  <span className="text-gray-500 mr-1">[{log.timestamp}]</span>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-gray-500 text-center border-t border-gray-700 pt-2">
          操作提示：点击己方单位选择发射源，拖拽移动卡牌
        </div>
      </div>
    </div>
  );
};

export default App;
