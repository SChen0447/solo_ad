import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Score, Note, ToolMode, User, Accidental, ConflictInfo } from '../../types';

const STAFF_LINE_COUNT = 5;
const STAFF_LINE_SPACING = 12;
const MEASURE_WIDTH = 200;
const NOTE_WIDTH = 16;
const NOTE_HEIGHT = 20;
const CANVAS_PADDING_TOP = 60;
const CANVAS_PADDING_LEFT = 40;
const MEASURE_HEIGHT = STAFF_LINE_SPACING * (STAFF_LINE_COUNT - 1);

const PITCH_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

interface ScoreEditorProps {
  score: Score;
  toolMode: ToolMode;
  accidentalMode: Accidental;
  currentUser: User | null;
  onNoteAdd: (note: Note) => void;
  onNoteRemove: (noteId: string) => void;
  playbackProgress: number;
  conflicts: ConflictInfo[];
  highlightedDiff: { x: number; y: number } | null;
}

function getPitchFrequency(pitch: number, accidental: Accidental): number {
  const A4 = 440;
  const semitoneRatio = Math.pow(2, 1 / 12);
  const A4Position = 9;
  let semitoneOffset = (pitch - A4Position) * 2;
  if (pitch % 7 === 3 || pitch % 7 === 0) {
    semitoneOffset = semitoneOffset - (pitch >= A4Position ? 1 : -1);
  }
  if (accidental === 'sharp') semitoneOffset += 1;
  if (accidental === 'flat') semitoneOffset -= 1;
  return A4 * Math.pow(semitoneRatio, semitoneOffset);
}

