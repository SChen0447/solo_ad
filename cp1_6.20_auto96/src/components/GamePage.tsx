import React, { useEffect, useState, useRef, useCallback } from 'react';
import Board from './Board';
import CardHand from './CardHand';
import ScoreBoard from './ScoreBoard';
import VictoryModal from './VictoryModal';
import { gameEngine } from '../game/GameEngine';
import { getSocket, disconnectSocket, JoinResult } from '../api/gameApi';
import { Socket } from 'socket.io-client';

export interface GamePageProps {
  joinResult: JoinResult;
  onExit: () => void;
}

const GamePage: React.FC<GamePageProps> = ({ joinResult, onExit }) => {
  const [, forceUpdate] = useState(0);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [flyingCard, setFlyingCard] = useState<any>(null);
  const [showVictory, setShowVictory] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    disconnectSocket();
    gameEngine.reset();
    onExit();
  }, [onExit]);

  useEffect(() => {
    gameEngine.setLocalPlayerId(joinResult.playerId);

    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      if (!joinedRef.current) {
        joinedRef.current = true;
        socket.emit('connect_player', {
          roomId: joinResult.roomId,
          playerId: joinResult.playerId,
          playerName: joinResult.playerName,
          color: joinResult.color,
        });
        setTimeout(() => {
          socket.emit('request_hand', {
            roomId: joinResult.roomId,
            playerId: joinResult.playerId,
          });
        }, 200);
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();

    socket.on('room_state', (data: any) => {
      gameEngine.syncFromServer({
        status: data.status,
        turn: data.turn,
        currentTurnIndex: data.currentTurnIndex,
        turnOrder: data.turnOrder,
        players: data.players,
        board: data.board,
        winner: data.winner,
      });
      socket.emit('request_hand', {
        roomId: joinResult.roomId,
        playerId: joinResult.playerId,
      });
      const me = data.players?.find((p: any) => p.id === joinResult.playerId);
      if (me) setReady(me.ready);
      forceUpdate((v) => v + 1);
    });

    socket.on('hand_update', (data: any) => {
      gameEngine.updateLocalHand(data.hand || []);
    });

    socket.on('card_played', (data: any) => {
      if (data.target) {
        gameEngine.setLastAction(data.cardType, data.target, data.playerId);
      }
    });

    socket.on('turn_changed', (data: any) => {
      setMessage(`回合更新：第 ${data.turn} 回合`);
      setTimeout(() => setMessage(''), 1500);
    });

    socket.on('game_started', () => {
      setMessage('🎮 游戏开始！');
      setTimeout(() => setMessage(''), 2000);
    });

    socket.on('victory', () => {
      setTimeout(() => setShowVictory(true), 500);
    });

    socket.on('action_error', (data: any) => {
      setMessage('❌ ' + (data.message || '操作失败'));
      setTimeout(() => setMessage(''), 2000);
    });

    socket.on('error', (data: any) => {
      setMessage('⚠️ ' + (data.message || '错误'));
    });

    socket.on('disconnect', () => {
      setMessage('连接断开');
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('room_state');
      socket.off('hand_update');
      socket.off('card_played');
      socket.off('turn_changed');
      socket.off('game_started');
      socket.off('victory');
      socket.off('action_error');
      socket.off('error');
      socket.off('disconnect');
    };
  }, [joinResult.roomId, joinResult.playerId, joinResult.playerName, joinResult.color]);

  const toggleReady = () => {
    socketRef.current?.emit('toggle_ready', {
      roomId: joinResult.roomId,
      playerId: joinResult.playerId,
    });
  };

  const endTurn = () => {
    if (!gameEngine.isMyTurn()) return;
    gameEngine.clearSelection();
    socketRef.current?.emit('end_turn', {
      roomId: joinResult.roomId,
      playerId: joinResult.playerId,
    });
  };

  const playCardToTarget = (target: { q: number; r: number; fromQ?: number; fromR?: number }) => {
    const card = gameEngine.getSelectedCard();
    if (!card) return;
    const container = document.querySelector('.board-container svg');
    if (container) {
      const rect = container.getBoundingClientRect();
      const handEl = document.querySelector('[data-card-hand]') as HTMLElement;
      let fromX = rect.width / 2;
      let fromY = rect.height - 100;
      if (handEl) {
        const hrect = handEl.getBoundingClientRect();
        fromX = hrect.left + hrect.width / 2 - rect.left;
        fromY = hrect.top - rect.top + 20;
      }
      setFlyingCard({
        cardId: card.id,
        cardType: card.type,
        fromX,
        fromY,
        toQ: target.q,
        toR: target.r,
      });
      setTimeout(() => setFlyingCard(null), 400);
    }
    socketRef.current?.emit('play_card', {
      roomId: joinResult.roomId,
      playerId: joinResult.playerId,
      cardId: card.id,
      target,
    });
  };

  const handleCellClick = () => {};

  const state = gameEngine.getState();
  const isWaiting = state.status === 'waiting';
  const isPlaying = state.status === 'playing';
  const isMyTurn = gameEngine.isMyTurn();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          background: 'rgba(26,26,46,0.8)',
          borderBottom: '2px solid rgba(212,175,55,0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={leaveRoom}
            style={{
              background: 'rgba(231,76,60,0.15)',
              border: '1px solid rgba(231,76,60,0.4)',
              color: '#e74c3c',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.3)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.15)')
            }
          >
            ← 离开房间
          </button>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>房间号</div>
            <div
              style={{
                fontSize: 20,
                color: '#d4af37',
                fontWeight: 'bold',
                letterSpacing: 4,
                fontFamily: 'monospace',
              }}
            >
              {joinResult.roomId}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: joinResult.color,
              border: '2px solid #d4af37',
              boxShadow: `0 0 12px ${joinResult.color}88`,
            }}
          />
          <div style={{ fontSize: 16, fontWeight: 500 }}>{joinResult.playerName}</div>
          {isWaiting && (
            <button
              onClick={toggleReady}
              style={{
                padding: '10px 24px',
                background: ready
                  ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                  : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                color: ready ? 'white' : '#1a1a2e',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: ready
                  ? '0 4px 16px rgba(46,204,113,0.4)'
                  : '0 4px 16px rgba(212,175,55,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
              }
            >
              {ready ? '✓ 已就绪' : '准备游戏'}
            </button>
          )}
          {isPlaying && isMyTurn && (
            <button
              onClick={endTurn}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 16px rgba(155,89,182,0.4)',
                transition: 'all 0.2s',
                animation: 'pulse 2s ease-in-out infinite',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
              }
            >
              结束回合 ⏭
            </button>
          )}
        </div>
      </div>

      <ScoreBoard />

      {message && (
        <div
          style={{
            position: 'fixed',
            top: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(48,43,99,0.95) 100%)',
            border: '2px solid #d4af37',
            color: 'white',
            padding: '12px 32px',
            borderRadius: 12,
            zIndex: 1000,
            fontSize: 15,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.2)',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          {message}
        </div>
      )}

      {isWaiting ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎯</div>
          <h2 style={{ color: '#d4af37', marginBottom: 8 }}>等待玩家就绪</h2>
          <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
            至少需要 2 名玩家，全部准备就绪后自动开始
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.values(state.players).map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `2px solid ${p.ready ? '#2ecc71' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 14,
                  padding: '20px 28px',
                  textAlign: 'center',
                  minWidth: 140,
                  transition: 'all 0.3s',
                  animation: p.ready ? 'readyGlow 1.5s ease-in-out infinite' : 'none',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    background: p.color,
                    margin: '0 auto 12px',
                    boxShadow: `0 0 20px ${p.color}66`,
                    border: p.id === joinResult.playerId ? '3px solid #d4af37' : 'none',
                  }}
                />
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{p.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: p.ready ? '#2ecc71' : '#888',
                  }}
                >
                  {p.id === joinResult.playerId ? '(你) ' : ''}
                  {p.ready ? '✓ 已准备' : '等待中...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px 20px',
            overflow: 'auto',
          }}
        >
          <Board
            onCellClick={handleCellClick}
            onPlayCardToTarget={playCardToTarget}
            flyingCard={flyingCard}
          />
        </div>
      )}

      {isPlaying && (
        <div data-card-hand>
          <CardHand
            onCardPlay={() => {}}
            onCardSelect={(id) => gameEngine.selectCard(id)}
            flyingCard={flyingCard}
          />
        </div>
      )}

      {showVictory && (
        <VictoryModal
          onClose={() => {
            setShowVictory(false);
            leaveRoom();
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(155,89,182,0.4); }
          50% { box-shadow: 0 4px 28px rgba(155,89,182,0.7); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes readyGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(46,204,113,0); }
          50% { box-shadow: 0 0 30px rgba(46,204,113,0.4); }
        }
      `}</style>
    </div>
  );
};

export default GamePage;
