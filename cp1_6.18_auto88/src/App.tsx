import React, { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import {
  BOARD_SIZE,
  BoardState,
  StoneColor,
  BLACK,
  WHITE,
  Move,
  AIRecommendation,
  idx,
} from './types';
import {
  createEmptyBoard,
  tryPlaceStone,
  reconstructBoard,
  boardToString,
  opponent,
} from './boardLogic';
import { getAIRecommendations } from './aiEngine';
import BoardCanvas from './BoardCanvas';
import Controls from './Controls';

interface CaptureAnim {
  x: number;
  y: number;
  startTime: number;
  color: StoneColor;
}

interface AppState {
  board: BoardState;
  currentColor: StoneColor;
  moves: Move[];
  blackCaptures: number;
  whiteCaptures: number;
  koPoint: { x: number; y: number } | null;
  lastMove: { x: number; y: number } | null;
  prevBoardStr: string | null;
  aiEnabled: boolean;
  aiRecommendations: AIRecommendation[];
  viewMoveIndex: number;
  captureAnims: CaptureAnim[];
  lastPlacedAnim: { x: number; y: number; startTime: number } | null;
}

const useStore = create<AppState>(() => ({
  board: createEmptyBoard(),
  currentColor: BLACK,
  moves: [],
  blackCaptures: 0,
  whiteCaptures: 0,
  koPoint: null,
  lastMove: null,
  prevBoardStr: null,
  aiEnabled: false,
  aiRecommendations: [],
  viewMoveIndex: -1,
  captureAnims: [],
  lastPlacedAnim: null,
}));

function placeStone(x: number, y: number) {
  const state = useStore.getState();
  if (state.viewMoveIndex !== -1 && state.viewMoveIndex < state.moves.length - 1) {
    return;
  }

  const result = tryPlaceStone(state.board, x, y, state.currentColor, state.koPoint, state.prevBoardStr);
  if (!result.legal) return;

  const newPrevBoardStr = boardToString(state.board);
  const move: Move = {
    x,
    y,
    color: state.currentColor,
    captures: result.captures,
    capturedPositions: result.capturedPositions,
  };

  const newMoves = [...state.moves, move];
  const isBlack = state.currentColor === BLACK;
  const newBlackCaptures = state.blackCaptures + (isBlack ? result.captures : 0);
  const newWhiteCaptures = state.whiteCaptures + (!isBlack ? result.captures : 0);

  const captureAnims: CaptureAnim[] = result.capturedPositions.map((pos) => ({
    x: pos.x,
    y: pos.y,
    startTime: performance.now(),
    color: isBlack ? WHITE : BLACK,
  }));

  const nextColor = opponent(state.currentColor);

  useStore.setState({
    board: result.board,
    currentColor: nextColor,
    moves: newMoves,
    blackCaptures: newBlackCaptures,
    whiteCaptures: newWhiteCaptures,
    koPoint: result.koPoint,
    lastMove: { x, y },
    prevBoardStr: newPrevBoardStr,
    viewMoveIndex: -1,
    captureAnims: [...state.captureAnims, ...captureAnims],
    lastPlacedAnim: { x, y, startTime: performance.now() },
  });

  computeAI();
}

function computeAI() {
  const state = useStore.getState();
  if (!state.aiEnabled) {
    useStore.setState({ aiRecommendations: [] });
    return;
  }

  const t0 = performance.now();
  const recs = getAIRecommendations(
    state.board,
    state.currentColor,
    state.koPoint,
    state.prevBoardStr,
    state.moves.length
  );
  const elapsed = performance.now() - t0;

  if (elapsed > 50) {
    console.warn(`AI computation took ${elapsed.toFixed(1)}ms`);
  }

  useStore.setState({ aiRecommendations: recs });
}

function undo() {
  const state = useStore.getState();
  if (state.moves.length === 0) return;

  const newMoves = state.moves.slice(0, -1);
  if (newMoves.length === 0) {
    useStore.setState({
      board: createEmptyBoard(),
      currentColor: BLACK,
      moves: [],
      blackCaptures: 0,
      whiteCaptures: 0,
      koPoint: null,
      lastMove: null,
      prevBoardStr: null,
      viewMoveIndex: -1,
      captureAnims: [],
      lastPlacedAnim: null,
    });
  } else {
    const lastMove = newMoves[newMoves.length - 1];
    let bCaptures = 0;
    let wCaptures = 0;
    for (const m of newMoves) {
      if (m.color === BLACK) bCaptures += m.captures;
      else wCaptures += m.captures;
    }
    const board = reconstructBoard(newMoves, newMoves.length - 1);
    const prevBoard = newMoves.length > 1
      ? boardToString(reconstructBoard(newMoves, newMoves.length - 2))
      : null;

    let koPoint: { x: number; y: number } | null = null;
    if (lastMove.captures === 1) {
      const group = [{ stones: [idx(lastMove.x, lastMove.y)], liberties: new Set<number>() }];
      if (group[0].stones.length === 1) {
        koPoint = lastMove;
      }
    }

    useStore.setState({
      board,
      currentColor: opponent(lastMove.color),
      moves: newMoves,
      blackCaptures: bCaptures,
      whiteCaptures: wCaptures,
      koPoint,
      lastMove: { x: lastMove.x, y: lastMove.y },
      prevBoardStr: prevBoard,
      viewMoveIndex: -1,
      captureAnims: [],
      lastPlacedAnim: null,
    });
  }
  computeAI();
}

function clearGame() {
  useStore.setState({
    board: createEmptyBoard(),
    currentColor: BLACK,
    moves: [],
    blackCaptures: 0,
    whiteCaptures: 0,
    koPoint: null,
    lastMove: null,
    prevBoardStr: null,
    aiRecommendations: [],
    viewMoveIndex: -1,
    captureAnims: [],
    lastPlacedAnim: null,
  });
}

function toggleAI() {
  const state = useStore.getState();
  const newEnabled = !state.aiEnabled;
  useStore.setState({ aiEnabled: newEnabled });
  if (newEnabled) {
    computeAI();
  } else {
    useStore.setState({ aiRecommendations: [] });
  }
}

function jumpToMove(index: number) {
  const state = useStore.getState();
  if (index < 0 || index >= state.moves.length) return;

  const board = reconstructBoard(state.moves, index);
  useStore.setState({
    board,
    viewMoveIndex: index,
    lastMove: { x: state.moves[index].x, y: state.moves[index].y },
  });
}

const App: React.FC = () => {
  const state = useStore();
  const moveListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [state.moves.length]);

  const handleBoardClick = useCallback((x: number, y: number) => {
    placeStone(x, y);
  }, []);

  const handleUndo = useCallback(() => {
    undo();
  }, []);

  const handleClear = useCallback(() => {
    clearGame();
  }, []);

  const handleToggleAI = useCallback(() => {
    toggleAI();
  }, []);

  const handleJumpToMove = useCallback((index: number) => {
    jumpToMove(index);
  }, []);

  const displayBoard = state.viewMoveIndex >= 0
    ? reconstructBoard(state.moves, state.viewMoveIndex)
    : state.board;

  const displayLastMove = state.viewMoveIndex >= 0
    ? { x: state.moves[state.viewMoveIndex].x, y: state.moves[state.viewMoveIndex].y }
    : state.lastMove;

  return (
    <div style={styles.outer}>
      <div className="main-layout" style={styles.mainLayout}>
        <div style={styles.boardArea}>
          <BoardCanvas
            board={displayBoard}
            lastMove={displayLastMove}
            aiRecommendations={state.viewMoveIndex >= 0 ? [] : state.aiRecommendations}
            aiEnabled={state.aiEnabled}
            capturedPositions={[]}
            onBoardClick={handleBoardClick}
            lastPlacedAnim={state.lastPlacedAnim}
            captureAnims={state.captureAnims}
          />
          {state.aiEnabled && (
            <div style={styles.aiFloatingLabel}>
              AI推荐已开启
            </div>
          )}
        </div>
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>♔ 围棋棋谱编辑器</div>
          <Controls
            moves={state.moves}
            blackCaptures={state.blackCaptures}
            whiteCaptures={state.whiteCaptures}
            aiEnabled={state.aiEnabled}
            aiRecommendations={state.aiRecommendations}
            viewMoveIndex={state.viewMoveIndex}
            onUndo={handleUndo}
            onClear={handleClear}
            onToggleAI={handleToggleAI}
            onJumpToMove={handleJumpToMove}
          />
        </div>
      </div>
      <div className="mobile-layout" style={styles.mobileLayout}>
        <div style={styles.boardAreaMobile}>
          <BoardCanvas
            board={displayBoard}
            lastMove={displayLastMove}
            aiRecommendations={state.viewMoveIndex >= 0 ? [] : state.aiRecommendations}
            aiEnabled={state.aiEnabled}
            capturedPositions={[]}
            onBoardClick={handleBoardClick}
            lastPlacedAnim={state.lastPlacedAnim}
            captureAnims={state.captureAnims}
          />
          {state.aiEnabled && (
            <div style={styles.aiFloatingLabelMobile}>
              AI推荐已开启
            </div>
          )}
        </div>
        <div style={styles.sidebarMobile}>
          <Controls
            moves={state.moves}
            blackCaptures={state.blackCaptures}
            whiteCaptures={state.whiteCaptures}
            aiEnabled={state.aiEnabled}
            aiRecommendations={state.aiRecommendations}
            viewMoveIndex={state.viewMoveIndex}
            onUndo={handleUndo}
            onClear={handleClear}
            onToggleAI={handleToggleAI}
            onJumpToMove={handleJumpToMove}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  outer: {
    width: '100%',
    height: '100%',
    background: '#8B5E3C',
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    overflow: 'auto',
  },
  mainLayout: {
    display: 'flex',
    height: '100%',
    gap: 0,
  },
  boardArea: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 16,
    minHeight: 0,
  },
  aiFloatingLabel: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(76,175,80,0.85)',
    color: '#FFF',
    padding: '4px 14px',
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 600,
    animation: 'breathe 2s ease-in-out infinite',
    pointerEvents: 'none',
  },
  sidebar: {
    width: 260,
    height: '100%',
    background: 'rgba(60,30,10,0.5)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    padding: 12,
    overflowY: 'auto',
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#F5DEB3',
    marginBottom: 12,
    textAlign: 'center' as const,
    letterSpacing: 2,
  },
  mobileLayout: {
    display: 'none',
    flexDirection: 'column',
    height: '100%',
  },
  boardAreaMobile: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 8,
    minHeight: 0,
  },
  aiFloatingLabelMobile: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(76,175,80,0.85)',
    color: '#FFF',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    animation: 'breathe 2s ease-in-out infinite',
    pointerEvents: 'none',
  },
  sidebarMobile: {
    height: 220,
    background: 'rgba(60,30,10,0.5)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: 8,
    overflowY: 'auto',
  },
};

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  @keyframes breathe {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1.0; }
  }
  @media (max-width: 799px) {
    .main-layout { display: none !important; }
    .mobile-layout { display: flex !important; }
  }
  @media (min-width: 800px) {
    .main-layout { display: flex !important; }
    .mobile-layout { display: none !important; }
  }
  button:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
  button:active {
    transform: scale(0.97);
  }
  ::-webkit-scrollbar {
    width: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(245,222,179,0.3);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(245,222,179,0.5);
  }
`;
document.head.appendChild(globalStyle);

export default App;
