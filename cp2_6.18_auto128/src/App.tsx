import React, { useState, useEffect, useRef, useCallback } from 'react';
import StickyNote, { Note } from './components/StickyNote';
import SidePanel from './components/SidePanel';

const NOTE_WIDTH = 240;
const NOTE_HEIGHT = 160;
const MAX_NOTES = 50;

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const separateOverlapping = useCallback((updatedNotes: Note[], movedId: string): Note[] => {
    const result = [...updatedNotes];
    const iterations = 5;

    for (let iter = 0; iter < iterations; iter++) {
      let hasOverlap = false;

      for (let i = 0; i < result.length; i++) {
        for (let j = i + 1; j < result.length; j++) {
          const a = result[i];
          const b = result[j];

          const overlapX = Math.min(a.x + NOTE_WIDTH, b.x + NOTE_WIDTH) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + NOTE_HEIGHT, b.y + NOTE_HEIGHT) - Math.max(a.y, b.y);

          if (overlapX > 0 && overlapY > 0) {
            hasOverlap = true;
            const repelStrength = 5;

            if (overlapX < overlapY) {
              if (a.x < b.x) {
                result[i] = { ...a, x: Math.max(0, a.x - repelStrength) };
                result[j] = { ...b, x: b.x + repelStrength };
              } else {
                result[i] = { ...a, x: a.x + repelStrength };
                result[j] = { ...b, x: Math.max(0, b.x - repelStrength) };
              }
            } else {
              if (a.y < b.y) {
                result[i] = { ...a, y: Math.max(0, a.y - repelStrength) };
                result[j] = { ...b, y: b.y + repelStrength };
              } else {
                result[i] = { ...a, y: a.y + repelStrength };
                result[j] = { ...b, y: Math.max(0, b.y - repelStrength) };
              }
            }
          }
        }
      }

      if (!hasOverlap) break;
    }

    if (boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      for (let i = 0; i < result.length; i++) {
        result[i] = {
          ...result[i],
          x: Math.max(0, Math.min(result[i].x, boardRect.width - NOTE_WIDTH)),
          y: Math.max(0, Math.min(result[i].y, boardRect.height - NOTE_HEIGHT))
        };
      }
    }

    return result;
  }, []);

  const handleAddNote = async (title: string, content: string, creator: string) => {
    if (notes.length >= MAX_NOTES) {
      alert(`最多支持 ${MAX_NOTES} 个便签`);
      return;
    }

    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();

    let x = Math.random() * (boardRect.width - NOTE_WIDTH - 40) + 20;
    let y = Math.random() * (boardRect.height - NOTE_HEIGHT - 40) + 20;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, creator, x, y })
      });
      const newNote = await response.json();

      setNotes(prev => {
        const updated = [...prev, newNote];
        const separated = separateOverlapping(updated, newNote.id);
        return separated;
      });

      setNewNoteId(newNote.id);
      setTimeout(() => setNewNoteId(null), 500);
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handlePositionChange = async (id: string, x: number, y: number) => {
    try {
      await fetch(`/api/notes/${id}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      });

      setNotes(prev => {
        const updated = prev.map(note =>
          note.id === id ? { ...note, x, y } : note
        );
        return separateOverlapping(updated, id);
      });
    } catch (err) {
      console.error('Failed to update position:', err);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}/like`, {
        method: 'PUT'
      });
      const updatedNote = await response.json();
      setNotes(prev =>
        prev.map(note => (note.id === id ? updatedNote : note))
      );
    } catch (err) {
      console.error('Failed to like note:', err);
    }
  };

  const handleToggleSort = () => {
    setIsSorting(prev => !prev);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brainstorm-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const handleImport = () => {
    fetchNotes();
  };

  const handleToggleMobile = () => {
    setIsMobileCollapsed(prev => !prev);
  };

  const sortedNotes = isSorting
    ? [...notes].sort((a, b) => b.likes - a.likes)
    : notes;

  const getBoardHeight = () => {
    if (!isSorting || !boardRef.current) return '100%';
    const isMobileView = window.innerWidth < 768;
    if (isMobileView) {
      return `${notes.length * (NOTE_HEIGHT + 20) + 60}px`;
    }
    const columns = Math.floor((boardRef.current.getBoundingClientRect().width - 40) / (NOTE_WIDTH + 20));
    const rows = Math.ceil(notes.length / Math.max(columns, 1));
    return `${rows * (NOTE_HEIGHT + 20) + 60}px`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: isMobile ? '16px 0' : '32px 0',
          overflow: 'auto',
          backgroundColor: '#faf5ef'
        }}
      >
        <div
          ref={boardRef}
          style={{
            width: '80%',
            minHeight: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 64px)',
            height: getBoardHeight(),
            backgroundColor: '#faf5ef',
            borderRadius: 8,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {sortedNotes.map((note, index) => (
            <StickyNote
              key={note.id}
              note={note}
              isNew={note.id === newNoteId}
              onPositionChange={handlePositionChange}
              onLike={handleLike}
              boardRef={boardRef}
              isSorting={isSorting}
              sortIndex={index}
            />
          ))}
          {notes.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: 16
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
              <div>在右侧输入创意想法，开始脑暴吧！</div>
            </div>
          )}
        </div>
      </div>

      <SidePanel
        onAddNote={handleAddNote}
        isSorting={isSorting}
        onToggleSort={handleToggleSort}
        onExport={handleExport}
        onImport={handleImport}
        isMobile={isMobile}
        isMobileCollapsed={isMobileCollapsed}
        onToggleMobile={handleToggleMobile}
      />
    </div>
  );
};

export default App;
