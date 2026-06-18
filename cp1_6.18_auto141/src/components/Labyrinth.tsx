import React, { useEffect, useCallback, useRef, useState } from 'react';
import { ColorName, getColorEmotion, getHexByName } from '../data/colorEmotionMap';
import { LabyrinthData, Mechanism } from '../logic/labyrinthGenerator';
import { canMoveTo, tryUnlockMechanism } from '../logic/colorMatcher';

interface LabyrinthProps {
  labyrinth: LabyrinthData;
  playerPos: { row: number; col: number };
  visitedCells: Set<string>;
  mechanismSequences: Map<string, ColorName[]>;
  mechanisms: Mechanism[];
  onMove: (row: number, col: number) => void;
  onCollectColor: (color: ColorName) => void;
  onAddToSequence: (mechanismId: string, color: ColorName) => void;
  onUnlockMechanism: (mechanismId: string) => void;
  onSequenceError: (mechanismId: string) => void;
  onWin: () => void;
}

const CELL_SIZE = 120;
const PLAYER_SIZE = 20;

const cellKey = (r: number, c: number) => `${r},${c}`;

const Labyrinth: React.FC<LabyrinthProps> = ({
  labyrinth,
  playerPos,
  visitedCells,
  mechanismSequences,
  mechanisms,
  onMove,
  onCollectColor,
  onAddToSequence,
  onUnlockMechanism,
  onSequenceError,
  onWin,
}) => {
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);
  const [mechanismPulse, setMechanismPulse] = useState<string | null>(null);
  const [mechanismError, setMechanismError] = useState<string | null>(null);
  const [playerPixel, setPlayerPixel] = useState({ x: 0, y: 0 });
  const [trails, setTrails] = useState<{ x: number; y: number; color: string; id: number }[]>([]);
  const [emotionPopup, setEmotionPopup] = useState<{
    name: string;
    emotion: string;
    description: string;
  } | null>(null);
  const trailIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { cells, size, exit } = labyrinth;

  const getPixelPos = useCallback(
    (row: number, col: number) => ({
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
    }),
    []
  );

  useEffect(() => {
    setPlayerPixel(getPixelPos(playerPos.row, playerPos.col));
  }, [playerPos, getPixelPos]);

  const handleMove = useCallback(
    (dr: number, dc: number) => {
      const newRow = playerPos.row + dr;
      const newCol = playerPos.col + dc;

      if (newRow < -1 || newRow > size || newCol < -1 || newCol > size) return;

      if (newRow === exit.row && newCol === exit.col + 1 && playerPos.row === exit.row && playerPos.col === exit.col) {
        onWin();
        return;
      }

      if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) return;

      const currentCell = cells[playerPos.row][playerPos.col];
      if (!canMoveTo(currentCell, newRow, newCol, cells, mechanisms)) return;

      const oldPixel = getPixelPos(playerPos.row, playerPos.col);
      const oldColor = getHexByName(cells[playerPos.row][playerPos.col].color);
      trailIdRef.current++;
      setTrails((prev) => [...prev.slice(-5), { x: oldPixel.x, y: oldPixel.y, color: oldColor, id: trailIdRef.current }]);

      onMove(newRow, newCol);

      const key = cellKey(newRow, newCol);
      const cell = cells[newRow][newCol];

      if (!visitedCells.has(key)) {
        onCollectColor(cell.color);
      }

      setAnimatingCell(key);
      const ce = getColorEmotion(cell.color);
      setEmotionPopup({ name: ce.name, emotion: ce.emotion, description: ce.description });
      setTimeout(() => setAnimatingCell(null), 500);
      setTimeout(() => setEmotionPopup(null), 2000);

      if (cell.isMechanism && cell.mechanismId) {
        const mech = mechanisms.find((m) => m.id === cell.mechanismId);
        if (mech && !mech.unlocked) {
          onAddToSequence(mech.id, cell.color);
          const seq = mechanismSequences.get(mech.id) || [];
          const newSeq = [...seq, cell.color];
          const result = tryUnlockMechanism(mech, newSeq);

          if (result.unlocked) {
            onUnlockMechanism(mech.id);
            setMechanismPulse(mech.id);
            setTimeout(() => setMechanismPulse(null), 400);
          } else if (!result.correct) {
            onSequenceError(mech.id);
            setMechanismError(mech.id);
            setTimeout(() => setMechanismError(null), 200);
          }
        }
      }

      if (newRow === exit.row && newCol === exit.col) {
        setTimeout(() => onWin(), 300);
      }
    },
    [playerPos, size, cells, mechanisms, visitedCells, exit, onMove, onCollectColor, onAddToSequence, onUnlockMechanism, onSequenceError, onWin, mechanismSequences, getPixelPos]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleMove(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleMove(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleMove(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleMove(0, 1);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  const currentColor = cells[playerPos.row]?.[playerPos.col]?.color
    ? getHexByName(cells[playerPos.row][playerPos.col].color)
    : '#fff';

  const gridWidth = size * CELL_SIZE;
  const gridHeight = size * CELL_SIZE;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: gridWidth, height: gridHeight }}>
      {cells.flat().map((cell) => {
        const key = cellKey(cell.row, cell.col);
        const isAnimating = animatingCell === key;
        const isMechPulse = mechanismPulse === cell.mechanismId;
        const isMechError = mechanismError === cell.mechanismId;
        const mech = cell.mechanismId ? mechanisms.find((m) => m.id === cell.mechanismId) : null;

        const wallStyle: React.CSSProperties = {
          position: 'absolute',
          left: cell.col * CELL_SIZE,
          top: cell.row * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: getHexByName(cell.color),
          border: '0.5px solid rgba(255,255,255,0.3)',
          boxShadow: isAnimating
            ? `0 0 20px ${getHexByName(cell.color)}, inset 0 0 15px rgba(255,255,255,0.3)`
            : 'inset 0 0 8px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.3s ease',
          opacity: isAnimating ? 1 : 0.7,
        };

        const wallBorders: React.CSSProperties = {
          borderTop: cell.walls.top ? '3px solid #1a1a2e' : '3px solid transparent',
          borderRight: cell.walls.right ? '3px solid #1a1a2e' : '3px solid transparent',
          borderBottom: cell.walls.bottom ? '3px solid #1a1a2e' : '3px solid transparent',
          borderLeft: cell.walls.left ? '3px solid #1a1a2e' : '3px solid transparent',
        };

        return (
          <div key={key} style={{ ...wallStyle, ...wallBorders }}>
            {cell.isMechanism && mech && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: `2px solid ${mech.unlocked ? '#2ECC71' : '#F1C40F'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: '#fff',
                  background: mech.unlocked ? 'rgba(46,204,113,0.4)' : 'rgba(241,196,15,0.4)',
                  animation: isMechPulse
                    ? 'mechPulse 0.4s ease-out'
                    : isMechError
                    ? 'mechError 0.2s ease'
                    : 'none',
                }}
              >
                {mech.unlocked ? '✓' : `${mech.requirement.colors.length}`}
              </div>
            )}

            {isMechPulse && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, white 0%, ${getHexByName(cell.color)} 50%, transparent 70%)`,
                  animation: 'pulseGlow 0.4s ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        );
      })}

      {trails.map((trail) => (
        <div
          key={trail.id}
          style={{
            position: 'absolute',
            left: trail.x - PLAYER_SIZE / 2,
            top: trail.y - PLAYER_SIZE / 2,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            borderRadius: '50%',
            background: trail.color,
            opacity: 0.3,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: playerPixel.x - PLAYER_SIZE / 2,
          top: playerPixel.y - PLAYER_SIZE / 2,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
          borderRadius: '50%',
          background: `radial-gradient(circle, white 0%, ${currentColor} 60%, transparent 100%)`,
          boxShadow: `0 0 12px ${currentColor}, 0 0 24px ${currentColor}80`,
          transition: 'left 0.2s ease, top 0.2s ease, background 0.3s ease, box-shadow 0.3s ease',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {emotionPopup && (
        <div
          style={{
            position: 'absolute',
            left: playerPixel.x + 18,
            top: playerPixel.y - 30,
            background: 'rgba(22, 33, 62, 0.95)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <div style={{ fontWeight: 700, color: currentColor }}>
            {emotionPopup.name}色 · {emotionPopup.emotion}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{emotionPopup.description}</div>
        </div>
      )}

      <style>{`
        @keyframes pulseGlow {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes mechPulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes mechError {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); }
          25% { transform: translate(-50%, -50%) translateX(-4px); }
          75% { transform: translate(-50%, -50%) translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Labyrinth;
