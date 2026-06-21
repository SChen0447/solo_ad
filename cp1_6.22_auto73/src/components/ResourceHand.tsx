import React, { useState } from 'react';
import { ResourceType, RESOURCE_COLORS, RESOURCE_NAMES, RESOURCE_ICONS, MAX_HAND_CARDS, MAX_TRADE_CARDS } from '../utils/gameData';

interface ResourceHandProps {
  resources: Record<ResourceType, number>;
  tradeCardCount: number;
  onDragStart: (type: ResourceType) => void;
  onDragEnd: () => void;
  disabled?: boolean;
}

const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;

const ResourceHand: React.FC<ResourceHandProps> = ({
  resources,
  tradeCardCount,
  onDragStart,
  onDragEnd,
  disabled = false
}) => {
  const [hoveredType, setHoveredType] = useState<ResourceType | null>(null);
  const [draggingType, setDraggingType] = useState<ResourceType | null>(null);

  const totalCards = Object.values(resources).reduce((sum, count) => sum + count, 0);
  const isHandFull = totalCards >= MAX_HAND_CARDS;

  const handleDragStart = (e: React.DragEvent, type: ResourceType) => {
    if (disabled || resources[type] <= 0 || tradeCardCount >= MAX_TRADE_CARDS) {
      e.preventDefault();
      return;
    }
    setDraggingType(type);
    e.dataTransfer.setData('resourceType', type);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(type);
  };

  const handleDragEnd = () => {
    setDraggingType(null);
    onDragEnd();
  };

  const renderCard = (type: ResourceType, count: number) => {
    const isHovered = hoveredType === type;
    const isDragging = draggingType === type;
    const isDisabled = count <= 0 || tradeCardCount >= MAX_TRADE_CARDS || disabled;

    return (
      <div
        key={type}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div
          draggable={!isDisabled}
          onDragStart={(e) => handleDragStart(e, type)}
          onDragEnd={handleDragEnd}
          onMouseEnter={() => setHoveredType(type)}
          onMouseLeave={() => setHoveredType(null)}
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: '12px',
            backgroundColor: RESOURCE_COLORS[type],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDisabled ? 'not-allowed' : 'grab',
            transition: 'all 0.2s ease',
            transform: isDragging 
              ? 'scale(1.2) translateY(-5px)' 
              : isHovered 
                ? 'translateY(-5px)' 
                : 'translateY(0)',
            boxShadow: isDragging
              ? '0 8px 25px rgba(0,0,0,0.5)'
              : isHovered
                ? '0 6px 20px rgba(0,0,0,0.4)'
                : '0 2px 8px rgba(0,0,0,0.3)',
            opacity: isDisabled ? 0.5 : 1,
            position: 'relative',
            userSelect: 'none'
          }}
        >
          <span style={{ fontSize: '36px', marginBottom: '8px' }}>
            {RESOURCE_ICONS[type]}
          </span>
          <span style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            {RESOURCE_NAMES[type]}
          </span>
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {count}
          </div>
        </div>
        {isDragging && (
          <div style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: '12px',
            border: '2px dashed rgba(255,255,255,0.3)',
            position: 'absolute',
            pointerEvents: 'none'
          }} />
        )}
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px' }}>
          资源手牌
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#a0aec0', fontSize: '14px' }}>
            {totalCards}/{MAX_HAND_CARDS}
          </span>
          {isHandFull && (
            <span style={{ 
              color: '#fc8181', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              手牌已满
            </span>
          )}
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        flex: 1,
        gap: '12px'
      }}>
        {Object.entries(resources)
          .filter(([type]) => type !== ResourceType.DESERT)
          .map(([type, count]) => renderCard(type as ResourceType, count))}
      </div>
      
      <div style={{
        color: '#718096',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        拖拽卡片到右侧交易区进行交换（最多 {MAX_TRADE_CARDS} 张）
      </div>
    </div>
  );
};

export default React.memo(ResourceHand);
