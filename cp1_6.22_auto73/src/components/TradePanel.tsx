import React, { useState, useRef } from 'react';
import { 
  ResourceType, 
  BuildingType,
  TradeCard,
  RESOURCE_COLORS, 
  RESOURCE_ICONS, 
  BUILDING_NAMES, 
  BUILDING_ICONS,
  BUILDING_COSTS,
  MAX_TRADE_CARDS,
  RESOURCE_TYPES
} from '../utils/gameData';

interface TradePanelProps {
  tradeCards: TradeCard[];
  onAddCard: (type: ResourceType) => void;
  onRemoveCard: (cardId: string) => void;
  onExecuteTrade: (buildingType: BuildingType) => void;
  canAfford: (buildingType: BuildingType) => boolean;
  disabled?: boolean;
}

const CARD_WIDTH = 60;
const CARD_HEIGHT = 90;

const TradePanel: React.FC<TradePanelProps> = ({
  tradeCards,
  onAddCard,
  onRemoveCard,
  onExecuteTrade,
  canAfford,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [pressedBuilding, setPressedBuilding] = useState<BuildingType | null>(null);
  const poolRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && tradeCards.length < MAX_TRADE_CARDS) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || tradeCards.length >= MAX_TRADE_CARDS) return;
    
    const resourceType = e.dataTransfer.getData('resourceType') as ResourceType;
    if (resourceType && resourceType !== ResourceType.DESERT) {
      onAddCard(resourceType);
    }
  };

  const handleBuildingClick = (type: BuildingType) => {
    if (disabled || !canAfford(type)) return;
    
    setPressedBuilding(type);
    setTimeout(() => {
      setPressedBuilding(null);
      onExecuteTrade(type);
    }, 100);
  };

  const renderCost = (type: BuildingType) => {
    const cost = BUILDING_COSTS[type];
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(cost)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => (
            <span key={resource} style={{ fontSize: '11px', color: '#a0aec0' }}>
              {RESOURCE_ICONS[resource as ResourceType]}×{amount}
            </span>
          ))}
      </div>
    );
  };

  const renderTradeCard = (card: TradeCard) => {
    const scale = card.animating ? Math.max(0, 1 - card.animationProgress) : 1;
    const opacity = card.animating ? Math.max(0, 1 - card.animationProgress) : 1;
    const blur = card.animating ? card.animationProgress * 3 : 0;
    
    return (
      <div
        key={card.id}
        style={{
          position: 'relative',
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: '8px',
          backgroundColor: RESOURCE_COLORS[card.type],
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: card.animating ? 'all 0.5s ease-out' : 'all 0.2s ease',
          transform: `scale(${scale})`,
          opacity,
          filter: card.animating ? `blur(${blur}px)` : 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        <span style={{ fontSize: '24px' }}>
          {RESOURCE_ICONS[card.type]}
        </span>
        <button
          onClick={() => !card.animating && onRemoveCard(card.id)}
          disabled={card.animating || disabled}
          style={{
            position: 'absolute',
            bottom: '-8px',
            left: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#e53e3e',
            color: '#fff',
            border: '2px solid #fff',
            cursor: card.animating || disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: 0,
            opacity: card.animating || disabled ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          ×
        </button>
      </div>
    );
  };

  const renderBuildingCard = (type: BuildingType) => {
    const affordable = canAfford(type);
    const isPressed = pressedBuilding === type;
    
    return (
      <div
        key={type}
        onClick={() => handleBuildingClick(type)}
        style={{
          backgroundColor: affordable ? '#4a5568' : '#2d3748',
          borderRadius: '12px',
          padding: '12px',
          cursor: affordable && !disabled ? 'pointer' : 'not-allowed',
          transition: 'all 0.1s ease',
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          opacity: affordable && !disabled ? 1 : 0.5,
          border: '2px solid',
          borderColor: affordable ? '#68d391' : '#4a5568',
          minWidth: '100px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '4px' }}>
          {BUILDING_ICONS[type]}
        </div>
        <div style={{ 
          color: '#e2e8f0', 
          fontSize: '13px', 
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
          {BUILDING_NAMES[type]}
        </div>
        {renderCost(type)}
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#2d3748',
      borderRadius: '16px',
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px' }}>
        交易区
      </h3>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragOver ? '#68d391' : '#4a5568'}`,
          borderRadius: '12px',
          padding: '16px',
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          transition: 'all 0.2s ease',
          backgroundColor: isDragOver ? 'rgba(104, 211, 145, 0.1)' : 'transparent'
        }}
      >
        {tradeCards.length === 0 ? (
          <span style={{ color: '#718096', fontSize: '14px' }}>
            拖入资源卡进行交易 ({tradeCards.length}/{MAX_TRADE_CARDS})
          </span>
        ) : (
          <>
            {tradeCards.map(renderTradeCard)}
            <span style={{ color: '#718096', fontSize: '12px', marginLeft: '8px' }}>
              {tradeCards.length}/{MAX_TRADE_CARDS}
            </span>
          </>
        )}
      </div>
      
      <div ref={poolRef} style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: '#1a202c',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#718096'
      }}>
        <span>📦 资源池</span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ margin: 0, color: '#a0aec0', fontSize: '14px' }}>
          可交换建筑
        </h4>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {[BuildingType.ROAD, BuildingType.VILLAGE, BuildingType.CITY].map(renderBuildingCard)}
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingTop: '8px',
        borderTop: '1px solid #4a5568'
      }}>
        {RESOURCE_TYPES.map(type => (
          <div key={type} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#a0aec0'
          }}>
            <span>{RESOURCE_ICONS[type]}</span>
            <span>{RESOURCE_COLORS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(TradePanel);
