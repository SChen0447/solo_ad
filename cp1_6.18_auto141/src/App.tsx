import React, { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { ColorName, getColorEmotion, COLOR_EMOTION_MAP } from './data/colorEmotionMap';
import { generateLabyrinth, LabyrinthData, Mechanism } from './logic/labyrinthGenerator';
import Labyrinth from './components/Labyrinth';

interface GameState {
  labyrinth: LabyrinthData;
  playerPos: { row: number; col: number };
  collectedColors: ColorName[];
  visitedCells: Set<string>;
  mechanismSequences: Map<string, ColorName[]>;
  moveCount: number;
  startTime: number;
  gameWon: boolean;
}

interface GameActions {
  movePlayer: (row: number, col: number) => void;
  collectColor: (color: ColorName) => void;
  addToSequence: (mechanismId: string, color: ColorName) => void;
  unlockMechanism: (mechanismId: string) => void;
  sequenceError: (mechanismId: string) => void;
  win: () => void;
  resetGame: () => void;
}

const cellKey = (r: number, c: number) => `${r},${c}`;

function createInitialState(): GameState {
  const labyrinth = generateLabyrinth(5);
  return {
    labyrinth,
    playerPos: { ...labyrinth.entrance },
    collectedColors: [],
    visitedCells: new Set([cellKey(labyrinth.entrance.row, labyrinth.entrance.col)]),
    mechanismSequences: new Map(),
    moveCount: 0,
    startTime: Date.now(),
    gameWon: false,
  };
}

const useGameStore = create<GameState & GameActions>((set) => ({
  ...createInitialState(),

  movePlayer: (row, col) =>
    set((state) => ({
      playerPos: { row, col },
      moveCount: state.moveCount + 1,
      visitedCells: new Set([...state.visitedCells, cellKey(row, col)]),
    })),

  collectColor: (color) =>
    set((state) => {
      if (state.collectedColors.includes(color)) return state;
      return { collectedColors: [...state.collectedColors, color] };
    }),

  addToSequence: (mechanismId, color) =>
    set((state) => {
      const newMap = new Map(state.mechanismSequences);
      const existing = newMap.get(mechanismId) || [];
      newMap.set(mechanismId, [...existing, color]);
      return { mechanismSequences: newMap };
    }),

  unlockMechanism: (mechanismId) =>
    set((state) => {
      const newMechs = state.labyrinth.mechanisms.map((m) =>
        m.id === mechanismId ? { ...m, unlocked: true } : m
      );
      const newCells = state.labyrinth.cells.map((row) =>
        row.map((cell) => {
          if (cell.mechanismId === mechanismId) {
            return { ...cell, isMechanism: true };
          }
          return cell;
        })
      );

      const mech = newMechs.find((m) => m.id === mechanismId);
      if (mech) {
        const { row, col, side } = mech.wallToRemove;
        const opposite: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
          top: 'bottom', bottom: 'top', left: 'right', right: 'left',
        };
        newCells[row][col].walls[side] = false;
        const nr = side === 'top' ? row - 1 : side === 'bottom' ? row + 1 : row;
        const nc = side === 'left' ? col - 1 : side === 'right' ? col + 1 : col;
        if (nr >= 0 && nr < state.labyrinth.size && nc >= 0 && nc < state.labyrinth.size) {
          newCells[nr][nc].walls[opposite[side]] = false;
        }
      }

      const newMap = new Map(state.mechanismSequences);
      newMap.delete(mechanismId);

      return {
        labyrinth: { ...state.labyrinth, cells: newCells, mechanisms: newMechs },
        mechanismSequences: newMap,
      };
    }),

  sequenceError: (mechanismId) =>
    set((state) => {
      const newMap = new Map(state.mechanismSequences);
      newMap.set(mechanismId, []);
      return { mechanismSequences: newMap };
    }),

  win: () => set({ gameWon: true }),

  resetGame: () => set(createInitialState()),
}));

