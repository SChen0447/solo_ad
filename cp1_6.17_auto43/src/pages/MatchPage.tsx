import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { GameBoard } from '../components/GameBoard';
import { GameState, BattleAnimation } from '../game/GameManager';
import { Card } from '../game/CardDeck';

interface HistoryEntry {
  id: string;
  timestamp: string | null;
  players: { nickname: string; avatar: string; result: string }[];
  winner: string;
  turnCount: number;
  battleLog: any[];
}

type MatchStatus = 'idle' | 'matching' | 'matched' | 'playing' | 'gameOver';

export const MatchPage: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('idle');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [targetPhase, setTargetPhase] = useState<'none' | 'selecting' | 'animating'>('none');
  const [battleAnimation, setBattleAnimation] = useState<BattleAnimation | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string>('');
  const mySidRef = useRef<string>('');

  const avatars = ['👤', '🦊', '🐱', '🐶', '🦁', '🐯', '🐻', '🐼', '🐸', '🦉'];

  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('match_status', (data: { status: string; queueSize: number }) => {
      console.log('Match status:', data);
    });

    socket.on('match_found', (state: GameState) => {
      console.log('Match found!', state);
      roomIdRef.current = state.roomId;
      mySidRef.current = state.me.sid;
      setGameState(state);
      setMatchStatus('playing');
    });

    socket.on('card_played', (data: any) => {
      console.log('Card played:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    });

    socket.on('opponent_played_card', (data: any) => {
      console.log('Opponent played card:', data);
      
      if (data.card && gameState) {
        const anim: BattleAnimation = {
          type: data.card.type,
          card: data.card,
          fromPlayer: 'opponent',
          targetPlayer: 'me'
        };
        setBattleAnimation(anim);
        setTargetPhase('animating');
        
        setTimeout(() => {
          setBattleAnimation(null);
          setTargetPhase('none');
          if (data.gameState) {
            setGameState(data.gameState);
          }
        }, 800);
      }
    });

    socket.on('turn_ended', (data: any) => {
      console.log('Turn ended:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    });

    socket.on('turn_started', (data: any) => {
      console.log('Turn started:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    });

    socket.on('opponent_left', () => {
      alert('对手离开了游戏！');
      setMatchStatus('idle');
      setGameState(null);
    });

    socket.on('error', (data: any) => {
      console.error('Error:', data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    loadHistory();

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get('/api/get_history');
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const startMatch = () => {
    if (!nickname.trim()) {
      alert('请输入昵称！');
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit('join_match', { nickname: nickname.trim(), avatar });
      setMatchStatus('matching');
    }
  };

  const cancelMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('cancel_match');
      setMatchStatus('idle');
    }
  };

  const handleCardSelect = useCallback((cardId: string | null) => {
    setSelectedCardId(cardId);
    setTargetPhase(cardId ? 'selecting' : 'none');
  }, []);

  const handleAttack = useCallback((cardId: string) => {
    if (!gameState || !socketRef.current || !roomIdRef.current) return;
    
    const card = gameState.me.hand?.find(c => c.id === cardId);
    if (!card) return;

    setTargetPhase('animating');
    
    const anim: BattleAnimation = {
      type: card.type,
      card: card,
      fromPlayer: 'me',
      targetPlayer: 'opponent'
    };
    setBattleAnimation(anim);

    socketRef.current.emit('play_card', {
      roomId: roomIdRef.current,
      cardId: cardId
    });

    setTimeout(() => {
      setBattleAnimation(null);
      setSelectedCardId(null);
      setTargetPhase('none');
    }, 800);
  }, [gameState]);

  const handleEndTurn = useCallback(() => {
    if (!gameState?.isMyTurn || !socketRef.current || !roomIdRef.current) return;
    
    socketRef.current.emit('end_turn', {
      roomId: roomIdRef.current
    });
  }, [gameState]);

  const canPlayCard = useCallback((card: Card): boolean => {
    if (!gameState || !gameState.isMyTurn) return false;
    if (gameState.gameOver) return false;
    if (targetPhase === 'animating') return false;
    return gameState.me.energy >= card.cost;
  }, [gameState, targetPhase]);

  useEffect(() => {
    if (gameState?.gameOver && !showGameOver) {
      setShowGameOver(true);
      setIsWinner(gameState.winner === mySidRef.current);
      setMatchStatus('gameOver');
      loadHistory();
    }
  }, [gameState?.gameOver]);

  const restartGame = () => {
    setShowGameOver(false);
    setMatchStatus('idle');
    setGameState(null);
    setSelectedCardId(null);
    setTargetPhase('none');
    setBattleAnimation(null);
    loadHistory();
  };

  const pageStyle: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(180deg, #0B0C10 0%, #1F2833 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: matchStatus === 'playing' ? 'flex-start' : 'center',
    overflow: 'auto'
  };

  const matchContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '40px',
    background: 'rgba(31, 40, 51, 0.8)',
    borderRadius: '16px',
    border: '2px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    maxWidth: '400px',
    width: '90%'
  };

  const titleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)'
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#a0aec0',
    fontSize: '16px',
    margin: 0
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #4a5568',
    background: '#1a202c',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  const avatarPickerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  };

  const avatarOptionStyle = (selected: boolean): React.CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    background: selected ? 'linear-gradient(145deg, #4CAF50, #388E3C)' : '#2d3748',
    border: selected ? '2px solid #4CAF50' : '2px solid #4a5568',
    transition: 'all 0.2s ease'
  });

  const buttonStyle = (primary: boolean = true, disabled: boolean = false): React.CSSProperties => ({
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled 
      ? '#4a5568' 
      : primary 
        ? 'linear-gradient(145deg, #2196F3, #1976D2)' 
        : 'linear-gradient(145deg, #FF4C4C, #D32F2F)',
    color: '#fff',
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(33,150,243,0.3)',
    transition: 'all 0.2s ease'
  });

  const spinnerContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px'
  };

  const spinnerStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    border: '4px solid #2d3748',
    borderTopColor: '#2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const successIconStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #4CAF50, #388E3C)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    color: '#fff',
    animation: 'scaleIn 0.5s ease'
  };

  const gameBoardContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #1F2833, #0B0C10)',
    padding: '40px',
    borderRadius: '16px',
    border: '3px solid #4a5568',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
  };

  const resultTitleStyle = (win: boolean): React.CSSProperties => ({
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: win ? '#4CAF50' : '#FF4C4C',
    textShadow: win 
      ? '0 0 20px rgba(76,175,80,0.5)' 
      : '0 0 20px rgba(255,76,76,0.5)'
  });

  const historySectionStyle: React.CSSProperties = {
    marginTop: '40px',
    width: '100%',
    maxWidth: '600px'
  };

  const historyTitleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center'
  };

  const historyListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  };

  const historyItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: 'rgba(45, 55, 72, 0.6)',
    borderRadius: '8px',
    border: '1px solid #4a5568',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  if (matchStatus === 'playing' && gameState) {
    return (
      <div style={pageStyle}>
        <div style={gameBoardContainerStyle}>
          <GameBoard
            gameState={gameState}
            selectedCardId={selectedCardId}
            targetPhase={targetPhase}
            battleAnimation={battleAnimation}
            onCardSelect={handleCardSelect}
            onAttack={handleAttack}
            onEndTurn={handleEndTurn}
            canPlayCard={canPlayCard}
          />
        </div>
        
        {showGameOver && (
          <div style={modalOverlayStyle}>
            <div style={modalStyle}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {isWinner ? '🏆' : '💀'}
              </div>
              <h2 style={resultTitleStyle(isWinner)}>
                {isWinner ? '胜利！' : '失败...'}
              </h2>
              <p style={{ color: '#a0aec0', marginBottom: '24px' }}>
                {isWinner ? '恭喜你击败了对手！' : '下次再接再厉！'}
              </p>
              <button
                style={buttonStyle(true, false)}
                onClick={restartGame}
              >
                返回大厅
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={matchContainerStyle}>
        <h1 style={titleStyle}>⚔️ 卡牌对战</h1>
        <p style={subtitleStyle}>回合制策略卡牌游戏</p>

        {matchStatus === 'idle' && (
          <>
            <div style={{ width: '100%' }}>
              <label style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                选择头像
              </label>
              <div style={avatarPickerStyle}>
                {avatars.map(av => (
                  <div
                    key={av}
                    style={avatarOptionStyle(avatar === av)}
                    onClick={() => setAvatar(av)}
                  >
                    {av}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: '100%' }}>
              <label style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                昵称
              </label>
              <input
                type="text"
                style={inputStyle}
                placeholder="输入你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startMatch()}
                maxLength={12}
              />
            </div>

            <button
              style={buttonStyle(true, !nickname.trim())}
              onClick={startMatch}
              disabled={!nickname.trim()}
            >
              🔍 开始匹配
            </button>
          </>
        )}

        {matchStatus === 'matching' && (
          <div style={spinnerContainerStyle}>
            <div style={spinnerStyle} />
            <p style={{ color: '#fff', fontSize: '18px' }}>正在寻找对手...</p>
            <p style={{ color: '#a0aec0', fontSize: '14px' }}>请稍候</p>
            <button
              style={buttonStyle(false, false)}
              onClick={cancelMatch}
            >
              取消匹配
            </button>
          </div>
        )}

        {matchStatus === 'gameOver' && (
          <div style={spinnerContainerStyle}>
            <div style={successIconStyle}>
              {isWinner ? '✓' : '✗'}
            </div>
            <p style={{ color: '#fff', fontSize: '18px' }}>
              游戏结束 - {isWinner ? '胜利' : '失败'}
            </p>
            <button
              style={buttonStyle(true, false)}
              onClick={restartGame}
            >
              返回大厅
            </button>
          </div>
        )}
      </div>

      <div style={historySectionStyle}>
        <h3 style={historyTitleStyle}>📜 对战历史</h3>
        <div style={historyListStyle}>
          {history.length === 0 ? (
            <p style={{ color: '#4a5568', textAlign: 'center', padding: '20px' }}>
              暂无对战记录
            </p>
          ) : (
            history.map((entry, index) => (
              <div key={entry.id || index} style={historyItemStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{entry.players[0].avatar}</span>
                  <span style={{ color: '#fff' }}>{entry.players[0].nickname}</span>
                  <span style={{ color: '#4a5568' }}>vs</span>
                  <span style={{ fontSize: '20px' }}>{entry.players[1].avatar}</span>
                  <span style={{ color: '#fff' }}>{entry.players[1].nickname}</span>
                </div>
                <div style={{ 
                  color: entry.winner === nickname ? '#4CAF50' : '#FF4C4C',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {entry.winner} 胜
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @media (max-width: 1280px) {
          .card-in-hand .card {
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default MatchPage;
