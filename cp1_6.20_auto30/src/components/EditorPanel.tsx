import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { NoteData, RoomSettings, UserCursor } from '../services/websocketClient';

type Duration = 'whole' | 'half' | 'quarter' | 'eighth';
type ToolMode = 'add' | 'delete' | 'select';

interface EditorPanelProps {
  notes: NoteData[];
  selectedNoteIds: Set<string>;
  setSelectedNoteIds: (ids: Set<string>) => void;
  cursors: Map<string, UserCursor>;
  roomSettings: RoomSettings;
  toolMode: ToolMode;
  currentDuration: Duration;
  durationValues: Record<Duration, number>;
  onNoteAdd: (note: NoteData) => void;
  onNoteDelete: (note: NoteData) => void;
  onNoteMove: (note: NoteData, oldNote: NoteData) => void;
  onCursorUpdate: (position: number, measure: number) => void;
  playingPosition: { measure: number; position: number } | null;
  userId: string;
}

const STAFF_WIDTH_PER_MEASURE = 320;
const STAFF_PADDING_LEFT = 60;
const STAFF_PADDING_RIGHT = 40;
const STAFF_TOP = 80;
const STAFF_LINE_SPACING = 10;
const TOTAL_MEASURES = 16;

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToStaffPosition(midi: number): number {
  const middleC = 60;
  const halfSteps = midi - middleC;
  const staffSteps = Math.round(halfSteps / 2);
  return STAFF_TOP + STAFF_LINE_SPACING * 4 - staffSteps * (STAFF_LINE_SPACING / 2);
}

function staffPositionToMidi(y: number): number {
  const middleCY = STAFF_TOP + STAFF_LINE_SPACING * 4;
  const staffSteps = Math.round((middleCY - y) / (STAFF_LINE_SPACING / 2));
  return 60 + staffSteps * 2;
}

const NOTE_WIDTHS: Record<Duration, number> = {
  whole: 28,
  half: 24,
  quarter: 20,
  eighth: 18,
};

const NOTE_HEIGHTS: Record<Duration, number> = {
  whole: 16,
  half: 14,
  quarter: 12,
  eighth: 11,
};

