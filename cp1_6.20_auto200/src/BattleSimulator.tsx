import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, BattleCell, AttackState, THEME, SIZES, RARITY_CONFIG, ANIMATION_CONFIG } from './types';
import { renderCardToCanvas } from './utils';

interface BattleSimulatorProps {
  cards: Card[];
  battleGrid: {
    player: BattleCell[][];
    enemy: BattleCell[][];
  };
  selectedAttacker: { row: number; col: number } | null;
  attackState: AttackState;
  onSelectAttacker: (pos: { row: number; col: number } | null) => void;
  onPlaceCard: (card: Card, row: number, col: number, side: 'player' | 'enemy') => void;
  onRemoveCard: (row: number, col: number, side: 'player' | 'enemy') => void;
  onAttack: (targetRow: number, targetCol: number) => void;
}

const BattleSimulator = ({
  cards,
  battleGrid,
  selectedAttacker,
  attackState,
  onSelectAttacker,
  onPlaceCard,
  onRemoveCard,
  onAttack
}: BattleSimulatorProps) => {
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [hpAnimating, setHpAnimating] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (attackState.active) {
      const timer = setTimeout(() => {
        battleGrid.enemy.forEach(row => {
          row.forEach(cell => {
            if (cell.card) {
              const key = `hp-enemy-${cell.row}-${cell.col}`;
              setHpAnimating(prev => new Set(prev).add(key));
              setTimeout(() => {
                setHpAnimating(prev => {
                  const next = new Set(prev);
                  next.delete(key);
                  return next;
                });
              }, ANIMATION_CONFIG.hpUpdate.duration * 1000);
            }
          });
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [attackState.active, battleGrid.enemy]);

  const handlePlayerCellClick = (row: number, col: number) => {
    const cell = battleGrid.player[row][col];
    if (cell.card) {
      if (selectedAttacker?.row === row && selectedAttacker?.col === col) {
        onSelectAttacker(null);
      } else {
        onSelectAttacker({ row, col });
      }
    } else if (draggedCard) {
      onPlaceCard(draggedCard, row, col, 'player');
      setDraggedCard(null);
    }
  };

  const handleEnemyCellClick = (row: number, col: number) => {
    const cell = battleGrid.enemy[row][col];
    if (cell.card && selectedAttacker) {
      onAttack(row, col);
    } else if (cell.card && !selectedAttacker) {
      onRemoveCard(row, col, 'enemy');
    } else if (!cell.card && draggedCard) {
      onPlaceCard(draggedCard, row, col, 'enemy');
      setDraggedCard(null);
    }
  };

  const renderCell = (
    cell: BattleCell,
    side: 'player' | 'enemy'
  ) => {
    const cardCanvasRef = useRef<HTMLCanvasElement>(null);
    const isSelected =
      side === 'player' &&
      selectedAttacker?.row === cell.row &&
      selectedAttacker?.col === cell.col;
    const canAttack = side === 'enemy' && selectedAttacker && cell.card;
    const hpKey = `hp-${side}-${cell.row}-${cell.col}`;
    const isHpAnimating = hpAnimating.has(hpKey);

    useEffect(() => {
      if (cell.card && cardCanvasRef.current) {
        renderCardToCanvas(
          cardCanvasRef.current,
          cell.card,
          SIZES.cellSize - 8,
          SIZES.cellSize - 8
        );
      }
    }, [cell.card]);

    return (
      <div
        key={`${side}-${cell.row}-${cell.col}`}
        onClick={() =>
          side === 'player'
            ? handlePlayerCellClick(cell.row, cell.col)
            : handleEnemyCellClick(cell.row, cell.col)
        }
        onDragOver={e => e.preventDefault()}
        onDrop={() => {
          if (draggedCard && !cell.card) {
            onPlaceCard(draggedCard, cell.row, cell.col, side);
            setDraggedCard(null);
          }
        }}
        style={{
          width: SIZES.cellSize,
          height: SIZES.cellSize,
          border: `0.5px dashed ${THEME.gridLine}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: cell.card
            ? side === 'player'
              ? 'pointer'
              : selectedAttacker
              ? 'crosshair'
              : 'pointer'
            : draggedCard
            ? 'copy'
            : 'default',
          backgroundColor: isSelected
            ? 'rgba(233, 69, 96, 0.2)'
            : canAttack
            ? 'rgba(76, 175, 80, 0.2)'
            : 'rgba(255, 255, 255, 0.02)',
          transition: 'background-color 0.15s ease',
          position: 'relative'
        }}
      >
        {cell.card && (
          <div
            id={`card-${side}-${cell.row}-${cell.col}`}
            style={{
              position: 'relative',
              width: SIZES.cellSize - 8,
              height: SIZES.cellSize - 8
            }}
          >
            <canvas
              ref={cardCanvasRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '4px',
                display: 'block'
              }}
            />
            {isHpAnimating && (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0.7, 1.1, 1] }}
                transition={{ duration: ANIMATION_CONFIG.hpUpdate.duration }}
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#FF6B6B',
                  pointerEvents: 'none'
                }}
              >
                {cell.card.currentHp ?? cell.card.hp}
              </motion.div>
            )}
          </div>
        )}
        {!cell.card && draggedCard && (
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.3)',
              textAlign: 'center'
            }}
          >
            放置
          </div>
        )}
      </div>
    );
  };

  const renderGrid = (grid: BattleCell[][], side: 'player' | 'enemy') => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${SIZES.cellSize}px)`,
        gridTemplateRows: `repeat(3, ${SIZES.cellSize}px)`,
        gap: '0px'
      }}
    >
      {grid.map(row => row.map(cell => renderCell(cell, side)))}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%'
      }}
    >
      <div
        style={{
          width: '240px',
          backgroundColor: '#16162A',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 16px',
          overflowY: 'auto'
        }}
      >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '16px',
          color: THEME.text
        }}
      >
        可用卡牌
      </h3>
      {cards.length === 0 ? (
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
          暂无卡牌，请先在编辑器中创建卡牌
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cards.map(card => (
            <motion.div
              key={card.id}
              draggable
              onDragStart={() => setDraggedCard(card)}
              onDragEnd={() => setDraggedCard(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                border: `2px solid ${RARITY_CONFIG[card.rarity].color}40`,
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  background: `linear-gradient(135deg, ${RARITY_CONFIG[card.rarity].gradient.start}, ${RARITY_CONFIG[card.rarity].gradient.end})`
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: THEME.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {card.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    gap: '8px'
                  }}
                >
                  <span>❤ {card.hp}</span>
                  <span>⚔ {card.attack}</span>
                </div>
              </div>
              </motion.div>
          ))}
        </div>
      )}
    </div>

      <div
        id="battle-container"
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '40px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          {selectedAttacker ? '点击敌方卡牌进行攻击' : '拖拽卡牌到战场，点击己方卡牌选择攻击者'}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginBottom: '8px'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '8px'
            }}
          >
            敌方阵地
          </div>
          {renderGrid(battleGrid.enemy, 'enemy')}
        </div>

        <div
          style={{
            width: '300px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
          }}
        />

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '8px'
            }}
          >
            己方阵地
          </div>
          {renderGrid(battleGrid.player, 'player')}
        </div>

        <AnimatePresence>
          {attackState.active && attackState.from && attackState.to && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible'
              }}
            >
              <defs>
                <linearGradient id="attackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <motion.line
                x1={attackState.from.x}
                y1={attackState.from.y}
                x2={attackState.to.x}
                y2={attackState.to.y}
                stroke="url(#attackGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: ANIMATION_CONFIG.attack.duration,
                  ease: 'easeOut'
                }}
              />
              <motion.circle
                cx={attackState.to.x}
                cy={attackState.to.y}
                r="15"
                fill="rgba(255, 255, 255, 0.6)"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: ANIMATION_CONFIG.attack.duration,
                  ease: 'easeOut'
                }}
              />
            </svg>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BattleSimulator;
