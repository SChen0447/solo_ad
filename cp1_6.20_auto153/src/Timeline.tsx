import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Shape, Keyframe, KeyframeProperty } from './types';

interface Props {
  shapes: Shape[];
  keyframes: Keyframe[];
  selectedShapeId: string | null;
  duration: number;
  currentTime: number;
  onSelectShape: (id: string | null) => void;
  onAddKeyframe: (shapeId: string, property: KeyframeProperty, time: number) => void;
  onUpdateKeyframe: (kfId: string, updater: (kf: Keyframe) => Keyframe) => void;
  onDeleteKeyframe: (kfId: string) => void;
  onUpdateShape: (id: string, updater: (s: Shape) => Shape) => void;
  onSeek: (time: number) => void;
}

const propertyConfig: { key: KeyframeProperty; label: string; color: string; unit?: string }[] = [
  { key: 'position', label: '位置', color: '#3b82f6' },
  { key: 'rotation', label: '旋转', color: '#f59e0b' },
  { key: 'scale', label: '缩放', color: '#10b981' },
  { key: 'strokeLength', label: '描边', color: '#8b5cf6', unit: '%' },
];

const PIXELS_PER_SEC = 100;

export default function Timeline({
  shapes,
  keyframes,
  selectedShapeId,
  duration,
  currentTime,
  onSelectShape,
  onAddKeyframe,
  onUpdateKeyframe,
  onDeleteKeyframe,
  onUpdateShape,
  onSeek,
}: Props) {
  const timelineWidth = (duration / 1000) * PIXELS_PER_SEC;
  const [draggingKf, setDraggingKf] = useState<{ id: string; startX: number; startOffset: number } | null>(null);
  const [editingKf, setEditingKf] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const getTimeFromX = useCallback((clientX: number): number => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, (x / PIXELS_PER_SEC) * 1000));
  }, [duration]);

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const t = getTimeFromX(e.clientX);
    onSeek(t);
  }, [getTimeFromX, onSeek]);

  const handleKfMouseDown = useCallback((e: React.MouseEvent, kf: Keyframe) => {
    e.stopPropagation();
    setDraggingKf({
      id: kf.id,
      startX: e.clientX,
      startOffset: kf.time,
    });
  }, []);

  const handleKfMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingKf) return;
    const deltaX = e.clientX - draggingKf.startX;
    const deltaT = (deltaX / PIXELS_PER_SEC) * 1000;
    const newTime = Math.max(0, Math.min(duration, draggingKf.startOffset + deltaT));
    onUpdateKeyframe(draggingKf.id, kf => ({ ...kf, time: Math.round(newTime) }));
  }, [draggingKf, duration, onUpdateKeyframe]);

  const handleKfMouseUp = useCallback(() => {
    if (draggingKf) setDraggingKf(null);
  }, [draggingKf]);

  useEffect(() => {
    if (!draggingKf) return;
    const mm = (e: MouseEvent) => handleKfMouseMove(e);
    const mu = () => handleKfMouseUp();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  }, [draggingKf, handleKfMouseMove, handleKfMouseUp]);

  const handleDoubleClickKf = useCallback((e: React.MouseEvent, kf: Keyframe) => {
    e.stopPropagation();
    setEditingKf(kf.id);
    setEditTime(String(kf.time));
  }, []);

  const commitTimeEdit = useCallback((kfId: string) => {
    const t = parseInt(editTime);
    if (!isNaN(t)) {
      onUpdateKeyframe(kfId, kf => ({ ...kf, time: Math.max(0, Math.min(duration, t)) }));
    }
    setEditingKf(null);
  }, [editTime, duration, onUpdateKeyframe]);

  const groupedKeyframes = useMemo(() => {
    const map: Record<string, Record<KeyframeProperty, Keyframe[]>> = {};
    shapes.forEach(s => {
      map[s.id] = { position: [], rotation: [], scale: [], strokeLength: [] };
    });
    keyframes.forEach(kf => {
      if (map[kf.shapeId]) {
        map[kf.shapeId][kf.property].push(kf);
        map[kf.shapeId][kf.property].sort((a, b) => a.time - b.time);
      }
    });
    return map;
  }, [shapes, keyframes]);

  const markers = useMemo(() => {
    const arr = [];
    const stepSec = duration > 10000 ? 5 : duration > 5000 ? 2 : 1;
    for (let t = 0; t <= duration; t += stepSec * 1000) {
      arr.push(t);
    }
    return arr;
  }, [duration]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>时间轴</h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
            点击属性右侧 + 添加关键帧，拖拽调整时间
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 120,
          flexShrink: 0,
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          background: '#f8fafc',
        }}>
          <div style={{ height: 40, borderBottom: '1px solid #e2e8f0' }} />
          {shapes.map(shape => {
            const isSelected = shape.id === selectedShapeId;
            const kfCount = keyframes.filter(k => k.shapeId === shape.id).length;
            return (
              <div key={shape.id}>
                <motion.div
                  whileHover={{ background: '#eef2ff' }}
                  onClick={() => onSelectShape(isSelected ? null : shape.id)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelected ? '#eef2ff' : 'transparent',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shape.name}
                  </span>
                  {kfCount > 0 && (
                    <span style={{
                      fontSize: 10,
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      padding: '1px 6px',
                      borderRadius: 10,
                      flexShrink: 0,
                      marginLeft: 4,
                    }}>
                      {kfCount}
                    </span>
                  )}
                </motion.div>
                <div style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {propertyConfig.map(p => (
                    <div
                      key={p.key}
                      style={{
                        padding: '5px 12px 5px 24px',
                        fontSize: 10,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'default',
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0,
                      }} />
                      <span style={{ flex: 1 }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {shapes.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              暂无图形
              <div style={{ marginTop: 4, fontSize: 11 }}>点击左侧工具栏添加</div>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}
          onScroll={e => {
            if (rulerRef.current) {
              rulerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            }
          }}
        >
          <div style={{ minWidth: Math.max(timelineWidth + 40, 400), position: 'relative' }}>
            <div
              ref={rulerRef}
              onClick={handleRulerClick}
              style={{
                height: 40,
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                background: '#ffffff',
                cursor: 'pointer',
                overflow: 'hidden',
                zIndex: 2,
              }}
            >
              <div style={{ position: 'relative', width: timelineWidth + 40, height: '100%', padding: '0 20px' }}>
                {markers.map(t => {
                  const x = (t / 1000) * PIXELS_PER_SEC + 20;
                  return (
                    <div
                      key={t}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingBottom: 4,
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ width: 1, height: 10, background: '#cbd5e1' }} />
                      <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: (currentTime / 1000) * PIXELS_PER_SEC + 20,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#ef4444',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: -6,
                  left: -4,
                  width: 10,
                  height: 10,
                  background: '#ef4444',
                  transform: 'rotate(45deg)',
                }} />
              </div>

              {shapes.map(shape => (
                <div key={shape.id}>
                  <div style={{
                    height: 36,
                    borderBottom: '1px solid #f1f5f9',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                  }} />
                  {propertyConfig.map(p => {
                    const kfs = groupedKeyframes[shape.id]?.[p.key] || [];
                    return (
                      <div
                        key={p.key}
                        style={{
                          position: 'relative',
                          height: 26,
                          borderBottom: '1px solid #f1f5f9',
                          width: timelineWidth + 40,
                          padding: '0 20px',
                        }}
                      >
                        <motion.button
                          whileHover={{ scale: 1.2, background: '#e0e7ff' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onAddKeyframe(shape.id, p.key, Math.round(currentTime))}
                          style={{
                            position: 'absolute',
                            left: 4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            background: 'transparent',
                            color: p.color,
                            fontSize: 14,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                          title="添加关键帧"
                        >
                          +
                        </motion.button>

                        {kfs.map((kf, idx) => {
                          const x = (kf.time / 1000) * PIXELS_PER_SEC;
                          const isEditing = editingKf === kf.id;
                          return (
                            <div
                              key={kf.id}
                              style={{
                                position: 'absolute',
                                left: 20 + x,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 5,
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="number"
                                  autoFocus
                                  value={editTime}
                                  onChange={e => setEditTime(e.target.value)}
                                  onBlur={() => commitTimeEdit(kf.id)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') commitTimeEdit(kf.id);
                                    if (e.key === 'Escape') setEditingKf(null);
                                  }}
                                  style={{
                                    width: 60,
                                    height: 20,
                                    fontSize: 10,
                                    padding: '0 4px',
                                    border: '2px solid #6366f1',
                                    borderRadius: 4,
                                    textAlign: 'center',
                                  }}
                                />
                              ) : (
                                <motion.div
                                  layoutId={kf.id}
                                  style={{
                                    width: 16,
                                    height: 8,
                                    borderRadius: 4,
                                    background: '#6366f1',
                                    cursor: 'grab',
                                    boxShadow: draggingKf?.id === kf.id ? '0 0 0 3px rgba(99,102,241,0.3)' : 'none',
                                  }}
                                  whileHover={{ scale: 1.2, backgroundColor: '#818cf8' }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  onMouseDown={e => handleKfMouseDown(e, kf)}
                                  onDoubleClick={e => handleDoubleClickKf(e, kf)}
                                  onContextMenu={e => {
                                    e.preventDefault();
                                    onDeleteKeyframe(kf.id);
                                  }}
                                  title={`时间: ${kf.time}ms\n${p.label}\n右键删除，双击编辑`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedShapeId && (
        <div style={{
          borderTop: '1px solid #e2e8f0',
          padding: 12,
          background: '#ffffff',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            图形变换 (当前时间)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#64748b' }}>
              X 偏移
              <input
                type="number"
                value={shapes.find(s => s.id === selectedShapeId)?.transform.x || 0}
                onChange={e => onUpdateShape(selectedShapeId, s => ({
                  ...s,
                  transform: { ...s.transform, x: Number(e.target.value) },
                }))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 2,
                  padding: '4px 6px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </label>
            <label style={{ fontSize: 11, color: '#64748b' }}>
              Y 偏移
              <input
                type="number"
                value={shapes.find(s => s.id === selectedShapeId)?.transform.y || 0}
                onChange={e => onUpdateShape(selectedShapeId, s => ({
                  ...s,
                  transform: { ...s.transform, y: Number(e.target.value) },
                }))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 2,
                  padding: '4px 6px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </label>
            <label style={{ fontSize: 11, color: '#64748b' }}>
              旋转 (°)
              <input
                type="number"
                value={shapes.find(s => s.id === selectedShapeId)?.transform.rotation || 0}
                onChange={e => onUpdateShape(selectedShapeId, s => ({
                  ...s,
                  transform: { ...s.transform, rotation: Number(e.target.value) },
                }))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 2,
                  padding: '4px 6px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </label>
            <label style={{ fontSize: 11, color: '#64748b' }}>
              缩放
              <input
                type="number"
                step="0.1"
                value={shapes.find(s => s.id === selectedShapeId)?.transform.scale || 1}
                onChange={e => onUpdateShape(selectedShapeId, s => ({
                  ...s,
                  transform: { ...s.transform, scale: Number(e.target.value) },
                }))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 2,
                  padding: '4px 6px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
