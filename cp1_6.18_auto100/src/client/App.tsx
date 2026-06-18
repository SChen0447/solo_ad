import React, { useEffect, useRef, useState, useCallback } from 'react';
import PianoRoll from './components/PianoRoll.js';
import ScoreEditor from './components/ScoreEditor.js';
import CollaborationPanel from './components/CollaborationPanel.js';
import { useStore } from './store.js';
import { audioEngine } from './audioEngine.js';
import { wsManager } from './wsManager.js';
import type { ScoreState as IScoreState } from './types.js';

const TRACK_TABS: { id: string; icon: string; label: string }[] = [
  { id: 'track-piano', icon: '🎹', label: '钢琴' },
  { id: 'track-strings', icon: '🎻', label: '弦乐' },
  { id: 'track-drums', icon: '🥁', label: '鼓' },
];

const QUANTIZE_OPTIONS = [
  { value: 4, label: '1/4 拍' },
  { value: 8, label: '1/8 拍' },
  { value: 16, label: '1/16 拍' },
];

async function createRoomAndJoin(userName: string) {
  try {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const data = await res.json();
    if (data?.roomId) {
      wsManager.connect(data.roomId, userName || '访客');
    }
  } catch (e) {
    console.error('创建房间失败', e);
  }
}

const App: React.FC = () => {
  const tracks = useStore((s) => s.tracks);
  const currentTrackId = useStore((s) => s.currentTrackId);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const bpm = useStore((s) => s.bpm);
  const setBPM = useStore((s) => s.setBPM);
  const quantize = useStore((s) => s.quantize);
  const setQuantize = useStore((s) => s.setQuantize);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const playbackHead = useStore((s) => s.playbackHead);
  const setPlaybackHead = useStore((s) => s.setPlaybackHead);
  const addHighlightedPitch = useStore((s) => s.addHighlightedPitch);
  const setHighlightedPitches = useStore((s) => s.setHighlightedPitches);
  const notifications = useStore((s) => s.notifications);
  const users = useStore((s) => s.users);
  const remoteCursors = useStore((s) => s.remoteCursors);
  const roomId = useStore((s) => s.roomId);
  const currentUser = useStore((s) => s.currentUser);

  const [prevTrackId, setPrevTrackId] = useState(currentTrackId);
  const [trackSwitching, setTrackSwitching] = useState(false);
  const [scoreEditorKey, setScoreEditorKey] = useState(0);
  const [isTablet, setIsTablet] = useState(false);

  const rafRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playStartBeatRef = useRef<number>(0);
  const scheduledNotesRef = useRef<Set<string>>(new Set());
  const audioStartCtxRef = useRef<number | null>(null);

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getScoreSnapshot = useCallback((): IScoreState => {
    const s = useStore.getState();
    return {
      tracks: s.tracks,
      bpm: s.bpm,
      quantize: s.quantize,
      currentTrackId: s.currentTrackId,
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let timer: number;
    const schedule = () => {
      wsManager.sendScore(getScoreSnapshot());
      timer = window.setTimeout(schedule, 300);
    };
    timer = window.setTimeout(schedule, 500);
    return () => clearTimeout(timer);
  }, [roomId, getScoreSnapshot]);

  const handleTrackChange = (trackId: string) => {
    if (trackId === currentTrackId || trackSwitching || isPlaying) return;
    setPrevTrackId(currentTrackId);
    setTrackSwitching(true);
    setTimeout(() => {
      setCurrentTrack(trackId);
      setScoreEditorKey((k) => k + 1);
      setTimeout(() => {
        setTrackSwitching(false);
      }, 280);
    }, 140);
  };

  const currentTrack = tracks.find((t) => t.id === currentTrackId);

  const stopPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
    setHighlightedPitches(new Set());
    audioEngine.stopAll();
    scheduledNotesRef.current.clear();
    audioStartCtxRef.current = null;
  }, [setPlaying, setHighlightedPitches]);

  const startPlayback = useCallback(() => {
    const allTracks = useStore.getState().tracks;
    const allNotes: { note: any; trackType: string }[] = [];
    allTracks.forEach((t) => {
      t.notes.forEach((n) => allNotes.push({ note: n, trackType: t.type }));
    });
    if (allNotes.length === 0) return;

    const s = useStore.getState();
    const beatsPerSec = s.bpm / 60;
    const startBeat = s.playbackHead;
    playStartTimeRef.current = performance.now();
    playStartBeatRef.current = startBeat;
    scheduledNotesRef.current = new Set();
    audioStartCtxRef.current = null;
    setPlaying(true);

    const maxEnd = allNotes.reduce(
      (m, { note }) => Math.max(m, note.start + note.duration),
      0
    );

    const step = () => {
      const now = performance.now();
      const elapsed = (now - playStartTimeRef.current) / 1000;
      const currentBeat = startBeat + elapsed * beatsPerSec;
      setPlaybackHead(currentBeat);

      if (audioStartCtxRef.current === null) {
        audioStartCtxRef.current = now;
      }

      const highlightedNow = new Set<number>();
      allNotes.forEach(({ note }) => {
        const noteOn = note.start;
        const noteOff = note.start + note.duration * 0.98;
        if (currentBeat >= noteOn && currentBeat < noteOff) {
          highlightedNow.add(note.pitch);
        }
        if (currentBeat >= noteOn && !scheduledNotesRef.current.has(note.id)) {
          scheduledNotesRef.current.add(note.id);
          const noteStartOffset = Math.max(0, elapsed - (noteOn - startBeat) / beatsPerSec);
          const startOffset = Math.max(0, noteStartOffset);
          audioEngine.playNote(
            note.pitch,
            Math.max(0.12, note.duration / beatsPerSec),
            (currentTrack?.type as any) || 'piano',
            -startOffset
          );
        }
      });
      setHighlightedPitches(highlightedNow);

      if (currentBeat >= maxEnd + 0.5) {
        stopPlayback();
        setPlaybackHead(0);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [setPlaying, setPlaybackHead, setHighlightedPitches, stopPlayback, currentTrack?.type]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const handleStop = () => {
    stopPlayback();
    setPlaybackHead(0);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const remoteCursorsArr = Array.from(remoteCursors.entries());

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes notifSlide {
          0% { transform: translate(-50%, -40px); opacity: 0; }
          15% { transform: translate(-50%, 0); opacity: 1; }
          80% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -10px); opacity: 0; }
        }
        @keyframes tabUnderline {
          0% { transform: scaleX(0); transform-origin: left; }
          100% { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes trackSwitchOld {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.92); opacity: 0; }
        }
        @keyframes trackSwitchNew {
          0% { transform: scale(0.94); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .track-tab-btn {
          position: relative;
          padding: 10px 18px;
          background: transparent;
          border: none;
          color: #8a9cbd;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .track-tab-btn:hover { transform: scale(1.03); }
        .track-tab-btn.active { color: #e0e5ec; }
        .track-tab-btn.active::after {
          content: '';
          position: absolute;
          left: 12px; right: 12px; bottom: 0;
          height: 2.5px;
          border-radius: 2px;
          background: linear-gradient(90deg, #4a7df5, #6a5af5, #4ecdc4);
          animation: tabUnderline 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          box-shadow: 0 0 8px rgba(106, 90, 245, 0.6);
        }
        .ctrl-btn {
          width: 40px; height: 40px;
          border-radius: 10px;
          border: none;
          background: rgba(20, 30, 60, 0.6);
          color: #e0e5ec;
          font-size: 16px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
        }
        .ctrl-btn:hover {
          transform: scale(1.08);
          background: rgba(40, 55, 95, 0.7);
        }
        .ctrl-btn.play-btn {
          background: linear-gradient(135deg, #4a7df5 0%, #6a5af5 100%);
          border: none;
          box-shadow: 0 4px 14px rgba(106, 90, 245, 0.4);
        }
        .ctrl-btn.play-btn:hover {
          box-shadow: 0 6px 20px rgba(106, 90, 245, 0.55);
        }
        input[type=range].bpm-slider {
          -webkit-appearance: none;
          width: 120px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          outline: none;
        }
        input[type=range].bpm-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          background: linear-gradient(135deg, #4a7df5, #6a5af5);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(106, 90, 245, 0.5);
        }
        .quantize-btn {
          padding: 5px 10px;
          background: rgba(10, 15, 28, 0.7);
          border: 1px solid rgba(255,255,255,0.1);
          color: #8a9cbd;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .quantize-btn.active {
          background: rgba(74, 125, 245, 0.25);
          border-color: rgba(74, 125, 245, 0.5);
          color: #7aaeff;
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '10px 20px',
              background: n.type === 'join'
                ? 'rgba(74, 205, 196, 0.85)'
                : n.type === 'leave'
                ? 'rgba(255, 107, 107, 0.85)'
                : 'rgba(74, 125, 245, 0.85)',
              borderRadius: 10,
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              animation: 'notifSlide 2s ease forwards',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              pointerEvents: 'auto',
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4a7df5 0%, #6a5af5 50%, #4ecdc4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 4px 14px rgba(106, 90, 245, 0.35)',
          }}>🎵</div>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #7aaeff, #b088ff, #4ecdc4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 0.5,
            }}>CollabScore</div>
            <div style={{ fontSize: 10, color: '#5a6a8a', marginTop: 1 }}>
              实时协作编曲 · {currentTrack?.name || '未选择轨道'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            background: 'rgba(12, 18, 32, 0.8)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 10, color: '#6a7a9a', marginRight: 4 }}>量化</span>
            {QUANTIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`quantize-btn ${quantize === opt.value ? 'active' : ''}`}
                onClick={() => !isPlaying && setQuantize(opt.value)}
                disabled={isPlaying}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {TRACK_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`track-tab-btn ${currentTrackId === tab.id ? 'active' : ''}`}
            onClick={() => handleTrackChange(tab.id)}
            disabled={isPlaying}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px',
        }}>
          <span style={{ fontSize: 11, color: '#6a7a9a' }}>BPM</span>
          <input
            type="range"
            className="bpm-slider"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBPM(Number(e.target.value))}
            disabled={isPlaying}
          />
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#7aaeff',
            minWidth: 36,
            textAlign: 'center',
            fontFamily: 'monospace',
          }}>{bpm}</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isTablet ? 'column' : 'row',
          gap: 14,
          padding: 14,
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              animation: trackSwitching
                ? prevTrackId !== currentTrackId
                  ? 'trackSwitchNew 0.3s ease forwards'
                  : 'trackSwitchOld 0.15s ease forwards'
                : 'none',
            }}
          >
            <ScoreEditor key={scoreEditorKey} />
            {remoteCursorsArr.map(([userId, cursor]) => {
              const user = users.find((u) => u.id === userId);
              if (!user || !cursor) return null;
              return (
                <div
                  key={`c-${userId}`}
                  style={{
                    position: 'absolute',
                    left: cursor.x,
                    top: 48 + cursor.y,
                    pointerEvents: 'none',
                    zIndex: 50,
                    transform: 'translate(-2px, -2px)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      d="M2,2 L15,7 L10,10 L7,15 Z"
                      fill={user.color}
                      stroke="white"
                      strokeWidth="1"
                      opacity={0.95}
                      style={{ filter: `drop-shadow(0 1px 4px ${user.color}88)` }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: 14,
                    left: 10,
                    padding: '2px 6px',
                    background: user.color,
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  }}>
                    {user.name}
                  </div>
                </div>
              );
            })}
          </div>

          <PianoRoll />
        </div>

        {!isTablet && (
          <CollaborationPanel onCreateRoom={() => createRoomAndJoin(currentUser?.name || '访客')} />
        )}
      </div>

      <div
        style={{
          padding: '10px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button className="ctrl-btn" onClick={handleStop} title="停止">
          ⏹
        </button>
        <button className="ctrl-btn play-btn" onClick={handlePlayPause} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div style={{
          fontSize: 11,
          color: '#6a7a9a',
          fontFamily: 'monospace',
          background: 'rgba(10, 15, 28, 0.6)',
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          拍: {playbackHead.toFixed(2)}
          {roomId && <span style={{ marginLeft: 10, color: '#4ecdc4' }}>● 协作同步中</span>}
        </div>
      </div>

      {isTablet && (
        <div style={{
          padding: '10px 20px 20px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <CollaborationPanel onCreateRoom={() => createRoomAndJoin(currentUser?.name || '访客')} />
        </div>
      )}
    </div>
  );
};

export default App;
