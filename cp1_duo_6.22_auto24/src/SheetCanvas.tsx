import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Note, NoteDuration, midiToNoteName } from './PlaybackEngine';

const STAFF_LINE_SPACING = 14;
const STAFF_TOP_MARGIN = 80;
const STAFF_LEFT_MARGIN = 60;
const STAFF_BOTTOM_MARGIN = 60;
const NOTE_WIDTH = 18;
const NOTE_HEIGHT = 13;
const MIN_PITCH = 60;
const MAX_PITCH = 84;
const TOTAL_BEATS = 16;
const TIME_GRID = 0.125;
const PLAYBACK_LINE_COLOR = '#ff3b3b';
const PLAYBACK_LINE_WIDTH = 2;

interface SheetCanvasProps {
  notes: Note[];
  selectedDuration: NoteDuration;
  playbackTime: number;
  isPlaying: boolean;
  metronomeEnabled: boolean;
  onAddNote: (pitch: number, startTime: number, duration: number) => void;
  onMoveNote: (id: string, pitch: number, startTime: number) => void;
  onSelectNote: (id: string | null) => void;
  deletingNoteIds: Set<string>;
}

function pitchToY(pitch: number, canvasHeight: number): number {
  const bottomLinePitch = 71; // B4 on the 5th line (bottom)
  const halfSteps = bottomLinePitch - pitch;
  return STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4 - halfSteps * (STAFF_LINE_SPACING / 2);
}

function yToPitch(y: number): number {
  const bottomLineY = STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4;
  const halfSteps = Math.round((bottomLineY - y) / (STAFF_LINE_SPACING / 2));
  let pitch = 71 - halfSteps;
  pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));
  return pitch;
}

function timeToX(time: number, canvasWidth: number): number {
  const staffWidth = canvasWidth - STAFF_LEFT_MARGIN - 40;
  return STAFF_LEFT_MARGIN + (time / TOTAL_BEATS) * staffWidth;
}

function xToTime(x: number, canvasWidth: number): number {
  const staffWidth = canvasWidth - STAFF_LEFT_MARGIN - 40;
  let time = ((x - STAFF_LEFT_MARGIN) / staffWidth) * TOTAL_BEATS;
  time = Math.round(time / TIME_GRID) * TIME_GRID;
  return Math.max(0, Math.min(TOTAL_BEATS - TIME_GRID, time));
}

