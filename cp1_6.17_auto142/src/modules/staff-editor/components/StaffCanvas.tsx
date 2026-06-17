import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  INSTRUMENT_CONFIG,
  DURATION_CONFIG,
  DURATION_ORDER,
  MusicSymbol,
  DurationType,
  TOTAL_BEATS,
  BEATS_PER_MEASURE,
  STAFF_LINE_COUNT,
  pitchToName,
} from '@/core/types';
import { useScoreStore } from '@/store/useScoreStore';
import styles from './StaffCanvas.module.css';

const STAFF_PADDING_LEFT = 40;
const STAFF_PADDING_RIGHT = 20;
const STAFF_PADDING_TOP = 50;
const LINE_SPACING = 16;
const STAFF_HEIGHT = (STAFF_LINE_COUNT - 1) * LINE_SPACING;
const SYMBOL_SIZE = 28;

function getStaffY(linePosition: number): number {
  return STAFF_PADDING_TOP + (STAFF_LINE_COUNT - 1 - linePosition) * (LINE_SPACING / 2);
}

function getLinePositionFromY(y: number): number {
  const raw = (STAFF_PADDING_TOP + STAFF_HEIGHT - y) / (LINE_SPACING / 2);
  return Math.max(0, Math.min(8, Math.round(raw)));
}

function getBeatFromX(x: number, canvasWidth: number): number {
  const usableWidth = canvasWidth - STAFF_PADDING_LEFT - STAFF_PADDING_RIGHT;
  const raw = ((x - STAFF_PADDING_LEFT) / usableWidth) * TOTAL_BEATS;
  return Math.max(0, Math.min(TOTAL_BEATS - 1, Math.floor(raw)));
}

function getSymbolX(beat: number, canvasWidth: number): number {
  const usableWidth = canvasWidth - STAFF_PADDING_LEFT - STAFF_PADDING_RIGHT;
  return STAFF_PADDING_LEFT + (beat / TOTAL_BEATS) * usableWidth + (usableWidth / TOTAL_BEATS) / 2;
}

