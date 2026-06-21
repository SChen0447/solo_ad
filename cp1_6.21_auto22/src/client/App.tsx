import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Agenda, Topic, Note, ActionItem } from '../shared/types';
import AgendaList from './components/AgendaList';
import MinutesPanel from './components/MinutesPanel';
import ActionItemBoard from './components/ActionItemBoard';

type Page = 'agendas' | 'minutes' | 'actions';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('agendas');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nickname, setNickname] = useState(() => localStorage.getItem('nickname') || '');
  const [nicknameSet, setNicknameSet] = useState(() => !!localStorage.getItem('nickname'));

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => { s.close(); };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-note', (note: Note) => {
      setNotes((prev) => [...prev, note]);
    });
    socket.on('note-retracted', ({ noteId }: { noteId: string }) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });
    socket.on('topics-updated', (topics: Topic[]) => {
      setSelectedAgenda((prev) => prev ? { ...prev, topics } : null);
    });
    return () => {
      socket.off('new-note');
      socket.off('note-retracted');
      socket.off('topics-updated');
    };
  }, [socket]);

  const fetchAgendas = useCallback(async () => {
    const res = await fetch('/api/agendas');
    const data = await res.json();
    setAgendas(data);
  }, []);

  const fetchNotes = useCallback(async (agendaId: string) => {
    const res = await fetch(`/api/notes/${agendaId}`);
    const data = await res.json();
    setNotes(data);
  }, []);

  const fetchActionItems = useCallback(async (filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const res = await fetch(`/api/actions?${params.toString()}`);
    const data = await res.json();
    setActionItems(data);
  }, []);

  useEffect(() => { fetchAgendas(); }, [fetchAgendas]);
  useEffect(() => { fetchActionItems(); }, [fetchActionItems]);

  const openAgenda = useCallback(async (agenda: Agenda) => {
    setSelectedAgenda(agenda);
    setPage('minutes');
    fetchNotes(agenda._id);
    if (socket) {
      socket.emit('join-agenda', agenda._id);
    }
  }, [socket, fetchNotes]);

  useEffect(() => {
    if (socket && selectedAgenda) {
      socket.emit('join-agenda', selectedAgenda._id);
    }
  }, [socket, selectedAgenda]);

  const addNote = useCallback((topicId: string, content: string) => {
    if (!socket || !selectedAgenda || !nickname) return;
    socket.emit('add-note', {
      agendaId: selectedAgenda._id,
      topicId,
      nickname,
      content,
    });
  }, [socket, selectedAgenda, nickname]);

  const retractNote = useCallback((noteId: string) => {
    if (!socket || !selectedAgenda || !nickname) return;
    socket.emit('retract-note', {
      agendaId: selectedAgenda._id,
      noteId,
      nickname,
    });
  }, [socket, selectedAgenda, nickname]);

  const updateTopics = useCallback(async (agendaId: string, topics: Topic[]) => {
    await fetch(`/api/agendas/${agendaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics }),
    });
    if (socket && selectedAgenda) {
      socket.emit('topic-updated', { agendaId, topics });
    }
    setSelectedAgenda((prev) => prev ? { ...prev, topics } : null);
  }, [socket, selectedAgenda]);

  const convertToAction = useCallback(async (topic: Topic, agendaId: string) => {
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: topic.title,
        assignee: topic.assignee,
        deadline: topic.deadline,
        topicId: topic.id,
        agendaId,
        priority: 'medium' as const,
        status: 'todo' as const,
      }),
    });
    const action = await res.json();
    setActionItems((prev) => [...prev, action]);
  }, []);

  const updateActionItem = useCallback(async (id: string, updates: Partial<ActionItem>) => {
    await fetch(`/api/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setActionItems((prev) => prev.map((a) => a._id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteActionItem = useCallback(async (id: string) => {
    await fetch(`/api/actions/${id}`, { method: 'DELETE' });
    setActionItems((prev) => prev.filter((a) => a._id !== id));
  }, []);

  const handleSetNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('nickname', nickname.trim());
      setNickname(nickname.trim());
      setNicknameSet(true);
    }
  };

  if (!nicknameSet) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, var(--sky-50) 0%, var(--green-50) 100%)' }}>
        <div className="card" style={{ padding: '32px 40px', textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h2 style={{ marginBottom: 8, color: 'var(--green-800)' }}>会议待办追踪</h2>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 24 }}>请输入您的昵称以开始协作</p>
          <div className="form-group">
            <input
              className="form-input"
              placeholder="输入昵称..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
              autoFocus
            />
          </div>
          <button className="btn btn-success" onClick={handleSetNickname} style={{ width: '100%' }}>
            开始使用
          </button>
        </div>
      </div>
    );
  }

  const navItems: { key: Page; icon: string; label: string }[] = [
    { key: 'agendas', icon: '📅', label: '会议议程' },
    { key: 'minutes', icon: '📝', label: '议题详情' },
    { key: 'actions', icon: '✅', label: '行动项看板' },
  ];

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">📋</div>
          <h2>会议追踪</h2>
        </div>
        <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          ◀
        </button>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sky-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {nickname[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }} className="nav-label">{nickname}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page === 'agendas' && (
          <AgendaList
            agendas={agendas}
            onRefresh={fetchAgendas}
            onOpen={openAgenda}
          />
        )}
        {page === 'minutes' && (
          <MinutesPanel
            agenda={selectedAgenda}
            notes={notes}
            nickname={nickname}
            onAddNote={addNote}
            onRetractNote={retractNote}
            onUpdateTopics={updateTopics}
            onConvertToAction={convertToAction}
            onBack={() => setPage('agendas')}
          />
        )}
        {page === 'actions' && (
          <ActionItemBoard
            actionItems={actionItems}
            onRefresh={fetchActionItems}
            onUpdate={updateActionItem}
            onDelete={deleteActionItem}
          />
        )}
      </main>
    </div>
  );
};

export default App;
