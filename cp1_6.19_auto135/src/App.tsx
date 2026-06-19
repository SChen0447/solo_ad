import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { LyricLine } from './types';
import { parseLyrics } from './utils/LyricParser';
import { TimeLineEditor } from './components/TimeLineEditor';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Exporter } from './components/Exporter';

const App: React.FC = () => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [totalDuration, setTotalDuration] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rawLyrics, setRawLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(55);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleParse = useCallback(() => {
    const result = parseLyrics(rawLyrics);
    setLines(result.lines);
    setTotalDuration(result.totalDuration);
    setCurrentTime(0);
  }, [rawLyrics]);

  const handlePlayPause = useCallback(() => {
    if (lines.length === 0 && !audioFile) return;
    setIsPlaying(p => !p);
  }, [lines.length, audioFile]);

  const handleSeek = useCallback((time: number) => {
    const maxTime = audioDuration > 0 ? audioDuration : totalDuration;
    setCurrentTime(Math.max(0, Math.min(maxTime, time)));
  }, [audioDuration, totalDuration]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width * 100;
      setLeftPanelWidth(Math.max(30, Math.min(70, percent)));
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1e1e2e',
      color: '#cdd6f4',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <nav style={{
        height: 56,
        backgroundColor: '#181825',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        gap: 12
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}>
            🎵
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff'
          }}>
            LyricForge
          </div>
          <div style={{
            fontSize: 11,
            color: '#6c7086',
            padding: '2px 8px',
            backgroundColor: '#313244',
            borderRadius: 4,
            marginLeft: 4
          }}>
            v1.0
          </div>
        </div>

        {isMobile ? (
          <>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Exporter lines={lines} />
              <button
                onClick={() => setShowMobileMenu(m => !m)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#313244',
                  border: 'none',
                  color: '#cdd6f4',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showMobileMenu ? '✕' : '☰'}
              </button>
            </div>
            {showMobileMenu && (
              <div style={{
                position: 'fixed',
                top: 56,
                left: 0,
                right: 0,
                backgroundColor: '#181825',
                borderBottom: '1px solid #313244',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 99
              }}>
                <div style={{
                  padding: '8px 12px',
                  color: '#6c7086',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  歌词行数: {lines.length}
                </div>
                <div style={{
                  padding: '8px 12px',
                  color: '#6c7086',
                  fontSize: 12
                }}>
                  总时长: {Math.floor(totalDuration / 60)}分{Math.floor(totalDuration % 60).toString().padStart(2, '0')}秒
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{
            marginLeft: 24,
            color: '#6c7086',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <span>🎶 {lines.length} 行歌词</span>
            <span>⏱ {Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}</span>
            {isPlaying && (
              <span style={{ color: '#34d399' }}>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  backgroundColor: '#34d399',
                  borderRadius: '50%',
                  marginRight: 6,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                播放中
              </span>
            )}
          </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Exporter lines={lines} />
            </div>
          </>
        )}
      </nav>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          marginTop: 56,
          display: isMobile ? 'flex' : 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          position: 'relative',
          userSelect: isResizing ? 'none' : 'auto'
        }}
      >
        {isMobile ? (
          <>
            <div style={{
              height: '50%',
              minHeight: 300,
              borderBottom: '1px solid #313244',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <TimeLineEditor
                lines={lines}
                onLinesChange={setLines}
                currentTime={currentTime}
                onSeek={handleSeek}
                totalDuration={totalDuration}
                rawLyrics={rawLyrics}
                onRawLyricsChange={setRawLyrics}
                onParse={handleParse}
              />
            </div>
            <div style={{
              height: '50%',
              minHeight: 300,
              overflow: 'hidden'
            }}>
              <PreviewPlayer
                lines={lines}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onTimeUpdate={handleTimeUpdate}
                onIsPlayingChange={setIsPlaying}
                audioFile={audioFile}
                onAudioFileChange={setAudioFile}
                audioDuration={audioDuration}
                onAudioDurationChange={setAudioDuration}
                totalDuration={totalDuration}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: `${leftPanelWidth}%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              minWidth: 300
            }}>
              <TimeLineEditor
                lines={lines}
                onLinesChange={setLines}
                currentTime={currentTime}
                onSeek={handleSeek}
                totalDuration={totalDuration}
                rawLyrics={rawLyrics}
                onRawLyricsChange={setRawLyrics}
                onParse={handleParse}
              />
            </div>

            <div
              onMouseDown={handleMouseDownResize}
              style={{
                width: 6,
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s ease',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#a78bfa';
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 3,
                height: 40,
                borderRadius: 2,
                backgroundColor: isResizing ? '#a78bfa' : '#45475a',
                transition: 'background-color 0.2s ease'
              }} />
            </div>

            <div style={{
              flex: 1,
              height: '100%',
              overflow: 'hidden',
              minWidth: 300
            }}>
              <PreviewPlayer
                lines={lines}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onTimeUpdate={handleTimeUpdate}
                onIsPlayingChange={setIsPlaying}
                audioFile={audioFile}
                onAudioFileChange={setAudioFile}
                audioDuration={audioDuration}
                onAudioDurationChange={setAudioDuration}
                totalDuration={totalDuration}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #181825;
        }

        ::-webkit-scrollbar-thumb {
          background: #45475a;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #585b70;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