const EditorPanel: React.FC<EditorPanelProps> = ({
  notes,
  selectedNoteIds,
  setSelectedNoteIds,
  cursors,
  roomSettings,
  toolMode,
  currentDuration,
  durationValues,
  onNoteAdd,
  onNoteDelete,
  onNoteMove,
  onCursorUpdate,
  playingPosition,
  userId,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    noteId: string;
    startX: number;
    startY: number;
    startPitch: number;
    startPosition: number;
    startMeasure: number;
    multiSelect: string[];
  } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; measure: number; position: number } | null>(null);
  const [animatingNotes, setAnimatingNotes] = useState<Map<string, 'add' | 'delete'>>(new Map());
  const prevNotesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(notes.map((n) => n.id));
    const added: string[] = [];
    currentIds.forEach((id) => {
      if (!prevNotesRef.current.has(id)) {
        added.push(id);
      }
    });
    if (added.length > 0) {
      const newAnim = new Map(animatingNotes);
      added.forEach((id) => newAnim.set(id, 'add'));
      setAnimatingNotes(newAnim);
      setTimeout(() => {
        setAnimatingNotes((prev) => {
          const next = new Map(prev);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, 400);
    }
    prevNotesRef.current = currentIds;
  }, [notes]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const newAnim = new Map(animatingNotes);
        newAnim.set(noteId, 'delete');
        setAnimatingNotes(newAnim);
        setTimeout(() => {
          onNoteDelete(note);
          setAnimatingNotes((prev) => {
            const next = new Map(prev);
            next.delete(noteId);
            return next;
          });
        }, 250);
      }
    },
    [notes, animatingNotes, onNoteDelete]
  );

  const measureWidth = STAFF_WIDTH_PER_MEASURE;
  const totalWidth = STAFF_PADDING_LEFT + TOTAL_MEASURES * measureWidth + STAFF_PADDING_RIGHT;
  const totalHeight = STAFF_TOP + STAFF_LINE_SPACING * 8 + 80;

  const beatsPerMeasure = useMemo(() => {
    const parts = roomSettings.timeSignature.split('/');
    return parseInt(parts[0], 10) || 4;
  }, [roomSettings.timeSignature]);

  const notesByMeasure = useMemo(() => {
    const map: Map<number, NoteData[]> = new Map();
    notes.forEach((note) => {
      if (!map.has(note.measure)) map.set(note.measure, []);
      map.get(note.measure)!.push(note);
    });
    return map;
  }, [notes]);

  const getSVGCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * totalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * totalHeight;
    return { x, y };
  }, [totalWidth, totalHeight]);

  const snapToGrid = useCallback(
    (x: number) => {
      const measureIndex = Math.max(0, Math.min(TOTAL_MEASURES - 1, Math.floor((x - STAFF_PADDING_LEFT) / measureWidth)));
      const measureStartX = STAFF_PADDING_LEFT + measureIndex * measureWidth;
      const positionInMeasure = x - measureStartX;
      const beatWidth = measureWidth / beatsPerMeasure;
      const gridSize = beatWidth / 2;
      const snapped = Math.round(positionInMeasure / gridSize) * gridSize;
      const position = snapped / beatWidth;
      return {
        measure: measureIndex,
        position: Math.max(0, Math.min(beatsPerMeasure - 0.5, position)),
        x: measureStartX + snapped,
      };
    },
    [measureWidth, beatsPerMeasure]
  );

  const handleStaffClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const coords = getSVGCoords(e);
      if (!coords) return;

      const snapped = snapToGrid(coords.x);
      const pitch = Math.max(36, Math.min(84, staffPositionToMidi(coords.y)));

      onCursorUpdate(snapped.position, snapped.measure);

      if (toolMode === 'add') {
        const note: NoteData = {
          id: Math.random().toString(36).substring(2, 10),
          pitch,
          duration: currentDuration,
          position: snapped.position,
          measure: snapped.measure,
          voice: 0,
        };
        onNoteAdd(note);
      } else if (toolMode === 'select') {
        setSelectedNoteIds(new Set());
      }
    },
    [toolMode, currentDuration, getSVGCoords, snapToGrid, onNoteAdd, onCursorUpdate, setSelectedNoteIds]
  );

  const handleNoteMouseDown = useCallback(
    (e: React.MouseEvent, note: NoteData) => {
      e.stopPropagation();

      if (toolMode === 'delete') {
        handleDeleteNote(note.id);
        return;
      }

      if (toolMode === 'select') {
        const newSelected = new Set(selectedNoteIds);
        if (e.shiftKey) {
          if (newSelected.has(note.id)) newSelected.delete(note.id);
          else newSelected.add(note.id);
        } else {
          if (!newSelected.has(note.id)) {
            newSelected.clear();
            newSelected.add(note.id);
          }
        }
        setSelectedNoteIds(newSelected);
      }

      if (toolMode === 'select' || toolMode === 'add') {
        const coords = getSVGCoords(e);
        if (!coords) return;

        const multiSelected = Array.from(selectedNoteIds);
        if (!multiSelected.includes(note.id)) {
          multiSelected.length = 0;
          multiSelected.push(note.id);
        }

        setDragging({
          noteId: note.id,
          startX: coords.x,
          startY: coords.y,
          startPitch: note.pitch,
          startPosition: note.position,
          startMeasure: note.measure,
          multiSelect: multiSelected,
        });
      }
    },
    [toolMode, selectedNoteIds, getSVGCoords, handleDeleteNote, setSelectedNoteIds]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getSVGCoords(e);
      if (!coords) return;

      const deltaX = coords.x - dragging.startX;
      const deltaY = coords.y - dragging.startY;

      const beatWidth = measureWidth / beatsPerMeasure;
      const deltaBeats = deltaX / beatWidth;
      const deltaSteps = Math.round(-deltaY / (STAFF_LINE_SPACING / 2));

      dragging.multiSelect.forEach((noteId) => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;

        const newPitch = Math.max(36, Math.min(84, dragging.startPitch + deltaSteps * 2));
        const totalPosition = dragging.startPosition + deltaBeats + dragging.startMeasure * beatsPerMeasure;
        const newMeasure = Math.max(0, Math.min(TOTAL_MEASURES - 1, Math.floor(totalPosition / beatsPerMeasure)));
        const newPosition = Math.max(0, Math.min(beatsPerMeasure - durationValues[note.duration as Duration], totalPosition - newMeasure * beatsPerMeasure));

        if (newPitch !== note.pitch || newPosition !== note.position || newMeasure !== note.measure) {
          const newNote: NoteData = {
            ...note,
            pitch: newPitch,
            position: parseFloat(newPosition.toFixed(2)),
            measure: newMeasure,
          };
          onNoteMove(newNote, note);
        }
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, notes, getSVGCoords, measureWidth, beatsPerMeasure, durationValues, onNoteMove]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getSVGCoords(e);
      if (!coords) return;
      const snapped = snapToGrid(coords.x);
      setHoverPosition({
        x: snapped.x,
        y: coords.y,
        measure: snapped.measure,
        position: snapped.position,
      });
    },
    [getSVGCoords, snapToGrid]
  );

  const renderStaff = () => {
    const lines: JSX.Element[] = [];
    for (let m = 0; m < TOTAL_MEASURES; m++) {
      const xStart = STAFF_PADDING_LEFT + m * measureWidth;
      for (let l = 0; l < 5; l++) {
        const y = STAFF_TOP + l * STAFF_LINE_SPACING;
        lines.push(
          <line
            key={`staff-${m}-${l}`}
            x1={xStart}
            y1={y}
            x2={xStart + measureWidth}
            y2={y}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
        );
      }
      if (m < TOTAL_MEASURES - 1) {
        lines.push(
          <line
            key={`bar-${m}`}
            x1={xStart + measureWidth}
            y1={STAFF_TOP - 5}
            x2={xStart + measureWidth}
            y2={STAFF_TOP + STAFF_LINE_SPACING * 4 + 5}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        );
      }
      lines.push(
        <text
          key={`num-${m}`}
          x={xStart + 8}
          y={STAFF_TOP - 18}
          fill="#666"
          fontSize={11}
          fontFamily="monospace"
        >
          {m + 1}
        </text>
      );
    }
    return lines;
  };

  const renderClef = () => (
    <text
      x={STAFF_PADDING_LEFT - 45}
      y={STAFF_TOP + STAFF_LINE_SPACING * 3 + 4}
      fill="#e0e0e0"
      fontSize={56}
      fontFamily="'Times New Roman', serif"
    >
      𝄞
    </text>
  );

  const renderNote = (note: NoteData) => {
    const x = STAFF_PADDING_LEFT + note.measure * measureWidth + (note.position * measureWidth) / beatsPerMeasure;
    const y = midiToStaffPosition(note.pitch);
    const width = NOTE_WIDTHS[note.duration as Duration];
    const height = NOTE_HEIGHTS[note.duration as Duration];
    const isSelected = selectedNoteIds.has(note.id);
    const animState = animatingNotes.get(note.id);

    const needsLedger = note.pitch <= 60 || note.pitch >= 71;
    const ledgerLines: JSX.Element[] = [];
    if (needsLedger) {
      let midi = note.pitch;
      while (midi <= 59) {
        const ly = midiToStaffPosition(midi);
        ledgerLines.push(
          <line
            key={`ledger-${note.id}-below-${midi}`}
            x1={x - width / 2 - 4}
            y1={ly}
            x2={x + width / 2 + 4}
            y2={ly}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
        );
        midi -= 2;
      }
      midi = note.pitch;
      while (midi >= 72) {
        const ly = midiToStaffPosition(midi);
        ledgerLines.push(
          <line
            key={`ledger-${note.id}-above-${midi}`}
            x1={x - width / 2 - 4}
            y1={ly}
            x2={x + width / 2 + 4}
            y2={ly}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
        );
        midi += 2;
      }
    }

    const needsStem = note.duration !== 'whole';
    const stemUp = note.pitch < 67;

    let animStyle: React.CSSProperties = { transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' };
    if (animState === 'add') {
      animStyle = {
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: 'notePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    } else if (animState === 'delete') {
      animStyle = {
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        opacity: 0,
        transform: 'scale(0.5)',
      };
    }

    return (
      <g
        key={note.id}
        style={animStyle}
        onMouseDown={(e) => handleNoteMouseDown(e, note)}
        className="note-group"
      >
        {ledgerLines}
        <ellipse
          cx={x}
          cy={y}
          rx={width / 2}
          ry={height / 2}
          fill={note.duration === 'whole' || note.duration === 'half' ? 'transparent' : '#e0e0e0'}
          stroke={isSelected ? '#667eea' : '#e0e0e0'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          style={{ cursor: toolMode === 'delete' ? 'not-allowed' : 'pointer' }}
        />
        {needsStem && (
          <line
            x1={stemUp ? x + width / 2 - 1 : x - width / 2 + 1}
            y1={y}
            x2={stemUp ? x + width / 2 - 1 : x - width / 2 + 1}
            y2={stemUp ? y - 32 : y + 32}
            stroke={isSelected ? '#667eea' : '#e0e0e0'}
            strokeWidth={1.5}
          />
        )}
        {note.duration === 'eighth' && (
          <line
            x1={stemUp ? x + width / 2 - 1 : x - width / 2 + 1}
            y1={stemUp ? y - 32 : y + 32}
            x2={stemUp ? x + width / 2 + 10 : x - width / 2 - 10}
            y2={stemUp ? y - 22 : y + 22}
            stroke={isSelected ? '#667eea' : '#e0e0e0'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {isSelected && (
          <rect
            x={x - width / 2 - 4}
            y={y - height / 2 - 4}
            width={width + 8}
            height={height + 8 + (needsStem ? 32 : 0)}
            fill="none"
            stroke="#667eea"
            strokeWidth={1}
            strokeDasharray="4 2"
            rx={4}
            pointerEvents="none"
          />
        )}
        {isSelected && (
          <text
            x={x}
            y={y - height / 2 - 10}
            fill="#667eea"
            fontSize={9}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {PITCH_NAMES[note.pitch % 12]}{Math.floor(note.pitch / 12) - 1}
          </text>
        )}
      </g>
    );
  };

  const renderCursors = () => {
    const elements: JSX.Element[] = [];
    cursors.forEach((cursor, cursorUserId) => {
      if (cursorUserId === userId) return;
      const x = STAFF_PADDING_LEFT + cursor.measure * measureWidth + (cursor.position * measureWidth) / beatsPerMeasure;
      elements.push(
        <g key={`cursor-${cursorUserId}`}>
          <line
            x1={x}
            y1={STAFF_TOP - 15}
            x2={x}
            y2={STAFF_TOP + STAFF_LINE_SPACING * 4 + 15}
            stroke={cursor.color}
            strokeWidth={2}
            strokeLinecap="round"
            style={{ opacity: 0.8 }}
          />
          <rect
            x={x}
            y={STAFF_TOP - 28}
            width={Math.max(30, cursor.userName.length * 8 + 10)}
            height={16}
            rx={4}
            fill={cursor.color}
            style={{ opacity: 0.9 }}
          />
          <text
            x={x + 5}
            y={STAFF_TOP - 16}
            fill="white"
            fontSize={10}
            fontWeight={600}
          >
            {cursor.userName}
          </text>
        </g>
      );
    });
    return elements;
  };

  const renderHoverPreview = () => {
    if (!hoverPosition || toolMode !== 'add') return null;
    const y = Math.max(STAFF_TOP - STAFF_LINE_SPACING * 2, Math.min(STAFF_TOP + STAFF_LINE_SPACING * 6, hoverPosition.y));
    const snappedPitch = staffPositionToMidi(y);
    const actualY = midiToStaffPosition(snappedPitch);
    const width = NOTE_WIDTHS[currentDuration];
    const height = NOTE_HEIGHTS[currentDuration];
    return (
      <g style={{ pointerEvents: 'none', opacity: 0.5 }}>
        <ellipse
          cx={hoverPosition.x}
          cy={actualY}
          rx={width / 2}
          ry={height / 2}
          fill={currentDuration === 'whole' || currentDuration === 'half' ? 'transparent' : '#667eea'}
          stroke="#667eea"
          strokeWidth={1.5}
        />
      </g>
    );
  };

  const renderPlayingCursor = () => {
    if (!playingPosition) return null;
    const x = STAFF_PADDING_LEFT + playingPosition.measure * measureWidth + (playingPosition.position * measureWidth) / beatsPerMeasure;
    return (
      <line
        x1={x}
        y1={STAFF_TOP - 10}
        x2={x}
        y2={STAFF_TOP + STAFF_LINE_SPACING * 4 + 10}
        stroke="#4a9eff"
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          animation: 'playCursorBlink 0.6s ease-in-out infinite',
        }}
      />
    );
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px',
        position: 'relative',
        background: '#1a1a2e',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        style={{
          minWidth: totalWidth,
          minHeight: totalHeight,
          cursor: toolMode === 'delete' ? 'not-allowed' : 'crosshair',
          userSelect: 'none',
        }}
        onClick={handleStaffClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPosition(null)}
      >
        <style>
          {`
            @keyframes notePop {
              0% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes playCursorBlink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
            .note-group {
              transition: transform 0.2s ease-out;
            }
          `}
        </style>
        {renderStaff()}
        {renderClef()}
        {Array.from(notesByMeasure.values()).flat().map(renderNote)}
        {renderCursors()}
        {renderHoverPreview()}
        {renderPlayingCursor()}
      </svg>
    </div>
  );
};

export default EditorPanel;
