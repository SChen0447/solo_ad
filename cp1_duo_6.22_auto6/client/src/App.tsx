import React, { useEffect, useRef, useState, useCallback } from 'react';
import Canvas from './Canvas';
import Sidebar from './Sidebar';

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  userId: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  state: {
    notes: StickyNote[];
    connections: Connection[];
  };
}

export interface GroupResult {
  groups: {
    theme: string;
    keywords: string[];
    summary: string;
    todos: string[];
  }[];
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [groupResult, setGroupResult] = useState<GroupResult | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('#00e5ff');
  const wsRef = useRef<WebSocket | null>(null);

  const sendWS = useCallback((type: string, payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init':
            setNotes(msg.payload.state.notes || []);
            setConnections(msg.payload.state.connections || []);
            setUserId(msg.payload.userId);
            setUserColor(msg.payload.color);
            break;
          case 'note_added':
            setNotes((prev) => [...prev, msg.payload]);
            break;
          case 'note_updated':
            setNotes((prev) =>
              prev.map((n) => (n.id === msg.payload.id ? { ...n, ...msg.payload } : n))
            );
            break;
          case 'note_deleted':
            setNotes((prev) => prev.filter((n) => n.id !== msg.payload.id));
            setConnections((prev) =>
              prev.filter((c) => c.fromId !== msg.payload.id && c.toId !== msg.payload.id)
            );
            setSelectedNoteIds((prev) => {
              const next = new Set(prev);
              next.delete(msg.payload.id);
              return next;
            });
            break;
          case 'note_moved':
            setNotes((prev) =>
              prev.map((n) =>
                n.id === msg.payload.id ? { ...n, x: msg.payload.x, y: msg.payload.y } : n
              )
            );
            break;
          case 'connection_added':
            setConnections((prev) => [...prev, msg.payload]);
            break;
          case 'connection_deleted':
            setConnections((prev) => prev.filter((c) => c.id !== msg.payload.id));
            break;
          case 'snapshot':
            setSnapshots((prev) => {
              const next = [...prev, msg.payload];
              return next.length > 20 ? next.slice(-20) : next;
            });
            break;
          case 'group_result':
            setGroupResult(msg.payload);
            break;
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current === ws) {
          window.location.reload();
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        const res = await fetch('/api/snapshots');
        const data = await res.json();
        setSnapshots(data);
      } catch {
        // ignore
      }
    };
    fetchSnapshots();
    const interval = setInterval(fetchSnapshots, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddNote = useCallback(
    (x: number, y: number, text: string) => {
      const note: StickyNote = {
        id: crypto.randomUUID(),
        text,
        x,
        y,
        color: userColor,
        userId,
      };
      sendWS('add_note', note);
    },
    [userColor, userId, sendWS]
  );

  const handleMoveNote = useCallback(
    (id: string, x: number, y: number) => {
      sendWS('move_note', { id, x, y });
    },
    [sendWS]
  );

  const handleUpdateNote = useCallback(
    (note: Partial<StickyNote> & { id: string }) => {
      sendWS('update_note', note);
    },
    [sendWS]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      sendWS('delete_note', { id });
    },
    [sendWS]
  );

  const handleAddConnection = useCallback(
    (fromId: string, toId: string) => {
      const conn: Connection = {
        id: crypto.randomUUID(),
        fromId,
        toId,
      };
      sendWS('add_connection', conn);
    },
    [sendWS]
  );

  const handleDeleteConnection = useCallback(
    (id: string) => {
      sendWS('delete_connection', { id });
    },
    [sendWS]
  );

  const handleGroupSelected = useCallback(() => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.has(n.id));
    if (selectedNotes.length < 2) return;
    const texts = selectedNotes.map((n) => n.text);
    sendWS('request_group', { texts });
  }, [notes, selectedNoteIds, sendWS]);

  const handleSnapshotReplay = useCallback(
    (snapshotState: Snapshot['state']) => {
      setNotes(snapshotState.notes);
      setConnections(snapshotState.connections);
      setSelectedNoteIds(new Set());
    },
    []
  );

  const handleToggleSelect = useCallback((noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  const appStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#0a0e1a',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    overflow: 'hidden',
  };

  return (
    <div style={appStyle}>
      <Canvas
        notes={notes}
        connections={connections}
        userId={userId}
        userColor={userColor}
        selectedNoteIds={selectedNoteIds}
        onAddNote={handleAddNote}
        onMoveNote={handleMoveNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onAddConnection={handleAddConnection}
        onDeleteConnection={handleDeleteConnection}
        onToggleSelect={handleToggleSelect}
        snapshots={snapshots}
        onSnapshotReplay={handleSnapshotReplay}
      />
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        groupResult={groupResult}
        onGroupSelected={handleGroupSelected}
        selectedCount={selectedNoteIds.size}
        snapshots={snapshots}
        onSnapshotReplay={handleSnapshotReplay}
      />
    </div>
  );
};

export default App;
