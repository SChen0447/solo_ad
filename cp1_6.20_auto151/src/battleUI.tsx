import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, ELEMENT_COLORS, ELEMENT_NAMES } from './cardData';
import {
  GameState,
  playCard,
  attack,
  startTurn,
  endTurn,
  directAttack,
  Difficulty,
  canPlayCard
} from './gameEngine';
import { decideAIAction, shouldAIEndTurn } from './aiPlayer';

interface BattleUIProps {
  initialGameState: GameState;
  difficulty: Difficulty;
  onGameEnd: (winner: 'player' | 'ai') => void;
  onBack: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
}

const BattleUI: React.FC<BattleUIProps> = ({ initialGameState, difficulty, onGameEnd, onBack }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedHandCard, setSelectedHandCard] = useState<CardInstance | null>(null);
  const [selectedFieldCard, setSelectedFieldCard] = useState<CardInstance | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showResult, setShowResult] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState.battleLog.length]);

  useEffect(() => {
    const newState = { ...gameState };
    startTurn(newState);
    setGameState({ ...newState });
  }, []);

  useEffect(() => {
    if (gameState.phase === 'gameOver' && !showResult) {
      setShowResult(true);
      if (gameState.winner === 'player') {
        createFireworks();
      }
      setTimeout(() => {
        onGameEnd(gameState.winner!);
      }, 3000);
    }
  }, [gameState.phase, gameState.winner]);

  useEffect(() => {
    if (gameState.currentTurn === 'ai' && gameState.phase !== 'gameOver' && !isAnimating) {
      runAITurn();
    }
  }, [gameState.currentTurn, gameState.phase]);

  const runAITurn = () => {
    setIsAnimating(true);
    processAIActions();
  };

  const processAIActions = () => {
    setTimeout(() => {
      setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState)) as GameState;

        if (shouldAIEndTurn(newState, difficulty)) {
          endTurn(newState);
          startTurn(newState);
          setIsAnimating(false);
          return newState;
        }

        const decision = decideAIAction(newState, difficulty);

        if (decision.type === 'playCard' && decision.card) {
          const cardInHand = newState.ai.hand.find(c => c.instanceId === decision.card!.instanceId);
          if (cardInHand && canPlayCard(newState.ai, cardInHand)) {
            playCard(newState.ai, cardInHand, newState.battleLog);
          }
        } else if (decision.type === 'attack' && decision.card && decision.target) {
          const attacker = newState.ai.field.find(c => c.instanceId === decision.card!.instanceId);
          const target = newState.player.field.find(c => c.instanceId === decision.target!.instanceId);
          if (attacker && target) {
            attack(newState, 'ai', attacker, target);
          }
        } else if (decision.type === 'directAttack' && decision.card) {
          const attacker = newState.ai.field.find(c => c.instanceId === decision.card!.instanceId);
          if (attacker) {
            directAttack(newState, 'ai', attacker);
          }
        }

        if (!shouldAIEndTurn(newState, difficulty)) {
          processAIActions();
        } else {
          setTimeout(() => {
            setGameState(s => {
              const ns = JSON.parse(JSON.stringify(s)) as GameState;
              endTurn(ns);
              startTurn(ns);
              setIsAnimating(false);
              return ns;
            });
          }, 800);
        }

        return newState;
      });
    }, 800);
  };

  const createFireworks = () => {
    const colors = ['#e63946', '#457b9d', '#a8dadc', '#f4a261', '#6c5b7b', '#ffd700', '#ff69b4'];
    const newParticles: Particle[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60;
      const speed = 3 + Math.random() * 5;
      newParticles.push({
        id: Date.now() + i,
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      });
    }
    setParticles(newParticles);

    setTimeout(() => {
      setParticles([]);
    }, 2000);
  };

  const handlePlayCard = (card: CardInstance) => {
    if (gameState.currentTurn !== 'player' || isAnimating) return;
    if (!canPlayCard(gameState.player, card)) return;

    setIsAnimating(true);
    setTimeout(() => {
      setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState)) as GameState;
        const cardInHand = newState.player.hand.find(c => c.instanceId === card.instanceId);
        if (cardInHand) {
          playCard(newState.player, cardInHand, newState.battleLog);
        }
        return newState;
      });
      setSelectedHandCard(null);
      setIsAnimating(false);
    }, 400);
  };

  const handleFieldCardClick = (card: CardInstance, isPlayer: boolean) => {
    if (gameState.currentTurn !== 'player' || isAnimating) return;

    if (isPlayer) {
      if (card.canAttack && !card.hasAttacked) {
        setSelectedFieldCard(card);
      }
    } else {
      if (selectedFieldCard) {
        setIsAnimating(true);
        setTimeout(() => {
          setGameState(prevState => {
            const newState = JSON.parse(JSON.stringify(prevState)) as GameState;
            const attacker = newState.player.field.find(c => c.instanceId === selectedFieldCard.instanceId);
            const target = newState.ai.field.find(c => c.instanceId === card.instanceId);
            if (attacker && target) {
              attack(newState, 'player', attacker, target);
            }
            return newState;
          });
          setSelectedFieldCard(null);
          setIsAnimating(false);
        }, 300);
      }
    }
  };

  const handleDirectAttack = () => {
    if (!selectedFieldCard || gameState.ai.field.length > 0) return;
    if (gameState.currentTurn !== 'player' || isAnimating) return;

    setIsAnimating(true);
    setTimeout(() => {
      setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState)) as GameState;
        const attacker = newState.player.field.find(c => c.instanceId === selectedFieldCard.instanceId);
        if (attacker) {
          directAttack(newState, 'player', attacker);
        }
        return newState;
      });
      setSelectedFieldCard(null);
      setIsAnimating(false);
    }, 300);
  };

  const handleEndTurn = () => {
    if (gameState.currentTurn !== 'player' || isAnimating) return;

    setGameState(prevState => {
      const newState = JSON.parse(JSON.stringify(prevState)) as GameState;
      endTurn(newState);
      startTurn(newState);
      return newState;
    });
    setSelectedHandCard(null);
    setSelectedFieldCard(null);
  };

  const handleSurrender = () => {
    setGameState(prev => {
      const newState = { ...prev };
      newState.winner = 'ai';
      newState.phase = 'gameOver';
      newState.battleLog.push('玩家投降了！');
      return newState;
    });
  };

  const renderManaDots = (current: number, max: number) => {
    const dots = [];
    for (let i = 0; i < max; i++) {
      dots.push(
        <div
          key={i}
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: i < current ? '#4a90d9' : '#2a3f5f',
            border: '2px solid #4a90d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {i === 0 && current > 0 ? current : ''}
        </div>
      );
    }
    return dots;
  };

  const renderCard = (card: CardInstance, isInHand: boolean, isPlayer: boolean, index: number) => {
    const isSelected = selectedHandCard?.instanceId === card.instanceId ||
                       selectedFieldCard?.instanceId === card.instanceId;
    const canPlay = isPlayer && isInHand && canPlayCard(gameState.player, card);
    const canAtk = isPlayer && !isInHand && card.canAttack && !card.hasAttacked;

    return (
      <motion.div
        key={card.instanceId}
        initial={{ scale: isInHand ? 0 : 0.5, opacity: 0 }}
        animate={{
          scale: isSelected ? 1.1 : 1,
          opacity: 1,
          y: isSelected && isInHand ? -15 : 0,
          filter: gameState.phase === 'gameOver' && isPlayer && gameState.winner === 'ai'
            ? 'grayscale(100%)'
            : 'none'
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={() => {
          if (isInHand && isPlayer) {
            setSelectedHandCard(isSelected ? null : card);
          } else if (!isInHand) {
            handleFieldCardClick(card, isPlayer);
          }
        }}
        className="card-item"
        style={{
          width: '80px',
          height: '120px',
          borderRadius: '8px',
          backgroundColor: 'white',
          border: `3px solid ${ELEMENT_COLORS[card.element]}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px',
          cursor: isPlayer ? 'pointer' : 'default',
          boxSizing: 'border-box',
          boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
          position: 'relative',
          opacity: isInHand && !canPlay && isPlayer ? 0.6 : 1,
          userSelect: 'none'
        }}
        whileHover={{ scale: isPlayer ? 1.05 : 1, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
      >
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: '#2a3f5f',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #4a90d9'
        }}>
          {card.cost}
        </div>

        <div style={{
          fontSize: '9px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '12px',
          color: '#333',
          lineHeight: '1.2'
        }}>
          {card.name}
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          {card.element === 'fire' && '🔥'}
          {card.element === 'water' && '💧'}
          {card.element === 'wind' && '🌪️'}
          {card.element === 'light' && '✨'}
          {card.element === 'dark' && '🌑'}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          <span style={{ color: '#e63946' }}>⚔{card.currentAttack}</span>
          <span style={{ color: '#2a9d8f' }}>❤{card.currentHealth}</span>
        </div>

        {canAtk && (
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#e63946',
            animation: 'pulse 1s infinite'
          }} />
        )}
      </motion.div>
    );
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
          animate={{
            x: p.x + p.vx * 100,
            y: p.y + p.vy * 100 - 100,
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: `0 0 ${p.size}px ${p.color}`
          }}
        />
      ))}

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 100
            }}
          >
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: gameState.winner === 'player' ? '#ffd700' : '#666',
              textShadow: '0 0 20px rgba(0,0,0,0.8)'
            }}>
              {gameState.winner === 'player' ? '🎉 胜利！' : '💀 失败...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#ff6b6b', fontSize: '14px' }}>🤖 AI</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {renderManaDots(gameState.ai.mana, gameState.ai.maxMana)}
          </div>
          <span style={{ color: '#e74c3c', fontSize: '14px', fontWeight: 'bold' }}>
            ❤ {gameState.ai.health}/{gameState.ai.maxHealth}
          </span>
          <span style={{ color: '#888', fontSize: '12px' }}>
            手牌: {gameState.ai.hand.length} | 牌库: {gameState.ai.deck.length}
          </span>
        </div>
        <div style={{ color: '#aaa', fontSize: '13px' }}>
          回合 {gameState.turn} | {gameState.currentTurn === 'player' ? '你的回合' : 'AI回合'}
        </div>
      </div>

      <div style={{
        flex: 0.3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '10px',
        minHeight: '130px'
      }}>
        {gameState.ai.field.map((card, i) => renderCard(card, false, false, i))}
        {gameState.ai.field.length === 0 && (
          <span style={{ color: '#555', fontSize: '12px' }}>AI战场空空如也</span>
        )}
      </div>

      <div style={{
        height: '100px',
        margin: '0 20px',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: '8px',
        padding: '8px',
        overflowY: 'auto',
        fontSize: '12px',
        color: '#ccc'
      }} ref={logRef}>
        {gameState.battleLog.map((log, i) => (
          <div key={i} style={{ marginBottom: '2px', color: log.includes('---') ? '#ffd700' : '#eee' }}>
            {log}
          </div>
        ))}
      </div>

      {selectedFieldCard && gameState.ai.field.length === 0 && gameState.currentTurn === 'player' && (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          backgroundColor: 'rgba(230, 57, 70, 0.3)'
        }}>
          <button
            onClick={handleDirectAttack}
            style={{
              padding: '8px 20px',
              backgroundColor: '#e63946',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            直接攻击敌方英雄！
          </button>
        </div>
      )}

      <div style={{
        flex: 0.3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '10px',
        minHeight: '130px'
      }}>
        {gameState.player.field.map((card, i) => renderCard(card, false, true, i))}
        {gameState.player.field.length === 0 && (
          <span style={{ color: '#555', fontSize: '12px' }}>你的战场空空如也</span>
        )}
      </div>

      <div style={{
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#4ecdc4', fontSize: '14px' }}>👤 玩家</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {renderManaDots(gameState.player.mana, gameState.player.maxMana)}
          </div>
          <span style={{ color: '#e74c3c', fontSize: '14px', fontWeight: 'bold' }}>
            ❤ {gameState.player.health}/{gameState.player.maxHealth}
          </span>
          <span style={{ color: '#888', fontSize: '12px' }}>
            牌库: {gameState.player.deck.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleEndTurn}
            disabled={gameState.currentTurn !== 'player' || isAnimating}
            style={{
              padding: '8px 16px',
              backgroundColor: gameState.currentTurn === 'player' ? '#457b9d' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: gameState.currentTurn === 'player' ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}
            onMouseOver={(e) => {
              if (gameState.currentTurn === 'player') e.currentTarget.style.backgroundColor = '#1d3557';
            }}
            onMouseOut={(e) => {
              if (gameState.currentTurn === 'player') e.currentTarget.style.backgroundColor = '#457b9d';
            }}
          >
            结束回合
          </button>
          <button
            onClick={handleSurrender}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e63946',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c1121f'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e63946'}
          >
            投降
          </button>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c5b7b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            返回
          </button>
        </div>
      </div>

      <div style={{
        height: '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        overflowX: 'auto'
      }}>
        {gameState.player.hand.map((card, i) => (
          <motion.div
            key={card.instanceId}
            onClick={() => handlePlayCard(card)}
            whileHover={{ y: -10 }}
            style={{ cursor: canPlayCard(gameState.player, card) ? 'pointer' : 'not-allowed' }}
          >
            {renderCard(card, true, true, i)}
          </motion.div>
        ))}
        {gameState.player.hand.length === 0 && (
          <span style={{ color: '#555', fontSize: '12px' }}>手牌为空</span>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        @media (max-width: 768px) {
          .card-item {
            width: 60px !important;
            height: 90px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BattleUI;
