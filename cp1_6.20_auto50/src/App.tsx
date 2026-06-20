import { useRef, useEffect, useState, useCallback } from 'react';
import { audioEngine, AudioEngineState } from './audioEngine';
import { WaveformRenderer } from './WaveformRenderer';
import { SpectrumRenderer } from './SpectrumRenderer';
import { ControlsManager, ControlState } from './controls';

const styles = {
  page: (isDark: boolean): React.CSSProperties => ({
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? '#0a0a1a' : '#f5f5f5',
    transition: 'background 0.3s ease',
    fontFamily: '"Fira Code", monospace',
    overflow: 'hidden',
  }),
  container: (isDark: boolean): React.CSSProperties => ({
    width: '1200px',
    height: '700px',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    background: isDark ? '#0a0a1a' : '#f5f5f5',
    boxShadow: isDark
      ? '0 8px 32px rgba(0,0,0,0.5)'
      : '0 8px 32px rgba(0,0,0,0.15)',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
  }),
  mainArea: {
    flex: 1,
    display: 'flex',
    position: 'relative' as const,
    overflow: 'hidden',
    minHeight: 0,
  },
  waveformSection: {
    width: '60%',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  divider: (isDark: boolean): React.CSSProperties => ({
    width: '1px',
    background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    transition: 'background 0.3s ease',
  }),
  spectrumSection: {
    width: '40%',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  fileInfo: (isDark: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '12px',
    left: '12px',
    fontSize: '14px',
    fontFamily: '"Fira Code", monospace',
    color: '#80cbc4',
    zIndex: 10,
    background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
    padding: '8px 12px',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    lineHeight: 1.6,
    pointerEvents: 'none',
    transition: 'background 0.3s ease',
  }),
  themeToggle: (isDark: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 10,
    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
    borderRadius: '8px',
    color: isDark ? '#fff' : '#333',
    padding: '6px 14px',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    fontSize: '13px',
    fontFamily: '"Fira Code", monospace',
    transition: 'all 0.3s ease',
  }),
  controlBar: (isDark: boolean): React.CSSProperties => ({
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '0 20px',
    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(10px)',
    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
    transition: 'background 0.3s ease, border-top 0.3s ease',
  }),
  playBtn: (isPlaying: boolean): React.CSSProperties => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: isPlaying ? '#00e676' : '#ff5252',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s ease, background 0.2s ease',
  }),
  timeDisplay: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
    fontSize: '13px',
    fontFamily: '"Fira Code", monospace',
    minWidth: '100px',
    textAlign: 'center',
    transition: 'color 0.3s ease',
  }),
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative' as const,
  },
  volumeSlider: {
    width: '150px',
    height: '4px',
    WebkitAppearance: 'none' as never,
    appearance: 'none' as never,
    background: '#333',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
  volumeLabel: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    fontSize: '11px',
    fontFamily: '"Fira Code", monospace',
    minWidth: '36px',
    transition: 'color 0.3s ease',
  }),
  viewLockBtn: (isDark: boolean, locked: boolean): React.CSSProperties => ({
    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
    borderRadius: '8px',
    color: locked ? '#7c4dff' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'),
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: '"Fira Code", monospace',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
  }),
  dropZone: (isDark: boolean, isDragging: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    background: isDark
      ? (isDragging ? 'rgba(10,10,26,0.95)' : 'rgba(10,10,26,0.85)')
      : (isDragging ? 'rgba(245,245,245,0.95)' : 'rgba(245,245,245,0.85)'),
    transition: 'background 0.3s ease',
    cursor: 'pointer',
  }),
  dropIcon: (isDark: boolean): React.CSSProperties => ({
    fontSize: '48px',
    marginBottom: '16px',
    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
  }),
  dropText: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    fontSize: '14px',
    fontFamily: '"Fira Code", monospace',
  }),
  toast: (isDark: boolean, visible: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '12px',
    right: '120px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
    fontSize: '13px',
    fontFamily: '"Fira Code", monospace',
    zIndex: 30,
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  }),
};

