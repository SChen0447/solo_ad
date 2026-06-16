import React from 'react';
import { Card } from '../game/CardDeck';
import { getCardBorderColor } from '../game/CardDeck';

interface CardProps {
  card: Card;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  size?: 'small' | 'normal' | 'large';
  showBack?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const CardComponent: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  size = 'normal',
  showBack = false,
  className = '',
  style = {}
}) => {
  const borderColor = getCardBorderColor(card.type);
  
  const sizeStyles = {
    small: {
      width: '80px',
      height: '112px',
      fontSize: '10px',
      padding: '6px'
    },
    normal: {
      width: '100px',
      height: '140px',
      fontSize: '12px',
      padding: '8px'
    },
    large: {
      width: '140px',
      height: '200px',
      fontSize: '14px',
      padding: '12px'
    }
  };
  
  const currentSize = sizeStyles[size];
  
  const cardStyle: React.CSSProperties = {
    ...currentSize,
    borderRadius: '12px',
    border: `3px solid ${borderColor}`,
    background: 'linear-gradient(145deg, #2a3441, #1a2029)',
    boxShadow: isSelected 
      ? `0 0 20px ${borderColor}, 0 0 40px ${borderColor}40` 
      : '0 4px 8px rgba(0,0,0,0.3)',
    cursor: isPlayable && onClick ? 'pointer' : 'default',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    transform: isSelected ? 'scale(1.1) translateY(-10px)' : 'scale(1)',
    opacity: showBack ? 0 : 1,
    ...style
  };
  
  const typeIcons: Record<string, string> = {
    attack: '⚔️',
    defense: '🛡️',
    heal: '💚',
    special: '✨'
  };
  
  const typeLabels: Record<string, string> = {
    attack: '攻击',
    defense: '防御',
    heal: '治疗',
    special: '特殊'
  };
  
  if (showBack) {
    return (
      <div
        className={`card-back ${className}`}
        style={{
          ...currentSize,
          borderRadius: '12px',
          border: '3px solid #4a5568',
          background: 'linear-gradient(145deg, #2d3748, #1a202c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        <div style={{
          width: '60%',
          height: '60%',
          borderRadius: '8px',
          border: '2px solid #4a5568',
          background: 'repeating-linear-gradient(45deg, #2d3748, #2d3748 5px, #1a202c 5px, #1a202c 10px)'
        }} />
      </div>
    );
  }
  
  return (
    <div
      className={`card ${isSelected ? 'card-selected' : ''} ${!isPlayable ? 'card-disabled' : ''} ${className}`}
      style={cardStyle}
      onClick={isPlayable && onClick ? onClick : undefined}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <span style={{ fontSize: size === 'small' ? '14px' : '18px' }}>
          {typeIcons[card.type]}
        </span>
        <div style={{
          width: size === 'small' ? '18px' : '24px',
          height: size === 'small' ? '18px' : '24px',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #f0e68c, #daa520)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a1a2e',
          fontWeight: 'bold',
          fontSize: size === 'small' ? '10px' : '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {card.cost}
        </div>
      </div>
      
      <div style={{
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '4px',
        fontSize: size === 'small' ? '10px' : '12px',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}>
        {card.name}
      </div>
      
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '4px'
      }}>
        {card.type === 'attack' && (
          <div style={{
            fontSize: size === 'small' ? '20px' : '28px',
            fontWeight: 'bold',
            color: '#FF4C4C',
            textShadow: '0 0 10px rgba(255,76,76,0.5)'
          }}>
            {card.value}
          </div>
        )}
        {card.type === 'defense' && (
          <div style={{
            fontSize: size === 'small' ? '20px' : '28px',
            fontWeight: 'bold',
            color: '#4CAF50',
            textShadow: '0 0 10px rgba(76,175,80,0.5)'
          }}>
            50%
          </div>
        )}
        {card.type === 'heal' && (
          <div style={{
            fontSize: size === 'small' ? '20px' : '28px',
            fontWeight: 'bold',
            color: '#00C853',
            textShadow: '0 0 10px rgba(0,200,83,0.5)'
          }}>
            +{card.value}
          </div>
        )}
        {card.type === 'special' && (
          <div style={{
            fontSize: size === 'small' ? '20px' : '28px',
            color: '#9C27B0',
            textShadow: '0 0 10px rgba(156,39,176,0.5)'
          }}>
            {card.specialType === 'draw' ? '🎴' : '💨'}
          </div>
        )}
      </div>
      
      <div style={{
        color: '#a0aec0',
        fontSize: size === 'small' ? '8px' : '10px',
        textAlign: 'center',
        lineHeight: 1.2
      }}>
        {card.description}
      </div>
      
      <div style={{
        marginTop: '4px',
        textAlign: 'center',
        fontSize: size === 'small' ? '8px' : '10px',
        color: borderColor,
        fontWeight: 'bold'
      }}>
        {typeLabels[card.type]}
      </div>
    </div>
  );
};

export default CardComponent;
