import { useState, useEffect, useCallback, useRef } from 'react';
import NoteBoard from './NoteBoard';
import type { Note, Group, Poll, NoteColor } from './types';
import { v4 as uuidv4 } from 'uuid';

const NOTE_COLORS: NoteColor[] = ['#4A90D9', '#50C878', '#FF8C42', '#E573A0'];

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [currentVoterId] = useState(() => {
    let id = localStorage.getItem('voterId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('voterId', id);
    }
    return id;
  });
  const [votedPollIds, setVotedPollIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<number | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [notesRes, groupsRes, pollsRes, votedRes] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/groups'),
        fetch('/api/polls'),
        fetch(`/api/voter/${currentVoterId}/polls`),
      ]);
      const notesData = await notesRes.json();
      const groupsData = await groupsRes.json();
      const pollsData = await pollsRes.json();
      const votedData = await votedRes.json();
      setNotes(notesData);
      setGroups(groupsData);
      setPolls(pollsData);
      setVotedPollIds(votedData.votedPollIds);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentVoterId]);

  useEffect(() => {
    fetchAllData();
    pollingRef.current = window.setInterval(fetchAllData, 30000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchAllData]);

  const createNote = useCallback(
    async (x: number, y: number, color?: NoteColor, content?: string, groupId?: string | null) => {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content || '',
            color: color || NOTE_COLORS[0],
            x,
            y,
            groupId: groupId || null,
          }),
        });
        const newNote = await res.json();
        setNotes((prev) => [...prev, newNote]);
      } catch (err) {
        console.error('Failed to create note:', err);
      }
    },
    []
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error('Failed to update note:', err);
        fetchAllData();
      }
    },
    [fetchAllData]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'DELETE',
        });
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    },
    []
  );

  const createPoll = useCallback(
    async (question: string, options: string[]) => {
      try {
        const res = await fetch('/api/polls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, options }),
        });
        const newPoll = await res.json();
        setPolls((prev) => [...prev, newPoll]);
      } catch (err) {
        console.error('Failed to create poll:', err);
      }
    },
    []
  );

  const vote = useCallback(
    async (pollId: string, optionId: string) => {
      if (votedPollIds.includes(pollId)) {
        return;
      }
      try {
        const res = await fetch(`/api/polls/${pollId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId, voterId: currentVoterId }),
        });
        if (res.ok) {
          const data = await res.json();
          setPolls((prev) =>
            prev.map((p) => (p.id === pollId ? data.poll : p))
          );
          setVotedPollIds((prev) => [...prev, pollId]);
        }
      } catch (err) {
        console.error('Failed to vote:', err);
      }
    },
    [currentVoterId, votedPollIds]
  );

  const showResults = useCallback(
    async (pollId: string) => {
      try {
        const res = await fetch(`/api/polls/${pollId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const updatedPoll = await res.json();
        setPolls((prev) =>
          prev.map((p) => (p.id === pollId ? updatedPoll : p))
        );
      } catch (err) {
        console.error('Failed to show results:', err);
      }
    },
    []
  );

  const resetPoll = useCallback(
    async (pollId: string) => {
      try {
        const res = await fetch(`/api/polls/${pollId}/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const updatedPoll = await res.json();
        setPolls((prev) =>
          prev.map((p) => (p.id === pollId ? updatedPoll : p))
        );
        setVotedPollIds((prev) => prev.filter((id) => id !== pollId));
      } catch (err) {
        console.error('Failed to reset poll:', err);
      }
    },
    []
  );

  const getNotesByGroup = useCallback(
    (groupId: string | null) => {
      return notes.filter((n) => n.groupId === groupId);
    },
    [notes]
  );

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1E1E2E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '18px',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1E1E2E',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '50px',
          backgroundColor: 'rgba(30, 30, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          会议便签与投票协作
        </h1>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: '8px',
          }}
        >
          {NOTE_COLORS.map((color) => (
            <div
              key={color}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: color,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onClick={() => createNote(100, 250, color, '')}
              title={`创建${color}便签`}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      </div>

      <NoteBoard
        notes={notes}
        groups={groups}
        polls={polls}
        votedPollIds={votedPollIds}
        getNotesByGroup={getNotesByGroup}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onVote={vote}
        onShowResults={showResults}
        onResetPoll={resetPoll}
        onCreatePoll={createPoll}
      />
    </div>
  );
}

export default App;
