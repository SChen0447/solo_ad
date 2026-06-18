import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Track } from './TrackManager';
import { audioEngine } from './AudioEngine';
import { MAX_TRACKS } from './TrackManager';

interface EQKnobProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (value: number) => void;
}

const EQKnob: React.FC<EQKnobProps> = ({ value, min, max, step, label, onChange }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const range = max - min;
  const normalized = (value - min) / range;
  const angle = -135 + normalized * 270;

  const getGradientColor = () => {
    if (value > 0) return `conic-gradient(from 135deg, #ff5252 0%, #ff9800 ${normalized * 75}%, transparent ${normalized * 75}%)`;
    if (value < 0) return `conic-gradient(from 135deg, #2196f3 0%, #2196f3 ${normalized * 75}%, transparent ${normalized * 75}%)`;
    return 'transparent';
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.cursor = 'ns-resize';

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - ev.clientY;
      const sensitivity = range / 150;
      let newValue = startValue.current + delta * sensitivity;
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [value, min, max, step, range, onChange]);

  return (
    <div className="eq-knob-wrap" style={styles.knobWrap}>
      <div style={styles.knobLabel}>{label}</div>
      <div
        ref={knobRef}
        style={{
          ...styles.knobOuter,
          background: getGradientColor(),
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.knobInner}>
          <div
            style={{
              ...styles.knobIndicator,
              transform: `rotate(${angle}deg)`,
            }}
          />
        </div>
      </div>
      <div style={styles.knobValue}>{value.toFixed(1)}dB</div>
    </div>
  );
};

interface WaveformMiniProps {
  track: Track;
  color: string;
}

const WaveformMini: React.FC<WaveformMiniProps> = ({ track, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, w, h);

    if (!track.waveformData || track.waveformData.peaks.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '12px Poppins';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('加载音频...', w / 2, midY);
      return;
    }

    const { peaks, rms } = track.waveformData;
    const barWidth = w / peaks.length;

    ctx.fillStyle = color + '55';
    for (let i = 0; i < rms.length; i++) {
      const x = i * barWidth;
      const rmsH = rms[i] * (h * 0.85);
      ctx.fillRect(x, midY - rmsH / 2, Math.max(1, barWidth - 0.5), rmsH);
    }

    ctx.fillStyle = color;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const peakH = peaks[i] * (h * 0.9);
      ctx.fillRect(x, midY - peakH / 2, Math.max(1, barWidth - 0.5), peakH);
    }
  }, [track.waveformData, color]);

  return <canvas ref={canvasRef} style={styles.waveformCanvas} />;
};

