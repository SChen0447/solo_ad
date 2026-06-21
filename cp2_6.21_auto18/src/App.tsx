import React, { useCallback, useRef, useMemo } from 'react';
import AudioPlayer from './AudioPlayer';
import WaveformAnnotator from './WaveformAnnotator';
import ReviewEditor from './ReviewEditor';
import { useApp } from './AppContext';
import { generateId } from './utils';
import type { Note, Review } from './types';
import './styles.css';

const App: React.FC = () => {
  const { state, dispatch, addTrack, undo, redo, toggleTheme } = useApp();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentTrack = useMemo(
    () => state.tracks.find((t) => t.id === state.currentTrackId) || null,
    [state.tracks, state.currentTrackId]
  );

  const currentTrackNotes = useMemo(
    () => state.notes.filter((n) => n.trackId === state.currentTrackId),
    [state.notes, state.currentTrackId]
  );

  const handleAddTrack = useCallback(
    async (file: File) => {
      const trackId = await addTrack(file);
      return trackId;
    },
    [addTrack]
  );

  const handleSelectTrack = useCallback((trackId: string | null) => {
    dispatch({ type: 'SET_CURRENT_TRACK', payload: trackId });
  }, [dispatch]);

  const handleTogglePlay = useCallback((playing?: boolean) => {
    dispatch({ type: 'TOGGLE_PLAY', payload: playing });
  }, [dispatch]);

  const handleSeek = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, [dispatch]);

  const handleVolumeChange = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, [dispatch]);

  const handleAddNote = useCallback(
    (time: number, text: string) => {
      if (!state.currentTrackId) return;
      const note: Note = {
        id: generateId(),
        trackId: state.currentTrackId,
        time,
        text,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_NOTE', payload: note });
    },
    [state.currentTrackId, dispatch]
  );

  const handleUpdateNote = useCallback(
    (note: Note) => {
      dispatch({ type: 'UPDATE_NOTE', payload: note });
    },
    [dispatch]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      dispatch({ type: 'DELETE_NOTE', payload: noteId });
    },
    [dispatch]
  );

  const handleAddReview = useCallback(
    (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now();
      const newReview: Review = {
        ...review,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_REVIEW', payload: newReview });
      return newReview.id;
    },
    [dispatch]
  );

  const handleUpdateReview = useCallback(
    (review: Review) => {
      dispatch({ type: 'UPDATE_REVIEW', payload: { ...review, updatedAt: Date.now() } });
    },
    [dispatch]
  );

  const handleDeleteReview = useCallback(
    (reviewId: string) => {
      dispatch({ type: 'DELETE_REVIEW', payload: reviewId });
    },
    [dispatch]
  );

  const canUndo = useMemo(() => {
    return state.reviews.length > 0 || state.notes.length > 0;
  }, [state.reviews.length, state.notes.length]);

  return (
    <div className="app-container" style={styles.container}>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        style={{
          ...styles.themeToggle,
          backgroundColor: state.theme === 'dark' ? '#2D2D44' : '#FFFFFF',
        }}
        title={state.theme === 'dark' ? '切换到明亮模式' : '切换到暗黑模式'}
      >
        {state.theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div style={styles.undoRedoButtons}>
        <button onClick={undo} style={styles.undoRedoBtn} title="撤销 (Ctrl+Z)">
          ↶
        </button>
        <button onClick={redo} style={styles.undoRedoBtn} title="重做 (Ctrl+Shift+Z)">
          ↷
        </button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <AudioPlayer
            tracks={state.tracks}
            currentTrack={currentTrack}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            volume={state.volume}
            onAddTrack={handleAddTrack}
            onSelectTrack={handleSelectTrack}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            audioElementRef={audioElementRef}
            animationFrameRef={animationFrameRef}
          />
          <WaveformAnnotator
            audioBuffer={currentTrack?.audioBuffer || null}
            currentTime={state.currentTime}
            duration={currentTrack?.duration || 0}
            notes={currentTrackNotes}
            onSeek={handleSeek}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            theme={state.theme}
          />
        </div>
        <ReviewEditor
          notes={currentTrackNotes}
          reviews={state.reviews}
          currentReviewId={state.currentReviewId}
          currentTrack={currentTrack}
          onAddReview={handleAddReview}
          onUpdateReview={handleUpdateReview}
          onDeleteReview={handleDeleteReview}
          onSelectReview={(id) => dispatch({ type: 'SET_CURRENT_REVIEW', payload: id })}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.3s ease',
  },
  themeToggle: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    zIndex: 1000,
    boxShadow: 'var(--shadow-md)',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  undoRedoButtons: {
    position: 'fixed',
    top: '16px',
    right: '64px',
    display: 'flex',
    gap: '8px',
    zIndex: 1000,
  },
  undoRedoBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    display: 'flex',
    width: '100%',
    height: '100%',
    padding: '16px',
    gap: '16px',
  },
  leftPanel: {
    flex: '0 0 calc(70% - 8px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
  },
};

export default App;
