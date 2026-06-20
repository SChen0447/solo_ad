import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngine, Attribute, Piece, Position } from './gameEngine';

interface GameBoardProps {
  engine: GameEngine;
  selectedAttribute: Attribute;
  selectedPiece: Piece | null;
  onSelectPiece: (piece: Piece | null) => void;
  onCellClick: (row: number, col: number) => void;
  trails: Array<{ from: Position; to: Position; attribute: Attribute; id: number }>;
}

const ATTRIBUTE_COLORS: Record<Attribute, string> = {
  light: '#ffd700',
  dark: '#9b59b6',
  phantom: '#00ffff',
};

const ATTRIBUTE_GLOW: Record<Attribute, string> = {
  light: '0 0 12px #ffd700, 0 0 24px #ffd70066',
  dark: '0 0 12px #9b59b6, 0 0 24px #9b59b666',
  phantom: '0 0 12px #00ffff, 0 0 24px #00ffff66',
};

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  light: '光',
  dark: '暗',
  phantom: '幻',
};

const CELL_SIZE = 60;
const BOARD_SIZE = 8;

function CellBackground({ row, col }: { row: number; col: number }) {
  const isOddOdd = row % 2 === 1 && col % 2 === 1;
  const bg = isOddOdd ? '#2a2a3e' : '#1e1e2e';
  return bg;
}

function PieceGlow({ attribute }: { attribute: Attribute }) {
  const color = ATTRIBUTE_COLORS[attribute];

  if (attribute === 'light') {
    return (
      <motion.div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  if (attribute === 'dark') {
    return (
      <motion.div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${color}88, transparent, ${color}88, transparent)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    );
  }

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: -4,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
      }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'steps(2)' }}
    />
  );
}

function PieceComponent({
  piece,
  isSelected,
  onClick,
}: {
  piece: Piece;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color = ATTRIBUTE_COLORS[piece.attribute];
  const playerBorder = piece.player === 0 ? '#00f5ff' : '#ff00ff';

  return (
    <motion.div
      layout
      layoutId={piece.id}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 15,
        duration: 0.4,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}44)`,
        border: `2px solid ${playerBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isSelected
          ? `0 0 0 3px #ffffff, ${ATTRIBUTE_GLOW[piece.attribute]}`
          : ATTRIBUTE_GLOW[piece.attribute],
        transition: 'box-shadow 0.3s ease',
        fontSize: 18,
        fontWeight: 700,
        color: '#0d0d1a',
        textShadow: '0 0 4px rgba(255,255,255,0.5)',
        zIndex: 2,
      }}
    >
      <PieceGlow attribute={piece.attribute} />
      <span style={{ position: 'relative', zIndex: 3 }}>
        {ATTRIBUTE_LABELS[piece.attribute]}
      </span>
    </motion.div>
  );
}

function TrailComponent({
  trail,
}: {
  trail: { from: Position; to: Position; attribute: Attribute; id: number };
}) {
  const color = ATTRIBUTE_COLORS[trail.attribute];
  const dx = (trail.to.col - trail.from.col) * CELL_SIZE;
  const dy = (trail.to.row - trail.from.row) * CELL_SIZE;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <motion.div
      key={trail.id}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: trail.from.col * CELL_SIZE + CELL_SIZE / 2,
        top: trail.from.row * CELL_SIZE + CELL_SIZE / 2,
        width: length || 2,
        height: 3,
        background: `linear-gradient(90deg, ${color}cc, transparent)`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        pointerEvents: 'none',
        zIndex: 1,
        borderRadius: 2,
      }}
    />
  );
}

export default function GameBoard({
  engine,
  selectedAttribute,
  selectedPiece,
  onSelectPiece,
  onCellClick,
  trails,
}: GameBoardProps) {
  const state = engine.getState();
  const energyNodes = engine.getEnergyNodes();

  const isEnergyNode = useCallback(
    (row: number, col: number) =>
      energyNodes.some((n) => n.row === row && n.col === col),
    [energyNodes]
  );

  const validMoves = useMemo(() => {
    if (!selectedPiece) return new Set<string>();
    const moves = engine.getValidMoves(selectedPiece);
    return new Set(moves.map((m) => `${m.row},${m.col}`));
  }, [selectedPiece, engine, state.turnCount]);

  return (
    <div
      style={{
        position: 'relative',
        width: BOARD_SIZE * CELL_SIZE,
        height: BOARD_SIZE * CELL_SIZE,
        background: '#0d0d1a',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #00f5ff33',
        boxShadow: '0 0 30px #00f5ff11, inset 0 0 60px #00000088',
      }}
    >
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
          const cell = state.board[row][col];
          const bg = CellBackground({ row, col });
          const isNode = isEnergyNode(row, col);
          const isValid = validMoves.has(`${row},${col}`);
          const isSelectedCell =
            selectedPiece !== null &&
            selectedPiece.position.row === row &&
            selectedPiece.position.col === col;

          return (
            <div
              key={`${row}-${col}`}
              onClick={() => onCellClick(row, col)}
              style={{
                position: 'absolute',
                left: col * CELL_SIZE,
                top: row * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: bg,
                borderRadius: 4,
                border: isNode ? '1px solid #ffd70044' : '1px solid #ffffff08',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
                boxShadow: isSelectedCell
                  ? '0 0 3px 3px #ffffff66'
                  : isValid
                  ? '0 0 3px 1px #00f5ff44'
                  : 'none',
              }}
            >
              {isNode && !cell.piece && (
                <motion.div
                  animate={{
                    scale: [0.8, 1.1, 0.8],
                    opacity: [0.4, 0.8, 0.4],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffd700, #ffd70044)',
                    boxShadow: '0 0 8px #ffd70066',
                  }}
                />
              )}
              {isNode && cell.piece && (
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 4,
                    background: 'radial-gradient(circle, #ffd70022, transparent)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {cell.isBlocked && (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 4,
                    background:
                      'repeating-linear-gradient(45deg, #9b59b622, #9b59b622 4px, transparent 4px, transparent 8px)',
                    border: '1px solid #9b59b644',
                  }}
                />
              )}
              <AnimatePresence>
                {cell.piece && (
                  <PieceComponent
                    key={cell.piece.id}
                    piece={cell.piece}
                    isSelected={
                      selectedPiece?.id === cell.piece.id
                    }
                    onClick={() => onSelectPiece(cell.piece!)}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}

      {trails.map((trail) => (
        <TrailComponent key={trail.id} trail={trail} />
      ))}
    </div>
  );
}
