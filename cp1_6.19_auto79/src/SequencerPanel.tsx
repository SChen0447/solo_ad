import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useProjectStore } from './store';
import AudioEngine from './AudioEngine';
import { AudioClip, Track, INSTRUMENT_COLORS, USER_COLORS, CollaboratorInfo, THEME } from './types';

const BEAT_SUBDIVISION = 4;
const TOTAL_BEATS = 64;
const TRACK_HEIGHT = 80;
const HEADER_WIDTH = 160;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SequencerPanel: React.FC = () => {
  const {
    project,
    zoom,
    selectedClipId,
    currentUserId,
    activeUsers,
    addTrack,
    deleteTrack,
    renameTrack,
    addClip,
    moveClip,
    deleteClip,
    updateClip,
    setSelectedClip,
    setZoom,
  } = useProjectStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ clipId: string; trackId: string; offsetX: number; origStart: number } | null>(null);
  const [snapX, setSnapX] = useState<number | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; name: string; color: string; timestamp: number }>>(new Map());
  const [selectedClipDetails, setSelectedClipDetails] = useState<AudioClip | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTrackId, setUploadTrackId] = useState<string | null>(null);

  const pxPerBeat = zoom;
  const pxPerSubBeat = pxPerBeat / BEAT_SUBDIVISION;
  const totalWidth = TOTAL_BEATS * pxPerBeat;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useProjectStore.getState().undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (selectedClipId && project) {
      for (const t of project.tracks) {
        const clip = t.clips.find((c) => c.id === selectedClipId);
        if (clip) {
          setSelectedClipDetails(clip);
          return;
        }
      }
    }
    setSelectedClipDetails(null);
  }, [selectedClipId, project]);

  const snapToGrid = useCallback((x: number): number => {
    const subBeat = Math.round(x / pxPerSubBeat);
    return subBeat * pxPerSubBeat;
  }, [pxPerSubBeat]);

  const handleMouseDown = useCallback((e: React.MouseEvent, clip: AudioClip, trackId: string) => {
    e.stopPropagation();
    setSelectedClip(clip.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    setDragging({ clipId: clip.id, trackId, offsetX, origStart: clip.startTime });
  }, [setSelectedClip, pxPerBeat]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft - HEADER_WIDTH - dragging.offsetX;
    const snapped = snapToGrid(Math.max(0, x));
    setSnapX(snapped);
  }, [dragging, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    if (dragging && snapX !== null && project) {
      const newStartBeat = snapX / pxPerBeat;
      moveClip(dragging.clipId, dragging.trackId, newStartBeat);
    }
    setDragging(null);
    setSnapX(null);
  }, [dragging, snapX, pxPerBeat, moveClip, project]);

  const handleFileUpload = useCallback(async (trackId: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit');
      return;
    }
    if (!file.name.match(/\.(wav|mp3)$/i)) {
      alert('Only WAV and MP3 files are supported');
      return;
    }
    const engine = AudioEngine.getInstance();
    const buffer = await engine.loadAudioFile(file);
    const duration = buffer.duration;
    addClip(trackId, {
      name: file.name.replace(/\.[^.]+$/, ''),
      startTime: 0,
      duration,
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
      speed: 1,
      buffer,
      color: INSTRUMENT_COLORS[project?.tracks.find((t) => t.id === trackId)?.instrument || 'piano'] || '#6c5ce7',
    });
  }, [addClip, project]);

  const handleZoomChange = useCallback((delta: number) => {
    const newZoom = Math.max(40, Math.min(160, zoom + delta));
    setZoom(newZoom);
  }, [zoom, setZoom]);

  const getUserColor = useCallback((userId: string): string => {
    const users = useProjectStore.getState().activeUsers;
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === 0) return USER_COLORS.owner;
    if (idx === 1) return USER_COLORS.collaboratorA;
    return USER_COLORS.collaboratorB;
  }, []);

  if (!project) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No project loaded</div>;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: THEME.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${THEME.border}`, background: THEME.componentBg, gap: 8 }}>
        <button className="btn" onClick={() => addTrack()} style={btnStyle}>+ Add Track</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn" onClick={() => handleZoomChange(-20)} style={btnSmall}>−</button>
          <span style={{ color: '#aaa', fontSize: 12 }}>{zoom}px/beat</span>
          <button className="btn" onClick={() => handleZoomChange(20)} style={btnSmall}>+</button>
        </div>
        <button className="btn" onClick={() => {
          const engine = AudioEngine.getInstance();
          engine.playTracks(project.tracks, useProjectStore.getState().mixerState);
        }} style={btnStyle}>▶ Play</button>
        <button className="btn" onClick={() => AudioEngine.getInstance().stopAll()} style={btnStyle}>■ Stop</button>
      </div>

      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: 'auto', position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ position: 'relative', width: totalWidth + HEADER_WIDTH, minHeight: '100%' }}>
          <div style={{ position: 'sticky', left: 0, zIndex: 10, width: HEADER_WIDTH, background: THEME.componentBg, borderBottom: `1px solid ${THEME.border}` }}>
            <div style={{ height: 30, display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#888', fontSize: 11 }}>Tracks</div>
          </div>

          <div style={{ position: 'absolute', left: HEADER_WIDTH, top: 0, height: 30, width: totalWidth, borderBottom: `1px solid ${THEME.border}` }}>
            {Array.from({ length: TOTAL_BEATS * BEAT_SUBDIVISION }, (_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: i * pxPerSubBeat,
                top: 0,
                width: 1,
                height: 30,
                background: i % BEAT_SUBDIVISION === 0 ? '#555' : '#333',
              }}>
                {i % BEAT_SUBDIVISION === 0 && (
                  <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 10, color: '#999' }}>
                    {i / BEAT_SUBDIVISION + 1}
                  </span>
                )}
              </div>
            ))}
          </div>

          {project.tracks.map((track, trackIdx) => (
            <div key={track.id} style={{ position: 'relative', height: TRACK_HEIGHT, borderBottom: `1px solid ${THEME.border}` }}>
              <div style={{
                position: 'sticky',
                left: 0,
                zIndex: 5,
                width: HEADER_WIDTH,
                height: '100%',
                background: THEME.componentBg,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                gap: 4,
                borderRight: `2px solid ${track.color}`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: track.color,
                  flexShrink: 0,
                }} />
                {editingTrackId === track.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) renameTrack(track.id, editingName.trim());
                      setEditingTrackId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingName.trim()) renameTrack(track.id, editingName.trim());
                        setEditingTrackId(null);
                      }
                    }}
                    style={{ background: '#0d1b2a', border: `1px solid ${THEME.highlight}`, color: '#fff', fontSize: 12, padding: '2px 4px', borderRadius: 3, width: 80 }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => { setEditingTrackId(track.id); setEditingName(track.name); }}
                    style={{ fontSize: 12, color: '#ccc', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                  >
                    {track.name}
                  </span>
                )}
                <button
                  className="btn"
                  onClick={() => { setUploadTrackId(track.id); fileInputRef.current?.click(); }}
                  style={{ ...btnIcon, color: '#7ec8e3' }}
                  title="Import audio"
                >
                  ↗
                </button>
                <button
                  className="btn"
                  onClick={() => { if (confirm('Delete this track?')) deleteTrack(track.id); }}
                  style={{ ...btnIcon, color: THEME.highlight }}
                  title="Delete track"
                >
                  ×
                </button>
              </div>

              <div style={{ position: 'absolute', left: HEADER_WIDTH, top: 0, height: '100%', width: totalWidth }}>
                {Array.from({ length: TOTAL_BEATS * BEAT_SUBDIVISION }, (_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: i * pxPerSubBeat,
                    top: 0,
                    width: 1,
                    height: '100%',
                    background: i % BEAT_SUBDIVISION === 0 ? `rgba(15,52,96,0.5)` : `rgba(15,52,96,0.2)`,
                  }} />
                ))}

                {track.clips.map((clip) => {
                  const isSelected = clip.id === selectedClipId;
                  const isDragged = dragging?.clipId === clip.id;
                  const clipLeft = isDragged && snapX !== null ? snapX : clip.startTime * pxPerBeat;
                  const clipWidth = (clip.duration / clip.speed) * pxPerBeat;
                  const borderColor = clip.editedBy ? getUserColor(clip.editedBy) : 'transparent';

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleMouseDown(e, clip, track.id)}
                      onClick={(e) => { e.stopPropagation(); setSelectedClip(clip.id); }}
                      style={{
                        position: 'absolute',
                        left: clipLeft,
                        top: 4,
                        width: Math.max(clipWidth, 20),
                        height: TRACK_HEIGHT - 8,
                        background: `${clip.color}88`,
                        border: isSelected ? `2px solid ${THEME.highlight}` : `1px solid ${clip.color}`,
                        borderRadius: 4,
                        cursor: 'grab',
                        transition: isDragged ? 'none' : 'left 0.2s ease-out, width 0.2s ease-out',
                        boxShadow: isSelected ? `0 0 8px ${THEME.highlight}44` : 'none',
                        overflow: 'hidden',
                        userSelect: 'none',
                      }}
                    >
                      {borderColor !== 'transparent' && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                          background: borderColor, opacity: 0.8,
                        }} />
                      )}
                      <div style={{ padding: '2px 6px', fontSize: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {clip.name}
                      </div>
                      {clip.fadeIn > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, bottom: 0, top: 0,
                          width: clip.fadeIn / clip.duration * clipWidth,
                          background: `linear-gradient(to right, transparent, ${clip.color}44)`,
                        }} />
                      )}
                      {clip.fadeOut > 0 && (
                        <div style={{
                          position: 'absolute', right: 0, bottom: 0, top: 0,
                          width: clip.fadeOut / clip.duration * clipWidth,
                          background: `linear-gradient(to left, transparent, ${clip.color}44)`,
                        }} />
                      )}
                      <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 9, color: '#ffffff99' }}>
                        {clip.speed !== 1 ? `${clip.speed}x` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {snapX !== null && (
            <div style={{
              position: 'absolute',
              left: HEADER_WIDTH + snapX,
              top: 0,
              width: 2,
              height: '100%',
              background: THEME.snapLine,
              opacity: 0.6,
              zIndex: 3,
              pointerEvents: 'none',
            }} />
          )}

          {Array.from(remoteCursors.entries()).map(([id, cursor]) => {
            if (Date.now() - cursor.timestamp > 1500) return null;
            return (
              <div key={id} style={{
                position: 'absolute',
                left: HEADER_WIDTH + cursor.x,
                top: cursor.y,
                zIndex: 20,
                pointerEvents: 'none',
                transition: 'opacity 0.3s',
              }}>
                <div style={{ background: cursor.color, color: '#fff', fontSize: 10, padding: '1px 4px', borderRadius: 3 }}>
                  {cursor.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTrackId) handleFileUpload(uploadTrackId, file);
          e.target.value = '';
        }}
      />

      {selectedClipDetails && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: HEADER_WIDTH,
          right: 0,
          background: THEME.componentBg,
          borderTop: `1px solid ${THEME.border}`,
          padding: '8px 12px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          zIndex: 20,
        }}>
          <span style={{ color: '#aaa', fontSize: 12 }}>{selectedClipDetails.name}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', fontSize: 11 }}>
            Vol
            <input
              type="range" min={0} max={100} step={1}
              value={selectedClipDetails.volume}
              onChange={(e) => {
                const vol = Number(e.target.value);
                const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipDetails.id));
                if (track) updateClip(selectedClipDetails.id, track.id, { volume: vol });
              }}
              style={{ width: 80 }}
            />
            {selectedClipDetails.volume}%
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', fontSize: 11 }}>
            FadeIn
            <input
              type="range" min={0} max={5} step={0.5}
              value={selectedClipDetails.fadeIn}
              onChange={(e) => {
                const val = Number(e.target.value);
                const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipDetails.id));
                if (track) updateClip(selectedClipDetails.id, track.id, { fadeIn: val });
              }}
              style={{ width: 60 }}
            />
            {selectedClipDetails.fadeIn}s
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', fontSize: 11 }}>
            FadeOut
            <input
              type="range" min={0} max={5} step={0.5}
              value={selectedClipDetails.fadeOut}
              onChange={(e) => {
                const val = Number(e.target.value);
                const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipDetails.id));
                if (track) updateClip(selectedClipDetails.id, track.id, { fadeOut: val });
              }}
              style={{ width: 60 }}
            />
            {selectedClipDetails.fadeOut}s
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', fontSize: 11 }}>
            Speed
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={selectedClipDetails.speed}
              onChange={(e) => {
                const val = Number(e.target.value);
                const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipDetails.id));
                if (track) updateClip(selectedClipDetails.id, track.id, { speed: val });
              }}
              style={{ width: 60 }}
            />
            {selectedClipDetails.speed}x
          </label>
          <button className="btn" onClick={() => {
            const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipDetails.id));
            if (track) deleteClip(selectedClipDetails.id, track.id);
            setSelectedClip(null);
          }} style={{ ...btnSmall, color: THEME.highlight }}>Delete</button>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: THEME.border,
  color: '#ddd',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all 0.1s',
};

const btnSmall: React.CSSProperties = {
  ...btnStyle,
  padding: '4px 8px',
  fontSize: 11,
};

const btnIcon: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
  transition: 'transform 0.1s',
};

export default SequencerPanel;
