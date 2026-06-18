import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Note,
  NotePitch,
  STAFF_POSITIONS,
  JIANPU_NUMBERS,
  ViewMode,
  generateId,
  PIANO_KEYS,
} from '@/types';
import { useScoreStore, getNextStartTime } from '@/store/useScoreStore';
import { audioEngine } from '@/utils/audioEngine';

const SVG_WIDTH = 1400;
const SVG_HEIGHT = 420;
const STAFF_TOP = 100;
const STAFF_LINE_SPACING = 10;
const MEASURE_WIDTH = 280;
const BEATS_PER_MEASURE = 4;
const BEAT_WIDTH = MEASURE_WIDTH / BEATS_PER_MEASURE;
const LEFT_MARGIN = 80;

const STAFF_PITCHES: NotePitch[] = [
  'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5',
  'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4',
  'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3',
];

export const ScoreEditor: React.FC = () => {
  const notes = useScoreStore((s) => s.notes);
  const viewMode = useScoreStore((s) => s.viewMode);
  const selectedNoteId = useScoreStore((s) => s.selectedNoteId);
  const currentNoteId = useScoreStore((s) => s.currentNoteId);
  const addNote = useScoreStore((s) => s.addNote);
  const removeNote = useScoreStore((s) => s.removeNote);
  const setSelectedNote = useScoreStore((s) => s.setSelectedNote);
  const userColor = useScoreStore((s) => s.userColor);
  const cursors = useScoreStore((s) => s.cursors);
  const userId = useScoreStore((s) => s.userId);
  const updateCursor = useScoreStore((s) => s.updateCursor);

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewTransition, setViewTransition] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number>(1);

  useEffect(() => {
    setViewTransition(true);
    const timer = setTimeout(() => setViewTransition(false), 500);
    return () => clearTimeout(timer);
  }, [viewMode]);

  const getNoteX = (startTime: number): number => {
    return LEFT_MARGIN + startTime * BEAT_WIDTH;
  };

  const getStaffNoteY = (pitch: NotePitch): number => {
    const pos = STAFF_POSITIONS[pitch];
    return STAFF_TOP + pos * (STAFF_LINE_SPACING / 2);
  };

  const getPitchFromY = (y: number): NotePitch => {
    const pos = Math.round((y - STAFF_TOP) / (STAFF_LINE_SPACING / 2));
    const idx = Math.max(0, Math.min(STAFF_PITCHES.length - 1, pos + 7));
    return STAFF_PITCHES[idx];
  };

  const getStartTimeFromX = (x: number): number => {
    const adjustedX = Math.max(0, x - LEFT_MARGIN);
    return Math.round((adjustedX / BEAT_WIDTH) * 4) / 4;
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let pitch: NotePitch;
    if (viewMode === 'staff') {
      pitch = getPitchFromY(y);
    } else {
      const rowIndex = Math.floor((y - 80) / 45);
      const rowPitches: NotePitch[][] = [
        ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'],
        ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
        ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'],
      ];
      const col = Math.min(6, Math.max(0, Math.floor((x - LEFT_MARGIN) % MEASURE_WIDTH / (MEASURE_WIDTH / 7))));
      const row = Math.max(0, Math.min(2, rowIndex));
      pitch = rowPitches[row][col];
    }

    const startTime = getStartTimeFromX(x);
    const noteId = generateId();

    audioEngine.playNote(pitch, 0.3);

    addNote({
      id: noteId,
      pitch,
      duration: currentDuration as any,
      startTime,
      velocity: 0.75,
      color: userColor,
    });
  };

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const scaleY = SVG_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      setHoverPosition({ x, y });

      updateCursor({
        userId,
        userName: useScoreStore.getState().userName,
        color: userColor,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [userId, userColor, updateCursor]
  );

  const handleNoteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (selectedNoteId === noteId) {
      removeNote(noteId);
      setSelectedNote(null);
    } else {
      setSelectedNote(noteId);
    }
  };

  const renderStaff = () => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(
        <line
          key={`staff-line-${i}`}
          x1={LEFT_MARGIN - 30}
          y1={STAFF_TOP + i * STAFF_LINE_SPACING}
          x2={SVG_WIDTH - 20}
          y2={STAFF_TOP + i * STAFF_LINE_SPACING}
          stroke="#333"
          strokeWidth={1}
        />
      );
    }

    const measures = [];
    const totalMeasures = Math.max(8, Math.ceil(getNextStartTime() / BEATS_PER_MEASURE) + 2);
    for (let i = 0; i <= totalMeasures; i++) {
      measures.push(
        <line
          key={`measure-${i}`}
          x1={LEFT_MARGIN + i * MEASURE_WIDTH}
          y1={STAFF_TOP - 5}
          x2={LEFT_MARGIN + i * MEASURE_WIDTH}
          y2={STAFF_TOP + 4 * STAFF_LINE_SPACING + 5}
          stroke="#666"
          strokeWidth={1}
        />
      );
    }

    const clef = (
      <text
        x={LEFT_MARGIN - 50}
        y={STAFF_TOP + 35}
        fontSize="56"
        fill="#333"
        fontFamily="serif"
      >
        𝄞
      </text>
    );

    return <>{lines}{measures}{clef}</>;
  };

  const renderJianpu = () => {
    const rows = [];
    const rowLabels = ['高音组', '中音组', '低音组'];
    for (let r = 0; r < 3; r++) {
      const baseY = 80 + r * 100;
      rows.push(
        <g key={`jianpu-row-${r}`}>
          <line
            x1={LEFT_MARGIN - 20}
            y1={baseY}
            x2={SVG_WIDTH - 20}
            y2={baseY}
            stroke="#555"
            strokeWidth={1.5}
          />
          <line
            x1={LEFT_MARGIN - 20}
            y1={baseY + 50}
            x2={SVG_WIDTH - 20}
            y2={baseY + 50}
            stroke="#555"
            strokeWidth={1.5}
          />
          <text
            x={10}
            y={baseY + 32}
            fontSize="12"
            fill="#888"
            textAnchor="start"
          >
            {rowLabels[r]}
          </text>
          {[1, 2, 3, 4, 5, 6, 7].map((n, i) => {
            const colX = LEFT_MARGIN + 20 + i * ((MEASURE_WIDTH - 40) / 6);
            return (
              <text
                key={`hint-${r}-${i}`}
                x={colX}
                y={baseY + 35}
                fontSize="18"
                fill="#ccc"
                textAnchor="middle"
                opacity={0.3}
              >
                {n}
              </text>
            );
          })}
        </g>
      );

      const totalMeasures = Math.max(4, Math.ceil(getNextStartTime() / BEATS_PER_MEASURE) + 1);
      for (let m = 1; m <= totalMeasures; m++) {
        rows.push(
          <line
            key={`jianpu-measure-${r}-${m}`}
            x1={LEFT_MARGIN + m * MEASURE_WIDTH}
            y1={baseY - 5}
            x2={LEFT_MARGIN + m * MEASURE_WIDTH}
            y2={baseY + 55}
            stroke="#888"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        );
      }
    }
    return <>{rows}</>;
  };

  const getJianpuNotePosition = (pitch: NotePitch): { row: number; baseY: number } => {
    const octave = parseInt(pitch.slice(-1));
    if (octave >= 5) return { row: 0, baseY: 80 };
    if (octave === 4) return { row: 1, baseY: 180 };
    return { row: 2, baseY: 280 };
  };

  const renderNoteStaff = (note: Note) => {
    const x = getNoteX(note.startTime);
    const y = getStaffNoteY(note.pitch);
    const isSelected = selectedNoteId === note.id;
    const isCurrent = currentNoteId === note.id;
    const isSharp = note.pitch.includes('#');

    const noteWidth = 18 + note.duration * 8;
    const stemUp = STAFF_POSITIONS[note.pitch] <= 4;

    let opacity = 1;
    let scale = 1;
    if (note.animating === 'fadeIn') {
      opacity = 0;
      scale = 0.3;
    } else if (note.animating === 'fadeOut') {
      opacity = 0;
      scale = 1.5;
    }

    return (
      <g
        key={note.id}
        onClick={(e) => handleNoteClick(e, note.id)}
        style={{
          cursor: 'pointer',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity,
          transformOrigin: `${x}px ${y}px`,
          transform: `scale(${scale})`,
        }}
      >
        {(isSelected || isCurrent) && (
          <rect
            x={x - 15}
            y={y - 20}
            width={noteWidth + 20}
            height={40}
            fill={isCurrent ? note.color : 'transparent'}
            stroke={isSelected ? '#ff6b6b' : 'transparent'}
            strokeWidth={2}
            rx={5}
            opacity={isCurrent ? 0.3 : 1}
          />
        )}
        {isSharp && (
          <text
            x={x - 18}
            y={y + 5}
            fontSize="18"
            fill={note.color}
            fontWeight="bold"
          >
            ♯
          </text>
        )}
        {STAFF_POSITIONS[note.pitch] > 7 && STAFF_POSITIONS[note.pitch] % 2 === 0 && (
          <line x1={x - 10} y1={y} x2={x + 28} y2={y} stroke="#333" strokeWidth={1} />
        )}
        {STAFF_POSITIONS[note.pitch] < -1 && STAFF_POSITIONS[note.pitch] % 2 === 0 && (
          <line x1={x - 10} y1={y} x2={x + 28} y2={y} stroke="#333" strokeWidth={1} />
        )}
        <ellipse
          cx={x + 9}
          cy={y}
          rx={noteWidth / 2}
          ry={7}
          fill={note.color}
          stroke={note.color}
          strokeWidth={1}
          transform={`rotate(${stemUp ? -15 : 15} ${x + 9} ${y})`}
          style={{
            filter: `drop-shadow(0 2px 4px ${note.color}55)`,
          }}
        />
        {note.duration < 4 && (
          <line
            x1={stemUp ? x + noteWidth - 2 : x + 2}
            y1={y}
            x2={stemUp ? x + noteWidth - 2 : x + 2}
            y2={stemUp ? y - 35 : y + 35}
            stroke={note.color}
            strokeWidth={2}
          />
        )}
        {note.duration < 1 && (
          <>
            {note.duration <= 0.5 && (
              <line
                x1={stemUp ? x + noteWidth : x}
                y1={stemUp ? y - 30 : y + 30}
                x2={x + noteWidth + 12}
                y2={stemUp ? y - 25 : y + 35}
                stroke={note.color}
                strokeWidth={2}
              />
            )}
            {note.duration <= 0.25 && (
              <line
                x1={stemUp ? x + noteWidth : x}
                y1={stemUp ? y - 22 : y + 22}
                x2={x + noteWidth + 12}
                y2={stemUp ? y - 17 : y + 27}
                stroke={note.color}
                strokeWidth={2}
              />
            )}
          </>
        )}
      </g>
    );
  };

  const renderNoteJianpu = (note: Note) => {
    const x = getNoteX(note.startTime) + 20;
    const { baseY } = getJianpuNotePosition(note.pitch);
    const y = baseY + 35;
    const isSelected = selectedNoteId === note.id;
    const isCurrent = currentNoteId === note.id;

    let opacity = 1;
    let scale = 1;
    if (note.animating === 'fadeIn') {
      opacity = 0;
      scale = 0.3;
    } else if (note.animating === 'fadeOut') {
      opacity = 0;
      scale = 1.5;
    }

    const fontSize = note.duration >= 2 ? 36 : note.duration >= 1 ? 30 : 24;

    return (
      <g
        key={note.id}
        onClick={(e) => handleNoteClick(e, note.id)}
        style={{
          cursor: 'pointer',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity,
          transformOrigin: `${x}px ${y}px`,
          transform: `scale(${scale})`,
        }}
      >
        {(isSelected || isCurrent) && (
          <circle
            cx={x}
            cy={y - 5}
            r={25}
            fill={isCurrent ? note.color : 'transparent'}
            stroke={isSelected ? '#ff6b6b' : 'transparent'}
            strokeWidth={2}
            opacity={isCurrent ? 0.3 : 1}
          />
        )}
        <text
          x={x}
          y={y}
          fontSize={fontSize}
          fontWeight="bold"
          fill={note.color}
          textAnchor="middle"
          style={{
            filter: `drop-shadow(0 2px 3px ${note.color}66)`,
          }}
        >
          {JIANPU_NUMBERS[note.pitch]}
        </text>
        {note.duration <= 0.5 && (
          <line x1={x - 12} y1={y + 10} x2={x + 12} y2={y + 10} stroke={note.color} strokeWidth={2} />
        )}
        {note.duration <= 0.25 && (
          <line x1={x - 12} y1={y + 16} x2={x + 12} y2={y + 16} stroke={note.color} strokeWidth={2} />
        )}
        {note.duration >= 2 && (
          <line x1={x - 15} y1={y + 12} x2={x + 15} y2={y + 12} stroke={note.color} strokeWidth={2} strokeDasharray="6,4" />
        )}
      </g>
    );
  };

  const renderCursors = () => {
    return Object.values(cursors)
      .filter((c) => c.userId !== userId)
      .map((cursor) => (
        <g key={cursor.userId}>
          <line
            x1={cursor.x}
            y1={cursor.y - 15}
            x2={cursor.x}
            y2={cursor.y + 15}
            stroke={cursor.color}
            strokeWidth={2}
            opacity={0.8}
          />
          <polygon
            points={`${cursor.x},${cursor.y - 15} ${cursor.x - 5},${cursor.y - 22} ${cursor.x + 5},${cursor.y - 22}`}
            fill={cursor.color}
          />
          <rect
            x={cursor.x + 8}
            y={cursor.y - 28}
            width={cursor.userName.length * 10 + 12}
            height={18}
            rx={4}
            fill={cursor.color}
          />
          <text
            x={cursor.x + 14}
            y={cursor.y - 15}
            fontSize="11"
            fill="#fff"
            fontWeight="600"
          >
            {cursor.userName}
          </text>
        </g>
      ));
  };

  const renderHoverPreview = () => {
    if (!hoverPosition) return null;
    if (viewMode === 'staff') {
      const pitch = getPitchFromY(hoverPosition.y);
      const startTime = getStartTimeFromX(hoverPosition.x);
      const x = getNoteX(startTime);
      const y = getStaffNoteY(pitch);
      return (
        <ellipse
          cx={x + 9}
          cy={y}
          rx={13}
          ry={7}
          fill={userColor}
          opacity={0.3}
          pointerEvents="none"
        />
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.label}>时值:</span>
        {[
          { v: 0.25, l: '𝅘𝅥𝅯', name: '16分' },
          { v: 0.5, l: '𝅘𝅥𝅮', name: '8分' },
          { v: 1, l: '𝅘𝅥', name: '4分' },
          { v: 2, l: '𝅗𝅥', name: '2分' },
          { v: 4, l: '𝅝', name: '全' },
        ].map((d) => (
          <button
            key={d.v}
            onClick={() => setCurrentDuration(d.v)}
            title={d.name}
            style={{
              ...styles.durationBtn,
              ...(currentDuration === d.v ? styles.durationBtnActive : {}),
            }}
          >
            <span style={{ fontSize: '18px' }}>{d.l}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={styles.hint}>点击谱面添加音符，再次点击音符可删除</span>
      </div>

      <div
        style={{
          ...styles.scoreWrapper,
          transform: viewTransition ? 'perspective(1000px) rotateY(90deg) scale(0.8)' : 'perspective(1000px) rotateY(0deg) scale(1)',
          opacity: viewTransition ? 0 : 1,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={styles.svg}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoverPosition(null)}
        >
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdf6e3" />
              <stop offset="100%" stopColor="#f5e9c8" />
            </linearGradient>
            <filter id="noteGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#bgGrad)" rx={8} />
          {viewMode === 'staff' ? renderStaff() : renderJianpu()}
          {hoverPosition && renderHoverPreview()}
          <g filter="url(#noteGlow)">
            {notes.map((note) =>
              viewMode === 'staff' ? renderNoteStaff(note) : renderNoteJianpu(note)
            )}
          </g>
          {renderCursors()}
        </svg>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  label: {
    color: '#aaa',
    fontSize: '13px',
    marginRight: '4px',
  },
  durationBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)',
    color: '#ccc',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  durationBtnActive: {
    background: 'linear-gradient(135deg, rgba(255,107,107,0.3), rgba(72,219,251,0.3))',
    color: '#fff',
    boxShadow: '0 0 15px rgba(72,219,251,0.2)',
    border: '1px solid rgba(72,219,251,0.3)',
  },
  hint: {
    color: '#666',
    fontSize: '12px',
  },
  scoreWrapper: {
    flex: 1,
    overflow: 'auto',
    borderRadius: '12px',
    padding: '12px',
    background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
    boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    width: '100%',
    maxWidth: '100%',
    height: 'auto',
    minHeight: '350px',
    cursor: 'crosshair',
    borderRadius: '8px',
  },
};

export default ScoreEditor;
