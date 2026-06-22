import React from 'react';
import type { CardData, PlacedCard } from '../shared/types';
import { ELEMENT_COLORS, ELEMENT_NAMES } from '../shared/constants';

interface CardProps {
  card: CardData | PlacedCard;
  isSelected?: boolean;
  isFlipped?: boolean;
  isDraggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  showSkill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  small?: boolean;
}

const SKILL_ICONS: Record<string, string> = {
  combo: '⚡',
  shield: '🛡️',
  pierce: '🗡️',
  heal: '💚',
  taunt: '👊',
  dodge: '💨',
};

const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isFlipped = false,
  isDraggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  showSkill = true,
  className = '',
  style,
  small = false,
}) => {
  const elementColor = ELEMENT_COLORS[card.element];
  const sizeClass = small ? 'card-small' : '';

  if (isFlipped) {
    return (
      <div
        className={`card card-back ${sizeClass} ${className}`}
        style={style}
        onClick={onClick}
      >
        <div className="card-back-inner">
          <div className="card-back-pattern" />
          <div className="card-back-logo">✦</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card ${sizeClass} ${isSelected ? 'card-selected' : ''} ${className}`}
      style={{
        ...style,
        '--card-element-color': elementColor,
      } as React.CSSProperties}
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div
        className="card-header"
        style={{ background: `linear-gradient(135deg, ${elementColor}, ${elementColor}99)` }}
      >
        <span className="card-name">{card.name}</span>
        <span
          className="card-element-badge"
          style={{ background: elementColor }}
        >
          {ELEMENT_NAMES[card.element]}
        </span>
      </div>
      <div className="card-body">
        <div className="card-artwork" style={{ background: `${elementColor}22` }}>
          <span style={{ fontSize: small ? '28px' : '40px' }}>
            {ELEMENT_NAMES[card.element] === '火' ? '🔥' :
             ELEMENT_NAMES[card.element] === '水' ? '💧' :
             ELEMENT_NAMES[card.element] === '风' ? '🌪️' :
             ELEMENT_NAMES[card.element] === '地' ? '🪨' :
             ELEMENT_NAMES[card.element] === '光' ? '☀️' : '🌙'}
          </span>
        </div>
        <div className="card-stats">
          <div className="card-stat card-stat-attack">
            <span className="stat-icon">⚔️</span>
            <span className="stat-value">{card.attack}</span>
          </div>
          <div className="card-stat card-stat-defense">
            <span className="stat-icon">🛡️</span>
            <span className="stat-value">{card.defense}</span>
          </div>
        </div>
        {showSkill && (
          <div className="card-skill">
            <span className="skill-icon">{SKILL_ICONS[card.skill] || '✨'}</span>
            <div className="skill-info">
              <span className="skill-name">{card.skillName}</span>
              {!small && <span className="skill-desc">{card.skillDesc}</span>}
            </div>
          </div>
        )}
      </div>
      <div className="card-glow" />
    </div>
  );
};

export default Card;
