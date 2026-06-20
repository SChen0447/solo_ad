import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Note,
  NoteEditor,
  NoteDuration,
  DURATION_NAMES,
  getPitchFromY,
  getYFromPitch,
  getBeatFromX,
  getXFromBeat,
} from '../modules/NoteEditor';
import { PlaybackEngine, PlaybackState } from '../modules/PlaybackEngine';
import { ChordData } from '../api/musicApi';

interface EditorProps {
  noteEditor: NoteEditor;
  playbackEngine: PlaybackEngine;
}

const STAFF_HEIGHT = 240;
const NOTE_COLORS: Record<string, string> = {
  E4: '#ff6b6b',
  F4: '#ff8066',
  G4: '#ffa94d',
  A4: '#ffd43b',
  B4: '#69db7c',
  C5: '#4ecdc4',
  D5: '#4dabf7',
  E5: '#748ffc',
};

const PIANO_KEYS = [
  { note: 'C4', isBlack: false },
  { note: 'C#4', isBlack: true },
  { note: 'D4', isBlack: false },
  { note: 'D#4', isBlack: true },
  { note: 'E4', isBlack: false },
  { note: 'F4', isBlack: false },
  { note: 'F#4', isBlack: true },
  { note: 'G4', isBlack: false },
  { note: 'G#4', isBlack: true },
  { note: 'A4', isBlack: false },
  { note: 'A#4', isBlack: true },
  { note: 'B4', isBlack: false },
  { note: 'C5', isBlack: false },
  { note: 'C#5', isBlack: true },
  { note: 'D5', isBlack: false },
  { note: 'D#5', isBlack: true },
  { note: 'E5', isBlack: false },
  { note: 'F5', isBlack: false },
  { note: 'F#5', isBlack: true },
  { note: 'G5', isBlack: false },
  { note: 'G#5', isBlack: true },
  { note: 'A5', isBlack: false },
  { note: 'A#5', isBlack: true },
  { note: 'B5', isBlack: false },
  { note: 'C6', isBlack: false },
];

const DURATION_OPTIONS: NoteDuration[] = ['whole', 'half', 'quarter', 'eighth', 'sixteenth'];

