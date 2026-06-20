import React, { useEffect, useRef, useState } from 'react';
import { gameEngine, cellKey } from '../game/GameEngine';
import { GameState, HexCell } from '../game/GameEngine';
import { BOARD_SIZE, getNeighbors } from '../game/CardDeck';
import { CARD_INFO } from '../game/CardDeck';

const HEX_SIZE = 40;
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
const HEX_HEIGHT = HEX_SIZE * 2;
const ROW_SPACING = HEX_HEIGHT * 0.75;

export interface BoardProps {
  onCellClick: (q: number, r: number) => void;
  onPlayCardToTarget: (target: { q: number; r: number; fromQ?: number; fromR?: number }) => void;
  flyingCard?: {
    cardId: string;
    cardType: string;
    fromX: number;
    fromY: number;
    toQ: number;
    toR: number;
  } | null;
}

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_WIDTH * (q + r / 2) + HEX_WIDTH;
  const y = ROW_SPACING * r + HEX_HEIGHT;
  return { x, y };
}

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

const Board: React.FC<BoardProps> = ({ onCellClick, onPlayCardToTarget, flyingCard }) => {
  const [, forceUpdate] = useState(0);
  const [glowingCell, setGlowingCell] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    return gameEngine.subscribe(() => forceUpdate((v) => v + 1));
  }, []);

  useEffect(() => {
    const action = gameEngine.getState().lastAction;
    if (action && action.target) {
      const key = cellKey(action.target.q, action.target.r);
      setGlowingCell(key);
      const timer = setTimeout(() => setGlowingCell(null), 300);
      return () => clearTimeout(timer);
    }
  }, [gameEngine.getState().lastAction?.timestamp]);

  const state = gameEngine.getState();
  const board = state.board;
  const selectedCard = gameEngine.getSelectedCard();
  const selectedMoveFrom = state.selectedMoveFrom;
  const localPlayerId = gameEngine.getLocalPlayerId();

  const cells: React.ReactNode[] = [];
  for (let q = 0; q < BOARD_SIZE; q++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const key = cellKey(q, r);
      const cell = board[key];
      if (!cell) continue;
      const { x, y } = hexToPixel(q, r);
      const points = hexPoints(x, y, HEX_SIZE);

      let fill = 'rgba(176, 176, 176, 0.5)';
      if (cell.owner) {
        const player = state.players[cell.owner];
        if (player) {
          fill = cell.blocked
            ? player.color + '66'
            : player.color;
        }
      }

      let stroke = '#ffffff';
      let strokeWidth = 2;
      let opacity = 1;

      const isMoveFromSelected =
        selectedMoveFrom && selectedMoveFrom[0] === q && selectedMoveFrom[1] === r;
      const isValidTarget =
        selectedCard &&
        (selectedCard.type === 'move'
          ? selectedMoveFrom
            ? gameEngine.validateTarget(
                selectedCard.type,
                q,
                r,
                localPlayerId,
                selectedMoveFrom[0],
                selectedMoveFrom[1],
              )
            : cell.owner === localPlayerId && !cell.blocked
          : gameEngine.isTargetValid(q, r));

      if (isMoveFromSelected) {
        strokeWidth = 4;
        stroke = '#d4af37';
      }
      if (isValidTarget) {
        strokeWidth = 3;
        stroke = '#d4af37';
        opacity = 1;
      }
      if (dragOverCell === key && isValidTarget) {
        strokeWidth = 5;
        stroke = '#ffffff';
      }

      const isGlowing = glowingCell === key;

      cells.push(
        <g
          key={key}
          className="hex-cell-group"
          style={{ cursor: 'pointer' }}
          onClick={() => handleCellClick(q, r, cell)}
          onDragOver={(e) => {
            if (isValidTarget) {
              e.preventDefault();
              setDragOverCell(key);
            }
          }}
          onDragLeave={() => setDragOverCell(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverCell(null);
            if (isValidTarget) {
              const target: any = { q, r };
              if (selectedCard?.type === 'move' && selectedMoveFrom) {
                target.fromQ = selectedMoveFrom[0];
                target.fromR = selectedMoveFrom[1];
              } else if (selectedCard?.type === 'move' && !selectedMoveFrom) {
                gameEngine.selectMoveFrom(q, r);
                return;
              }
              onPlayCardToTarget(target);
            }
          }}
        >
          {isGlowing && (
            <polygon
              points={points}
              fill="white"
              opacity="0.6"
              style={{
                animation: 'cellGlow 0.3s ease-out forwards',
                transformOrigin: `${x}px ${y}px`,
              }}
            />
          )}
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            style={{
              transition: 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease',
              filter: cell.blocked ? 'grayscale(60%)' : 'none',
            }}
          />
          {cell.durability > 0 && (
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              pointerEvents="none"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              {cell.blocked ? '🔒' : cell.durability}
            </text>
          )}
          {isValidTarget && selectedCard && (
            <circle
              cx={x}
              cy={y - 28}
              r={10}
              fill={CARD_INFO[selectedCard.type]?.color || '#d4af37'}
              opacity="0.9"
              style={{ animation: 'targetPulse 0.8s ease-in-out infinite' }}
            />
          )}
        </g>,
      );
    }
  }

  function handleCellClick(q: number, r: number, cell: HexCell) {
    const selectedCard = gameEngine.getSelectedCard();
    if (selectedCard) {
      if (selectedCard.type === 'move') {
        if (!state.selectedMoveFrom) {
          if (cell.owner === localPlayerId && !cell.blocked) {
            gameEngine.selectMoveFrom(q, r);
            return;
          }
        } else {
          const [fromQ, fromR] = state.selectedMoveFrom;
          if (fromQ === q && fromR === r) {
            gameEngine.clearSelection();
            return;
          }
          if (gameEngine.validateTarget(selectedCard.type, q, r, localPlayerId, fromQ, fromR)) {
            onPlayCardToTarget({ q, r, fromQ, fromR });
            return;
          }
        }
      } else if (gameEngine.isTargetValid(q, r)) {
        onPlayCardToTarget({ q, r });
        return;
      }
    }
    onCellClick(q, r);
  }

  const totalWidth = HEX_WIDTH * (BOARD_SIZE + BOARD_SIZE / 2) + HEX_WIDTH * 2;
  const totalHeight = ROW_SPACING * (BOARD_SIZE - 1) + HEX_HEIGHT * 2;

  return (
    <div className="board-container" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 60px rgba(212,175,55,0.05)',
      border: '2px solid rgba(212,175,55,0.3)',
    }}>
      <svg
        ref={svgRef}
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ display: 'block' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {cells}
        {flyingCard && (() => {
          const to = hexToPixel(flyingCard.toQ, flyingCard.toR);
          const cardType = flyingCard.cardType as keyof typeof CARD_INFO;
          const info = CARD_INFO[cardType];
          return (
            <g
              style={{
                animation: 'cardFly 0.4s ease-out forwards',
                transformOrigin: `${flyingCard.fromX}px ${flyingCard.fromY}px`,
                ['--to-x' as any]: `${to.x - flyingCard.fromX}px`,
                ['--to-y' as any]: `${to.y - flyingCard.fromY}px`,
              }}
              transform={`translate(${flyingCard.fromX - 20}, ${flyingCard.fromY - 28})`}
            >
              <rect
                width="40"
                height="56"
                rx="6"
                fill={info?.color || '#d4af37'}
                stroke="#d4af37"
                strokeWidth="2"
                filter="url(#glow)"
              />
              <text
                x="20"
                y="36"
                textAnchor="middle"
                fill="white"
                fontSize="22"
                fontWeight="bold"
                pointerEvents="none"
              >
                {info?.icon || '?'}
              </text>
            </g>
          );
        })()}
      </svg>
      <style>{`
        @keyframes cellGlow {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.15); }
        }
        @keyframes targetPulse {
          0%, 100% { opacity: 0.6; r: 8; }
          50% { opacity: 1; r: 12; }
        }
        @keyframes cardFly {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--to-x), var(--to-y)) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Board;
