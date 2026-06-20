import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Track, Effect, EffectType } from '../types';

interface TrackListProps {
  tracks: Track[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onAddEffect: (trackId: string, type: EffectType) => void;
  onRemoveEffect: (trackId: string, effectId: string) => void;
  onEffectParamChange: (trackId: string, effectId: string, params: Partial<Effect['params']>) => void;
  onRemoveTrack: (trackId: string) => void;
  zoom: number;
  currentTime: number;
}

interface DraggedState {
  index: number;
  trackId: string;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onReorder,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onAddEffect,
  onRemoveEffect,
  onEffectParamChange,
  onRemoveTrack,
  zoom,
  currentTime
}) => {
  const [dragged, setDragged] = useState<DraggedState | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedEffect, setExpandedEffect] = useState<{ trackId: string; effectId: string } | null>(null);
  const [showEffectMenu, setShowEffectMenu] = useState<string | null>(null);

  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const animationRefs = useRef<Map<string, number>>(new Map());

  const drawWaveform = useCallback((canvas: HTMLCanvasElement, track: Track) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6c63ff');
    gradient.addColorStop(1, '#00d2ff');

    ctx.clearRect(0, 0, width, height);

    const barCount = track.waveformData.length;
    const barWidth = (width * zoom) / barCount;
    const centerY = height / 2;

    const playheadX = (currentTime / (track.audioBuffer?.duration || 1)) * width * zoom;

    track.waveformData.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * height * 0.8;
      const isPlayed = x < playheadX;

      ctx.fillStyle = isPlayed ? '#00d2ff' : gradient;
      ctx.globalAlpha = isPlayed ? 1 : 0.7;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    });

    ctx.globalAlpha = 1;

    if (playheadX >= 0 && playheadX <= width) {
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }, [zoom, currentTime]);

  const animateWaveforms = useCallback(() => {
    canvasRefs.current.forEach((canvas, trackId) => {
      const track = tracks.find(t => t.id === trackId);
      if (track && canvas) {
        drawWaveform(canvas, track);
      }
    });
  }, [tracks, drawWaveform]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      animateWaveforms();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [animateWaveforms]);

  useEffect(() => {
    return () => {
      animationRefs.current.forEach(id => cancelAnimationFrame(id));
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number, trackId: string) => {
    setDragged({ index, trackId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragged && dragged.index !== toIndex) {
      onReorder(dragged.index, toIndex);
    }
    setDragged(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragged(null);
    setDragOverIndex(null);
  };

  const getEffectLabel = (type: EffectType): string => {
    switch (type) {
      case 'reverb': return '混响';
      case 'delay': return '延迟';
      case 'lowpass': return '低通滤波';
    }
  };

  const getEffectIcon = (type: EffectType): string => {
    switch (type) {
      case 'reverb': return '🌊';
      case 'delay': return '⏱️';
      case 'lowpass': return '🎚️';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      height: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(108,99,255,0.5) transparent'
    }}>
      <style>{`
        .effect-card {
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(108, 99, 255, 0.4);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .effect-card:hover {
          border-color: rgba(108, 99, 255, 0.8);
          transform: translateY(-1px);
        }
        .control-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.15s ease;
          background: #555;
          color: #fff;
        }
        .control-btn:hover {
          transform: scale(1.05);
        }
        .control-btn.active {
          background: #00d2ff;
          box-shadow: 0 0 12px rgba(0, 210, 255, 0.5);
        }
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #6c63ff, #00d2ff);
          outline: none;
          cursor: pointer;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }
        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .volume-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .param-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
          cursor: pointer;
        }
        .param-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6c63ff;
          cursor: pointer;
        }
        .placeholder-track {
          background: linear-gradient(135deg, rgba(108, 99, 255, 0.3), rgba(0, 210, 255, 0.3));
          border: 2px dashed rgba(108, 99, 255, 0.6);
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .track-item {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .track-item.dragging {
          opacity: 0.5;
          transform: scale(0.98);
        }
      `}</style>

      {tracks.map((track, index) => (
        <React.Fragment key={track.id}>
          {dragOverIndex === index && dragged?.index !== index && (
            <div className="placeholder-track" style={{ height: '200px', marginBottom: '16px' }} />
          )}
          <div
            className={`track-item ${dragged?.trackId === track.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index, track.id)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              background: '#1a1a2e',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              border: '1px solid rgba(108, 99, 255, 0.2)',
              transition: 'all 0.15s ease',
              cursor: 'grab'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '8px',
                height: '40px',
                background: 'linear-gradient(to bottom, #6c63ff, #00d2ff)',
                borderRadius: '4px',
                cursor: 'grab'
              }} />
              <div style={{
                fontWeight: 600,
                fontSize: '14px',
                minWidth: '120px',
                fontFamily: "'Orbitron', sans-serif"
              }}>
                {track.name}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className={`control-btn ${track.muted ? 'active' : ''}`}
                  onClick={() => onMuteToggle(track.id)}
                  title="静音"
                >
                  M
                </button>
                <button
                  className={`control-btn ${track.solo ? 'active' : ''}`}
                  onClick={() => onSoloToggle(track.id)}
                  title="独奏"
                >
                  S
                </button>
              </div>

              <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value))}
                    className="volume-slider"
                  />
                  <div style={{
                    position: 'absolute',
                    top: '-24px',
                    left: `${track.volume}%`,
                    transform: 'translateX(-50%)',
                    fontSize: '14px',
                    color: '#fff',
                    fontWeight: 600,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}>
                    {track.volume}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveTrack(track.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 68, 68, 0.5)',
                  color: '#ff4444',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                删除
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(track.id, el);
                }}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '4px',
                  display: 'block'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {track.effects.map((effect) => (
                <div
                  key={effect.id}
                  className="effect-card"
                  onClick={() => setExpandedEffect(
                    expandedEffect?.trackId === track.id && expandedEffect?.effectId === effect.id
                      ? null
                      : { trackId: track.id, effectId: effect.id }
                  )}
                  style={{
                    minWidth: '140px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getEffectIcon(effect.type)}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{getEffectLabel(effect.type)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveEffect(track.id, effect.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff6b6b',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {expandedEffect?.trackId === track.id && expandedEffect?.effectId === effect.id && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(108, 99, 255, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {effect.type === 'reverb' && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                            Decay Time: {effect.params.decayTime?.toFixed(1)}s
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={effect.params.decayTime || 2}
                            onChange={(e) => onEffectParamChange(track.id, effect.id, { decayTime: parseFloat(e.target.value) })}
                            className="param-slider"
                          />
                        </div>
                      )}
                      {effect.type === 'delay' && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                            Feedback: {(effect.params.feedback || 0.3).toFixed(2)}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="0.9"
                            step="0.05"
                            value={effect.params.feedback || 0.3}
                            onChange={(e) => onEffectParamChange(track.id, effect.id, { feedback: parseFloat(e.target.value) })}
                            className="param-slider"
                          />
                        </div>
                      )}
                      {effect.type === 'lowpass' && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                            Cutoff: {effect.params.cutoff || 2000}Hz
                          </div>
                          <input
                            type="range"
                            min="200"
                            max="5000"
                            step="100"
                            value={effect.params.cutoff || 2000}
                            onChange={(e) => onEffectParamChange(track.id, effect.id, { cutoff: parseFloat(e.target.value) })}
                            className="param-slider"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {track.effects.length < 3 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowEffectMenu(showEffectMenu === track.id ? null : track.id)}
                    style={{
                      background: 'rgba(108, 99, 255, 0.2)',
                      border: '1px dashed rgba(108, 99, 255, 0.6)',
                      color: '#a29bfe',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(108, 99, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)';
                    }}
                  >
                    + 添加滤镜 ({track.effects.length}/3)
                  </button>

                  {showEffectMenu === track.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      marginTop: '8px',
                      background: '#1a1a2e',
                      border: '1px solid rgba(108, 99, 255, 0.4)',
                      borderRadius: '8px',
                      padding: '8px',
                      zIndex: 100,
                      minWidth: '150px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                      {(['reverb', 'delay', 'lowpass'] as EffectType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            onAddEffect(track.id, type);
                            setShowEffectMenu(null);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(108, 99, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {getEffectIcon(type)} {getEffectLabel(type)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      ))}

      {tracks.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '16px',
          gap: '12px'
        }}>
          <div style={{ fontSize: '48px' }}>🎵</div>
          <div>点击上方"上传音轨"按钮添加音频文件</div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>支持 WAV、MP3 格式，单文件最大 10MB</div>
        </div>
      )}
    </div>
  );
};