const Editor: React.FC<EditorProps> = ({ noteEditor, playbackEngine }) => {
  const [notes, setNotes] = useState<Note[]>(noteEditor.getNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(playbackEngine.getState());
  const [chords, setChords] = useState<ChordData[]>([]);
  const [staffWidth, setStaffWidth] = useState(800);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [activePianoKey, setActivePianoKey] = useState<string | null>(null);
  const [currentInsertBeat, setCurrentInsertBeat] = useState(0);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const staffRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (staffRef.current) {
        setStaffWidth(staffRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const unsubscribe = playbackEngine.onPlaybackChange((state) => {
      setPlaybackState(state);
    });
    return unsubscribe;
  }, [playbackEngine]);

  useEffect(() => {
    const unsubscribe = playbackEngine.onChordChange((newChords) => {
      setChords(newChords);
    });
    return unsubscribe;
  }, [playbackEngine]);

  useEffect(() => {
    setNotes(noteEditor.getNotes());
    playbackEngine.setNotes(noteEditor.getNotes());
  }, [noteEditor, playbackEngine]);

  const updateNotes = useCallback(() => {
    setNotes([...noteEditor.getNotes()]);
    playbackEngine.setNotes(noteEditor.getNotes());
  }, [noteEditor, playbackEngine]);

  const handleStaffClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedNoteId) return;

    const rect = staffRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pitch = getPitchFromY(y, STAFF_HEIGHT);
    const beat = getBeatFromX(x, staffWidth, noteEditor.getTotalBeats());

    const existingNote = noteEditor.getNoteAt(beat, pitch);
    if (existingNote) {
      setSelectedNoteId(existingNote.id);
      noteEditor.setSelectedNote(existingNote.id);
    } else {
      const newNote = noteEditor.addNote(pitch, beat, 'quarter');
      setSelectedNoteId(newNote.id);
      noteEditor.setSelectedNote(newNote.id);
      playbackEngine.previewNote(pitch, 'quarter');
      updateNotes();
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setDraggedNoteId(noteId);
    setSelectedNoteId(noteId);
    noteEditor.setSelectedNote(noteId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedNoteId || !staffRef.current) return;

      const rect = staffRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pitch = getPitchFromY(y, STAFF_HEIGHT);
      const beat = getBeatFromX(x, staffWidth, noteEditor.getTotalBeats());
      const snappedBeat = noteEditor.snapToGrid(beat, 0.25);

      noteEditor.updateNotePosition(draggedNoteId, pitch, snappedBeat);
      updateNotes();
    },
    [draggedNoteId, noteEditor, staffWidth, updateNotes]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNoteId(null);
  }, []);

  useEffect(() => {
    if (draggedNoteId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNoteId, handleMouseMove, handleMouseUp]);

  const handleDeleteNote = (noteId: string) => {
    noteEditor.deleteNote(noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      noteEditor.setSelectedNote(null);
    }
    updateNotes();
  };

  const handleDurationChange = (noteId: string, duration: NoteDuration) => {
    noteEditor.updateNoteDuration(noteId, duration);
    updateNotes();
  };

  const handlePlayPause = async () => {
    await playbackEngine.togglePlay();
  };

  const handleStop = () => {
    playbackEngine.stop();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    playbackEngine.setSpeed(speed);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const totalBeats = Math.max(noteEditor.getMaxBeat(), noteEditor.getTotalBeats());
    const beat = percentage * totalBeats;
    playbackEngine.seek(beat);
  };

  const handlePianoKeyDown = (note: string) => {
    setActivePianoKey(note);
    const beat = currentInsertBeat;
    const newNote = noteEditor.addNote(note, beat, 'quarter');
    setSelectedNoteId(newNote.id);
    noteEditor.setSelectedNote(newNote.id);
    playbackEngine.previewNote(note, 'quarter');
    
    const nextBeat = beat + 1;
    const totalBeats = noteEditor.getTotalBeats();
    setCurrentInsertBeat(nextBeat >= totalBeats ? 0 : nextBeat);
    
    updateNotes();
  };

  const handlePianoKeyUp = () => {
    setActivePianoKey(null);
  };

  const handleSave = async () => {
    const jsonData = noteEditor.exportToJSON();
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melody_${Date.now()}.melo`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    const jsonData = noteEditor.exportToJSON();
    try {
      await navigator.clipboard.writeText(jsonData);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const selectedNote = selectedNoteId ? noteEditor.getSelectedNote() : null;

  const renderStaffLines = () => {
    const lineCount = 5;
    const lineSpacing = STAFF_HEIGHT / (lineCount + 3);
    const lines = [];

    for (let i = 0; i < lineCount; i++) {
      const y = lineSpacing * 2 + i * lineSpacing;
      lines.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y,
            height: 1,
            backgroundColor: '#b0b0b0',
          }}
        />
      );
    }
    return lines;
  };

  const renderBeatMarkers = () => {
    const totalBeats = noteEditor.getTotalBeats();
    const beatWidth = staffWidth / totalBeats;
    const markers = [];

    for (let i = 0; i <= totalBeats; i++) {
      const x = i * beatWidth;
      const isMeasure = i % 4 === 0;
      markers.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: isMeasure ? 2 : 1,
            backgroundColor: isMeasure ? '#b0b0b0' : '#e0e0e0',
            opacity: isMeasure ? 0.8 : 0.4,
          }}
        />
      );
    }
    return markers;
  };

  const renderNotes = () => {
    return notes.map((note) => {
      const x = getXFromBeat(note.beat, staffWidth, noteEditor.getTotalBeats());
      const y = getYFromPitch(note.pitch, STAFF_HEIGHT);
      const isSelected = selectedNoteId === note.id;
      const isDragging = draggedNoteId === note.id;

      return (
        <motion.div
          key={note.id}
          drag={false}
          initial={{ scale: 0 }}
          animate={{ scale: isDragging ? 1.2 : isSelected ? 1.1 : 1 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            left: x - 6,
            top: y - 6,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: NOTE_COLORS[note.pitch] || '#4ecdc4',
            cursor: 'grab',
            boxShadow: isSelected
              ? '0 0 0 3px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.3)'
              : '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: isSelected ? 10 : isDragging ? 20 : 1,
            transition: 'box-shadow 0.2s ease',
          }}
          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
        />
      );
    });
  };

  const renderPlayhead = () => {
    const totalBeats = Math.max(noteEditor.getMaxBeat(), noteEditor.getTotalBeats());
    if (totalBeats === 0) return null;

    const x = (playbackState.currentBeat / totalBeats) * staffWidth;

    return (
      <motion.div
        style={{
          position: 'absolute',
          left: x,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#e74c3c',
          zIndex: 5,
          boxShadow: '0 0 10px rgba(231, 76, 60, 0.5)',
        }}
      />
    );
  };

  const renderChordLabels = () => {
    if (chords.length === 0) return null;

    return (
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginTop: 16,
          overflowX: 'auto',
          padding: '8px 0',
        }}
      >
        {chords.map((chord, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              minWidth: 100,
              height: 28,
              borderRadius: 12,
              backgroundColor: chord.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              cursor: 'default',
            }}
          >
            {chord.name}
          </motion.div>
        ))}
      </div>
    );
  };

  const renderPianoKeyboard = () => {
    const whiteKeys = PIANO_KEYS.filter((k) => !k.isBlack);
    const blackKeys = PIANO_KEYS.filter((k) => k.isBlack);

    const whiteKeyWidth = 30;
    const blackKeyWidth = 18;
    const whiteKeyHeight = 120;
    const blackKeyHeight = 72;

    const getBlackKeyPosition = (note: string) => {
      const baseNote = note.slice(0, -1);
      const octave = parseInt(note.slice(-1));
      const octaveOffset = (octave - 4) * 7 * whiteKeyWidth;

      const positions: Record<string, number> = {
        'C#': whiteKeyWidth * 0.65,
        'D#': whiteKeyWidth * 1.7,
        'F#': whiteKeyWidth * 3.65,
        'G#': whiteKeyWidth * 4.7,
        'A#': whiteKeyWidth * 5.75,
      };

      return octaveOffset + (positions[baseNote] || 0);
    };

    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          marginTop: 20,
          justifyContent: 'center',
        }}
      >
        {whiteKeys.map((key) => {
          const isActive = activePianoKey === key.note;
          return (
            <div
              key={key.note}
              onMouseDown={() => handlePianoKeyDown(key.note)}
              onMouseUp={handlePianoKeyUp}
              onMouseLeave={() => isActive && handlePianoKeyUp()}
              style={{
                width: whiteKeyWidth,
                height: whiteKeyHeight,
                backgroundColor: isActive ? '#2980b9' : '#f1f1f1',
                border: '1px solid #ccc',
                borderRight: 'none',
                borderRadius: '0 0 4px 4px',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 8,
                fontSize: 10,
                color: isActive ? '#fff' : '#666',
                userSelect: 'none',
              }}
            >
              {key.note.slice(0, -1)}
            </div>
          );
        })}

        {blackKeys.map((key) => {
          const isActive = activePianoKey === key.note;
          const left = getBlackKeyPosition(key.note);
          return (
            <div
              key={key.note}
              onMouseDown={() => handlePianoKeyDown(key.note)}
              onMouseUp={handlePianoKeyUp}
              onMouseLeave={() => isActive && handlePianoKeyUp()}
              style={{
                position: 'absolute',
                left: left,
                top: 0,
                width: blackKeyWidth,
                height: blackKeyHeight,
                backgroundColor: isActive ? '#7f8c8d' : '#2c3e50',
                borderRadius: '0 0 3px 3px',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                zIndex: 1,
                userSelect: 'none',
              }}
            />
          );
        })}
      </div>
    );
  };

  const totalBeats = Math.max(noteEditor.getMaxBeat(), noteEditor.getTotalBeats());
  const progressPercentage = totalBeats > 0 ? (playbackState.currentBeat / totalBeats) * 100 : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 24,
        fontFamily: "'Inter', sans-serif",
        color: '#ecf0f1',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          gap: 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 24,
              color: '#ecf0f1',
            }}
          >
            实时乐谱编辑器
          </h1>

          <div
            ref={staffRef}
            onClick={handleStaffClick}
            style={{
              position: 'relative',
              width: '100%',
              height: STAFF_HEIGHT,
              backgroundColor: '#faf7f2',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: 'crosshair',
              marginBottom: 16,
            }}
          >
            {renderStaffLines()}
            {renderBeatMarkers()}
            {renderNotes()}
            {renderPlayhead()}
          </div>

          {renderChordLabels()}
          {renderPianoKeyboard()}

          <div
            style={{
              height: 60,
              backgroundColor: '#2c3e50',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              gap: 20,
              marginTop: 20,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#1abc9c',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#16a085')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1abc9c')}
            >
              {playbackState.isPlaying ? (
                <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStop}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: '#7f8c8d',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
              }}
            >
              <svg width="12" height="12" fill="#fff" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </motion.button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#bdc3c7' }}>速度</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={playbackState.speed}
                onChange={handleSpeedChange}
                style={{
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  background: '#7f8c8d',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 13, color: '#ecf0f1', minWidth: 40 }}>
                {playbackState.speed.toFixed(2)}x
              </span>
            </div>

            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              style={{
                flex: 1,
                height: 6,
                backgroundColor: '#7f8c8d',
                borderRadius: 3,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  backgroundColor: '#e74c3c',
                  borderRadius: 3,
                  width: `${progressPercentage}%`,
                  transition: 'width 0.05s linear',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyToClipboard}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  backgroundColor: '#9b59b6',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8e44ad')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#9b59b6')}
              >
                复制
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                style={{
                  width: 100,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: '#3498db',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2980b9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3498db')}
              >
                保存
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {showCopySuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'fixed',
                  bottom: 40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  zIndex: 1000,
                }}
              >
                已复制到剪贴板！
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedNote && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                width: 280,
                flexShrink: 0,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                color: '#2c3e50',
                alignSelf: 'flex-start',
                position: 'sticky',
                top: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>音符属性</h3>
                <button
                  onClick={() => {
                    setSelectedNoteId(null);
                    noteEditor.setSelectedNote(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#95a5a6',
                    padding: 0,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#7f8c8d',
                    marginBottom: 8,
                  }}
                >
                  音高
                </label>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#2c3e50',
                    padding: '12px 16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: 8,
                  }}
                >
                  {selectedNote.pitch}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#7f8c8d',
                    marginBottom: 8,
                  }}
                >
                  节拍位置
                </label>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#2c3e50',
                    padding: '12px 16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: 8,
                  }}
                >
                  {selectedNote.beat.toFixed(1)}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#7f8c8d',
                    marginBottom: 8,
                  }}
                >
                  时长
                </label>
                <select
                  value={selectedNote.duration}
                  onChange={(e) => handleDurationChange(selectedNote.id, e.target.value as NoteDuration)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    borderRadius: 8,
                    border: '2px solid #e9ecef',
                    backgroundColor: '#fff',
                    color: '#2c3e50',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {DURATION_NAMES[duration]}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#7f8c8d',
                    marginBottom: 8,
                  }}
                >
                  时长滑块
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={DURATION_OPTIONS.indexOf(selectedNote.duration)}
                  onChange={(e) => {
                    const index = parseInt(e.target.value);
                    handleDurationChange(selectedNote.id, DURATION_OPTIONS[index]);
                  }}
                  style={{
                    width: '100%',
                    height: 4,
                    borderRadius: 2,
                    background: '#ddd',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontSize: 11,
                    color: '#95a5a6',
                  }}
                >
                  <span>十六分</span>
                  <span>八分</span>
                  <span>四分</span>
                  <span>二分</span>
                  <span>全</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDeleteNote(selectedNote.id)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 8,
                  backgroundColor: '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c0392b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e74c3c')}
              >
                删除音符
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #457b9d;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #457b9d;
          cursor: pointer;
          border: none;
        }
        select:focus {
          outline: none;
          border-color: #3498db !important;
        }
      `}</style>
    </div>
  );
};

export default Editor;
