import React, { useRef, useEffect } from 'react';
import { Card as CardType, useGameStore } from './GameState';

interface CardProps {
  card: CardType;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

const toIsometric = (x: number, y: number, z: number = 0) => {
  const isoX = (x - y) * 0.5;
  const isoY = (x + y) * 0.25 - z;
  return { x: isoX, y: isoY };
};

export const CardComponent: React.FC<CardProps> = ({
  card,
  cellSize,
  boardOffsetX,
  boardOffsetY,
  isDragging = false,
  onMouseDown,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const animationRef = useRef<number>();

  const { draggingCardId, dragPosition, selectedCardId, selectCard, currentPlayer, phase, hasMoved } =
    useGameStore();

  const iso = toIsometric(card.position.x, card.position.y);
  const baseX = boardOffsetX + iso.x * cellSize;
  const baseY = boardOffsetY + iso.y * cellSize;

  const cardSize = cellSize * 0.8;
  const isSelected = selectedCardId === card.id;
  const isDraggingThis = draggingCardId === card.id;
  const canInteract = card.faction === currentPlayer && phase !== 'ai' && phase !== 'gameover';
  const canMove = canInteract && !hasMoved && card.type === 'hero';

  const factionColor = card.faction === 'player' ? '#3498db' : '#e74c3c';
  const lowHp = card.hp / card.maxHp < 0.3;

  useEffect(() => {
    if (isDraggingThis && dragPosition) {
      const animate = () => {
        const now = Date.now();
        trailRef.current = [
          { x: dragPosition.x, y: dragPosition.y, time: now },
          ...trailRef.current.filter((t) => now - t.time < 200),
        ];
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDraggingThis, dragPosition]);

  const renderTrail = () => {
    if (!isDraggingThis || trailRef.current.length < 2) return null;
    return (
      <svg
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
        }}
      >
        {trailRef.current.slice(1).map((point, i) => {
          const prev = trailRef.current[i];
          const age = (Date.now() - point.time) / 200;
          const opacity = 1 - age;
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={factionColor}
              strokeWidth={3 * (1 - age)}
              strokeLinecap="round"
              opacity={opacity * 0.6}
            />
          );
        })}
      </svg>
    );
  };

  if (card.type === 'obstacle') {
    return (
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: baseX - cardSize / 2,
          top: baseY - cardSize / 2,
          width: cardSize,
          height: cardSize,
          zIndex: Math.floor(card.position.y * 10),
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #555 0%, #333 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontSize: cardSize * 0.5,
          }}
        >
          {card.avatar}
        </div>
      </div>
    );
  }

  if (card.type === 'base') {
    const baseHeight = cellSize * 1.5;
    return (
      <div
        className="absolute flex items-end justify-center"
        style={{
          left: baseX - cardSize / 2,
          top: baseY - baseHeight,
          width: cardSize,
          height: baseHeight + cardSize * 0.3,
          zIndex: Math.floor(card.position.y * 10) + 5,
        }}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-end">
          <div
            className="absolute top-0 w-full"
            style={{
              height: cardSize * 0.5,
              clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
              background: `linear-gradient(135deg, ${factionColor} 0%, ${factionColor}aa 100%)`,
              filter: 'drop-shadow(0 0 10px rgba(241,196,15,0.5))',
            }}
          />
          <div
            className="w-full flex-1 flex items-center justify-center"
            style={{
              background: `linear-gradient(180deg, ${factionColor}cc 0%, ${factionColor}88 100%)`,
              border: `2px solid ${factionColor}`,
              borderRadius: '4px',
              marginTop: -1,
              fontSize: cardSize * 0.4,
              boxShadow: `0 0 20px ${factionColor}66, inset 0 0 20px rgba(255,255,255,0.1)`,
            }}
          >
            {card.avatar}
          </div>
          <div className="absolute -bottom-6 w-full">
            <div className="text-[10px] text-center text-white font-bold mb-1">
              {card.name}
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(card.hp / card.maxHp) * 100}%`,
                  backgroundColor: lowHp ? '#c0392b' : '#2ecc71',
                  animation: lowHp ? 'pulse 0.5s infinite' : 'none',
                }}
              />
            </div>
            <div className="text-[9px] text-center text-gray-300 mt-0.5">
              {card.hp}/{card.maxHp}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayX = isDraggingThis && dragPosition ? dragPosition.x : baseX;
  const displayY = isDraggingThis && dragPosition ? dragPosition.y : baseY;

  return (
    <>
      {renderTrail()}
      <div
        ref={cardRef}
        className={`absolute flex items-center justify-center transition-all ${
          canMove ? 'cursor-grab active:cursor-grabbing' : canInteract ? 'cursor-pointer' : ''
        } ${isDraggingThis ? 'z-[100]' : ''}`}
        style={{
          left: displayX - cardSize / 2,
          top: displayY - cardSize / 2,
          width: cardSize,
          height: cardSize,
          zIndex: isDraggingThis ? 1000 : Math.floor(card.position.y * 10) + 10,
          transform: isDraggingThis ? 'scale(1.1)' : isSelected ? 'scale(1.05)' : 'scale(1)',
          transition: isDraggingThis ? 'none' : 'transform 0.2s ease',
          opacity: isDragging ? 0 : 1,
        }}
        onMouseDown={(e) => {
          if (canMove && onMouseDown) {
            onMouseDown(e);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (canInteract && !isDragging) {
            if (isSelected) {
              selectCard(null);
            } else {
              selectCard(card.id);
            }
          }
          if (onClick) onClick();
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${factionColor}40 0%, transparent 70%)`,
            animation: 'breathe 2s ease-in-out infinite',
            transform: 'scale(1.3)',
          }}
        />

        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden ${
            isSelected ? 'ring-4 ring-yellow-400 ring-opacity-80' : ''
          }`}
          style={{
            background: `linear-gradient(135deg, ${factionColor}cc 0%, ${factionColor}88 100%)`,
            border: `2px solid ${factionColor}`,
            boxShadow: `
              0 0 ${isSelected ? '30px' : '15px'} ${factionColor}${isSelected ? '99' : '66'},
              inset 0 0 20px rgba(255,255,255,0.2)
            `,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
            }}
          />

          <div
            className="absolute inset-1 rounded-full"
            style={{
              border: `1px solid rgba(255,255,255,0.3)`,
            }}
          />

          <span
            className="relative z-10 select-none"
            style={{ fontSize: cardSize * 0.45 }}
          >
            {card.avatar}
          </span>

          {card.isMirror && (
            <div
              className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #a8e6cf 0%, #88d8b0 100%)',
                fontSize: '8px',
              }}
            >
              ◇
            </div>
          )}
        </div>

        <div className="absolute -bottom-5 w-full">
          <div className="text-[9px] text-center text-white font-bold mb-0.5 truncate">
            {card.name}
          </div>
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-0.5">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(card.hp / card.maxHp) * 100}%`,
                backgroundColor: lowHp ? '#c0392b' : '#2ecc71',
                animation: lowHp ? 'pulse 0.5s infinite' : 'none',
              }}
            />
          </div>
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(card.energy / card.maxEnergy) * 100}%`,
                backgroundColor: '#3498db',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

interface MiniCardProps {
  card: CardType;
}

export const MiniCard: React.FC<MiniCardProps> = ({ card }) => {
  const factionColor = card.faction === 'player' ? '#3498db' : '#e74c3c';
  const lowHp = card.hp / card.maxHp < 0.3;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${factionColor}cc 0%, ${factionColor}88 100%)`,
          border: `1px solid ${factionColor}`,
          boxShadow: `0 0 8px ${factionColor}66`,
          fontSize: '14px',
        }}
      >
        {card.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white font-medium truncate">{card.name}</div>
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-0.5">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(card.hp / card.maxHp) * 100}%`,
              backgroundColor: lowHp ? '#c0392b' : '#2ecc71',
              animation: lowHp ? 'pulse 0.5s infinite' : 'none',
            }}
          />
        </div>
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-0.5">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(card.energy / card.maxEnergy) * 100}%`,
              backgroundColor: '#3498db',
            }}
          />
        </div>
      </div>
    </div>
  );
};