interface TrackPanelProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onAddTrack: () => void;
  onLoadFile: (trackId: string, file: File) => void;
  onVolumeChange: (id: string, volume: number) => void;
  onMuteToggle: (id: string) => void;
  onSoloToggle: (id: string) => void;
  onEQChange: (id: string, band: 'low' | 'mid' | 'high', value: number) => void;
  onRename: (id: string, name: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const TrackPanel: React.FC<TrackPanelProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onAddTrack,
  onLoadFile,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onEQChange,
  onRename,
  isMobile = false,
  isOpen = true,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTrackIdRef = useRef<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleFileClick = (trackId: string) => {
    activeTrackIdRef.current = trackId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTrackIdRef.current) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    const validExts = ['.mp3', '.wav', '.ogg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      alert('仅支持 MP3、WAV、OGG 格式');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      e.target.value = '';
      return;
    }

    onLoadFile(activeTrackIdRef.current, file);
    e.target.value = '';
  };

  const handleDoubleClick = (track: Track) => {
    setEditingId(track.id);
    setEditName(track.name);
  };

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  const panelContent = (
    <>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>轨道列表</span>
        {isMobile && (
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        )}
      </div>

      <div style={styles.trackList}>
        {tracks.map(track => {
          const isSelected = track.id === selectedTrackId;
          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={{
                ...styles.trackItem,
                backgroundColor: isSelected ? '#e3f2fd' : '#fafafa',
                borderLeft: `4px solid ${track.color}`,
              }}
            >
              <div style={styles.trackHeaderRow}>
                {editingId === track.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => handleRenameSubmit(track.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(track.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={styles.nameInput}
                  />
                ) : (
                  <span
                    style={styles.trackName}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      handleDoubleClick(track);
                    }}
                  >
                    {track.name}
                  </span>
                )}

                <div style={styles.trackBtns}>
                  <button
                    onClick={e => { e.stopPropagation(); onMuteToggle(track.id); }}
                    style={{
                      ...styles.smallBtn,
                      backgroundColor: track.muted ? '#e53935' : '#555',
                    }}
                    title="静音"
                  >
                    M
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onSoloToggle(track.id); }}
                    style={{
                      ...styles.smallBtn,
                      backgroundColor: track.solo ? '#ff9800' : '#555',
                    }}
                    title="独奏"
                  >
                    S
                  </button>
                </div>
              </div>

              <div onClick={e => { e.stopPropagation(); handleFileClick(track.id); }} style={styles.waveformWrap}>
                <WaveformMini track={track} color={track.color} />
              </div>

              <div style={styles.controlsRow}>
                <div style={styles.volumeWrap}>
                  <span style={styles.volLabel}>音量</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onVolumeChange(track.id, Number(e.target.value))}
                    style={styles.volumeSlider}
                  />
                  <span style={styles.volValue}>{track.volume}%</span>
                </div>

                <div style={styles.eqWrap}>
                  <EQKnob
                    value={track.eq.low}
                    min={-12}
                    max={12}
                    step={0.5}
                    label="低频"
                    onChange={v => onEQChange(track.id, 'low', v)}
                  />
                  <EQKnob
                    value={track.eq.mid}
                    min={-12}
                    max={12}
                    step={0.5}
                    label="中频"
                    onChange={v => onEQChange(track.id, 'mid', v)}
                  />
                  <EQKnob
                    value={track.eq.high}
                    min={-12}
                    max={12}
                    step={0.5}
                    label="高频"
                    onChange={v => onEQChange(track.id, 'high', v)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddTrack}
        disabled={tracks.length >= MAX_TRACKS}
        style={{
          ...styles.addBtn,
          opacity: tracks.length >= MAX_TRACKS ? 0.5 : 1,
          cursor: tracks.length >= MAX_TRACKS ? 'not-allowed' : 'pointer',
        }}
      >
        + 添加音轨 ({tracks.length}/{MAX_TRACKS})
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div style={styles.mobileOverlay} onClick={onClose}>
            <div style={styles.mobilePanel} onClick={e => e.stopPropagation()}>
              {panelContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return <div style={styles.panel}>{panelContent}</div>;
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    height: '100%',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  panelHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    color: '#fff',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 14,
    fontWeight: 500,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: 18,
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background-color 0.2s ease-in-out',
  },
  trackList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
  },
  trackItem: {
    marginBottom: 8,
    borderRadius: 6,
    padding: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out',
    boxSizing: 'border-box',
  },
  trackHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackName: {
    color: '#222',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'text',
    userSelect: 'none',
  },
  nameInput: {
    fontFamily: 'Poppins, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    padding: '2px 6px',
    border: '1px solid #42a5f5',
    borderRadius: 4,
    outline: 'none',
    backgroundColor: '#fff',
    color: '#222',
    width: 120,
  },
  trackBtns: {
    display: 'flex',
    gap: 4,
  },
  smallBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: 'none',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease-in-out',
  },
  waveformWrap: {
    height: 36,
    borderRadius: 4,
    overflow: 'hidden',
    cursor: 'pointer',
    marginBottom: 6,
  },
  waveformCanvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  controlsRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  volumeWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  volLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Poppins, sans-serif',
  },
  volumeSlider: {
    width: '100%',
    height: 4,
    cursor: 'pointer',
  },
  volValue: {
    fontSize: 10,
    color: '#444',
    fontFamily: 'JetBrains Mono, monospace',
  },
  eqWrap: {
    display: 'flex',
    gap: 4,
  },
  knobWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  knobLabel: {
    fontSize: 9,
    color: '#666',
    fontFamily: 'Poppins, sans-serif',
  },
  knobOuter: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    padding: 2,
    boxSizing: 'border-box',
    transition: 'all 0.2s ease-in-out',
  },
  knobInner: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#424242',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobIndicator: {
    position: 'absolute',
    width: 2,
    height: 6,
    backgroundColor: '#bdbdbd',
    top: 2,
    borderRadius: 1,
    transformOrigin: 'bottom center',
  },
  knobValue: {
    fontSize: 9,
    color: '#444',
    fontFamily: 'JetBrains Mono, monospace',
    whiteSpace: 'nowrap',
  },
  addBtn: {
    margin: '8px',
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#00acc1',
    color: '#fff',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 48,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  },
  mobilePanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderBottom: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};

export default TrackPanel;