export default function ScoreEditor({
  score,
  toolMode,
  accidentalMode,
  currentUser,
  onNoteAdd,
  onNoteRemove,
  playbackProgress,
  conflicts,
  highlightedDiff,
}: ScoreEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [pressedNote, setPressedNote] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const lastFrameRef = useRef<number>(0);

  const totalWidth = score.measures * MEASURE_WIDTH + CANVAS_PADDING_LEFT * 2;
  const totalHeight = MEASURE_HEIGHT + CANVAS_PADDING_TOP + 80;

  const animate = useCallback((timestamp: number) => {
    if (!lastFrameRef.current) lastFrameRef.current = timestamp;
    const delta = timestamp - lastFrameRef.current;
    if (delta >= 33) {
      lastFrameRef.current = timestamp;
    }
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
    const y = (clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
    return { x, y };
  }, []);

  const snapToNotePosition = useCallback((x: number, y: number) => {
    const relX = x - CANVAS_PADDING_LEFT;
    const measure = Math.max(0, Math.min(score.measures - 1, Math.floor(relX / MEASURE_WIDTH)));
    const posInMeasure = relX - measure * MEASURE_WIDTH;
    const snappedPosInMeasure = Math.round(posInMeasure / 20) * 20;

    const staffTop = CANVAS_PADDING_TOP;
    const relY = y - staffTop;
    const snappedPitch = Math.max(0, Math.min(18, Math.round(relY / (STAFF_LINE_SPACING / 2))));

    return {
      measure,
      position: measure * MEASURE_WIDTH + snappedPosInMeasure,
      pitch: snappedPitch,
      x: CANVAS_PADDING_LEFT + measure * MEASURE_WIDTH + snappedPosInMeasure,
      y: staffTop + snappedPitch * (STAFF_LINE_SPACING / 2),
    };
  }, [score.measures]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSvgPoint(e.clientX, e.clientY);
    if (!point) return;

    if (toolMode === 'add_quarter' || toolMode === 'add_eighth') {
      const snapped = snapToNotePosition(point.x, point.y);
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        measure: snapped.measure,
        position: snapped.position,
        pitch: snapped.pitch,
        duration: toolMode === 'add_quarter' ? 'quarter' : 'eighth',
        accidental: accidentalMode,
        x: snapped.x,
        y: snapped.y,
      };
      onNoteAdd(newNote);
      setPressedNote(newNote.id);
      setTimeout(() => setPressedNote(null), 200);
    }
  }, [toolMode, accidentalMode, getSvgPoint, snapToNotePosition, onNoteAdd]);

  const handleNoteClick = useCallback((e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (toolMode === 'delete') {
      onNoteRemove(note.id);
    }
  }, [toolMode, onNoteRemove]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode === 'add_quarter' || toolMode === 'add_eighth') {
      const point = getSvgPoint(e.clientX, e.clientY);
      if (point) {
        setHoverPos(snapToNotePosition(point.x, point.y));
      }
    }
  }, [toolMode, getSvgPoint, snapToNotePosition]);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  const renderStaffLines = () => {
    const lines = [];
    for (let i = 0; i < STAFF_LINE_COUNT; i++) {
      lines.push(
        <line
          key={`staff-${i}`}
          x1={CANVAS_PADDING_LEFT}
          y1={CANVAS_PADDING_TOP + i * STAFF_LINE_SPACING}
          x2={totalWidth - CANVAS_PADDING_LEFT}
          y2={CANVAS_PADDING_TOP + i * STAFF_LINE_SPACING}
          stroke="#cccccc"
          strokeWidth={1}
        />
      );
    }
    for (let m = 0; m <= score.measures; m++) {
      lines.push(
        <line
          key={`bar-${m}`}
          x1={CANVAS_PADDING_LEFT + m * MEASURE_WIDTH}
          y1={CANVAS_PADDING_TOP}
          x2={CANVAS_PADDING_LEFT + m * MEASURE_WIDTH}
          y2={CANVAS_PADDING_TOP + MEASURE_HEIGHT}
          stroke="#cccccc"
          strokeWidth={m === 0 || m === score.measures ? 2 : 1}
        />
      );
      if (m < score.measures) {
        lines.push(
          <text
            key={`measure-num-${m}`}
            x={CANVAS_PADDING_LEFT + m * MEASURE_WIDTH + 8}
            y={CANVAS_PADDING_TOP - 10}
            fill="#888"
            fontSize={10}
          >
            {m + 1}
          </text>
        );
      }
    }
    lines.push(
      <text
        key="clef"
        x={CANVAS_PADDING_LEFT - 25}
        y={CANVAS_PADDING_TOP + 30}
        fill="#cccccc"
        fontSize={36}
      >
        𝄞
      </text>
    );
    return lines;
  };

  const renderNote = (note: Note) => {
    const isPressed = pressedNote === note.id;
    const hasConflict = conflicts.some(c => c.type === 'note' && Math.abs(c.x - note.x) < 5 && Math.abs(c.y - note.y) < 5);

    return (
      <motion.g
        key={note.id}
        onClick={(e) => handleNoteClick(e, note)}
        whileHover={{ cursor: toolMode === 'delete' ? 'pointer' : 'default' }}
        style={{ transformOrigin: `${note.x}px ${note.y}px` }}
      >
        <AnimatePresence>
          {hasConflict && (
            <motion.circle
              cx={note.x}
              cy={note.y}
              r={18}
              fill="none"
              stroke="#FFD700"
              strokeWidth={2}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        <motion.g
          animate={{
            scale: isPressed ? 0.9 : 1,
            filter: isPressed ? 'brightness(0.6)' : 'brightness(1)',
          }}
          transition={{ duration: 0.2 }}
        >
          {note.accidental === 'sharp' && (
            <text
              x={note.x - 18}
              y={note.y + 4}
              fill="#000"
              fontSize={14}
              fontWeight="bold"
            >
              ♯
            </text>
          )}
          {note.accidental === 'flat' && (
            <text
              x={note.x - 18}
              y={note.y + 4}
              fill="#000"
              fontSize={14}
              fontWeight="bold"
            >
              ♭
            </text>
          )}
          {note.accidental === 'natural' && (
            <text
              x={note.x - 18}
              y={note.y + 4}
              fill="#000"
              fontSize={14}
              fontWeight="bold"
            >
              ♮
            </text>
          )}

          <ellipse
            cx={note.x}
            cy={note.y}
            rx={NOTE_WIDTH / 2}
            ry={NOTE_HEIGHT / 4}
            fill="#000"
            transform={`rotate(-20 ${note.x} ${note.y})`}
          />

          {(note.duration === 'quarter' || note.duration === 'eighth') && (
            <line
              x1={note.x + NOTE_WIDTH / 2 - 2}
              y1={note.y}
              x2={note.x + NOTE_WIDTH / 2 - 2}
              y2={note.y - 40}
              stroke="#000"
              strokeWidth={1.5}
            />
          )}

          {note.duration === 'eighth' && (
            <path
              d={`M ${note.x + NOTE_WIDTH / 2 - 2} ${note.y - 40} Q ${note.x + NOTE_WIDTH / 2 + 8} ${note.y - 25} ${note.x + NOTE_WIDTH / 2 - 2} ${note.y - 15}`}
              fill="none"
              stroke="#000"
              strokeWidth={1.5}
            />
          )}

          {note.pitch >= 10 && (
            <>
              {note.pitch % 2 === 0 && (
                <line
                  x1={note.x - NOTE_WIDTH}
                  y1={note.y}
                  x2={note.x + NOTE_WIDTH}
                  y2={note.y}
                  stroke="#cccccc"
                  strokeWidth={1}
                />
              )}
            </>
          )}
          {note.pitch < 4 && (
            <>
              {note.pitch % 2 === 0 && (
                <line
                  x1={note.x - NOTE_WIDTH}
                  y1={note.y}
                  x2={note.x + NOTE_WIDTH}
                  y2={note.y}
                  stroke="#cccccc"
                  strokeWidth={1}
                />
              )}
            </>
          )}
        </motion.g>
      </motion.g>
    );
  };

  const playbackX = CANVAS_PADDING_LEFT + playbackProgress * (totalWidth - CANVAS_PADDING_LEFT * 2);

  return (
    <div className="score-editor">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        height="100%"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="score-svg"
      >
        <defs>
          <pattern id="diffHighlight" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#FFD700" fillOpacity="0.3" />
            <circle cx="10" cy="10" r="3" fill="#FFD700" fillOpacity="0.5" />
          </pattern>
        </defs>

        {highlightedDiff && (
          <motion.rect
            x={highlightedDiff.x - 30}
            y={highlightedDiff.y - 30}
            width={60}
            height={60}
            fill="url(#diffHighlight)"
            rx={4}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {renderStaffLines()}

        <motion.line
          x1={playbackX}
          y1={CANVAS_PADDING_TOP - 10}
          x2={playbackX}
          y2={CANVAS_PADDING_TOP + MEASURE_HEIGHT + 10}
          stroke="#FF6B6B"
          strokeWidth={2}
          style={{
            transition: 'x 0.1s linear',
          }}
        />

        {score.notes.map(renderNote)}

        {hoverPos && (toolMode === 'add_quarter' || toolMode === 'add_eighth') && (
          <g opacity={0.5}>
            <ellipse
              cx={hoverPos.x}
              cy={hoverPos.y}
              rx={NOTE_WIDTH / 2}
              ry={NOTE_HEIGHT / 4}
              fill="#666"
              transform={`rotate(-20 ${hoverPos.x} ${hoverPos.y})`}
            />
            <line
              x1={hoverPos.x + NOTE_WIDTH / 2 - 2}
              y1={hoverPos.y}
              x2={hoverPos.x + NOTE_WIDTH / 2 - 2}
              y2={hoverPos.y - 40}
              stroke="#666"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