const CollectionPanel: React.FC<{
  collectedColors: ColorName[];
  onCardClick: (color: ColorName) => void;
}> = ({ collectedColors, onCardClick }) => {
  const [hoveredColor, setHoveredColor] = useState<ColorName | null>(null);

  return (
    <div
      style={{
        width: 200,
        background: '#16213e',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        🎨 配色收藏
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        {COLOR_EMOTION_MAP.map((ce) => {
          const isCollected = collectedColors.includes(ce.name);
          return (
            <div
              key={ce.name}
              onClick={() => isCollected && onCardClick(ce.name)}
              onMouseEnter={() => isCollected && setHoveredColor(ce.name)}
              onMouseLeave={() => setHoveredColor(null)}
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                background: isCollected
                  ? `linear-gradient(135deg, ${ce.hex}cc, ${ce.hex}66)`
                  : '#1a1a2e',
                border: isCollected ? `1px solid ${ce.hex}` : '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isCollected ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                opacity: isCollected ? 1 : 0.3,
                transform: hoveredColor === ce.name ? 'scale(1.08)' : 'scale(1)',
                position: 'relative',
              }}
            >
              {isCollected && (
                <>
                  <span style={{ fontSize: 20 }}>{ce.name}</span>
                  {hoveredColor === ce.name && (
                    <span style={{ fontSize: 10, color: '#fff', marginTop: 2 }}>
                      {ce.emotion}
                    </span>
                  )}
                </>
              )}
              {!isCollected && <span style={{ fontSize: 18, opacity: 0.3 }}>?</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ColorDetailModal: React.FC<{
  color: ColorName;
  onClose: () => void;
}> = ({ color, onClose }) => {
  const ce = getColorEmotion(color);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#16213e',
          borderRadius: 12,
          padding: 28,
          maxWidth: 380,
          width: '90%',
          boxShadow: `0 0 40px ${ce.hex}40`,
          border: `1px solid ${ce.hex}60`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: 80,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${ce.hex}, ${ce.hex}88)`,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 32, color: '#fff', fontWeight: 700 }}>
            {ce.name}色 · {ce.emotion}
          </span>
        </div>
        <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
          {ce.description}
        </div>
        <div style={{ color: '#999', fontSize: 12, lineHeight: 1.8 }}>{ce.story}</div>
        <div
          style={{
            marginTop: 16,
            padding: '8px 12px',
            background: '#1a1a2e',
            borderRadius: 6,
            fontFamily: 'monospace',
            color: ce.hex,
            fontSize: 14,
          }}
        >
          HEX: {ce.hex}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 0',
            background: ce.hex,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'opacity 0.2s',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
};

const VictoryScreen: React.FC<{
  moveCount: number;
  collectedCount: number;
  startTime: number;
  collectedColors: ColorName[];
  onReset: () => void;
}> = ({ moveCount, collectedCount, startTime, collectedColors, onReset }) => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const gradientColors = collectedColors
    .map((c) => getColorEmotion(c).hex)
    .join(', ');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: '#16213e',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 0 60px rgba(241,196,15,0.2)',
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700, color: '#F1C40F', marginBottom: 24 }}>
          🎉 通关成功！
        </div>
        <div
          style={{
            height: 30,
            borderRadius: 15,
            background: `linear-gradient(90deg, ${gradientColors})`,
            marginBottom: 24,
            boxShadow: `0 0 20px rgba(255,255,255,0.1)`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>步数</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{moveCount}</div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>色块</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
              {collectedCount}/8
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>用时</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '14px 48px',
            background: 'linear-gradient(135deg, #E74C3C, #F1C40F)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            transition: 'transform 0.2s, opacity 0.2s',
          }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
};

const MechanismHint: React.FC<{
  mechanisms: Mechanism[];
  sequences: Map<string, ColorName[]>;
}> = ({ mechanisms, sequences }) => {
  const lockedMechs = mechanisms.filter((m) => !m.unlocked);
  if (lockedMechs.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: -40,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {lockedMechs.map((m) => {
        const seq = sequences.get(m.id) || [];
        const progress = seq.length;
        const total = m.requirement.colors.length;
        return (
          <div
            key={m.id}
            style={{
              background: 'rgba(22,33,62,0.9)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              color: '#ccc',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: '#F1C40F' }}>⚙</span>
            {m.requirement.colors.map((c, i) => (
              <span
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: i < progress ? getColorEmotion(c).hex : '#333',
                  border: `1px solid ${i < progress ? getColorEmotion(c).hex : '#555'}`,
                  display: 'inline-block',
                }}
              />
            ))}
            <span style={{ marginLeft: 2, color: '#888' }}>
              {progress}/{total}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const {
    labyrinth,
    playerPos,
    collectedColors,
    visitedCells,
    mechanismSequences,
    moveCount,
    startTime,
    gameWon,
    movePlayer,
    collectColor,
    addToSequence,
    unlockMechanism,
    sequenceError,
    win,
    resetGame,
  } = useGameStore();

  const [detailColor, setDetailColor] = useState<ColorName | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleReset = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const mainStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const mazeContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: isMobile ? '1 1 auto' : undefined,
  };

  const panelContainerStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        maxHeight: 140,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0 12px 12px',
      }
    : {
        marginLeft: 20,
        flexShrink: 0,
      };

  return (
    <div style={mainStyle}>
      <div style={mazeContainerStyle}>
        <div
          style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 12,
            textShadow: '0 0 10px rgba(241,196,15,0.5)',
          }}
        >
          调色秘境
        </div>
        <div style={{ position: 'relative' }}>
          <MechanismHint mechanisms={labyrinth.mechanisms} sequences={mechanismSequences} />
          <Labyrinth
            labyrinth={labyrinth}
            playerPos={playerPos}
            visitedCells={visitedCells}
            mechanismSequences={mechanismSequences}
            mechanisms={labyrinth.mechanisms}
            onMove={movePlayer}
            onCollectColor={collectColor}
            onAddToSequence={addToSequence}
            onUnlockMechanism={unlockMechanism}
            onSequenceError={sequenceError}
            onWin={win}
          />
        </div>
        <div style={{ color: '#666', fontSize: 12, marginTop: 10 }}>
          使用方向键移动 · 踩中机关格按顺序解锁
        </div>
      </div>

      <div style={panelContainerStyle}>
        <CollectionPanel collectedColors={collectedColors} onCardClick={setDetailColor} />
      </div>

      {detailColor && (
        <ColorDetailModal color={detailColor} onClose={() => setDetailColor(null)} />
      )}

      {gameWon && (
        <VictoryScreen
          moveCount={moveCount}
          collectedCount={collectedColors.length}
          startTime={startTime}
          collectedColors={collectedColors}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default App;
