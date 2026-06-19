import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { LyricLine, AnimationType } from '../types';
import { formatTime, updateLyricLineTimes } from '../utils/LyricParser';

interface TimeLineEditorProps {
  lines: LyricLine[];
  onLinesChange: (lines: LyricLine[]) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  totalDuration: number;
  rawLyrics: string;
  onRawLyricsChange: (text: string) => void;
  onParse: () => void;
}

const ANIMATION_OPTIONS: { value: AnimationType; label: string; icon: string }[] = [
  { value: 'fade', label: '淡入淡出', icon: '◐' },
  { value: 'scale', label: '逐字缩放', icon: '◉' },
  { value: 'slide', label: '右滑入', icon: '→' }
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const PIXELS_PER_SECOND_BASE = 50;
const LINE_HEIGHT = 56;
const RULER_HEIGHT = 48;

export const TimeLineEditor: React.FC<TimeLineEditorProps> = ({
  lines,
  onLinesChange,
  currentTime,
  onSeek,
  totalDuration,
  rawLyrics,
  onRawLyricsChange,
  onParse
}) => {
  const [zoom, setZoom] = useState(1.5);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(lines.length === 0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom;
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 800);

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const interval = zoom < 1.5 ? 10 : zoom < 3 ? 5 : 1;
    for (let t = 0; t <= totalDuration + interval; t += interval) {
      markers.push(t);
    }
    return markers;
  }, [totalDuration, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  const timeFromX = useCallback((x: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const relativeX = x - rect.left + scrollLeft;
    return Math.max(0, relativeX / pixelsPerSecond);
  }, [pixelsPerSecond]);

  const xFromTime = useCallback((time: number): number => {
    return time * pixelsPerSecond;
  }, [pixelsPerSecond]);

  const handleMouseDown = useCallback((e: React.MouseEvent, line: LyricLine) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    setDraggingId(line.id);
    setDragOffset(clickX);
  }, []);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rawTime = timeFromX(e.clientX) - dragOffset / pixelsPerSecond;
      const snappedTime = Math.round(rawTime * 10) / 10;
      const newTime = Math.max(0, snappedTime);
      onLinesChange(updateLyricLineTimes(lines, draggingId, newTime));
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset, lines, onLinesChange, timeFromX, pixelsPerSecond]);

  const handleTimelineMove = useCallback((e: React.MouseEvent) => {
    if (draggingId) return;
    const time = timeFromX(e.clientX);
    setHoverTime(time);
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverX(e.clientX - rect.left);
    }
  }, [draggingId, timeFromX]);

  const handleTimelineLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (draggingId) return;
    const time = timeFromX(e.clientX);
    onSeek(time);
  }, [draggingId, timeFromX, onSeek]);

  const handleDelete = useCallback((id: string) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      onLinesChange(lines.filter(l => l.id !== id));
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, [lines, onLinesChange]);

  const handleAnimationChange = useCallback((id: string, animation: AnimationType) => {
    onLinesChange(lines.map(l => l.id === id ? { ...l, animation } : l));
  }, [lines, onLinesChange]);

  const handleDurationChange = useCallback((id: string, duration: number) => {
    const newDuration = Math.max(0.5, Math.min(10, duration));
    onLinesChange(lines.map(l => {
      if (l.id === id) {
        return {
          ...l,
          duration: newDuration,
          endTime: Math.round((l.startTime + newDuration) * 10) / 10
        };
      }
      return l;
    }));
  }, [lines, onLinesChange]);

  return (
    <div className="timeline-editor" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e1e2e',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #313244',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowImport(s => !s)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#a78bfa',
            color: '#1e1e2e',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: 13
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#a78bfa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {showImport ? '隐藏导入' : '📝 导入歌词'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cdd6f4', fontSize: 12 }}>
          <span>缩放:</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ accentColor: '#a78bfa', width: 100 }}
          />
          <span style={{ color: '#a78bfa', minWidth: 36 }}>{zoom.toFixed(1)}x</span>
          <span style={{ color: '#6c7086', marginLeft: 8 }}>(Ctrl+滚轮)</span>
        </div>
        <div style={{ marginLeft: 'auto', color: '#6c7086', fontSize: 12 }}>
          共 {lines.length} 行 | 总时长 {formatTime(totalDuration)}
        </div>
      </div>

      {showImport && (
        <div style={{
          padding: 16,
          borderBottom: '1px solid #313244',
          backgroundColor: '#181825'
        }}>
          <div style={{ color: '#cdd6f4', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
            粘贴歌词文本（支持时间戳格式 00:00.00 或 [00:00.00]）
          </div>
          <textarea
            value={rawLyrics}
            onChange={(e) => onRawLyricsChange(e.target.value)}
            placeholder={`00:00.00 第一行歌词\n00:03.50 第二行歌词\n00:07.20 第三行歌词\n\n或直接粘贴纯文本，将自动分配时间戳`}
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              backgroundColor: '#1e1e2e',
              color: '#cdd6f4',
              border: '1px solid #313244',
              borderRadius: 8,
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={onParse}
              style={{
                padding: '8px 20px',
                backgroundColor: '#a78bfa',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: 13
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#a78bfa';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              解析歌词
            </button>
            <button
              onClick={() => {
                onRawLyricsChange(DEFAULT_LYRICS);
                setTimeout(onParse, 50);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#313244',
                color: '#cdd6f4',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: 13
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
              加载示例
            </button>
          </div>
        </div>
      )}

      {lines.length === 0 && !showImport && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c7086',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ fontSize: 48 }}>🎵</div>
          <div style={{ fontSize: 14 }}>暂无歌词，请点击上方"导入歌词"按钮开始</div>
        </div>
      )}

      {lines.length > 0 && (
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative'
          }}
          onWheel={handleWheel}
        >
          <div
            style={{
              minWidth: timelineWidth,
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                height: RULER_HEIGHT,
                backgroundColor: '#181825',
                borderBottom: '1px solid #313244',
                overflow: 'hidden'
              }}
            >
              {timeMarkers.map((t, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: xFromTime(t),
                    top: 0,
                    height: '100%',
                    borderLeft: '1px solid #313244',
                    paddingLeft: 6,
                    paddingTop: 14,
                    color: '#6c7086',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatTime(t).slice(0, 5)}
                </div>
              ))}
            </div>

            <div
              ref={timelineRef}
              onMouseMove={handleTimelineMove}
              onMouseLeave={handleTimelineLeave}
              onClick={handleTimelineClick}
              style={{ position: 'relative', cursor: 'crosshair' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: xFromTime(currentTime),
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: '#f38ba8',
                  zIndex: 20,
                  pointerEvents: 'none',
                  boxShadow: '0 0 8px rgba(243, 139, 168, 0.6)'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: -8,
                  left: -6,
                  width: 14,
                  height: 14,
                  backgroundColor: '#f38ba8',
                  borderRadius: '50%',
                  transform: 'rotate(45deg)',
                  borderRadius: '2px 2px 2px 50%'
                }} />
              </div>

              {hoverTime !== null && !draggingId && (
                <div
                  style={{
                    position: 'absolute',
                    left: hoverX,
                    top: 8,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(167, 139, 250, 0.95)',
                    color: '#1e1e2e',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    pointerEvents: 'none',
                    zIndex: 30,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              {lines.map((line, index) => {
                const isRemoving = removingIds.has(line.id);
                const isDragging = draggingId === line.id;
                return (
                  <div
                    key={line.id}
                    style={{
                      height: LINE_HEIGHT,
                      padding: '8px 8px',
                      boxSizing: 'border-box',
                      position: 'relative',
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? 'scale(0.8)' : 'scale(1)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      bottom: 8,
                      width: 240,
                      backgroundColor: '#181825',
                      borderRadius: 12,
                      padding: '8px 12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!isRemoving) {
                        e.currentTarget.style.transform = 'scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: line.color,
                          flexShrink: 0
                        }} />
                        <span style={{
                          flex: 1,
                          color: '#cdd6f4',
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 500
                        }}>
                          {line.text}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(line.id);
                          }}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#6c7086',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            padding: 0,
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f38ba8';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#6c7086';
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{
                          color: '#a78bfa',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          backgroundColor: 'rgba(167, 139, 250, 0.1)',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}>
                          {formatTime(line.startTime)}
                        </span>
                        <input
                          type="number"
                          min={0.5}
                          max={10}
                          step={0.1}
                          value={line.duration}
                          onChange={(e) => handleDurationChange(line.id, parseFloat(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: 44,
                            height: 18,
                            backgroundColor: '#313244',
                            color: '#cdd6f4',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 10,
                            padding: '0 4px',
                            outline: 'none'
                          }}
                        />
                        <span style={{ color: '#6c7086', fontSize: 10 }}>s</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                          {ANIMATION_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnimationChange(line.id, opt.value);
                              }}
                              title={opt.label}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: line.animation === opt.value ? line.color : '#313244',
                                color: line.animation === opt.value ? '#1e1e2e' : '#6c7086',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (line.animation !== opt.value) {
                                  e.currentTarget.style.backgroundColor = '#45475a';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (line.animation !== opt.value) {
                                  e.currentTarget.style.backgroundColor = '#313244';
                                }
                              }}
                            >
                              {opt.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      onMouseDown={(e) => handleMouseDown(e, line)}
                      style={{
                        position: 'absolute',
                        left: 256 + xFromTime(line.startTime),
                        top: 16,
                        height: LINE_HEIGHT - 32,
                        minWidth: 40,
                        width: Math.max(xFromTime(line.duration), 40),
                        backgroundColor: line.color + (isDragging ? 'cc' : '80'),
                        borderRadius: 8,
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: isDragging ? 'none' : 'background-color 0.2s ease',
                        userSelect: 'none',
                        boxShadow: isDragging 
                          ? `0 4px 20px ${line.color}66` 
                          : `0 2px 8px rgba(0, 0, 0, 0.2)`,
                        border: isDragging ? `2px solid ${line.color}` : 'none'
                      }}
                    >
                      <span style={{
                        color: '#1e1e2e',
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        padding: '0 8px'
                      }}>
                        {index + 1} | {formatTime(line.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DEFAULT_LYRICS = `00:00.00 夜空中最亮的星
00:04.50 能否听清
00:07.80 那仰望的人
00:11.20 心底的孤独和叹息

00:15.00 夜空中最亮的星
00:19.50 能否记起
00:22.80 曾与我同行
00:26.20 消失在风里的身影

00:30.00 我祈祷拥有一颗透明的心灵
00:34.50 和会流泪的眼睛
00:38.00 给我再去相信的勇气
00:42.50 越过谎言去拥抱你`;
