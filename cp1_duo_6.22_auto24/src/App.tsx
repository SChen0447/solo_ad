import React, { useState, useCallback, useEffect, useRef } from 'react';
import SheetCanvas from './SheetCanvas';
import NoteEditor from './NoteEditor';
import { PlaybackEngine, Note, NoteDuration } from './PlaybackEngine';

let nextId = 1;
function generateId(): string {
  return `note-${nextId++}-${Date.now()}`;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<NoteDuration>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [deletingNoteIds, setDeletingNoteIds] = useState<Set<string>>(new Set());
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);

  const engineRef = useRef<PlaybackEngine>(new PlaybackEngine());
  const pauseOffsetRef = useRef(0);

  const handleAddNote = useCallback(
    (pitch: number, startTime: number, duration: number) => {
      if (notes.length >= 50) return;
      const newNote: Note = {
        id: generateId(),
        pitch,
        startTime,
        duration,
      };
      setNotes(prev => [...prev, newNote]);
    },
    [notes.length]
  );

  const handleMoveNote = useCallback((id: string, pitch: number, startTime: number) => {
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, pitch, startTime } : n))
    );
  }, []);

  const handleSelectNote = useCallback((id: string | null) => {
    setSelectedNoteId(id);
  }, []);

  const deleteNote = useCallback((id: string) => {
    setDeletingNoteIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setNotes(prev => prev.filter(n => n.id !== id));
      setDeletingNoteIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedNoteId(prev => (prev === id ? null : prev));
    }, 200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId) {
        if (!isPlaying) {
          deleteNote(selectedNoteId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, isPlaying, deleteNote]);

  const handlePlay = useCallback(() => {
    const engine = engineRef.current;
    const offset = isPlaying ? pauseOffsetRef.current : 0;

    engine.play(
      notes,
      offset,
      playbackSpeed,
      (time: number) => {
        setPlaybackTime(time);
      },
      (id: string) => {
        setNotes(prev => prev.map(n => (n.id === id ? { ...n, isPlaying: true } : n)));
      },
      (id: string) => {
        setNotes(prev => prev.map(n => (n.id === id ? { ...n, isPlaying: false } : n)));
      },
      () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        pauseOffsetRef.current = 0;
        setNotes(prev => prev.map(n => ({ ...n, isPlaying: false })));
      }
    );
    setIsPlaying(true);
  }, [notes, playbackSpeed, isPlaying]);

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    const offset = engine.getCurrentOffset();
    pauseOffsetRef.current = offset;
    engine.pause();
    setIsPlaying(false);
    setNotes(prev => prev.map(n => ({ ...n, isPlaying: false })));
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
    pauseOffsetRef.current = 0;
    setNotes(prev => prev.map(n => ({ ...n, isPlaying: false })));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (engineRef.current.getIsPlaying()) {
      pauseOffsetRef.current = engineRef.current.getCurrentOffset();
      engineRef.current.setSpeed(speed);
    }
  }, []);

  const handleDurationChange = useCallback((duration: NoteDuration) => {
    setSelectedDuration(duration);
  }, []);

  const handleMetronomeToggle = useCallback(() => {
    setMetronomeEnabled(prev => {
      const next = !prev;
      engineRef.current.setMetronomeEnabled(next);
      return next;
    });
  }, []);

  return (
    <div className="app-container">
      <SheetCanvas
        notes={notes}
        selectedDuration={selectedDuration}
        playbackTime={playbackTime}
        isPlaying={isPlaying}
        metronomeEnabled={metronomeEnabled}
        onAddNote={handleAddNote}
        onMoveNote={handleMoveNote}
        onSelectNote={handleSelectNote}
        deletingNoteIds={deletingNoteIds}
      />
      <NoteEditor
        selectedDuration={selectedDuration}
        onDurationChange={handleDurationChange}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        metronomeEnabled={metronomeEnabled}
        onMetronomeToggle={handleMetronomeToggle}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSpeedChange={handleSpeedChange}
        noteCount={notes.length}
      />
    </div>
  );
};

export default App;
