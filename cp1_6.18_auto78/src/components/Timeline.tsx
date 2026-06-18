import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store';
import { EASING_COLORS, EASING_LABELS, EasingType, Keyframe } from '../types';
import { FiPlus, FiTrash2, FiClock } from 'react-icons/fi';

const TIMELINE_HEIGHT = 120;
const TRACK_HEIGHT = 60;
const KEYFRAME_WIDTH = 12;
const KEYFRAME_HEIGHT = 12;
const PADDING_LEFT = 80;
const PADDING_RIGHT = 20;

const Timeline: React.FC = () => {
  const {
    keyframes,
    playback,
    selectedKeyframeId,
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    selectKeyframe,
    setCurrentTime
  } = useEditorStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingKeyframe, setEditingKeyframe] = useState<Keyframe | null>(null);
  const [showEasingMenu, setShowEasingMenu] = useState<string | null>(null);

  const getTimelineWidth = useCallback(() => {
    if (!timelineRef.current) return 0;
    return timelineRef.current.clientWidth - PADDING_LEFT - PADDING_RIGHT;
  }, []);

  const timeToX = useCallback(
    (time: number) => {
      const width = getTimelineWidth();
      return PADDING_LEFT + (time / playback.totalDuration) * width;
    },
    [playback.totalDuration, getTimelineWidth]
  );

  const xToTime = useCallback(
    (x: number) => {
      const width = getTimelineWidth();
      const time = ((x - PADDING_LEFT) / width) * playback.totalDuration;
      return Math.max(0, Math.min(time, playback.totalDuration));
    },
    [playback.totalDuration, getTimelineWidth]
  );

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || draggingId) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    setCurrentTime(time);
  };

  const handleTimelineDoubleClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    addKeyframe(time);
  };

  const handleKeyframeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    selectKeyframe(id);
    setDraggingId(id);
  };

  const handleKeyframeDoubleClick = (e: React.MouseEvent, keyframe: Keyframe) => {
    e.stopPropagation();
    setEditingKeyframe(keyframe);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = xToTime(x);
      updateKeyframe(draggingId, { time: Math.round(time) });
    },
    [draggingId, xToTime, updateKeyframe]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const handleEasingChange = (id: string, easing: EasingType) => {
    updateKeyframe(id, { easing });
    setShowEasingMenu(null);
  };

  const handleValueChange = (field: string, value: number) => {
    if (!editingKeyframe) return;
    setEditingKeyframe({
      ...editingKeyframe,
      values: { ...editingKeyframe.values, [field]: value }
    });
  };

  const saveEditingKeyframe = () => {
    if (!editingKeyframe) return;
    updateKeyframe(editingKeyframe.id, { values: editingKeyframe.values });
    setEditingKeyframe(null);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
  };

  const timeMarks = [];
  const markInterval = playback.totalDuration > 5000 ? 1000 : 500;
  for (let t = 0; t <= playback.totalDuration; t += markInterval) {
    timeMarks.push(t);
  }

  return (
    <div
      style={{
        height: TIMELINE_HEIGHT,
        backgroundColor: '#0d1b2a',
        borderTop: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          height: 30,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: PADDING_LEFT,
          borderBottom: '1px solid #16213e',
          position: 'relative'
        }}
      >
        {timeMarks.map((time) => (
          <div
            key={time}
            style={{
              position: 'absolute',
              left: timeToX(time),
              transform: 'translateX(-50%)',
              fontSize: '11px',
              color: '#4a4a6a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: 1,
                height: 8,
                backgroundColor: '#4a4a6a',
                marginBottom: 2
              }}
            />
            {formatTime(time)}
          </div>
        ))}
      </div>

      <div
        ref={timelineRef}
        style={{
          flex: 1,
          position: 'relative',
          cursor: 'pointer'
        }}
        onClick={handleTimelineClick}
        onDoubleClick={handleTimelineDoubleClick}
      >
        <div
          style={{
            position: 'absolute',
            left: PADDING_LEFT,
            right: PADDING_RIGHT,
            top: '50%',
            height: 4,
            transform: 'translateY(-50%)',
            backgroundColor: '#16213e',
            borderRadius: 2
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: timeToX(playback.currentTime),
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#e94560',
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #e94560'
            }}
          />
        </div>

        {keyframes.map((kf) => (
          <div
            key={kf.id}
            style={{
              position: 'absolute',
              left: timeToX(kf.time),
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: KEYFRAME_WIDTH,
              height: KEYFRAME_HEIGHT,
              borderRadius: '50%',
              backgroundColor: EASING_COLORS[kf.easing],
              cursor: 'grab',
              border: selectedKeyframeId === kf.id ? '2px solid #ffffff' : 'none',
              boxShadow:
                selectedKeyframeId === kf.id
                  ? `0 0 8px ${EASING_COLORS[kf.easing]}`
                  : 'none',
              transition: 'transform 0.1s, box-shadow 0.1s',
              zIndex: selectedKeyframeId === kf.id ? 5 : 2
            }}
            onMouseDown={(e) => handleKeyframeMouseDown(e, kf.id)}
            onDoubleClick={(e) => handleKeyframeDoubleClick(e, kf)}
            onClick={(e) => {
              e.stopPropagation();
              setShowEasingMenu(showEasingMenu === kf.id ? null : kf.id);
            }}
            title={`${formatTime(kf.time)} - ${EASING_LABELS[kf.easing]}`}
          >
            {showEasingMenu === kf.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#16213e',
                  border: '1px solid #0f3460',
                  borderRadius: 4,
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  zIndex: 20,
                  minWidth: 100
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(Object.keys(EASING_COLORS) as EasingType[]).map((easing) => (
                  <button
                    key={easing}
                    onClick={() => handleEasingChange(kf.id, easing)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: 3,
                      backgroundColor:
                        kf.easing === easing ? '#0f3460' : 'transparent',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: EASING_COLORS[easing]
                      }}
                    />
                    {EASING_LABELS[easing]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {editingKeyframe && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setEditingKeyframe(null)}
        >
          <div
            style={{
              backgroundColor: '#16213e',
              borderRadius: 8,
              padding: 20,
              minWidth: 300,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16, color: '#00b4d8', fontSize: '16px' }}>
              关键帧属性
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ width: 60, fontSize: '13px', color: '#aaa' }}>
                  位移X
                </label>
                <input
                  type="number"
                  value={editingKeyframe.values.x}
                  onChange={(e) => handleValueChange('x', Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #0f3460',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ width: 60, fontSize: '13px', color: '#aaa' }}>
                  位移Y
                </label>
                <input
                  type="number"
                  value={editingKeyframe.values.y}
                  onChange={(e) => handleValueChange('y', Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #0f3460',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ width: 60, fontSize: '13px', color: '#aaa' }}>
                  缩放
                </label>
                <input
                  type="number"
                  value={editingKeyframe.values.scale}
                  step={0.1}
                  onChange={(e) =>
                    handleValueChange('scale', Number(e.target.value))
                  }
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #0f3460',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ width: 60, fontSize: '13px', color: '#aaa' }}>
                  旋转°
                </label>
                <input
                  type="number"
                  value={editingKeyframe.values.rotation}
                  onChange={(e) =>
                    handleValueChange('rotation', Number(e.target.value))
                  }
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #0f3460',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ width: 60, fontSize: '13px', color: '#aaa' }}>
                  透明度
                </label>
                <input
                  type="number"
                  value={editingKeyframe.values.opacity}
                  step={0.1}
                  min={0}
                  max={1}
                  onChange={(e) =>
                    handleValueChange('opacity', Number(e.target.value))
                  }
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #0f3460',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiClock style={{ color: '#aaa' }} />
                <label style={{ fontSize: '13px', color: '#aaa' }}>
                  时间: {formatTime(editingKeyframe.time)}
                </label>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 20
              }}
            >
              <button
                onClick={() => {
                  removeKeyframe(editingKeyframe.id);
                  setEditingKeyframe(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '13px'
                }}
              >
                <FiTrash2 />
                删除
              </button>
              <button
                onClick={saveEditingKeyframe}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00b4d8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 10,
          top: 5,
          fontSize: '11px',
          color: '#666'
        }}
      >
        双击添加关键帧 · 单击选缓动 · 双击编辑
      </div>
    </div>
  );
};

export default Timeline;
