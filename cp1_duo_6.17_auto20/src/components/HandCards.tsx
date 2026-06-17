import React from 'react';
import { Card } from '../game/types';

interface HandCardsProps {
  cards: Card[];
  selectedCardId?: string | null;
  currentMana: number;
  onCardSelect?: (card: Card) => void;
  isPlayerTurn?: boolean;
}

const HandCards: React.FC<HandCardsProps> = ({
  cards,
  selectedCardId,
  currentMana,
  onCardSelect,
  isPlayerTurn = true
}) => {
  const handleCardClick = (card: Card) => {
    if (!isPlayerTurn) return;
    if (currentMana < card.cost) return;
    if (onCardSelect) {
      onCardSelect(card);
    }
  };

  const getCardTypeLabel = (type: string) => {
    return type === 'spell' ? '法术' : '生物';
  };

  const getRareBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return '2px solid #ffffff';
      case 'rare': return '3px solid #4a9eff';
      case 'epic': return '3px solid #a855f7';
      case 'legendary': return '4px solid #f59e0b';
      default: return '2px solid #ffffff';
    }
  };

  const getElementIcon = (element: string) => {
    const icons: Record<string, string> = {
      fire: '🔥',
      ice: '❄️',
      thunder: '⚡',
      shadow: '🌑',
      light: '✨',
      nature: '🌿'
    };
    return icons[element] || '?';
  };

  return (
    <div className="hand-cards-container">
      {cards.map((card, index) => {
        const isSelected = selectedCardId === card.instance_id;
        const isPlayable = currentMana >= card.cost && isPlayerTurn;
        const rotation = (index - (cards.length - 1) / 2) * 5;
        const translateY = Math.abs(index - (cards.length - 1) / 2) * 8;
        
        return (
          <div
            key={card.instance_id}
            className={`hand-card ${card.rarity} ${card.element} ${isSelected ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`}
            style={{
              transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
              zIndex: isSelected ? 20 : index
            }}
            onClick={() => handleCardClick(card)}
            title={card.description}
          >
            <div className="card-cost">{card.cost}</div>
            <div className="card-name">{card.name}</div>
            <div className={`card-art ${card.element}`}>
              {getElementIcon(card.element)}
            </div>
            <div className="card-type">
              {getCardTypeLabel(card.type)} · {card.element === 'fire' ? '火焰' : card.element === 'ice' ? '寒冰' : card.element === 'thunder' ? '雷电' : card.element === 'shadow' ? '暗影' : card.element === 'light' ? '光明' : '自然'}
            </div>
            <div className="card-description">{card.description}</div>
            
            {card.type === 'creature' && (
              <div className="card-stats">
                <div className="card-attack">{card.attack}</div>
                <div className="card-health">{card.health}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandCards;
