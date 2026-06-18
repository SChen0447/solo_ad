import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, Card, Position, BeamRecord } from './GameState';
import { CardComponent } from './Card';

interface BoardProps {
  width: number;
  height: number;
}

const BOARD_SIZE = 8;
const CELL_WIDTH = 80;
const CELL_HEIGHT = 40;

const toIsometric = (x: number, y: number, z: number = 0) => {
  const isoX = (x - y) * 0.5;
  const isoY = (x + y) * 0.25 - z;
  return { x: isoX, y: isoY };
};

const fromIsometric = (isoX: number, isoY: number) => {
  const x = isoX + 2 * isoY;
  const y = 2 * isoY - isoX;
  return { x: Math.floor(x), y: Math.floor(y) };
};

export const Board: React.FC<BoardProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const beamProgressRef = useRef<number>(0);

  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  const {
    cards,
    phase,
    aimAngle,
    aimSourceId,
    activeBeam,
    particles,
    currentPlayer,
    hasMoved,
    hasAttacked,
    selectedCardId,
    draggingCardId,
    setDraggingCard,
    updateDragPosition,
    moveCard,
    startAim,
    setAimAngle,
    fireBeam,
    updateParticles,
    selectCard,
  } = useGameStore();

  const boardWidth = BOARD_SIZE * CELL_WIDTH;
  const boardHeight = BOARD_SIZE * CELL_HEIGHT;
  const boardOffsetX = width / 2;
  const boardOffsetY = height / 2 - boardHeight / 2 + 50;

  const screenToBoard = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = screenX - rect.left - boardOffsetX;
      const y = screenY - rect.top - boardOffsetY;
      const isoX = x / (CELL_WIDTH / 2);
      const isoY = y / (CELL_HEIGHT / 2);
      const boardPos = fromIsometric(isoX, isoY);
      return {
        x: Math.max(0, Math.min(BOARD_SIZE - 1, boardPos.x)),
        y: Math.max(0, Math.min(BOARD_SIZE - 1, boardPos.y)),
      };
    },
    [boardOffsetX, boardOffsetY]
  );

  const getBeamColor = (reflectionCount: number) => {
    const baseColor = '#00d4ff';
    if (reflectionCount === 0) return baseColor;
    const alpha = 1 - reflectionCount * 0.25;
    return `rgba(0, 212, 255, ${alpha})`;
  };

  const getBeamWidth = (reflectionCount: number) => {
    return Math.max(0.5, 2 - reflectionCount * 0.5);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      updateParticles(deltaTime);

      ctx.clearRect(0, 0, width, height);

      if (activeBeam) {
        beamProgressRef.current += deltaTime * 2 * useGameStore.getState().animationSpeed;
        const progress = Math.min(beamProgressRef.current, 1);
        drawBeam(ctx, activeBeam, progress);
      } else {
        beamProgressRef.current = 0;
      }

      drawParticles(ctx);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, activeBeam, updateParticles]);

  const drawBeam = (ctx: CanvasRenderingContext2D, beam: BeamRecord, progress: number) => {
    const totalLength = beam.path.length - 1;
    const currentSegment = Math.min(Math.floor(progress * totalLength), totalLength - 1);
    const segmentProgress = (progress * totalLength) % 1;

    for (let i = 0; i <= currentSegment; i++) {
      const start = beam.path[i];
      const end = beam.path[i + 1];
      if (!start || !end) break;

      const startIso = toIsometric(start.x, start.y);
      const endIso = toIsometric(end.x, end.y);

      const startX = boardOffsetX + startIso.x * CELL_WIDTH;
      const startY = boardOffsetY + startIso.y * CELL_HEIGHT;
      const endX = boardOffsetX + endIso.x * CELL_WIDTH;
      const endY = boardOffsetY + endIso.y * CELL_HEIGHT;

      let drawEndX = endX;
      let drawEndY = endY;

      if (i === currentSegment && segmentProgress < 1) {
        drawEndX = startX + (endX - startX) * segmentProgress;
        drawEndY = startY + (endY - startY) * segmentProgress;
      }

      const reflectionCount = start.reflectionCount;
      const color = getBeamColor(reflectionCount);
      const lineWidth = getBeamWidth(reflectionCount);

      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(drawEndX, drawEndY);
      ctx.stroke();

      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 2;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(drawEndX, drawEndY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particles.forEach((p) => {
      const iso = toIsometric(p.x, p.y);
      const x = boardOffsetX + iso.x * CELL_WIDTH;
      const y = boardOffsetY + iso.y * CELL_HEIGHT;

      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
  };

  const drawAngleSelector = () => {
    if (phase !== 'aim' || !aimSourceId) return null;

    const source = cards.find((c) => c.id === aimSourceId);
    if (!source) return null;

    const iso = toIsometric(source.position.x + 0.5, source.position.y + 0.5);
    const centerX = boardOffsetX + iso.x * CELL_WIDTH;
    const centerY = boardOffsetY + iso.y * CELL_HEIGHT;
    const radius = 150;

    const startAngle = -aimAngle * (Math.PI / 180) - Math.PI / 6;
    const endAngle = -aimAngle * (Math.PI / 180) + Math.PI / 6;

    const { path, hits } = useGameStore.getState().calculateBeamPath(source, aimAngle);
    const previewColor = hits.length > 0 ? '#2ecc71' : '#e74c3c';

    return (
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: '100%', zIndex: 50 }}
      >
        <defs>
          <radialGradient id="aimGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
          </radialGradient>
        </defs>

        <path
          d={`M ${centerX} ${centerY} L ${centerX + Math.cos(startAngle) * radius} ${
            centerY + Math.sin(startAngle) * radius
          } A ${radius} ${radius} 0 0 1 ${centerX + Math.cos(endAngle) * radius} ${
            centerY + Math.sin(endAngle) * radius
          } Z`}
          fill="url(#aimGradient)"
          stroke="#00d4ff"
          strokeWidth="1"
          opacity="0.5"
        />

        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + Math.cos(-aimAngle * (Math.PI / 180)) * radius}
          y2={centerY + Math.sin(-aimAngle * (Math.PI / 180)) * radius}
          stroke={previewColor}
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {path.length > 1 && (
          <polyline
            points={path
              .map((p) => {
                const isoP = toIsometric(p.x, p.y);
                return `${boardOffsetX + isoP.x * CELL_WIDTH},${boardOffsetY + isoP.y * CELL_HEIGHT}`;
              })
              .join(' ')}
            fill="none"
            stroke={previewColor}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.6"
          />
        )}

        <text
          x={centerX}
          y={centerY - 30}
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="bold"
        >
          {aimAngle}°
        </text>
      </svg>
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (draggingCardId) {
      updateDragPosition(screenX, screenY);
    }

    if (phase === 'aim') {
      const source = cards.find((c) => c.id === aimSourceId);
      if (source) {
        const iso = toIsometric(source.position.x + 0.5, source.position.y + 0.5);
        const centerX = boardOffsetX + iso.x * CELL_WIDTH;
        const centerY = boardOffsetY + iso.y * CELL_HEIGHT;
        const dx = screenX - centerX;
        const dy = screenY - centerY;
        let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
        setAimAngle(angle);
      }
    }

    const cell = screenToBoard(e.clientX, e.clientY);
    setHoveredCell(cell);
  };

  const handleMouseDown = (e: React.MouseEvent, card: Card) => {
    if (card.faction !== currentPlayer || phase !== 'move') return;
    if (card.type !== 'hero' || hasMoved) return;

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingCard(card.id, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingCardId) {
      const targetPos = screenToBoard(e.clientX, e.clientY);
      moveCard(draggingCardId, targetPos);
      setDraggingCard(null);
    }
  };

  const handleCellClick = (pos: Position) => {
    if (phase === 'aim') return;
    if (phase === 'ai' || phase === 'gameover') return;

    const cardAtPos = cards.find(
      (c) => c.position.x === pos.x && c.position.y === pos.y
    );

    if (cardAtPos && cardAtPos.faction === currentPlayer) {
      if (cardAtPos.type === 'base' || cardAtPos.type === 'hero') {
        if (!hasAttacked) {
          startAim(cardAtPos.id);
        }
      }
    } else if (selectedCardId && !cardAtPos) {
      const selectedCard = cards.find((c) => c.id === selectedCardId);
      if (selectedCard && selectedCard.type === 'hero') {
        const dx = Math.abs(pos.x - selectedCard.position.x);
        const dy = Math.abs(pos.y - selectedCard.position.y);
        if (dx <= 1 && dy <= 1) {
          moveCard(selectedCardId, pos);
        }
      }
    } else {
      selectCard(null);
    }
  };

  const handleConfirmAttack = () => {
    if (phase === 'aim' && aimSourceId) {
      fireBeam(aimSourceId, aimAngle);
    }
  };

  const handleCancelAim = () => {
    useGameStore.setState({ phase: 'move', aimSourceId: null });
  };

  const renderCells = () => {
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const iso = toIsometric(x, y);
        const px = boardOffsetX + iso.x * CELL_WIDTH;
        const py = boardOffsetY + iso.y * CELL_HEIGHT;
        const isDark = (x + y) % 2 === 0;
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        const canMoveTo =
          selectedCardId &&
          !cards.find((c) => c.position.x === x && c.position.y === y);

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`absolute transition-all duration-150 ${
              canMoveTo ? 'cursor-pointer' : ''
            }`}
            style={{
              left: px - CELL_WIDTH / 2,
              top: py,
              width: CELL_WIDTH,
              height: CELL_HEIGHT,
              zIndex: Math.floor(y * 10),
            }}
            onMouseEnter={() => setHoveredCell({ x, y })}
            onMouseLeave={() => setHoveredCell(null)}
            onClick={() => handleCellClick({ x, y })}
          >
            <div
              className="w-full h-full transition-all"
              style={{
                background: isDark ? '#2c3e50' : '#34495e',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                opacity: isHovered ? 0.8 : 1,
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered
                  ? '0 0 20px rgba(241, 196, 15, 0.5)'
                  : 'none',
              }}
            />
            {canMoveTo && isHovered && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  background: 'rgba(46, 204, 113, 0.3)',
                }}
              />
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const renderBorder = () => {
    const borderPoints = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      borderPoints.push(toIsometric(i, 0));
    }
    for (let i = 0; i < BOARD_SIZE; i++) {
      borderPoints.push(toIsometric(BOARD_SIZE - 1, i));
    }
    for (let i = BOARD_SIZE - 1; i >= 0; i--) {
      borderPoints.push(toIsometric(i, BOARD_SIZE - 1));
    }
    for (let i = BOARD_SIZE - 1; i >= 0; i--) {
      borderPoints.push(toIsometric(0, i));
    }

    const svgPoints = borderPoints
      .map(
        (p) =>
          `${boardOffsetX + p.x * CELL_WIDTH},${boardOffsetY + p.y * CELL_HEIGHT + CELL_HEIGHT / 2}`
      )
      .join(' ');

    return (
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: '100%', zIndex: 5 }}
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
        <polygon
          points={svgPoints}
          fill="none"
          stroke="#f1c40f"
          strokeWidth="3"
          filter="url(#glow)"
          style={{
            strokeDasharray: '10,5',
            animation: 'borderGlow 3s linear infinite',
          }}
        />
      </svg>
    );
  };

  return (
    <div
      ref={boardRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
          }}
        />
      </div>

      {renderCells()}
      {renderBorder()}

      {cards
        .filter((c) => c.type === 'obstacle')
        .map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            cellSize={CELL_WIDTH}
            boardOffsetX={boardOffsetX}
            boardOffsetY={boardOffsetY}
          />
        ))}

      {cards
        .filter((c) => c.type === 'base')
        .map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            cellSize={CELL_WIDTH}
            boardOffsetX={boardOffsetX}
            boardOffsetY={boardOffsetY}
            onClick={() => {
              if (card.faction === currentPlayer && !hasAttacked) {
                startAim(card.id);
              }
            }}
          />
        ))}

      {cards
        .filter((c) => c.type === 'hero')
        .sort((a, b) => a.position.y - b.position.y)
        .map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            cellSize={CELL_WIDTH}
            boardOffsetX={boardOffsetX}
            boardOffsetY={boardOffsetY}
            isDragging={draggingCardId === card.id}
            onMouseDown={(e) => handleMouseDown(e, card)}
            onClick={() => {
              if (card.faction === currentPlayer && !hasAttacked && phase === 'move') {
                startAim(card.id);
              }
            }}
          />
        ))}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 100 }}
      />

      {drawAngleSelector()}

      {phase === 'aim' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-[200]">
          <button
            onClick={handleCancelAim}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all shadow-lg"
          >
            取消
          </button>
          <button
            onClick={handleConfirmAttack}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-bold transition-all shadow-lg shadow-cyan-500/30"
          >
            发射！({aimAngle}°)
          </button>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[300]">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {useGameStore.getState().winner === 'player' ? '🏆' : '💀'}
            </div>
            <div className="text-3xl font-bold text-white mb-4">
              {useGameStore.getState().winner === 'player' ? '胜利！' : '失败...'}
            </div>
            <button
              onClick={() => useGameStore.getState().initializeGame()}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-xl hover:scale-105 transition-transform"
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
