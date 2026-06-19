import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LyricLine } from '../types';
import { formatTime } from '../utils/LyricParser';
import { getAnimationState, isLineActive, isLinePast, isLineFuture } from '../utils/AnimationEngine';

interface PreviewPlayerProps {
  lines: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onIsPlayingChange: (playing: boolean) => void;
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  audioDuration: number;
  onAudioDurationChange: (duration: number) => void;
  totalDuration: number;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  lines,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  onTimeUpdate,
  onIsPlayingChange,
  audioFile,
  onAudioFileChange,
  audioDuration,
  onAudioDurationChange,
  totalDuration
}) => {
  const [volume, setVolume] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actualDuration = audioDuration > 0 ? audioDuration : totalDuration;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      const diff = Math.abs(audioRef.current.currentTime - currentTime);
      if (diff > 0.1) {
        audioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          onIsPlayingChange(false);
        });
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, onIsPlayingChange]);

  const processAudioBuffer = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      onAudioDurationChange(audioBuffer.duration);
      drawWaveform(audioBuffer);
    } catch (e) {
      console.error('Failed to decode audio:', e);
    }
  }, [onAudioDurationChange]);

  const drawWaveform = useCallback((audioBuffer: AudioBuffer) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const data = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(data.length / width);
    
    ctx.fillStyle = '#181825';
    ctx.fillRect(0, 0, width, height);
    
    const centerY = height / 2;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#a78bfa');
    gradient.addColorStop(0.5, '#c4b5fd');
    gradient.addColorStop(1, '#a78bfa');
    
    ctx.fillStyle = gradient;
    
    for (let x = 0; x < width; x++) {
      let sum = 0;
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, data.length);
      
      for (let i = start; i < end; i++) {
        sum += Math.abs(data[i]);
      }
      
      const avg = sum / (end - start);
      const barHeight = Math.max(2, avg * height * 1.5);
      
      ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight);
    }
  }, []);

  useEffect(() => {
    if (audioFile) {
      processAudioBuffer(audioFile);
    }
  }, [audioFile, processAudioBuffer]);

  useEffect(() => {
    if (!isPlaying || audioRef.current) return;
    
    const tick = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      onTimeUpdate(Math.min(actualDuration, currentTime + delta));
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [isPlaying, currentTime, actualDuration, onTimeUpdate, audioFile]);

  useEffect(() => {
    if (!isPlaying && audioBufferRef.current && waveformCanvasRef.current) {
      drawWaveform(audioBufferRef.current);
    }
  }, [isPlaying, drawWaveform]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('音频文件不能超过10MB');
        return;
      }
      onAudioFileChange(file);
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateProgress(e);
  };

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(percent * actualDuration);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, actualDuration, onSeek]);

  const updateProgress = (e: React.MouseEvent) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(percent * actualDuration);
    }
  };

  const activeLine = lines.find(l => isLineActive(l, currentTime));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#181825'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1e1e2e'
      }}>
        <div style={{ color: '#cdd6f4', fontSize: 13, fontWeight: 600 }}>
          🎬 预览播放器
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {audioFile && (
            <span style={{
              color: '#a78bfa',
              fontSize: 11,
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              padding: '4px 10px',
              borderRadius: 4
            }}>
              🎵 {audioFile.name.length > 20 ? audioFile.name.slice(0, 20) + '...' : audioFile.name}
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '6px 14px',
              backgroundColor: '#313244',
              color: '#cdd6f4',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#45475a';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#313244';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {audioFile ? '更换音频' : '上传音频 (MP3, ≤10MB)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div style={{
        padding: 16,
        borderBottom: '1px solid #313244'
      }}>
        <div
          ref={progressRef}
          onMouseDown={handleProgressMouseDown}
          onClick={(e) => !isDragging && updateProgress(e)}
          style={{
            position: 'relative',
            height: 64,
            backgroundColor: '#1e1e2e',
            borderRadius: 8,
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          <canvas
            ref={waveformCanvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%'
            }}
          />
          {!audioFile && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6c7086',
              fontSize: 12
            }}>
              {lines.length > 0 ? '上传音频以显示波形图' : '请先导入歌词'}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0}%`,
              backgroundColor: 'rgba(167, 139, 250, 0.25)',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0}%`,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: '#a78bfa',
              boxShadow: '0 0 10px rgba(167, 139, 250, 0.8)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none'
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#6c7086'
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(actualDuration)}</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }}>
        {lines.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6c7086',
            gap: 12
          }}>
            <div style={{ fontSize: 48 }}>✨</div>
            <div style={{ fontSize: 14 }}>歌词将在此处显示</div>
            <div style={{ fontSize: 12 }}>导入歌词后可预览播放效果</div>
          </div>
        ) : (
          lines.map(line => {
            const isActive = isLineActive(line, currentTime);
            const isPast = isLinePast(line, currentTime);
            const isFuture = isLineFuture(line, currentTime);
            const animState = getAnimationState(line, currentTime);
            
            const opacity = isActive 
              ? animState.opacity 
              : isPast 
                ? 0.25 
                : 0.4;
            
            const bgColor = isActive 
              ? line.color + '30' 
              : 'transparent';
            
            return (
              <div
                key={line.id}
                onClick={() => onSeek(line.startTime)}
                style={{
                  maxWidth: '100%',
                  padding: '10px 24px',
                  borderRadius: 12,
                  backgroundColor: bgColor,
                  cursor: 'pointer',
                  transition: isActive ? 'none' : 'all 0.3s ease',
                  animation: isActive ? 'breathing 2s ease-in-out infinite' : 'none',
                  transform: `scale(${isActive ? animState.scale : 1}) translateX(${isActive ? animState.translateX : 0}px)`,
                  opacity
                }}
              >
                <div style={{
                  fontSize: isActive ? 22 : 16,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#ffffff' : '#cdd6f4',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  lineHeight: 1.6,
                  textShadow: isActive ? `0 0 20px ${line.color}66` : 'none'
                }}>
                  {line.text}
                </div>
                <div style={{
                  fontSize: 10,
                  color: line.color,
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  marginTop: 4,
                  opacity: isActive ? 1 : 0.6
                }}>
                  {formatTime(line.startTime)} - {formatTime(line.endTime)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(30, 30, 46, 0.85)',
        borderTop: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button
          onClick={onPlayPause}
          disabled={lines.length === 0 && !audioFile}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: lines.length === 0 && !audioFile ? '#45475a' : '#a78bfa',
            color: '#1e1e2e',
            cursor: lines.length === 0 && !audioFile ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            padding: 0
          }}
          onMouseEnter={(e) => {
            if (!(lines.length === 0 && !audioFile)) {
              e.currentTarget.style.backgroundColor = '#8b5cf6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!(lines.length === 0 && !audioFile)) {
              e.currentTarget.style.backgroundColor = '#a78bfa';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentTime - 5))}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#313244',
            color: '#cdd6f4',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#45475a';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#313244';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⏮
        </button>

        <button
          onClick={() => onSeek(Math.min(actualDuration, currentTime + 5))}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#313244',
            color: '#cdd6f4',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#45475a';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#313244';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⏭
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto'
        }}>
          <span style={{ color: '#6c7086', fontSize: 14 }}>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              width: 80,
              accentColor: '#a78bfa'
            }}
          />
          <span style={{
            color: '#a78bfa',
            fontSize: 11,
            fontFamily: 'monospace',
            minWidth: 32,
            textAlign: 'right'
          }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {audioFile && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioFile)}
          onTimeUpdate={(e) => {
            if (!isDragging) {
              onTimeUpdate(e.currentTarget.currentTime);
            }
          }}
          onPlay={() => onIsPlayingChange(true)}
          onPause={() => onIsPlayingChange(false)}
          onEnded={() => {
            onIsPlayingChange(false);
            onSeek(0);
          }}
          onLoadedMetadata={(e) => {
            onAudioDurationChange(e.currentTarget.duration);
          }}
          style={{ display: 'none' }}
        />
      )}

      <style>{`
        @keyframes breathing {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(167, 139, 250, 0);
          }
          50% { 
            box-shadow: 0 0 30px 8px rgba(167, 139, 250, 0.2);
          }
        }
      `}</style>
    </div>
  );
};
