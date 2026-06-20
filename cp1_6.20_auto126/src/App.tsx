import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngine, Attribute, Piece, Position } from './gameEngine';
import GameBoard from './gameBoard';

interface LogEntry {
  id: number;
  text: string;
  type: 'move' | 'capture' | 'score' | 'win' | 'info';
  timestamp: number;
}

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  light: '光',
  dark: '暗',
  phantom: '幻',
};

const ATTRIBUTE_COLORS: Record<Attribute, string> = {
  light: '#ffd700',
  dark: '#9b59b6',
  phantom: '#00ffff',
};

const COUNTER_HINTS: Record<Attribute, string> = {
  light: '光→克暗',
  dark: '暗→克幻',
  phantom: '幻→克光',
};

export default function App() {
  const [engine] = useState(() => new GameEngine(() => setTick((t) => t + 1)));
  const [tick, setTick] = useState(0);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute>('light');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trails, setTrails] = useState<
    Array<{ from: Position; to: Position; attribute: Attribute; id: number }>
  >([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const logIdRef = useRef(0);
  const trailIdRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = engine.getState();

  const addLog = useCallback((text: string, type: LogEntry['type']) => {
    setLogs((prev) => [
      ...prev.slice(-50),
      { id: ++logIdRef.current, text, type, timestamp: Date.now() },
    ]);
  }, []);

  const addTrail = useCallback((from: Position, to: Position, attribute: Attribute) => {
    const id = ++trailIdRef.current;
    setTrails((prev) => [...prev, { from, to, attribute, id }]);
    setTimeout(() => {
      setTrails((prev) => prev.filter((t) => t.id !== id));
    }, 600);
  }, []);

  useEffect(() => {
    const onMove = (data: unknown) => {
      const d = data as { piece: Piece; from: Position; to: Position };
      const label = ATTRIBUTE_LABELS[d.piece.attribute];
      const player = d.piece.player === 0 ? '玩家1' : 'AI';
      addLog(`${player} 移动 ${label} 属性棋子 (${d.from.row},${d.from.col})→(${d.to.row},${d.to.col})`, 'move');
      if (d.from.row !== d.to.row || d.from.col !== d.to.col) {
        addTrail(d.from, d.to, d.piece.attribute);
      }
    };
    const onCapture = (data: unknown) => {
      const d = data as { attacker: Piece; captured: Piece };
      addLog(
        `${ATTRIBUTE_LABELS[d.attacker.attribute]} 吃掉 ${ATTRIBUTE_LABELS[d.captured.attribute]}！`,
        'capture'
      );
    };
    const onScore = (data: unknown) => {
      const d = data as { player: number; points: number };
      const player = d.player === 0 ? '玩家1' : 'AI';
      addLog(`${player} 得 ${d.points} 分！`, 'score');
    };
    const onWin = (data: unknown) => {
      const d = data as { winner: number; reason: string };
      const player = d.winner === 0 ? '玩家1' : 'AI';
      addLog(`${player} 获胜！原因：${d.reason}`, 'win');
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };

    engine.on('move', onMove);
    engine.on('capture', onCapture);
    engine.on('score', onScore);
    engine.on('win', onWin);

    return () => {
      engine.off('move', onMove);
      engine.off('capture', onCapture);
      engine.off('score', onScore);
      engine.off('win', onWin);
    };
  }, [engine, addLog, addTrail]);

  useEffect(() => {
    if (gameStarted && !state.isGameOver) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => (c <= 1 ? 30 : c - 1));
      }, 1000);
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      };
    }
  }, [gameStarted, state.isGameOver]);

  const handleStartGame = useCallback(() => {
    engine.reset();
    engine.startAI();
    setGameStarted(true);
    setSelectedPiece(null);
    setLogs([]);
    setTrails([]);
    setCountdown(30);
    addLog('游戏开始！你执先手（玩家1），AI为对手。', 'info');
  }, [engine, addLog]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!gameStarted || state.isGameOver || state.turn !== 0) return;

      if (selectedPiece) {
        const success = engine.movePiece(selectedPiece.id, row, col, 0);
        if (success) {
          setSelectedPiece(null);
          setCountdown(30);
        } else {
          const cell = state.board[row][col];
          if (cell.piece && cell.piece.player === 0 && cell.piece.id !== selectedPiece.id) {
            setSelectedPiece(cell.piece);
          } else {
            setSelectedPiece(null);
          }
        }
      } else {
        const success = engine.placePiece(row, col, selectedAttribute, 0);
        if (success) {
          setCountdown(30);
        } else {
          const cell = state.board[row][col];
          if (cell.piece && cell.piece.player === 0) {
            setSelectedPiece(cell.piece);
          }
        }
      }
    },
    [gameStarted, state, engine, selectedPiece, selectedAttribute]
  );

  const handleSelectPiece = useCallback((piece: Piece | null) => {
    setSelectedPiece((prev) => (prev?.id === piece?.id ? null : piece));
  }, []);

  const handleUndo = useCallback(() => {
    engine.undoLastAction();
  }, [engine]);

  const attributes: Attribute[] = ['light', 'dark', 'phantom'];

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d0d1a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <header
        style={{
          width: '100%',
          height: 60,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid #00f5ff22',
          flexShrink: 0,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#00f5ff', fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>
              玩家1
            </span>
            <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, fontFamily: "'Orbitron', sans-serif" }}>
              {state.scores[0]}
            </span>
          </div>
          <span style={{ color: '#ffffff44', fontSize: 12 }}>
            {COUNTER_HINTS[selectedAttribute]}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ color: '#ffffff66', fontSize: 11, fontFamily: "'Orbitron', sans-serif" }}>
            回合 {state.turnCount}
          </span>
          <span
            style={{
              color: countdown <= 5 ? '#ff4444' : '#00f5ff',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {gameStarted ? (state.isGameOver ? '结束' : `${countdown}s`) : '--'}
          </span>
          <span style={{ color: '#ffffff44', fontSize: 11 }}>
            {state.isGameOver ? '' : state.turn === 0 ? '你的回合' : 'AI思考中...'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#ffffff44', fontSize: 12 }}>
            暗→克幻 / 幻→克光
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#ff00ff', fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>
              AI
            </span>
            <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, fontFamily: "'Orbitron', sans-serif" }}>
              {state.scores[1]}
            </span>
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            padding: 20,
          }}
        >
          <h1
            style={{
              color: '#00f5ff',
              fontSize: 28,
              fontWeight: 900,
              fontFamily: "'Orbitron', sans-serif",
              textShadow: '0 0 20px #00f5ff44',
              margin: 0,
              letterSpacing: 4,
            }}
          >
            幻光棋局
          </h1>

          <GameBoard
            engine={engine}
            selectedAttribute={selectedAttribute}
            selectedPiece={selectedPiece}
            onSelectPiece={handleSelectPiece}
            onCellClick={handleCellClick}
            trails={trails}
          />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!gameStarted && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                style={{
                  padding: '10px 32px',
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: 1,
                  boxShadow: '0 0 20px #6c5ce744',
                }}
              >
                开始游戏
              </motion.button>
            )}

            {gameStarted && !state.isGameOver && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  {attributes.map((attr) => (
                    <motion.button
                      key={attr}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAttribute(attr);
                        setSelectedPiece(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        background:
                          selectedAttribute === attr
                            ? `linear-gradient(135deg, ${ATTRIBUTE_COLORS[attr]}88, ${ATTRIBUTE_COLORS[attr]}44)`
                            : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                        color: selectedAttribute === attr ? '#ffffff' : '#ffffffaa',
                        border:
                          selectedAttribute === attr
                            ? `2px solid ${ATTRIBUTE_COLORS[attr]}`
                            : '2px solid transparent',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Rajdhani', sans-serif",
                        boxShadow:
                          selectedAttribute === attr
                            ? `0 0 12px ${ATTRIBUTE_COLORS[attr]}44`
                            : '0 0 8px #6c5ce722',
                      }}
                    >
                      {ATTRIBUTE_LABELS[attr]}属性
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPiece(null)}
                  disabled={!selectedPiece}
                  style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    color: selectedPiece ? '#ffffff' : '#ffffff44',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: selectedPiece ? 'pointer' : 'default',
                    fontFamily: "'Rajdhani', sans-serif",
                  }}
                >
                  {selectedPiece ? '取消选择' : '放置模式'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUndo}
                  style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #6c5ce744, #a29bfe44)',
                    color: '#ffffffaa',
                    border: '1px solid #a29bfe44',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Rajdhani', sans-serif",
                  }}
                >
                  撤回
                </motion.button>
              </>
            )}

            {state.isGameOver && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                style={{
                  padding: '10px 32px',
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                  boxShadow: '0 0 20px #6c5ce744',
                }}
              >
                再来一局
              </motion.button>
            )}
          </div>

          {selectedPiece && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                color: ATTRIBUTE_COLORS[selectedPiece.attribute],
                fontSize: 13,
                fontFamily: "'Rajdhani', sans-serif",
              }}
            >
              已选中 {ATTRIBUTE_LABELS[selectedPiece.attribute]} 属性棋子 — 点击相邻格子移动
            </motion.div>
          )}

          {!selectedPiece && gameStarted && !state.isGameOver && state.turn === 0 && (
            <div style={{ color: '#ffffff44', fontSize: 13, fontFamily: "'Rajdhani', sans-serif" }}>
              点击空格放置 {ATTRIBUTE_LABELS[selectedAttribute]} 属性棋子，或点击己方棋子后移动
            </div>
          )}

          <AnimatePresence>
            {state.isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.7)',
                  zIndex: 100,
                }}
              >
                <motion.div
                  initial={{ y: 30 }}
                  animate={{ y: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, #0d0d1a, #1a1a2e)',
                    border: '1px solid #00f5ff44',
                    borderRadius: 16,
                    padding: '40px 60px',
                    textAlign: 'center',
                    boxShadow: '0 0 60px #00f5ff11',
                  }}
                >
                  <div
                    style={{
                      color: state.winner === 0 ? '#00f5ff' : '#ff00ff',
                      fontSize: 36,
                      fontWeight: 900,
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: `0 0 30px ${state.winner === 0 ? '#00f5ff44' : '#ff00ff44'}`,
                    }}
                  >
                    {state.winner === 0 ? '你赢了！' : 'AI 获胜'}
                  </div>
                  <div style={{ color: '#ffffff66', fontSize: 16, marginTop: 12, fontFamily: "'Rajdhani', sans-serif" }}>
                    最终比分 {state.scores[0]} : {state.scores[1]}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          style={{
            width: 280,
            background: 'rgba(0,0,0,0.4)',
            borderLeft: '1px solid #00f5ff11',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #00f5ff11',
              color: '#00f5ff',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 1,
            }}
          >
            对局日志
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {logs.length === 0 && (
              <div style={{ color: '#ffffff22', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                等待游戏开始...
              </div>
            )}
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  color:
                    log.type === 'capture'
                      ? '#ff6b6b'
                      : log.type === 'score'
                      ? '#ffd700'
                      : log.type === 'win'
                      ? '#00f5ff'
                      : log.type === 'move'
                      ? '#ffffff88'
                      : '#ffffff44',
                  background:
                    log.type === 'capture'
                      ? '#ff6b6b11'
                      : log.type === 'score'
                      ? '#ffd70011'
                      : log.type === 'win'
                      ? '#00f5ff11'
                      : 'transparent',
                  borderLeft:
                    log.type === 'capture'
                      ? '2px solid #ff6b6b44'
                      : log.type === 'score'
                      ? '2px solid #ffd70044'
                      : log.type === 'win'
                      ? '2px solid #00f5ff44'
                      : '2px solid transparent',
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                {log.text}
              </motion.div>
            ))}
          </div>

          <div
            style={{
              padding: 12,
              borderTop: '1px solid #00f5ff11',
            }}
          >
            <div
              style={{
                color: '#ffffff44',
                fontSize: 11,
                marginBottom: 8,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              属性克制
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#ffd700', width: 16, textAlign: 'center' }}>光</span>
                <span style={{ color: '#ffffff33' }}>→</span>
                <span style={{ color: '#9b59b6', width: 16, textAlign: 'center' }}>暗</span>
                <span style={{ color: '#ffffff22', marginLeft: 4, fontSize: 10 }}>光克暗</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#9b59b6', width: 16, textAlign: 'center' }}>暗</span>
                <span style={{ color: '#ffffff33' }}>→</span>
                <span style={{ color: '#00ffff', width: 16, textAlign: 'center' }}>幻</span>
                <span style={{ color: '#ffffff22', marginLeft: 4, fontSize: 10 }}>暗克幻</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#00ffff', width: 16, textAlign: 'center' }}>幻</span>
                <span style={{ color: '#ffffff33' }}>→</span>
                <span style={{ color: '#ffd700', width: 16, textAlign: 'center' }}>光</span>
                <span style={{ color: '#ffffff22', marginLeft: 4, fontSize: 10 }}>幻克光</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