function App() {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRendererRef = useRef<WaveformRenderer | null>(null);
  const spectrumRendererRef = useRef<SpectrumRenderer | null>(null);
  const controlsRef = useRef(new ControlsManager());
  const rafRef = useRef<number>(0);
  const isAudioLoadedRef = useRef(false);

  const [isDark, setIsDark] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [viewLocked, setViewLocked] = useState(true);
  const [fileName, setFileName] = useState('');
  const [sampleRate, setSampleRate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDrop, setShowDrop] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const formatTime = useCallback((s: number) => {
    const sec = Math.max(0, s);
    const min = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${min}:${ss}`;
  }, []);

  useEffect(() => {
    if (waveformCanvasRef.current && !waveformRendererRef.current) {
      waveformRendererRef.current = new WaveformRenderer(waveformCanvasRef.current);
    }
    if (spectrumCanvasRef.current && !spectrumRendererRef.current) {
      spectrumRendererRef.current = new SpectrumRenderer(spectrumCanvasRef.current);
    }
  }, []);

  useEffect(() => {
    const onEngineState = (state: AudioEngineState) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setVolume(state.volume);
      setFileName(state.fileName);
      setSampleRate(state.sampleRate);
      if (state.fileName) {
        setShowDrop(false);
        isAudioLoadedRef.current = true;
      }
    };
    audioEngine.onStateChange(onEngineState);
    return () => {
      audioEngine.onStateChange(() => {});
    };
  }, []);

  useEffect(() => {
    const onControlState = (state: ControlState) => {
      setToastMessage(state.toastMessage);
      setToastVisible(state.toastVisible);
    };
    controlsRef.current.onStateChange(onControlState);
    return () => {
      controlsRef.current.onStateChange(() => {});
    };
  }, []);

  useEffect(() => {
    const render = () => {
      if (waveformRendererRef.current) {
        const pcmData = audioEngine['pcmData'] as Float32Array | null;
        const ct = audioEngine.currentTime;
        const dur = audioEngine.duration;
        const sr = audioEngine.sampleRate;
        waveformRendererRef.current.setTheme(isDark);
        waveformRendererRef.current.render(pcmData, ct, dur, sr);
      }
      if (spectrumRendererRef.current) {
        const freqData = audioEngine.getFrequencyData();
        const sr = audioEngine.sampleRate;
        spectrumRendererRef.current.setTheme(isDark);
        spectrumRendererRef.current.render(freqData, sr);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isDark]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const result = controlsRef.current.handleKeyboard(e);
      if (!result) return;
      if (result.action === 'togglePlay') {
        audioEngine.togglePlay();
      } else if (result.action === 'seek' && result.value !== undefined) {
        audioEngine.seekRelative(result.value);
      } else if (result.action === 'volume' && result.value !== undefined) {
        audioEngine.setVolume(audioEngine.volume + result.value);
        setVolume(audioEngine.volume);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      await audioEngine.loadFile(file);
      if (spectrumRendererRef.current) {
        spectrumRendererRef.current.setSampleRate(audioEngine.sampleRate, 512);
      }
      audioEngine.play();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load audio file');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const togglePlay = useCallback(() => {
    audioEngine.togglePlay();
  }, []);

  const toggleViewLock = useCallback(() => {
    setViewLocked(v => !v);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(d => !d);
  }, []);

  const onVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    audioEngine.setVolume(v);
    setVolume(v);
  }, []);

  const playBtnOnMouseDown = useCallback((e: React.MouseEvent) => {
    (e.target as HTMLElement).style.transform = 'scale(0.95)';
  }, []);
  const playBtnOnMouseUp = useCallback((e: React.MouseEvent) => {
    (e.target as HTMLElement).style.transform = 'scale(1)';
  }, []);

  const sr = sampleRate > 0 ? `${(sampleRate / 1000).toFixed(1)} kHz` : '';

  return (
    <div style={styles.page(isDark)}>
      <div style={styles.container(isDark)}>
        <div style={styles.mainArea}>
          {showDrop && (
            <div
              style={styles.dropZone(isDark, isDragging)}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={onDropZoneClick}
            >
              <div style={styles.dropIcon(isDark)}>🎵</div>
              <div style={styles.dropText(isDark)}>
                {isDragging ? 'Drop audio file here' : 'Click or drag a WAV/MP3 file here (max 50MB)'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3"
                style={{ display: 'none' }}
                onChange={onFileInput}
              />
            </div>
          )}

          {fileName && (
            <div style={styles.fileInfo(isDark)}>
              <div>{fileName}</div>
              <div>{formatTime(duration)} | {sr}</div>
            </div>
          )}

          <button
            style={styles.themeToggle(isDark)}
            onClick={toggleTheme}
          >
            {isDark ? '☀ Light' : '🌙 Dark'}
          </button>

          <div style={styles.toast(isDark, toastVisible)}>{toastMessage}</div>

          <div className="waveform-section" style={styles.waveformSection}>
            <canvas
              ref={waveformCanvasRef}
              style={styles.canvas}
            />
          </div>
          <div style={styles.divider(isDark)} />
          <div className="spectrum-section" style={styles.spectrumSection}>
            <canvas
              ref={spectrumCanvasRef}
              style={styles.canvas}
            />
          </div>
        </div>

        <div style={styles.controlBar(isDark)}>
          <button
            style={styles.playBtn(isPlaying)}
            onClick={togglePlay}
            onMouseDown={playBtnOnMouseDown}
            onMouseUp={playBtnOnMouseUp}
            onMouseLeave={playBtnOnMouseUp}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={styles.timeDisplay(isDark)}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div style={styles.volumeContainer}>
            <span style={styles.volumeLabel(isDark)}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={onVolumeChange}
              style={styles.volumeSlider}
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
            <span style={styles.volumeLabel(isDark)}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          <button
            style={styles.viewLockBtn(isDark, viewLocked)}
            onClick={toggleViewLock}
          >
            {viewLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .waveform-section {
            width: 100% !important;
            height: 50% !important;
          }
          .spectrum-section {
            width: 100% !important;
            height: 50% !important;
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7c4dff;
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7c4dff;
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          background: #333;
          border-radius: 2px;
          height: 4px;
        }
        input[type="range"]::-moz-range-track {
          background: #333;
          border-radius: 2px;
          height: 4px;
        }
        button:hover {
          filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
}

export default App;
