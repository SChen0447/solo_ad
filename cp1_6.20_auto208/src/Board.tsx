import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Line } from './types';

interface BoardProps {
  state: GameState;
  onCellClick: (row: number, col: number) => void;
  shakingCell: string | null;
}

const CELL_SIZE = 65;

const StarIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd700" stroke="#ffaa00" strokeWidth="0.5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const LineOverlay: React.FC<{ line: Line; boardSize: number }> = React.memo(({ line, boardSize }) => {
  const startCell = line.cells[0];
  const endCell = line.cells[line.cells.length - 1];

  const x1 = startCell[1] * CELL_SIZE + CELL_SIZE / 2;
  const y1 = startCell[0] * CELL_SIZE + CELL_SIZE / 2;
  const x2 = endCell[1] * CELL_SIZE + CELL_SIZE / 2;
  const y2 = endCell[0] * CELL_SIZE + CELL_SIZE / 2;

  const color = line.player === 1 ? '#ff4757' : '#3742fa';

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      opacity={0.7}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.7 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );
});
LineOverlay.displayName = 'LineOverlay';

const Cell: React.FC<{
  row: number;
  col: number;
  cell: GameState['board'][0][0];
  currentPlayer: number;
  skillMode: boolean;
  isOnLine: boolean;
  phase: string;
  onClick: () => void;
  isShaking: boolean;
}> = React.memo(({ row, col, cell, currentPlayer, skillMode, isOnLine, phase, onClick, isShaking }) => {
  const isEmpty = cell.owner === null;
  const isOpponent = skillMode && cell.owner !== null && cell.owner !== currentPlayer;
  const isPlaceable = (isEmpty || isOpponent) && phase === 'playing';

  return (
    <motion.div
      className="board-cell"
      data-row={row}
      data-col={col}
      onClick={isPlaceable ? onClick : undefined}
      animate={isShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
      transition={isShaking ? { duration: 0.3 } : {}}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        border: '1px solid #1a1a2e',
        background: cell.isPlanet
          ? 'linear-gradient(135deg, #16213e 0%, #1a1a3e 50%, #16213e 100%)'
          : 'rgba(22, 33, 62, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isPlaceable ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      {isPlaceable && (
        <motion.div
          className="cell-glow"
          animate={{
            boxShadow: [
              '0 0 5px rgba(100, 149, 237, 0.3)',
              '0 0 15px rgba(100, 149, 237, 0.6)',
              '0 0 5px rgba(100, 149, 237, 0.3)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 2,
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      )}

      {cell.isPlanet && cell.owner === null && (
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <StarIcon />
        </motion.div>
      )}

      {cell.isPlanet && cell.owner !== null && (
        <div style={{ position: 'absolute', top: 2, right: 2 }}>
          <StarIcon />
        </div>
      )}

      <AnimatePresence mode="wait">
        {cell.owner !== null && (
          <motion.div
            key={`token-${row}-${col}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: cell.owner === 1
                ? 'radial-gradient(circle at 35% 35%, #ff6b81, #ff4757)'
                : 'radial-gradient(circle at 35% 35%, #5352ed, #3742fa)',
              boxShadow: isOnLine
                ? cell.owner === 1
                  ? '0 0 12px rgba(255, 71, 87, 0.8)'
                  : '0 0 12px rgba(55, 66, 250, 0.8)'
                : cell.owner === 1
                  ? '0 0 6px rgba(255, 71, 87, 0.4)'
                  : '0 0 6px rgba(55, 66, 250, 0.4)',
              position: 'relative',
              zIndex: 2,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});
Cell.displayName = 'Cell';

const Board: React.FC<BoardProps> = React.memo(({ state, onCellClick, shakingCell }) => {
  const lineCellSet = useMemo(() => {
    const s = new Set<string>();
    for (const line of state.activeLines) {
      for (const [r, c] of line.cells) {
        s.add(`${r}-${c}`);
      }
    }
    return s;
  }, [state.activeLines]);

  const handleClick = useCallback((row: number, col: number) => {
    onCellClick(row, col);
  }, [onCellClick]);

  const boardWidth = state.boardSize * CELL_SIZE;

  return (
    <div
      className="board-container"
      style={{
        position: 'relative',
        display: 'inline-block',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(100, 149, 237, 0.15)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${state.boardSize}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${state.boardSize}, ${CELL_SIZE}px)`,
        }}
      >
        {state.board.map((row, ri) =>
          row.map((cell, ci) => (
            <Cell
              key={`${ri}-${ci}`}
              row={ri}
              col={ci}
              cell={cell}
              currentPlayer={state.currentPlayer}
              skillMode={state.skillMode}
              isOnLine={lineCellSet.has(`${ri}-${ci}`)}
              phase={state.phase}
              onClick={() => handleClick(ri, ci)}
              isShaking={shakingCell === `${ri}-${ci}`}
            />
          ))
        )}
      </div>

      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: boardWidth,
          height: boardWidth,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        {state.activeLines.map((line, i) => (
          <LineOverlay key={`line-${i}`} line={line} boardSize={state.boardSize} />
        ))}
      </svg>
    </div>
  );
});
Board.displayName = 'Board';

export default Board;
