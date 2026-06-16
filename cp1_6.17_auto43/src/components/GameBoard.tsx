import React, { useEffect, useState, useCallback } from 'react';
import { GameState, BattleAnimation, CardPlayResult } from '../game/GameManager';
import { Card } from '../game/CardDeck';
import CardComponent from './Card';
import PlayerInfo from './PlayerInfo';

interface GameBoardProps {
  gameState: GameState;
  selectedCardId: string | null;
  targetPhase: 'none' | 'selecting' | 'animating';
  battleAnimation: BattleAnimation | null;
  onCardSelect: (cardId: string | null) => void;
  onAttack: (cardId: string) => void;
  onEndTurn: () => void;
  canPlayCard: (card: Card) => boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  selectedCardId,
  targetPhase,
  battleAnimation,
  onCardSelect,
  onAttack,
  onEndTurn,
  canPlayCard
}) => {
  const [showDamage, setShowDamage] = useState<{ amount: number; isHeal: boolean; target: 'me' | 'opponent' } | null>(null);
  const [opponentHit, setOpponentHit] = useState(false);
  const [meHit, setMeHit] = useState(false);
  const [meDefending, setMeDefending] = useState(false);
  const [opponentDefending, setOpponentDefending] = useState(false);
  const [meHealing, setMeHealing] = useState(false);
  const [opponentHealing, setOpponentHealing] = useState(false);
  const [flyingCard, setFlyingCard] = useState<{ card: Card; from: 'me' | 'opponent'; to: 'me' | 'opponent' } | null>(null);
  const [specialEffect, setSpecialEffect] = useState<{ type: string; target: 'me' | 'opponent' } | null>(null);

  const handleCardClick = useCallback((card: Card) => {
    if (!canPlayCard(card)) return;
    
    if (selectedCardId === card.id) {
      onCardSelect(null);
    } else {
      onCardSelect(card.id);
    }
  }, [selectedCardId, canPlayCard, onCardSelect]);

  const handleOpponentClick = useCallback(() => {
    if (targetPhase === 'selecting' && selectedCardId) {
      onAttack(selectedCardId);
    }
  }, [targetPhase, selectedCardId, onAttack]);

  useEffect(() => {
    if (battleAnimation) {
      const { type, card, fromPlayer, targetPlayer } = battleAnimation;
      
      setFlyingCard({ card, from: fromPlayer, to: targetPlayer });
      
      const animationTimer = setTimeout(() => {
        setFlyingCard(null);
        
        if (type === 'attack') {
          if (targetPlayer === 'me') {
            setMeHit(true);
            setTimeout(() => setMeHit(false), 400);
          } else {
            setOpponentHit(true);
            setTimeout(() => setOpponentHit(false), 400);
          }
        } else if (type === 'defense') {
          if (fromPlayer === 'me') {
            setMeDefending(true);
          } else {
            setOpponentDefending(true);
          }
          setTimeout(() => {
            setMeDefending(false);
            setOpponentDefending(false);
          }, 800);
        } else if (type === 'heal') {
          if (fromPlayer === 'me') {
            setMeHealing(true);
            setTimeout(() => setMeHealing(false), 800);
          } else {
            setOpponentHealing(true);
            setTimeout(() => setOpponentHealing(false), 800);
          }
        } else if (type === 'special') {
          setSpecialEffect({ type: card.specialType || 'draw', target: targetPlayer });
          setTimeout(() => setSpecialEffect(null), 800);
        }
      }, 500);
      
      return () => clearTimeout(animationTimer);
    }
  }, [battleAnimation]);

  const myHand = gameState.me.hand || [];

  const boardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #0B0C10 0%, #1F2833 100%)',
    position: 'relative',
    overflow: 'hidden'
  };

  const battleZoneStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    margin: '20px 0'
  };

  const handAreaStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '12px',
    padding: '16px',
    background: 'rgba(45, 55, 72, 0.6)',
    borderRadius: '16px 16px 0 0',
    minHeight: '180px',
    borderTop: '3px solid #4a5568'
  };

  const opponentHandStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px',
    minHeight: '80px'
  };

  const turnIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '12px 24px',
    background: gameState.isMyTurn 
      ? 'linear-gradient(145deg, #2196F3, #1976D2)' 
      : 'linear-gradient(145deg, #FF9800, #F57C00)',
    color: '#fff',
    borderRadius: '24px',
    fontWeight: 'bold',
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 10,
    whiteSpace: 'nowrap'
  };

  const endTurnButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '20px',
    bottom: '200px',
    padding: '12px 24px',
    background: gameState.isMyTurn 
      ? 'linear-gradient(145deg, #4CAF50, #388E3C)' 
      : '#4a5568',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: gameState.isMyTurn ? 'pointer' : 'not-allowed',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: gameState.isMyTurn ? '0 4px 12px rgba(76,175,80,0.3)' : 'none',
    transition: 'all 0.2s ease',
    zIndex: 10
  };

  const turnNumberStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#a0aec0',
    fontSize: '14px',
    zIndex: 5
  };

  const targetHintStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#FFD700',
    fontSize: '18px',
    fontWeight: 'bold',
    animation: 'pulse 1s ease-in-out infinite',
    zIndex: 5
  };

  const flyingCardStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 100,
    transition: 'all 0.5s ease-in-out',
    pointerEvents: 'none'
  };

  const getFlyingCardPosition = () => {
    if (!flyingCard) return {};
    
    if (flyingCard.from === 'me' && flyingCard.to === 'opponent') {
      return {
        bottom: '30%',
        left: '50%',
        transform: 'translateX(-50%) translateY(-200px) scale(0.8)',
        opacity: 0.8
      };
    } else if (flyingCard.from === 'opponent' && flyingCard.to === 'me') {
      return {
        top: '30%',
        left: '50%',
        transform: 'translateX(-50%) translateY(200px) scale(0.8)',
        opacity: 0.8
      };
    }
    
    return {};
  };

  return (
    <div style={boardStyle} className="game-board">
      <div style={turnNumberStyle}>第 {gameState.turnNumber} 回合</div>
      
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <PlayerInfo
          player={gameState.opponent}
          isOpponent={true}
          isTargetable={targetPhase === 'selecting'}
          isHit={opponentHit}
          isDefending={opponentDefending || gameState.opponent.defenseActive}
          isHealing={opponentHealing}
          onClick={handleOpponentClick}
        />
      </div>
      
      <div style={opponentHandStyle}>
        {[...Array(gameState.opponent.handSize)].map((_, i) => (
          <div key={i} style={{
            width: '60px',
            height: '84px',
            borderRadius: '8px',
            border: '2px solid #4a5568',
            background: 'linear-gradient(145deg, #2d3748, #1a202c)',
          }} />
        ))}
      </div>
      
      <div style={battleZoneStyle}>
        {targetPhase === 'selecting' && (
          <div style={targetHintStyle}>👆 点击敌方头像发动攻击</div>
        )}
        
        <div style={turnIndicatorStyle}>
          {gameState.isMyTurn ? '⚡ 你的回合' : '⏳ 对手回合'}
        </div>
        
        {battleAnimation && (
          <div style={{ ...flyingCardStyle, ...getFlyingCardPosition() }}>
            <CardComponent card={battleAnimation.card} size="normal" />
          </div>
        )}
        
        {specialEffect && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
            animation: 'spin 0.8s ease-out',
            zIndex: 50
          }}>
            {specialEffect.type === 'draw' ? '🎴' : '💨'}
          </div>
        )}
      </div>
      
      <button
        style={endTurnButtonStyle}
        onClick={onEndTurn}
        disabled={!gameState.isMyTurn}
        className="end-turn-btn"
      >
        结束回合
      </button>
      
      <div style={handAreaStyle} className="hand-area">
        {myHand.map((card, index) => (
          <div
            key={card.id}
            style={{
              transform: `rotate(${(index - (myHand.length - 1) / 2) * 3}deg)`,
              transformOrigin: 'bottom center',
              transition: 'all 0.2s ease'
            }}
            className="card-in-hand"
          >
            <CardComponent
              card={card}
              isSelected={selectedCardId === card.id}
              isPlayable={canPlayCard(card)}
              onClick={() => handleCardClick(card)}
              size="normal"
            />
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <PlayerInfo
          player={gameState.me}
          isOpponent={false}
          isHit={meHit}
          isDefending={meDefending || gameState.me.defenseActive}
          isHealing={meHealing}
        />
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) translateY(-2px); }
          75% { transform: translateX(5px) translateY(2px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1);
          }
        }
        
        @keyframes spin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg) scale(1.5);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) scale(1);
          }
        }
        
        .card-in-hand:hover {
          z-index: 10;
        }
        
        @media (max-width: 1280px) {
          .hand-area {
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GameBoard;
