import React, { useEffect, useState } from 'react';
import { gameEngine } from '../game/GameEngine';
import { CARD_INFO, PLAY_PER_TURN } from '../game/CardDeck';
import { Card } from '../game/CardDeck';

export interface CardHandProps {
  onCardPlay: (cardId: string, targetX: number, targetY: number) => void;
  onCardSelect: (cardId: string | null) => void;
  flyingCard: any;
}

const CardHand: React.FC<CardHandProps> = ({ onCardPlay, onCardSelect, flyingCard }) => {
  const [, forceUpdate] = useState(0);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    return gameEngine.subscribe(() => forceUpdate((v) => v + 1));
  }, []);

  const player = gameEngine.getLocalPlayer();
  const hand = player?.hand || [];
  const selectedId = gameEngine.getState().selectedCardId;
  const isMyTurn = gameEngine.isMyTurn();
  const canPlay = gameEngine.canPlayCard();
  const cardsPlayed = player?.cardsPlayedThisTurn || 0;

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    if (!isMyTurn || !canPlay) {
      e.preventDefault();
      return;
    }
    onCardSelect(card.id);
    setDragging({ id: card.id, x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    const img = new Image();
    img.src =
      'data:image/svg+xml;base64,' +
      btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (selectedId === cardId) {
      onCardSelect(null);
    } else {
      onCardSelect(cardId);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(15,12,41,0.98) 100%)',
        borderTop: '2px solid rgba(212,175,55,0.4)',
        padding: '16px 24px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: 14 }}>
          🃏 手牌 ({hand.length}/7)
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          <span style={{ color: isMyTurn ? '#2ecc71' : '#b0b0b0' }}>
            {isMyTurn ? '🎯 你的回合' : '⏳ 等待中'}
          </span>
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '4px 12px',
              color: '#fff',
            }}
          >
            已出牌 <b style={{ color: '#d4af37' }}>{cardsPlayed}</b>/{PLAY_PER_TURN}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          alignItems: 'flex-end',
          minHeight: 180,
          flexWrap: 'wrap',
          perspective: '1000px',
        }}
      >
        {hand.length === 0 ? (
          <div
            style={{
              color: '#555',
              fontSize: 14,
              padding: 40,
            }}
          >
            手牌为空...
          </div>
        ) : (
          hand.map((card, idx) => {
            const info = CARD_INFO[card.type];
            const isSelected = selectedId === card.id;
            const offset = Math.abs(idx - (hand.length - 1) / 2) * 2;
            return (
              <div
                key={card.id}
                draggable={isMyTurn && canPlay}
                onDragStart={(e) => handleDragStart(e, card)}
                onDragEnd={handleDragEnd}
                onClick={() => handleCardClick(card.id)}
                style={{
                  width: 110,
                  height: 160,
                  borderRadius: 12,
                  background: `linear-gradient(160deg, ${info.color}dd 0%, ${info.color}88 100%)`,
                  border: isSelected
                    ? '3px solid #d4af37'
                    : '2px solid rgba(255,255,255,0.3)',
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isSelected
                    ? '0 12px 30px rgba(212,175,55,0.5), 0 0 20px rgba(212,175,55,0.3)'
                    : '0 6px 20px rgba(0,0,0,0.4)',
                  transform: isSelected
                    ? `translateY(-20px) scale(1.08) rotate(0deg)`
                    : `translateY(${offset}px) rotate(${(idx - (hand.length - 1) / 2) * 1.5}deg)`,
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  opacity: !isMyTurn ? 0.6 : isSelected ? 1 : 0.95,
                  position: 'relative',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (isMyTurn && !isSelected) {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      'translateY(-12px) scale(1.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isMyTurn && !isSelected) {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      `translateY(${offset}px) rotate(${(idx - (hand.length - 1) / 2) * 1.5}deg)`;
                  }
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 8,
                    right: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 11,
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  <span>{info.name}</span>
                  <span style={{ opacity: 0.6 }}>{idx + 1}</span>
                </div>
                <div
                  style={{
                    fontSize: 44,
                    marginTop: 28,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  }}
                >
                  {info.icon}
                </div>
                <div
                  style={{
                    color: 'white',
                    fontSize: 11,
                    textAlign: 'center',
                    lineHeight: 1.4,
                    opacity: 0.95,
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
                  {info.description}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.4)',
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CardHand;
