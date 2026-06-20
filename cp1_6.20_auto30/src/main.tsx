import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import EditorPanel from './components/EditorPanel';
import HarmonyPanel from './components/HarmonyPanel';
import { websocketClient, NoteData, EditEvent, RoomSettings, ChordData, UserCursor } from './services/websocketClient';

type Duration = 'whole' | 'half' | 'quarter' | 'eighth';
type ToolMode = 'add' | 'delete' | 'select';

const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];
const KEY_SIGNATURES = ['C大调', 'G大调', 'D大调', 'F大调', 'A大调', 'E大调'];
const DURATION_VALUES: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

function App() {
  const [connected, setConnected] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomOwner, setRoomOwner] = useState(false);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [currentDuration, setCurrentDuration] = useState<Duration>('quarter');
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const [harmonyCollapsed, setHarmonyCollapsed] = useState(false);
  const [chords, setChords] = useState<ChordData[]>([]);
  const [generatingHarmony, setGeneratingHarmony] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    timeSignature: '4/4',
    keySignature: 'C大调',
    tempo: 120,
  });
  const [playingPosition, setPlayingPosition] = useState<{ measure: number; position: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState<NoteData[][]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const userId = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('userId', userId);
    return () => {
      websocketClient.disconnect();
      if (playingIntervalRef.current) clearInterval(playingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const handleNoteAdded = (data: unknown) => {
      const event = data as EditEvent;
      setNotes((prev) => {
        if (prev.find((n) => n.id === event.note.id)) return prev;
        const newNotes = [...prev, event.note];
        return newNotes;
      });
    };

    const handleNoteDeleted = (data: unknown) => {
      const event = data as EditEvent;
      setNotes((prev) => prev.filter((n) => n.id !== event.note.id));
    };

    const handleNoteMoved = (data: unknown) => {
      const event = data as EditEvent;
      setNotes((prev) =>
        prev.map((n) => (n.id === event.note.id ? event.note : n))
      );
    };

    const handleCursorUpdate = (data: unknown) => {
      const cursor = data as UserCursor;
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    };

    const handleRoomSettings = (data: unknown) => {
      setRoomSettings(data as RoomSettings);
    };

    const handleRoomJoined = (data: unknown) => {
      const roomData = data as { roomId: string; notes: NoteData[]; settings: RoomSettings; users: Array<{ id: string; name: string }> };
      setRoomId(roomData.roomId);
      setNotes(roomData.notes);
      setRoomSettings(roomData.settings);
      setUsers(roomData.users);
      setInRoom(true);
      setHistory([roomData.notes]);
      setHistoryIndex(0);
      if (roomData.users.length === 1) setRoomOwner(true);
    };

    const handleUserJoined = (data: unknown) => {
      const user = data as { id: string; name: string };
      setUsers((prev) => (prev.find((u) => u.id === user.id) ? prev : [...prev, user]));
    };

    const handleUserLeft = (data: unknown) => {
      const user = data as { id: string; name: string };
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(user.id);
        return next;
      });
    };

    const handleConflict = (data: unknown) => {
      const conflict = data as { measure: number; message: string };
      setConflictMessage(conflict.message);
      setTimeout(() => setConflictMessage(null), 3000);
    };

    const handleHarmonyGenerated = (data: unknown) => {
      const harmonyData = data as { chords: ChordData[] };
      setChords(harmonyData.chords);
      setGeneratingHarmony(false);
    };

    websocketClient.on('note:added', handleNoteAdded);
    websocketClient.on('note:deleted', handleNoteDeleted);
    websocketClient.on('note:moved', handleNoteMoved);
    websocketClient.on('cursor:update', handleCursorUpdate);
    websocketClient.on('room:settings', handleRoomSettings);
    websocketClient.on('room:joined', handleRoomJoined);
    websocketClient.on('user:joined', handleUserJoined);
    websocketClient.on('user:left', handleUserLeft);
    websocketClient.on('conflict:detected', handleConflict);
    websocketClient.on('harmony:generated', handleHarmonyGenerated);

    return () => {
      websocketClient.off('note:added', handleNoteAdded);
      websocketClient.off('note:deleted', handleNoteDeleted);
      websocketClient.off('note:moved', handleNoteMoved);
      websocketClient.off('cursor:update', handleCursorUpdate);
      websocketClient.off('room:settings', handleRoomSettings);
      websocketClient.off('room:joined', handleRoomJoined);
      websocketClient.off('user:joined', handleUserJoined);
      websocketClient.off('user:left', handleUserLeft);
      websocketClient.off('conflict:detected', handleConflict);
      websocketClient.off('harmony:generated', handleHarmonyGenerated);
    };
  }, []);

  const connect = async () => {
    if (!nickname.trim()) return;
    const userId = localStorage.getItem('userId') || Math.random().toString(36).substring(2, 10);
    try {
      await websocketClient.connect(userId, nickname.trim());
      setConnected(true);
    } catch (e) {
      alert('连接失败，请检查后端服务是否启动');
    }
  };

  const createRoom = () => {
    const id = websocketClient.createRoom();
    setRoomId(id);
  };

  const joinRoom = () => {
    if (!roomIdInput.trim()) return;
    websocketClient.joinRoom(roomIdInput.trim().toUpperCase());
  };

  const pushHistory = useCallback((newNotes: NoteData[]) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, newNotes];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleNoteAdd = (note: NoteData) => {
    websocketClient.sendEditEvent({
      type: 'add',
      note,
      measure: note.measure,
    });
    const newNotes = [...notes, note];
    setNotes(newNotes);
    pushHistory(newNotes);
  };

  const handleNoteDelete = (note: NoteData) => {
    websocketClient.sendEditEvent({
      type: 'delete',
      note,
      measure: note.measure,
    });
    const newNotes = notes.filter((n) => n.id !== note.id);
    setNotes(newNotes);
    pushHistory(newNotes);
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(note.id);
      return next;
    });
  };

  const handleNoteMove = (note: NoteData, oldNote: NoteData) => {
    websocketClient.sendEditEvent({
      type: 'move',
      note,
      oldNote,
      measure: note.measure,
    });
    const newNotes = notes.map((n) => (n.id === note.id ? note : n));
    setNotes(newNotes);
    pushHistory(newNotes);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setNotes(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setNotes(history[newIndex]);
    }
  };

  const handleCursorUpdate = (position: number, measure: number) => {
    websocketClient.updateCursor(position, measure);
  };

  const handleSettingsChange = (settings: RoomSettings) => {
    setRoomSettings(settings);
    websocketClient.updateSettings(settings);
  };

  const generateHarmony = () => {
    setGeneratingHarmony(true);
    const measuresByIndex: NoteData[][] = [];
    notes.forEach((note) => {
      if (!measuresByIndex[note.measure]) measuresByIndex[note.measure] = [];
      measuresByIndex[note.measure].push(note);
    });
    websocketClient.generateHarmony(0, measuresByIndex);
  };

  const playChord = (midiNotes: number[]) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    midiNotes.forEach((midi) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  };

  const playMelody = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const beatDuration = 60 / roomSettings.tempo;
    let time = ctx.currentTime + 0.1;
    const sortedNotes = [...notes].sort((a, b) => {
      if (a.measure !== b.measure) return a.measure - b.measure;
      return a.position - b.position;
    });
    sortedNotes.forEach((note) => {
      const measureOffset = note.measure * 4;
      const startSec = (measureOffset + note.position) * beatDuration;
      const durSec = DURATION_VALUES[note.duration as keyof typeof DURATION_VALUES] * beatDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 * Math.pow(2, (note.pitch - 69) / 12), time + startSec);
      gain.gain.setValueAtTime(0, time + startSec);
      gain.gain.linearRampToValueAtTime(0.25, time + startSec + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + startSec + durSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time + startSec);
      osc.stop(time + startSec + durSec);
    });
  };

  const exportMIDI = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 500));

    const ticksPerQuarter = 480;
    const microsecondsPerBeat = Math.floor(60000000 / roomSettings.tempo);

    const writeVarLen = (value: number): number[] => {
      const buffer: number[] = [];
      let v = value;
      buffer.push(v & 0x7f);
      v >>= 7;
      while (v > 0) {
        buffer.push((v & 0x7f) | 0x80);
        v >>= 7;
      }
      return buffer.reverse();
    };

    const headerChunk: number[] = [
      0x4d, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      (ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff,
    ];

    const trackEvents: number[] = [];
    trackEvents.push(
      0x00, 0xff, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xff,
      (microsecondsPerBeat >> 8) & 0xff,
      microsecondsPerBeat & 0xff,
    );

    const sortedNotes = [...notes].sort((a, b) => {
      const aTime = a.measure * 4 + a.position;
      const bTime = b.measure * 4 + b.position;
      return aTime - bTime;
    });

    let lastTime = 0;
    const noteOffEvents: Array<{ time: number; pitch: number }> = [];

    sortedNotes.forEach((note) => {
      const startTicks = Math.round((note.measure * 4 + note.position) * ticksPerQuarter);
      const durTicks = Math.round(DURATION_VALUES[note.duration as keyof typeof DURATION_VALUES] * ticksPerQuarter);
      const deltaOn = startTicks - lastTime;
      trackEvents.push(...writeVarLen(deltaOn));
      trackEvents.push(0x90, note.pitch, 0x64);
      lastTime = startTicks;
      noteOffEvents.push({ time: startTicks + durTicks, pitch: note.pitch });
    });

    noteOffEvents.sort((a, b) => a.time - b.time);
    noteOffEvents.forEach((evt) => {
      const deltaOff = evt.time - lastTime;
      trackEvents.push(...writeVarLen(deltaOff));
      trackEvents.push(0x80, evt.pitch, 0x00);
      lastTime = evt.time;
    });

    trackEvents.push(0x00, 0xff, 0x2f, 0x00);

    const trackLength = trackEvents.length;
    const trackChunk: number[] = [
      0x4d, 0x54, 0x72, 0x6b,
      (trackLength >> 24) & 0xff,
      (trackLength >> 16) & 0xff,
      (trackLength >> 8) & 0xff,
      trackLength & 0xff,
      ...trackEvents,
    ];

    const midiData = new Uint8Array([...headerChunk, ...trackChunk]);
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `score_${roomId || 'export'}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const copySelectedNotes = () => {
    const selected = notes.filter((n) => selectedNoteIds.has(n.id));
    if (selected.length === 0) return;
    const copied = selected.map((n) => ({
      ...n,
      id: Math.random().toString(36).substring(2, 10),
      position: n.position + 2,
    }));
    copied.forEach((note) => handleNoteAdd(note));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelectedNotes();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        copySelectedNotes();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedNoteIds.forEach((id) => {
          const note = notes.find((n) => n.id === id);
          if (note) handleNoteDelete(note);
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!connected) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🎵 协同乐谱编辑器</h1>
          <p style={styles.subtitle}>实时协作 · 智能和声配器</p>
          <input
            type="text"
            placeholder="输入你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            style={styles.input}
          />
          <button onClick={connect} style={styles.primaryButton}>
            进入
          </button>
        </div>
      </div>
    );
  }

  if (!inRoom) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🎵 协同乐谱编辑器</h1>
          <p style={styles.subtitle}>欢迎, {nickname}</p>
          <button onClick={createRoom} style={styles.primaryButton}>
            创建新房间
          </button>
          <div style={styles.divider}>或</div>
          <input
            type="text"
            placeholder="输入房间ID"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            style={styles.input}
          />
          <button onClick={joinRoom} style={styles.secondaryButton}>
            加入房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerLogo}>🎼</span>
          <span style={styles.headerTitle}>协同乐谱编辑器</span>
          <span style={styles.roomBadge}>房间: {roomId}</span>
        </div>
        <div style={styles.headerCenter}>
          {roomOwner && (
            <>
              <select
                value={roomSettings.timeSignature}
                onChange={(e) => handleSettingsChange({ ...roomSettings, timeSignature: e.target.value })}
                style={styles.select}
              >
                {TIME_SIGNATURES.map((t) => (
                  <option key={t} value={t}>{t}拍</option>
                ))}
              </select>
              <select
                value={roomSettings.keySignature}
                onChange={(e) => handleSettingsChange({ ...roomSettings, keySignature: e.target.value })}
                style={styles.select}
              >
                {KEY_SIGNATURES.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </>
          )}
          {!roomOwner && (
            <span style={styles.settingsDisplay}>
              {roomSettings.timeSignature} · {roomSettings.keySignature}
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userList}>
            {users.map((u) => (
              <span key={u.id} style={styles.userChip}>
                {u.name}
                {u.id === websocketClient.getUserId() && ' (我)'}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.toolPanel}>
          <ToolButton
            icon="♩"
            label="四分音符"
            active={currentDuration === 'quarter' && toolMode === 'add'}
            onClick={() => { setCurrentDuration('quarter'); setToolMode('add'); }}
          />
          <ToolButton
            icon="♪"
            label="八分音符"
            active={currentDuration === 'eighth' && toolMode === 'add'}
            onClick={() => { setCurrentDuration('eighth'); setToolMode('add'); }}
          />
          <ToolButton
            icon="𝅗𝅥"
            label="二分音符"
            active={currentDuration === 'half' && toolMode === 'add'}
            onClick={() => { setCurrentDuration('half'); setToolMode('add'); }}
          />
          <ToolButton
            icon="𝅝"
            label="全音符"
            active={currentDuration === 'whole' && toolMode === 'add'}
            onClick={() => { setCurrentDuration('whole'); setToolMode('add'); }}
          />
          <div style={styles.toolDivider} />
          <ToolButton
            icon="✓"
            label="选择"
            active={toolMode === 'select'}
            onClick={() => setToolMode('select')}
          />
          <ToolButton
            icon="✕"
            label="删除"
            active={toolMode === 'delete'}
            onClick={() => setToolMode('delete')}
          />
          <div style={styles.toolDivider} />
          <ToolButton
            icon="↶"
            label="撤销"
            onClick={undo}
            disabled={historyIndex <= 0}
          />
          <ToolButton
            icon="↷"
            label="重做"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          />
          <div style={styles.toolDivider} />
          <ToolButton icon="▶" label="试听" onClick={playMelody} />
          <ToolButton
            icon="🎹"
            label="生成和声"
            onClick={generateHarmony}
            loading={generatingHarmony}
          />
          <div style={styles.toolDivider} />
          <ToolButton icon="💾" label="导出MIDI" onClick={exportMIDI} />
        </div>

        <div style={styles.editorArea}>
          <EditorPanel
            notes={notes}
            selectedNoteIds={selectedNoteIds}
            setSelectedNoteIds={setSelectedNoteIds}
            cursors={cursors}
            roomSettings={roomSettings}
            toolMode={toolMode}
            currentDuration={currentDuration}
            durationValues={DURATION_VALUES}
            onNoteAdd={handleNoteAdd}
            onNoteDelete={handleNoteDelete}
            onNoteMove={handleNoteMove}
            onCursorUpdate={handleCursorUpdate}
            playingPosition={playingPosition}
            userId={websocketClient.getUserId()}
          />
          {conflictMessage && (
            <div style={styles.conflictBar}>
              ⚠️ {conflictMessage}
            </div>
          )}
        </div>

        {!harmonyCollapsed ? (
          <HarmonyPanel
            chords={chords}
            keySignature={roomSettings.keySignature}
            onPlayChord={playChord}
            onCollapse={() => setHarmonyCollapsed(true)}
          />
        ) : (
          <div style={styles.harmonyCollapsed} onClick={() => setHarmonyCollapsed(false)} title="展开和声面板">
            🎹
          </div>
        )}
      </div>

      {isExporting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>正在导出 MIDI...</p>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
  disabled,
  loading,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        ...styles.toolButton,
        ...(active ? styles.toolButtonActive : {}),
        ...(disabled ? styles.toolButtonDisabled : {}),
      }}
    >
      {loading ? <div style={styles.smallSpinner} /> : icon}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    fontFamily: "'Segoe UI', sans-serif",
  },
  loginCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 48,
    minWidth: 360,
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
  },
  title: {
    color: '#e0e0e0',
    fontSize: 28,
    margin: 0,
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    margin: 0,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s',
    marginBottom: 16,
  },
  secondaryButton: {
    width: '100%',
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 15,
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
  divider: {
    color: '#666',
    margin: '16px 0',
    fontSize: 13,
  },
  appContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', sans-serif",
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  roomBadge: {
    background: 'rgba(102, 126, 234, 0.3)',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  headerCenter: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  select: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  settingsDisplay: {
    fontSize: 13,
    color: '#aaa',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  userList: {
    display: 'flex',
    gap: 8,
  },
  userChip: {
    padding: '4px 10px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  toolPanel: {
    width: 70,
    background: 'rgba(0, 0, 0, 0.2)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 6px',
    gap: 6,
    flexShrink: 0,
    '@media (maxWidth: 768px)': {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: 'auto',
      height: 60,
      flexDirection: 'row',
      justifyContent: 'center',
      padding: '8px',
      borderRight: 'none',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    },
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid transparent',
    color: '#e0e0e0',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  toolButtonActive: {
    background: 'rgba(102, 126, 234, 0.3)',
    borderColor: 'rgba(102, 126, 234, 0.6)',
    color: '#fff',
  },
  toolButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  toolDivider: {
    width: 36,
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '4px 0',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'auto',
    width: '70%',
  },
  conflictBar: {
    background: 'rgba(255, 165, 0, 0.2)',
    borderTop: '1px solid rgba(255, 165, 0, 0.5)',
    color: '#ffa500',
    padding: '10px 20px',
    fontSize: 13,
    flexShrink: 0,
  },
  harmonyCollapsed: {
    width: 40,
    background: 'rgba(0, 0, 0, 0.2)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 20,
    flexShrink: 0,
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(102, 126, 234, 0.2)',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  smallSpinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    marginTop: 16,
    color: '#aaa',
    fontSize: 14,
  },
};

const css = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes press {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  button:active {
    animation: press 0.15s ease;
  }
  @media (max-width: 768px) {
    div[style*="toolPanel"] {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: auto !important;
      height: 60px !important;
      flex-direction: row !important;
      justify-content: center !important;
      padding: 8px !important;
      border-right: none !important;
      border-top: 1px solid rgba(255,255,255,0.05) !important;
    }
    div[style*="harmonyCollapsed"] ~ div, div[class*="harmony"] {
      display: none !important;
    }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
