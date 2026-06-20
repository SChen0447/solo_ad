import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PlayerState, GameState, getHpColorGradient, INITIAL_HP } from '../gameLogic';

interface FlyingCard {
  id: string;
  card: Card;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  fromPlayer: 'me' | 'opponent';
}

interface GameBoardProps {
  ws: WebSocket | null;
  playerId: string;
  playerName: string;
  roomName: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ ws, playerId, playerName, roomName }) => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [showTurnIndicator, setShowTurnIndicator] = useState(false);
  const [turnIndicatorText, setTurnIndicatorText] = useState('');
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [totalRounds, setTotalRounds] = useState(0);
  const [hitAnimation, setHitAnimation] = useState<'me' | 'opponent' | null>(null);
  const [animatingHp, setAnimatingHp] = useState<{ me: number; opponent: number }>({ me: INITIAL_HP, opponent: INITIAL_HP });
  const [glowingCards, setGlowingCards] = useState<string[]>([]);
  const animationFrameRef = useRef<number>();
  const myAvatarRef = useRef<HTMLDivElement>(null);
  const opponentAvatarRef = useRef<HTMLDivElement>(null);
  const localWsRef = useRef<WebSocket | null>(null);

  const myPlayer = gameState?.players.find(p => p.id === playerId);
  const opponentPlayer = gameState?.players.find(p => p.id !== playerId);

  useEffect(() => {
    if (gameState && myPlayer && opponentPlayer) {
      setAnimatingHp({ me: myPlayer.hp, opponent: opponentPlayer.hp });
    }
  }, []);

  useEffect(() => {
    if (ws) {
      localWsRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'game_start':
            const initialState: GameState = {
              round: message.round,
              players: message.players,
              gameOver: false
            };
            setGameState(initialState);
            const myHp = message.players.find((p: PlayerState) => p.id === playerId)?.hp || INITIAL_HP;
            const oppHp = message.players.find((p: PlayerState) => p.id !== playerId)?.hp || INITIAL_HP;
            setAnimatingHp({ me: myHp, opponent: oppHp });
            showTurnIndicatorMessage(message.round, message.players[0].name);
            break;

          case 'cards_played':
            if (!gameState) return;
            
            const isMyCard = message.playerId === playerId;
            const playedCards: Card[] = message.playedCards;
            const newOpponentHp = message.newOpponentHp;
            
            playedCards.forEach((card, index) => {
              setTimeout(() => {
                setGlowingCards(prev => [...prev, card.id]);
                setTimeout(() => {
                  setGlowingCards(prev => prev.filter(id => id !== card.id));
                  
                  const startRect = isMyCard ? 
                    { left: window.innerWidth / 2, top: window.innerHeight - 150 } :
                    { left: window.innerWidth / 2, top: 150 };
                  
                  const endRect = isMyCard ?
                    (opponentAvatarRef.current?.getBoundingClientRect() || { left: window.innerWidth - 200, top: 100 }) :
                    (myAvatarRef.current?.getBoundingClientRect() || { left: 200, top: window.innerHeight - 200 });
                  
                  const flyingCard: FlyingCard = {
                    id: `${card.id}-${Date.now()}`,
                    card,
                    startX: startRect.left + 50,
                    startY: startRect.top + 50,
                    endX: endRect.left + 50,
                    endY: endRect.top + 50,
                    startTime: Date.now(),
                    fromPlayer: isMyCard ? 'me' : 'opponent'
                  };
                  
                  setFlyingCards(prev => [...prev, flyingCard]);
                  
                  setTimeout(() => {
                    setFlyingCards(prev => prev.filter(fc => fc.id !== flyingCard.id));
                    setHitAnimation(isMyCard ? 'opponent' : 'me');
                    setTimeout(() => setHitAnimation(null), 300);
                    
                    if (isMyCard) {
                      animateHpChange('opponent', newOpponentHp);
                    } else {
                      animateHpChange('me', newOpponentHp);
                    }
                  }, 500);
                }, 200);
              }, index * 100);
            });

            setGameState(prev => {
              if (!prev) return prev;
              const newPlayers = prev.players.map(p => {
                if (p.id === message.playerId) {
                  return { ...p, hand: message.remainingHand };
                }
                const opponent = prev.players.find(pl => pl.id !== message.playerId);
                if (p.id === opponent?.id) {
                  return { ...p, hp: message.newOpponentHp };
                }
                return p;
              });
              return { ...prev, players: newPlayers };
            });

            if (message.gameOver) {
              setTimeout(() => {
                setShowVictoryModal(true);
              }, 800);
            }
            break;

          case 'turn_ended':
            if (!gameState) return;
            
            setGameState(prev => {
              if (!prev) return prev;
              const newPlayers = prev.players.map(p => ({
                ...p,
                isTurn: p.id === message.newTurnPlayerId,
                hand: p.id === message.newTurnPlayerId ? message.newHand : p.hand
              }));
              return { ...prev, round: message.round, players: newPlayers };
            });

            setSelectedCards([]);
            if (message.newTurnPlayerId === playerId) {
              showTurnIndicatorMessage(message.round, playerName);
            } else {
              showTurnIndicatorMessage(message.round, message.newTurnPlayerName);
            }
            break;

          case 'game_over':
            setWinnerName(message.winnerName);
            setTotalRounds(message.totalRounds);
            setShowVictoryModal(true);
            break;

          case 'opponent_left':
            alert('对手已离开游戏');
            navigate('/');
            break;
        }
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (localWsRef.current) {
        localWsRef.current.onmessage = null;
      }
    };
  }, [ws, playerId, playerName, navigate, gameState]);

  const showTurnIndicatorMessage = (round: number, playerName: string) => {
    setTurnIndicatorText(`第${round}回合 - ${playerName}的回合`);
    setShowTurnIndicator(true);
    setTimeout(() => setShowTurnIndicator(false), 1500);
  };

  const animateHpChange = (target: 'me' | 'opponent', targetHp: number) => {
    setAnimatingHp(prev => {
      const duration = 300;
      const startTime = Date.now();
      const startHp = prev[target];

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentHp = Math.round(startHp + (targetHp - startHp) * easeProgress);

        setAnimatingHp(p => ({ ...p, [target]: currentHp }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
      return prev;
    });
  };

  const toggleCardSelection = (cardId: string) => {
    if (!myPlayer?.isTurn) return;
    
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const handlePlayCards = useCallback(() => {
    if (!ws || selectedCards.length === 0 || !myPlayer?.isTurn) return;

    ws.send(JSON.stringify({
      type: 'play_cards',
      cardIds: selectedCards
    }));

    setSelectedCards([]);
  }, [ws, selectedCards, myPlayer]);

  const handleEndTurn = useCallback(() => {
    if (!ws || !myPlayer?.isTurn) return;

    ws.send(JSON.stringify({
      type: 'end_turn'
    }));
  }, [ws, myPlayer]);

  const handleRestart = useCallback(() => {
    if (!ws) return;

    setShowVictoryModal(false);
    setSelectedCards([]);
    setFlyingCards([]);
    ws.send(JSON.stringify({
      type: 'restart_game'
    }));
  }, [ws]);

  const calculateCardPosition = (card: FlyingCard, currentTime: number) => {
    const progress = Math.min((currentTime - card.startTime) / 500, 1);
    const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const x = card.startX + (card.endX - card.startX) * easeProgress;
    const peakHeight = 200;
    const yOffset = -4 * peakHeight * easeProgress * (1 - easeProgress);
    const y = card.startY + (card.endY - card.startY) * easeProgress + yOffset;
    const rotation = progress * 360;

    return { x, y, rotation, progress };
  };

  useEffect(() => {
    const animate = () => {
      setFlyingCards(prev => [...prev]);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const renderHpBar = (currentHp: number, targetHp: number, _isMe: boolean) => {
    const percentage = Math.max(0, Math.min(100, (currentHp / INITIAL_HP) * 100));
    const gradient = getHpColorGradient(targetHp);

    return (
      <div style={styles.hpBarContainer}>
        <div
          style={{
            ...styles.hpBarFill,
            width: `${percentage}%`,
            background: gradient,
            transition: 'width 0.3s ease-out'
          }}
        />
        <span style={styles.hpText}>{currentHp} / {INITIAL_HP}</span>
      </div>
    );
  };

  const renderPlayerArea = (player: PlayerState | undefined, isMe: boolean) => {
    if (!player) return null;

    const isCurrentTurn = player.isTurn;
    const hitAnim = (isMe && hitAnimation === 'me') || (!isMe && hitAnimation === 'opponent');
    const avatarRef = isMe ? myAvatarRef : opponentAvatarRef;
    const displayHp = isMe ? animatingHp.me : animatingHp.opponent;

    return (
      <div
        ref={avatarRef}
        style={{
          ...styles.playerArea,
          ...(isMe ? styles.meArea : styles.opponentArea)
        }}
      >
        <div style={styles.avatarContainer}>
          <div
            style={{
              ...styles.avatarWrapper,
              ...(isCurrentTurn ? styles.avatarActiveWrapper : {}),
              ...(hitAnim ? styles.avatarHit : {})
            }}
          >
            {isCurrentTurn && <div style={styles.avatarGlow} />}
            <div
              style={{
                ...styles.avatar,
                borderColor: isCurrentTurn ? '#ffd700' : '#666'
              }}
            >
              <span style={styles.avatarText}>{player.name.charAt(0)}</span>
            </div>
          </div>
          <p style={styles.playerName}>{player.name}</p>
          {renderHpBar(displayHp, player.hp, isMe)}
        </div>
      </div>
    );
  };

  const renderHand = (cards: Card[], isMe: boolean) => {
    if (!isMe) {
      return (
        <div style={styles.opponentHandContainer}>
          {cards.map((_, index) => (
            <div
              key={`opponent-card-${index}`}
              style={{
                ...styles.opponentCard,
                marginLeft: index > 0 ? '-40px' : '0'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div style={styles.handContainer}>
        {cards.map((card, index) => {
          const isSelected = selectedCards.includes(card.id);
          const isGlowing = glowingCards.includes(card.id);
          const canSelect = myPlayer?.isTurn;
          
          return (
            <div
              key={card.id}
              onClick={() => canSelect && toggleCardSelection(card.id)}
              style={{
                ...styles.card,
                marginLeft: index > 0 ? '-40px' : '0',
                transform: isSelected ? 'translateY(-30px) scale(1.05)' : 'translateY(0)',
                cursor: canSelect ? 'pointer' : 'not-allowed',
                opacity: canSelect ? 1 : 0.6,
                boxShadow: isGlowing ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)' : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div style={styles.cardInner}>
                <span style={styles.cardAttack}>{card.attack}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFlyingCards = () => {
    const currentTime = Date.now();
    return flyingCards.map(fc => {
      const { x, y, rotation, progress } = calculateCardPosition(fc, currentTime);
      if (progress >= 1) return null;

      return (
        <div
          key={fc.id}
          style={{
            ...styles.flyingCard,
            left: x - 50,
            top: y - 70,
            transform: `rotate(${rotation}deg) scale(${1 - progress * 0.3})`,
            opacity: 1 - progress * 0.2
          }}
        >
          <div style={styles.cardInner}>
            <span style={styles.cardAttack}>{fc.card.attack}</span>
          </div>
        </div>
      );
    });
  };

  if (!gameState) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>加载游戏中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <span style={styles.roomName}>{roomName}</span>
        <span style={styles.roundIndicator}>第 {gameState.round} 回合</span>
        <button style={styles.leaveButton} onClick={() => navigate('/')}>
          离开房间
        </button>
      </div>

      <div style={styles.gameArea}>
        {renderPlayerArea(opponentPlayer, false)}
        
        <div style={styles.battleArea}>
          {renderHand(opponentPlayer?.hand || [], false)}
          <div style={styles.vsText}>VS</div>
        </div>

        {renderPlayerArea(myPlayer, true)}
      </div>

      <div style={styles.bottomBar}>
        {renderHand(myPlayer?.hand || [], true)}
        <div style={styles.actionButtons}>
          <button
            style={{
              ...styles.actionButton,
              ...(selectedCards.length > 0 && myPlayer?.isTurn ? styles.actionButtonActive : {}),
              ...(!myPlayer?.isTurn ? styles.actionButtonDisabled : {})
            }}
            onClick={handlePlayCards}
            disabled={selectedCards.length === 0 || !myPlayer?.isTurn}
          >
            出牌攻击 ({selectedCards.length})
          </button>
          <button
            style={{
              ...styles.endTurnButton,
              ...(!myPlayer?.isTurn ? styles.actionButtonDisabled : {})
            }}
            onClick={handleEndTurn}
            disabled={!myPlayer?.isTurn}
          >
            结束回合
          </button>
        </div>
      </div>

      {renderFlyingCards()}

      {showTurnIndicator && (
        <div style={styles.turnIndicator}>
          {turnIndicatorText}
        </div>
      )}

      {showVictoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalAvatar}>
              <span style={styles.modalAvatarText}>{winnerName.charAt(0)}</span>
            </div>
            <h2 style={styles.modalTitle}>{winnerName} 获胜!</h2>
            <p style={styles.modalSubtitle}>总回合数: {totalRounds}</p>
            <button style={styles.modalButton} onClick={handleRestart}>
              再来一局
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes flash {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(2) saturate(0.5) sepia(1) hue-rotate(-50deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #3a3a5c',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    color: '#aaa',
    fontSize: '18px'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  roomName: {
    fontSize: '18px',
    color: '#667eea',
    fontWeight: 'bold'
  },
  roundIndicator: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffd700'
  },
  leaveButton: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#c62828',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '20px',
    minHeight: '0'
  },
  playerArea: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    minHeight: '180px'
  },
  meArea: {
    flexDirection: 'row-reverse' as const
  },
  opponentArea: {
    flexDirection: 'row' as const
  },
  avatarContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '10px'
  },
  avatarWrapper: {
    position: 'relative' as const,
    width: '100px',
    height: '100px',
    borderRadius: '50%'
  },
  avatarActiveWrapper: {
    animation: 'pulse 0.5s ease-in-out infinite'
  },
  avatarGlow: {
    position: 'absolute' as const,
    top: '-6px',
    left: '-6px',
    right: '-6px',
    bottom: '-6px',
    borderRadius: '50%',
    background: 'conic-gradient(#ffd700, #ff8c00, #ffd700)',
    animation: 'spin 0.5s linear infinite',
    zIndex: 0
  },
  avatar: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '4px solid #666',
    zIndex: 1,
    transition: 'border-color 0.3s ease'
  },
  avatarHit: {
    animation: 'flash 0.3s ease-in-out'
  },
  avatarText: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff'
  },
  playerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff'
  },
  hpBarContainer: {
    width: '120px',
    height: '24px',
    backgroundColor: '#333',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative' as const
  },
  hpBarFill: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s ease-out'
  },
  hpText: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
  },
  battleArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: '200px'
  },
  opponentHandContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px'
  },
  opponentCard: {
    width: '80px',
    height: '110px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #4a4a6a 0%, #3a3a5c 100%)',
    border: '2px solid #5a5a7a'
  },
  vsText: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    opacity: 0.5
  },
  handContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px'
  },
  card: {
    width: '100px',
    height: '140px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
    border: '2px solid #9e9e9e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    zIndex: 1,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  cardInner: {
    width: '80%',
    height: '80%',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardAttack: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#d32f2f',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
  },
  bottomBar: {
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px'
  },
  actionButton: {
    padding: '15px 40px',
    fontSize: '16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3a3a5c',
    color: '#666',
    cursor: 'not-allowed',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  actionButtonActive: {
    background: 'linear-gradient(135deg, #c62828 0%, #ef5350 100%)',
    color: '#fff',
    cursor: 'pointer'
  },
  endTurnButton: {
    padding: '15px 40px',
    fontSize: '16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  actionButtonDisabled: {
    background: '#3a3a5c',
    color: '#666',
    cursor: 'not-allowed'
  },
  flyingCard: {
    position: 'fixed' as const,
    width: '100px',
    height: '140px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
    border: '2px solid #9e9e9e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none'
  },
  turnIndicator: {
    position: 'fixed' as const,
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '15px 40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '30px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    animation: 'fadeIn 0.3s ease',
    zIndex: 50,
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.5)'
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'linear-gradient(135deg, #252542 0%, #1a1a2e 100%)',
    borderRadius: '20px',
    padding: '60px 80px',
    textAlign: 'center' as const,
    border: '2px solid rgba(255, 215, 0, 0.3)',
    animation: 'scaleIn 0.5s ease',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  modalAvatar: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 30px',
    border: '4px solid #ffd700',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
  },
  modalAvatarText: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#1a1a2e'
  },
  modalTitle: {
    fontSize: '36px',
    color: '#ffd700',
    marginBottom: '15px'
  },
  modalSubtitle: {
    fontSize: '18px',
    color: '#aaa',
    marginBottom: '40px'
  },
  modalButton: {
    padding: '15px 60px',
    fontSize: '18px',
    borderRadius: '30px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s ease'
  }
} as const;

export default GameBoard;
