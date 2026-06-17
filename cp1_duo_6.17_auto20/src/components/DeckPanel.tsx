import React, { useState } from 'react';
import { Card } from '../game/types';

interface DeckPanelProps {
  deckCount: number;
  discardCount: number;
  onDrawCard?: () => void;
  canDraw?: boolean;
}

const DeckPanel: React.FC<DeckPanelProps> = ({
  deckCount,
  discardCount,
  onDrawCard,
  canDraw = true
}) => {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDrawCard = () => {
    if (!canDraw || !onDrawCard || isDrawing) return;
    
    setIsDrawing(true);
    onDrawCard();
    
    setTimeout(() => {
      setIsDrawing(false);
    }, 600);
  };

  return (
    <div className="deck-panel">
      <div
        className={`deck-pile ${isDrawing ? 'drawing' : ''}`}
        onClick={handleDrawCard}
        title="牌堆 - 点击抽卡"
      >
        <div className="deck-count">{deckCount}</div>
        <div className="deck-label">牌堆</div>
      </div>
      
      <div className="discard-pile" title="弃牌堆">
        <div className="deck-count">{discardCount}</div>
        <div className="deck-label">弃牌</div>
      </div>
    </div>
  );
};

export default DeckPanel;