function drawStaff(ctx: CanvasRenderingContext2D, width: number, height: number, metronomeEnabled: boolean) {
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 5; i++) {
    const y = STAFF_TOP_MARGIN + i * STAFF_LINE_SPACING;
    ctx.beginPath();
    ctx.moveTo(STAFF_LEFT_MARGIN, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();
  }

  ctx.font = '48px serif';
  ctx.fillStyle = '#e94560';
  ctx.fillText('𝄞', STAFF_LEFT_MARGIN - 48, STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 3.6);

  for (let m = 1; m <= 4; m++) {
    const x = STAFF_LEFT_MARGIN + ((width - STAFF_LEFT_MARGIN - 40) * m) / 4;
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, STAFF_TOP_MARGIN);
    ctx.lineTo(x, STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4);
    ctx.stroke();
  }

  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STAFF_LEFT_MARGIN, STAFF_TOP_MARGIN);
  ctx.lineTo(STAFF_LEFT_MARGIN, STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 40, STAFF_TOP_MARGIN);
  ctx.lineTo(width - 40, STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4);
  ctx.stroke();

  if (metronomeEnabled) {
    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    const dotY = STAFF_TOP_MARGIN - 8;
    for (let m = 0; m <= 4; m++) {
      const x = STAFF_LEFT_MARGIN + ((width - STAFF_LEFT_MARGIN - 40) * m) / 4;
      ctx.beginPath();
      ctx.arc(x, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLedgerLines(ctx: CanvasRenderingContext2D, pitch: number, x: number, width: number) {
  const bottomLinePitch = 71;
  const topLinePitch = 83;

  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 1;

  if (pitch < bottomLinePitch) {
    for (let p = bottomLinePitch - 2; p >= pitch; p -= 2) {
      const ly = pitchToY(p, 0);
      ctx.beginPath();
      ctx.moveTo(x - NOTE_WIDTH, ly);
      ctx.lineTo(x + NOTE_WIDTH, ly);
      ctx.stroke();
    }
  }

  if (pitch > topLinePitch) {
    for (let p = topLinePitch + 2; p <= pitch; p += 2) {
      const ly = pitchToY(p, 0);
      ctx.beginPath();
      ctx.moveTo(x - NOTE_WIDTH, ly);
      ctx.lineTo(x + NOTE_WIDTH, ly);
      ctx.stroke();
    }
  }

  if (pitch === 60) {
    const ly = pitchToY(60, 0);
    ctx.beginPath();
    ctx.moveTo(x - NOTE_WIDTH, ly);
    ctx.lineTo(x + NOTE_WIDTH, ly);
    ctx.stroke();
  }
}

function drawNote(ctx: CanvasRenderingContext2D, note: Note, x: number, y: number, isHighlight: boolean, scale: number = 1, opacity: number = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const color = isHighlight ? '#e94560' : '#0f3460';
  const fillColor = isHighlight ? '#e94560' : '#4a6fa1';

  drawLedgerLines(ctx, note.pitch, 0, 0);

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  if (note.duration === 4) {
    ctx.beginPath();
    ctx.ellipse(0, 0, NOTE_WIDTH - 2, NOTE_HEIGHT - 3, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, NOTE_WIDTH - 2, NOTE_HEIGHT - 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (note.duration !== 4) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(NOTE_WIDTH - 3, 0);
    ctx.lineTo(NOTE_WIDTH - 3, -40);
    ctx.stroke();

    if (note.duration === 1 || note.duration === 0.5) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(NOTE_WIDTH - 3, -40);
      ctx.lineTo(NOTE_WIDTH - 3 + 12, -33);
      ctx.lineTo(NOTE_WIDTH - 3, -26);
      ctx.closePath();
      ctx.fill();
    }

    if (note.duration === 0.5) {
      ctx.beginPath();
      ctx.moveTo(NOTE_WIDTH - 3, -30);
      ctx.lineTo(NOTE_WIDTH - 3 + 12, -23);
      ctx.lineTo(NOTE_WIDTH - 3, -16);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (note.duration === 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(NOTE_WIDTH - 3, 0);
    ctx.lineTo(NOTE_WIDTH - 3, -40);
    ctx.stroke();
  }

  ctx.restore();
}

const SheetCanvas: React.FC<SheetCanvasProps> = ({
  notes,
  selectedDuration,
  playbackTime,
  isPlaying,
  metronomeEnabled,
  onAddNote,
  onMoveNote,
  onSelectNote,
  deletingNoteIds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

  const draggingRef = useRef<{
    noteId: string;
    offsetX: number;
    offsetY: number;
    originalPitch: number;
    originalTime: number;
  } | null>(null);

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pitch: number;
  }>({ visible: false, x: 0, y: 0, pitch: 0 });

  const deletingAnimationsRef = useRef<Map<string, { startTime: number; note: Note }>>(new Map());
  const prevDeletingRef = useRef<Set<string>>(new Set());

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      setCanvasSize({
        width: Math.floor(rect.width * dpr),
        height: Math.floor(rect.height * dpr),
      });
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateCanvasSize]);

  useEffect(() => {
    for (const id of deletingNoteIds) {
      if (!prevDeletingRef.current.has(id)) {
        const note = notes.find(n => n.id === id);
        if (note) {
          deletingAnimationsRef.current.set(id, {
            startTime: performance.now(),
            note,
          });
        }
      }
    }
    prevDeletingRef.current = new Set(deletingNoteIds);
  }, [deletingNoteIds, notes]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvasSize.width / dpr;
    const displayHeight = canvasSize.height / dpr;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    ctx.fillStyle = 'rgba(22, 33, 62, 0.3)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    drawStaff(ctx, displayWidth, displayHeight, metronomeEnabled);

    const now = performance.now();
    const animatingIds: string[] = [];

    deletingAnimationsRef.current.forEach((anim, id) => {
      const elapsed = (now - anim.startTime) / 1000;
      if (elapsed < 0.2) {
        animatingIds.push(id);
        const progress = elapsed / 0.2;
        const scale = 1 - progress * 0.7;
        const opacity = 1 - progress;
        const x = timeToX(anim.note.startTime, displayWidth);
        const y = pitchToY(anim.note.pitch, displayHeight);
        drawNote(ctx, anim.note, x, y, false, scale, opacity);
      } else {
        deletingAnimationsRef.current.delete(id);
      }
    });

    const highlightIds = new Set<string>();
    if (isPlaying) {
      notes.forEach(n => {
        if (n.isPlaying) highlightIds.add(n.id);
      });
    }

    for (const note of notes) {
      if (deletingNoteIds.has(note.id) && animatingIds.includes(note.id)) continue;
      if (deletingNoteIds.has(note.id)) continue;

      const x = timeToX(note.startTime, displayWidth);
      const y = pitchToY(note.pitch, displayHeight);
      const isHighlight = highlightIds.has(note.id);
      drawNote(ctx, note, x, y, isHighlight);
    }

    if (isPlaying && playbackTime >= 0 && playbackTime < TOTAL_BEATS) {
      const lineX = timeToX(playbackTime, displayWidth);
      ctx.strokeStyle = PLAYBACK_LINE_COLOR;
      ctx.lineWidth = PLAYBACK_LINE_WIDTH;
      ctx.shadowColor = PLAYBACK_LINE_COLOR;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(lineX, STAFF_TOP_MARGIN - 20);
      ctx.lineTo(lineX, STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4 + 20);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [canvasSize, notes, playbackTime, isPlaying, metronomeEnabled, deletingNoteIds]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [render]);

  const findNoteAtPosition = useCallback(
    (canvasX: number, canvasY: number): Note | null => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvasSize.width / dpr;
      const displayHeight = canvasSize.height / dpr;

      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (deletingNoteIds.has(note.id)) continue;
        const nx = timeToX(note.startTime, displayWidth);
        const ny = pitchToY(note.pitch, displayHeight);
        const dx = canvasX - nx;
        const dy = canvasY - ny;
        if (Math.abs(dx) < NOTE_WIDTH + 4 && Math.abs(dy) < NOTE_HEIGHT + 4) {
          return note;
        }
      }
      return null;
    },
    [notes, canvasSize, deletingNoteIds]
  );

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPlaying) return;
      const { x, y } = getCanvasCoords(e);

      const hitNote = findNoteAtPosition(x, y);
      if (hitNote) {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = canvasSize.width / dpr;
        const nx = timeToX(hitNote.startTime, displayWidth);
        const ny = pitchToY(hitNote.pitch, canvasSize.height / dpr);

        draggingRef.current = {
          noteId: hitNote.id,
          offsetX: x - nx,
          offsetY: y - ny,
          originalPitch: hitNote.pitch,
          originalTime: hitNote.startTime,
        };
        onSelectNote(hitNote.id);
      } else {
        const pitch = yToPitch(y);
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = canvasSize.width / dpr;
        const time = xToTime(x, displayWidth);

        if (time >= 0 && time < TOTAL_BEATS) {
          onAddNote(pitch, time, selectedDuration);
        }
        onSelectNote(null);
      }
    },
    [isPlaying, getCanvasCoords, findNoteAtPosition, onAddNote, selectedDuration, onSelectNote, canvasSize]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;

      const { x, y } = getCanvasCoords(e);
      const drag = draggingRef.current;
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvasSize.width / dpr;
      const displayHeight = canvasSize.height / dpr;

      const adjustedY = y - drag.offsetY;
      const newPitch = yToPitch(adjustedY);
      const adjustedX = x - drag.offsetX;
      const newTime = xToTime(adjustedX, displayWidth);

      setTooltipState({
        visible: true,
        x: e.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0),
        y: adjustedY,
        pitch: newPitch,
      });

      onMoveNote(drag.noteId, newPitch, newTime);
    },
    [getCanvasCoords, canvasSize, onMoveNote]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    setTooltipState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    draggingRef.current = null;
    setTooltipState(prev => ({ ...prev, visible: false }));
  }, []);

  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvasSize.width / dpr;
  const displayHeight = canvasSize.height / dpr;

  return (
    <div className="sheet-area" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: displayWidth, height: displayHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {tooltipState.visible && (
        <div
          className={`pitch-tooltip ${tooltipState.visible ? 'visible' : ''}`}
          style={{ left: tooltipState.x, top: tooltipState.y }}
        >
          {midiToNoteName(tooltipState.pitch)}
        </div>
      )}
    </div>
  );
};

export default SheetCanvas;
