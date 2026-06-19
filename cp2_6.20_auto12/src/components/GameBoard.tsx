import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Card, playCard, endTurn, createInitialGameState, drawCard } from '../gameLogic';

interface FlyingCard {
  id: string;
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  startTime: number;
  playerIndex: number;
}

interface GameBoardProps {
  ws: WebSocket | null;
  roomId: string;
  playerId: string;
  players: { id: string; name: string }[];
}

const ANIM_DURATION = 500;

const GameBoard: React.FC<GameBoardProps> = ({ ws, roomId, playerId, players }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [hitFlash, setHitFlash] = useState<{ [key: number]: boolean }>({});
  const [turnNotification, setTurnNotification] = useState<string | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [victoryName, setVictoryName] = useState('');
  const [totalTurns, setTotalTurns] = useState(0);
  const [displayHp, setDisplayHp] = useState<[number, number]>([20, 20]);
  const [glowCards, setGlowCards] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const myPlayerIndex = players.findIndex((p) => p.id === playerId);

  useEffect(() => {
    const gs = createInitialGameState(
      players[0].id, players[0].name,
      players[1].id, players[1].name
    );
    gs.players[0] = drawCard(gs.players[0]);
    gs.players[1] = drawCard(gs.players[1]);
    setGameState(gs);
    setDisplayHp([gs.players[0].hp, gs.players[1].hp]);
  }, [players]);

  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.roomId !== roomId) return;

      if (msg.type === 'play_card') {
        setGameState((prev) => {
          if (!prev) return prev;
          const newState = playCard(prev, msg.playerIndex, msg.cardId);
          setDisplayHp([newState.players[0].hp, newState.players[1].hp]);
          if (newState.gameOver) {
            setTotalTurns(newState.turnNumber);
            const winner = newState.players.find((p) => p.id === newState.winner);
            setVictoryName(winner?.name || '');
            setTimeout(() => setShowVictory(true), 600);
          }
          return newState;
        });
        triggerCardAnimation(msg.playerIndex, msg.cardId, msg.card);
        triggerHitFlash(msg.playerIndex === 0 ? 1 : 0);
      }

      if (msg.type === 'turn_end') {
        setGameState((prev) => {
          if (!prev) return prev;
          const newState = endTurn(prev);
          showTurnNotification(newState.turnNumber, newState.currentTurn, newState);
          return newState;
        });
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, roomId]);

  useEffect(() => {
    if (!gameState) return;
    const targetHp0 = gameState.players[0].hp;
    const targetHp1 = gameState.players[1].hp;
    const startHp0 = displayHp[0];
    const startHp1 = displayHp[1];

    if (startHp0 === targetHp0 && startHp1 === targetHp1) return;

    const startTime = performance.now();
    const duration = 300;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayHp([
        Math.round(startHp0 + (targetHp0 - startHp0) * eased),
        Math.round(startHp1 + (targetHp1 - startHp1) * eased),
      ]);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [gameState?.players[0].hp, gameState?.players[1].hp]);

  const triggerHitFlash = useCallback((playerIndex: number) => {
    setHitFlash((prev) => ({ ...prev, [playerIndex]: true }));
    setTimeout(() => setHitFlash((prev) => ({ ...prev, [playerIndex]: false })), 400);
  }, []);

  const triggerCardAnimation = useCallback((playerIndex: number, cardId: string, card: Card) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const fromX = playerIndex === 0 ? rect.width * 0.2 : rect.width * 0.8;
    const fromY = rect.height - 120;
    const toX = playerIndex === 0 ? rect.width * 0.8 : rect.width * 0.2;
    const toY = 120;

    const flying: FlyingCard = {
      id: `fly-${Date.now()}-${cardId}`,
      card,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      startTime: performance.now(),
      playerIndex,
    };

    setFlyingCards((prev) => [...prev, flying]);
    setGlowCards((prev) => new Set(prev).add(cardId));
    setTimeout(() => {
      setGlowCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, 200);

    const animateFly = (time: number) => {
      const elapsed = time - flying.startTime;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      setFlyingCards((prev) =>
        prev.map((fc) => (fc.id === flying.id ? { ...fc, progress: t } : fc))
      );
      if (t < 1) {
        requestAnimationFrame(animateFly);
      } else {
        setFlyingCards((prev) => prev.filter((fc) => fc.id !== flying.id));
      }
    };
    requestAnimationFrame(animateFly);
  }, []);

  const showTurnNotification = useCallback((turnNum: number, turnPlayer: number, gs: GameState) => {
    const name = gs.players[turnPlayer].name;
    setTurnNotification(`第${turnNum}回合 - ${name}的回合`);
    setTimeout(() => setTurnNotification(null), 1500);
  }, []);

  const handlePlayCard = useCallback((cardId: string) => {
    if (!gameState || !ws) return;
    const myIndex = myPlayerIndex;
    if (gameState.currentTurn !== myIndex) return;
    if (gameState.gameOver) return;

    const card = gameState.players[myIndex].hand.find((c) => c.id === cardId);
    if (!card) return;

    const newState = playCard(gameState, myIndex, cardId);
    setGameState(newState);
    setDisplayHp([newState.players[0].hp, newState.players[1].hp]);

    ws.send(
      JSON.stringify({
        type: 'play_card',
        roomId,
        playerIndex: myIndex,
        cardId,
        card,
      })
    );

    triggerCardAnimation(myIndex, cardId, card);
    triggerHitFlash(myIndex === 0 ? 1 : 0);

    if (newState.gameOver) {
      setTotalTurns(newState.turnNumber);
      const winner = newState.players.find((p) => p.id === newState.winner);
      setVictoryName(winner?.name || '');
      setTimeout(() => setShowVictory(true), 600);
    }
  }, [gameState, ws, roomId, myPlayerIndex, triggerCardAnimation, triggerHitFlash]);

  const handleEndTurn = useCallback(() => {
    if (!gameState || !ws) return;
    if (gameState.currentTurn !== myPlayerIndex) return;
    if (gameState.gameOver) return;

    const newState = endTurn(gameState);
    setGameState(newState);
    showTurnNotification(newState.turnNumber, newState.currentTurn, newState);

    ws.send(
      JSON.stringify({
        type: 'turn_end',
        roomId,
        playerIndex: myPlayerIndex,
      })
    );
  }, [gameState, ws, roomId, myPlayerIndex, showTurnNotification]);

  const handleRestart = useCallback(() => {
    const gs = createInitialGameState(
      players[0].id, players[0].name,
      players[1].id, players[1].name
    );
    gs.players[0] = drawCard(gs.players[0]);
    gs.players[1] = drawCard(gs.players[1]);
    setGameState(gs);
    setDisplayHp([gs.players[0].hp, gs.players[1].hp]);
    setShowVictory(false);
    setVictoryName('');
    setFlyingCards([]);
    setHitFlash({});
    showTurnNotification(gs.turnNumber, gs.currentTurn, gs);
  }, [players, showTurnNotification]);

  if (!gameState) return null;

  const isMyTurn = gameState.currentTurn === myPlayerIndex;
  const myPlayer = gameState.players[myPlayerIndex];
  const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
  const opponent = gameState.players[opponentIndex];

  const getHpBarGradient = (hp: number, maxHp: number) => {
    const ratio = hp / maxHp;
    if (ratio > 0.5) return 'linear-gradient(90deg, #4caf50, #66bb6a)';
    if (ratio > 0.2) return 'linear-gradient(90deg, #ff9800, #ffb74d)';
    return 'linear-gradient(90deg, #f44336, #ef5350)';
  };

  const getDisplayHpPercent = (displayValue: number, maxHp: number) => {
    return Math.max(0, (displayValue / maxHp) * 100);
  };

  const renderPlayerArea = (playerIdx: number, side: 'left' | 'right') => {
    const player = gameState.players[playerIdx];
    const isCurrentTurn = gameState.currentTurn === playerIdx;
    const dHp = displayHp[playerIdx];
    const isHit = hitFlash[playerIdx];
    const isMe = playerIdx === myPlayerIndex;

    return (
      <div style={{
        ...styles.playerArea,
        ...(side === 'left' ? styles.playerLeft : styles.playerRight),
      }}>
        <div style={{
          ...styles.avatarContainer,
          ...(isCurrentTurn ? styles.avatarActive : styles.avatarInactive),
          ...(isHit ? styles.avatarHit : {}),
        }}>
          <div style={styles.avatarInner}>
            {player.name.charAt(0).toUpperCase()}
          </div>
          {isCurrentTurn && (
            <div style={styles.rotatingGlow} className="rotating-glow" />
          )}
        </div>
        <div style={styles.playerName}>{player.name}</div>
        <div style={styles.hpBarContainer}>
          <div style={{
            ...styles.hpBarFill,
            width: `${getDisplayHpPercent(dHp, player.maxHp)}%`,
            background: getHpBarGradient(dHp, player.maxHp),
            transition: 'width 0.3s ease',
          }} />
          <span style={styles.hpText}>{dHp}/{player.maxHp}</span>
        </div>
        <div style={styles.deckInfo}>
          牌堆: {player.deck.length}
        </div>
      </div>
    );
  };

  const renderHand = () => {
    if (!myPlayer) return null;
    return (
      <div style={styles.handContainer}>
        {myPlayer.hand.map((card, index) => {
          const offset = index * -30;
          const isGlowing = glowCards.has(card.id);
          return (
            <div
              key={card.id}
              style={{
                ...styles.card,
                marginLeft: index === 0 ? 0 : offset,
                zIndex: index,
                ...(isGlowing ? styles.cardGlow : {}),
                ...(isMyTurn && !gameState.gameOver ? styles.cardPlayable : {}),
              }}
              onClick={() => isMyTurn && !gameState.gameOver && handlePlayCard(card.id)}
            >
              <div style={styles.cardName}>{card.name}</div>
              <div style={{
                ...styles.cardAttack,
                color: card.attack >= 4 ? '#f44336' : card.attack >= 2 ? '#ff9800' : '#4caf50',
              }}>
                ⚔ {card.attack}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.board} ref={boardRef}>
      {renderPlayerArea(myPlayerIndex === 0 ? 0 : 1, 'left')}
      {renderPlayerArea(myPlayerIndex === 0 ? 1 : 0, 'right')}

      <div style={styles.centerArea}>
        <div style={styles.turnIndicator}>
          回合 {gameState.turnNumber}
        </div>
        {isMyTurn && !gameState.gameOver && (
          <button style={styles.endTurnButton} onClick={handleEndTurn}>
            结束回合
          </button>
        )}
      </div>

      {renderHand()}

      {flyingCards.map((fc) => {
        const t = fc.progress;
        const eased = t;
        const x = fc.fromX + (fc.toX - fc.fromX) * eased;
        const y = fc.fromY + (fc.toY - fc.fromY) * eased - Math.sin(eased * Math.PI) * 200;

        return (
          <div
            key={fc.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 70,
              height: 100,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #e0e0e0, #bdbdbd)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              zIndex: 1000,
              pointerEvents: 'none',
              transform: `rotate(${(eased - 0.5) * 30}deg) scale(${1 + eased * 0.2})`,
            }}
          >
            <div style={{ fontSize: 10, color: '#333', fontWeight: 'bold' }}>{fc.card.name}</div>
            <div style={{ fontSize: 18, color: '#d32f2f', fontWeight: 'bold' }}>⚔ {fc.card.attack}</div>
          </div>
        );
      })}

      {turnNotification && (
        <div style={styles.turnNotification} className="turn-notification">
          {turnNotification}
        </div>
      )}

      {showVictory && (
        <div style={styles.victoryOverlay} className="victory-overlay">
          <div style={styles.victoryCard} className="victory-card">
            <div style={styles.victoryCrown}>👑</div>
            <div style={styles.victoryName}>{victoryName}</div>
            <div style={styles.victoryTitle}>胜利！</div>
            <div style={styles.victoryStats}>总回合数: {totalTurns}</div>
            <button style={styles.restartButton} onClick={handleRestart}>
              再来一局
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rotateGlow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes flashRed {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.8), inset 0 0 20px rgba(255, 0, 0, 0.3); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
        @keyframes victoryAppear {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .rotating-glow {
          animation: rotateGlow 0.5s linear infinite;
        }
        .turn-notification {
          animation: fadeInOut 1.5s ease forwards;
        }
        .victory-overlay {
          animation: fadeIn 0.3s ease;
        }
        .victory-card {
          animation: victoryAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  board: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#1a1a2e',
    overflow: 'hidden',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', sans-serif",
  },
  playerArea: {
    position: 'absolute',
    top: '5%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '25%',
  },
  playerLeft: {
    left: '5%',
  },
  playerRight: {
    right: '5%',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    border: '3px solid #ffd700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
  },
  avatarInactive: {
    border: '3px solid #555',
    boxShadow: 'none',
  },
  avatarHit: {
    animation: 'flashRed 0.4s ease',
  },
  avatarInner: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  rotatingGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTopColor: '#ffd700',
    borderRightColor: 'rgba(255, 215, 0, 0.5)',
    pointerEvents: 'none',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  hpBarContainer: {
    width: '100%',
    maxWidth: 200,
    height: 24,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 12,
    transition: 'width 0.3s ease',
  },
  hpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  deckInfo: {
    fontSize: 12,
    color: '#888',
  },
  centerArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  turnIndicator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
  },
  endTurnButton: {
    padding: '12px 32px',
    borderRadius: 8,
    border: '2px solid #ffd700',
    background: 'rgba(255, 215, 0, 0.15)',
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  handContainer: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 0,
    padding: '0 20px',
  },
  card: {
    width: 80,
    height: 110,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #e0e0e0, #bdbdbd)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'default',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    flexShrink: 0,
    userSelect: 'none',
  },
  cardPlayable: {
    cursor: 'pointer',
  },
  cardGlow: {
    boxShadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 2px 8px rgba(0,0,0,0.3)',
  },
  cardName: {
    fontSize: 11,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    lineHeight: 1.2,
  },
  cardAttack: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  turnNotification: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translate(-50%, 0)',
    padding: '12px 32px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.85)',
    color: '#ffd700',
    fontSize: 22,
    fontWeight: 'bold',
    whiteSpace: 'nowrap' as const,
    border: '1px solid rgba(255, 215, 0, 0.3)',
    zIndex: 500,
  },
  victoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  victoryCard: {
    padding: '48px 64px',
    borderRadius: 24,
    background: 'linear-gradient(135deg, #1a1a2e, #2d2d5e)',
    border: '2px solid rgba(255, 215, 0, 0.4)',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 0 60px rgba(255, 215, 0, 0.2)',
  },
  victoryCrown: {
    fontSize: 64,
    marginBottom: 8,
  },
  victoryName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  victoryStats: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  restartButton: {
    marginTop: 16,
    padding: '14px 40px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700, #ff8f00)',
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
};

export default GameBoard;