function ShapeRenderer({ shape, color, size }: { shape: string; color: string; size: number }) {
  const half = size / 2;
  switch (shape) {
    case 'circle':
      return <circle cx={half} cy={half} r={half * 0.8} fill={color} />;
    case 'triangle':
      return <polygon points={`${half},${size * 0.1} ${size * 0.9},${size * 0.85} ${size * 0.1},${size * 0.85}`} fill={color} />;
    case 'square':
      return <rect x={size * 0.1} y={size * 0.1} width={size * 0.8} height={size * 0.8} rx={3} fill={color} />;
    case 'wave':
      return (
        <path
          d={`M${size * 0.05},${half} Q${size * 0.25},${size * 0.15} ${half},${half} Q${size * 0.75},${size * 0.85} ${size * 0.95},${half}`}
          stroke={color}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

function PlacedSymbol({
  symbol,
  canvasWidth,
  isHighlighted,
  isSelected,
  onSelect,
  onDoubleClick,
  onDurationCycle,
}: {
  symbol: MusicSymbol;
  canvasWidth: number;
  isHighlighted: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDurationCycle: () => void;
}) {
  const config = INSTRUMENT_CONFIG[symbol.instrument];
  const durConfig = DURATION_CONFIG[symbol.duration];
  const x = getSymbolX(symbol.beat, canvasWidth);
  const y = getStaffY(symbol.linePosition);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      style={{ cursor: 'pointer' }}
    >
      <g
        style={{
          transform: animating ? 'scale(1.3)' : isSelected ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: `${SYMBOL_SIZE / 2}px ${SYMBOL_SIZE / 2}px`,
        }}
      >
        <rect
          x={-2}
          y={-2}
          width={SYMBOL_SIZE + 4}
          height={SYMBOL_SIZE + 4}
          rx={6}
          fill="rgba(0,0,0,0.3)"
          style={{ opacity: isSelected ? 1 : 0 }}
        />
        <g transform={`translate(${(SYMBOL_SIZE - SYMBOL_SIZE) / 2}, ${(SYMBOL_SIZE - SYMBOL_SIZE) / 2})`}>
          <ShapeRenderer shape={config.shape} color={config.color} size={SYMBOL_SIZE} />
        </g>
        {animating && (
          <circle
            cx={SYMBOL_SIZE / 2}
            cy={SYMBOL_SIZE / 2}
            r={SYMBOL_SIZE / 2 + 6}
            fill="none"
            stroke="#D4A848"
            strokeWidth="2"
            opacity={0.8}
          >
            <animate attributeName="r" from={SYMBOL_SIZE / 2} to={SYMBOL_SIZE / 2 + 20} dur="0.3s" fill="freeze" />
            <animate attributeName="opacity" from={0.8} to={0} dur="0.3s" fill="freeze" />
          </circle>
        )}
      </g>
      <g
        transform={`translate(${SYMBOL_SIZE - 4}, -4)`}
        onClick={(e) => {
          e.stopPropagation();
          onDurationCycle();
        }}
        style={{ cursor: 'pointer' }}
      >
        <circle r={7} fill={durConfig.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
        <text
          x={0}
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="7"
          fontWeight="bold"
          fontFamily="'Orbitron', sans-serif"
        >
          {durConfig.beats}
        </text>
      </g>
      <text
        x={SYMBOL_SIZE / 2}
        y={SYMBOL_SIZE + 12}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize="8"
        fontFamily="'Noto Sans SC', sans-serif"
      >
        {pitchToName(symbol.pitch)}
      </text>
    </g>
  );
}

function PitchRuler({ symbol, canvasWidth }: { symbol: MusicSymbol; canvasWidth: number }) {
  const x = getSymbolX(symbol.beat, canvasWidth);
  const y = getStaffY(symbol.linePosition);
  const rulerTop = STAFF_PADDING_TOP - 10;
  const rulerBottom = STAFF_PADDING_TOP + STAFF_HEIGHT + 10;
  const steps = 9;
  const stepHeight = (rulerBottom - rulerTop) / (steps - 1);

  return (
    <g>
      <rect
        x={x - 50}
        y={rulerTop}
        width={100}
        height={rulerBottom - rulerTop}
        fill="rgba(0,0,0,0.5)"
        rx={4}
      />
      {Array.from({ length: steps }).map((_, i) => {
        const sy = rulerTop + i * stepHeight;
        const isActive = Math.round(symbol.linePosition * 2) / 2 === Math.round((8 - i) / 1 * 4) / 4;
        return (
          <g key={i}>
            <line
              x1={x - 40}
              y1={sy}
              x2={x + 40}
              y2={sy}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <text
              x={x - 44}
              y={sy + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize="7"
            >
              {pitchToName(i)}
            </text>
          </g>
        );
      })}
      <line
        x1={x}
        y1={rulerTop}
        x2={x}
        y2={rulerBottom}
        stroke={INSTRUMENT_CONFIG[symbol.instrument].color}
        strokeWidth="2"
        opacity={0.6}
      />
      <circle
        cx={x}
        cy={y}
        r={4}
        fill={INSTRUMENT_CONFIG[symbol.instrument].color}
      />
    </g>
  );
}

export default function StaffCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const symbols = useScoreStore((s) => s.symbols);
  const selectedId = useScoreStore((s) => s.selectedId);
  const highlightedId = useScoreStore((s) => s.highlightedId);
  const playbackState = useScoreStore((s) => s.playback);
  const addSymbol = useScoreStore((s) => s.addSymbol);
  const selectSymbol = useScoreStore((s) => s.selectSymbol);
  const updateSymbol = useScoreStore((s) => s.updateSymbol);
  const cycleDuration = useScoreStore((s) => s.cycleDuration);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({ id: 'staff-canvas' });

  const measuredRef = useCallback(
    (node: SVGSVGElement | null) => {
      if (node) {
        const rect = node.getBoundingClientRect();
        setCanvasWidth(rect.width);
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            setCanvasWidth(entry.contentRect.width);
          }
        });
        resizeObserver.observe(node);
        return () => resizeObserver.disconnect();
      }
    },
    []
  );

  const combinedRef = useCallback(
    (node: SVGSVGElement | null) => {
      (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
      measuredRef(node);
      setNodeRef(node);
    },
    [measuredRef, setNodeRef]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.target === svgRef.current) {
        selectSymbol(null);
        setEditingPitchId(null);
      }
    },
    [selectSymbol]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const instrument = e.dataTransfer.getData('instrument') as MusicSymbol['instrument'];
      if (!instrument) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const beat = getBeatFromX(x, canvasWidth);
      const linePosition = getLinePositionFromY(y);

      addSymbol({
        instrument,
        beat,
        pitch: Math.round((8 - linePosition) * 3),
        duration: 'quarter',
        linePosition,
      });
    },
    [canvasWidth, addSymbol]
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      setEditingPitchId(id);
    },
    []
  );

  const handlePitchAdjust = useCallback(
    (id: string, delta: number) => {
      const sym = symbols.find((s) => s.id === id);
      if (!sym) return;
      const newPitch = Math.max(0, Math.min(23, sym.pitch + delta));
      const newLinePos = Math.max(0, Math.min(8, 8 - Math.round(newPitch / 3)));
      updateSymbol(id, { pitch: newPitch, linePosition: newLinePos });
    },
    [symbols, updateSymbol]
  );

  useEffect(() => {
    if (editingPitchId) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handlePitchAdjust(editingPitchId, 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handlePitchAdjust(editingPitchId, -1);
        } else if (e.key === 'Escape') {
          setEditingPitchId(null);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [editingPitchId, handlePitchAdjust]);

  const usableWidth = canvasWidth - STAFF_PADDING_LEFT - STAFF_PADDING_RIGHT;
  const playheadX =
    STAFF_PADDING_LEFT + (playbackState.currentBeat / TOTAL_BEATS) * usableWidth;

  const canvasHeight = STAFF_PADDING_TOP + STAFF_HEIGHT + 60;

  return (
    <div className={styles.canvasWrapper}>
      <svg
        ref={combinedRef}
        className={styles.canvas}
        width="100%"
        height={canvasHeight}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <defs>
          <linearGradient id="staffBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2C3E50" />
            <stop offset="100%" stopColor="#34495E" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#staffBg)" rx="8" />

        {isOver && (
          <rect
            width="100%"
            height="100%"
            fill="rgba(212, 168, 72, 0.05)"
            rx="8"
          />
        )}

        {Array.from({ length: STAFF_LINE_COUNT }).map((_, i) => {
          const y = STAFF_PADDING_TOP + i * LINE_SPACING;
          return (
            <line
              key={`line-${i}`}
              x1={STAFF_PADDING_LEFT}
              y1={y}
              x2={canvasWidth - STAFF_PADDING_RIGHT}
              y2={y}
              stroke="#D4A848"
              strokeWidth="1.5"
              opacity={0.7}
            />
          );
        })}

        {Array.from({ length: TOTAL_BEATS / BEATS_PER_MEASURE }).map((_, i) => {
          const x = STAFF_PADDING_LEFT + (i / (TOTAL_BEATS / BEATS_PER_MEASURE)) * usableWidth;
          return (
            <g key={`measure-${i}`}>
              <line
                x1={x}
                y1={STAFF_PADDING_TOP - 4}
                x2={x}
                y2={STAFF_PADDING_TOP + STAFF_HEIGHT + 4}
                stroke="rgba(212, 168, 72, 0.3)"
                strokeWidth="1"
              />
              <text
                x={x + 8}
                y={STAFF_PADDING_TOP - 10}
                fill="rgba(212, 168, 72, 0.5)"
                fontSize="10"
                fontFamily="'Orbitron', sans-serif"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {symbols.map((sym) => (
          <PlacedSymbol
            key={sym.id}
            symbol={sym}
            canvasWidth={canvasWidth}
            isHighlighted={highlightedId === sym.id}
            isSelected={selectedId === sym.id}
            onSelect={() => selectSymbol(sym.id)}
            onDoubleClick={() => handleDoubleClick(sym.id)}
            onDurationCycle={() => cycleDuration(sym.id)}
          />
        ))}

        {editingPitchId && (() => {
          const sym = symbols.find((s) => s.id === editingPitchId);
          if (!sym) return null;
          return <PitchRuler symbol={sym} canvasWidth={canvasWidth} />;
        })()}

        {playbackState.isPlaying && (
          <line
            x1={playheadX}
            y1={STAFF_PADDING_TOP - 10}
            x2={playheadX}
            y2={STAFF_PADDING_TOP + STAFF_HEIGHT + 10}
            stroke="#D4A848"
            strokeWidth="2.5"
            filter="url(#glow)"
          >
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </line>
        )}
      </svg>
    </div>
  );
}
