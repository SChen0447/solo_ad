import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Clock, MapPin, Calendar } from 'lucide-react';
import { useAppStore } from '../store';
import type { Spot } from '../types';

interface SpotCardProps {
  spot: Spot;
  index: number;
  onEdit: (spot: Spot) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const SpotCard = React.memo(function SpotCard({
  spot,
  index,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}: SpotCardProps) {
  return (
    <>
      {isDropTarget && (
        <div
          style={{
            height: 8,
            margin: '4px 0',
            border: '2px dashed #3498db',
            borderRadius: 4,
            background: 'rgba(52, 152, 219, 0.1)',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      )}
      <div
        draggable
        onDragStart={() => onDragStart(spot.id)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, spot.id)}
        onDragEnd={onDragEnd}
        style={{
          padding: '12px 14px',
          marginBottom: 8,
          background: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          cursor: 'grab',
          opacity: isDragging ? 0.4 : 1,
          transform: isDragging ? 'scale(0.98)' : 'scale(1)',
          transition:
            'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          border: '1px solid transparent',
          userSelect: 'none' as const,
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
          }
        }}
        onDragStartCapture={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', spot.id);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#95a5a6',
              cursor: 'grab',
              padding: '2px',
            }}
          >
            <GripVertical size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#3498db',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2c3e50',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {spot.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(spot);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#95a5a6',
                    padding: 4,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#3498db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#95a5a6';
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(spot.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#95a5a6',
                    padding: 4,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#e74c3c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#95a5a6';
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: '#7f8c8d',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} /> {spot.duration} 分钟
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} /> {spot.lat.toFixed(2)}, {spot.lng.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

interface EditModalProps {
  spot: Spot | null;
  onSave: (spot: Partial<Spot>) => void;
  onCancel: () => void;
}

function EditModal({ spot, onSave, onCancel }: EditModalProps) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(60);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  useEffect(() => {
    if (spot) {
      setName(spot.name);
      setDuration(spot.duration);
      setLat(spot.lat);
      setLng(spot.lng);
    } else {
      setName('');
      setDuration(60);
      setLat(0);
      setLng(0);
    }
  }, [spot]);

  if (!spot) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          minWidth: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#2c3e50' }}>
          编辑景点
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#7f8c8d', marginBottom: 4 }}>
            景点名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7f8c8d', marginBottom: 4 }}>
              停留时长(分钟)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7f8c8d', marginBottom: 4 }}>
              纬度
            </label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7f8c8d', marginBottom: 4 }}>
              经度
            </label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ name, duration, lat, lng })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function MapCanvas({ spots }: { spots: Spot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (spots.length === 0) {
      ctx.fillStyle = '#95a5a6';
      ctx.font = '14px "Noto Sans SC"';
      ctx.textAlign = 'center' as const;
      ctx.fillText('添加景点后将在这里显示路线', canvas.width / 2, canvas.height / 2);
      return;
    }

    const lats = spots.map((s) => s.lat);
    const lngs = spots.map((s) => s.lng);
    const minLat = Math.min(...lats) - 0.1;
    const maxLat = Math.max(...lats) + 0.1;
    const minLng = Math.min(...lngs) - 0.1;
    const maxLng = Math.max(...lngs) + 0.1;

    const padding = 30;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const latToY = (lat: number) =>
      padding + height * (1 - (lat - minLat) / (maxLat - minLat));
    const lngToX = (lng: number) =>
      padding + width * ((lng - minLng) / (maxLng - minLng));

    ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
      ctx.stroke();
      const x = padding + (width / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + height);
      ctx.stroke();
    }

    if (spots.length > 1) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lngToX(spots[0].lng), latToY(spots[0].lat));
      for (let i = 1; i < spots.length; i++) {
        ctx.lineTo(lngToX(spots[i].lng), latToY(spots[i].lat));
      }
      ctx.stroke();
    }

    spots.forEach((spot, index) => {
      const x = lngToX(spot.lng);
      const y = latToY(spot.lat);

      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#3498db';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px "Noto Sans SC"';
      ctx.textAlign = 'center' as const;
      ctx.textBaseline = 'middle' as const;
      ctx.fillText(String(index + 1), x, y);

      ctx.fillStyle = '#2c3e50';
      ctx.font = '11px "Noto Sans SC"';
      ctx.textAlign = 'left' as const;
      ctx.fillText(spot.name, x + 14, y + 3);
    });
  }, [spots]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 300,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

export default function PlanView() {
  const {
    state,
    addDay,
    addSpot,
    updateSpot,
    deleteSpot,
    reorderSpots,
    setCurrentDay,
  } = useAppStore();

  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const currentTrip = useMemo(
    () => state.trips.find((t) => t.id === state.currentTripId),
    [state.trips, state.currentTripId]
  );

  const currentDay = useMemo(
    () =>
      currentTrip?.days.find((d) => d.id === state.currentDayId) ??
      currentTrip?.days[0] ??
      null,
    [currentTrip, state.currentDayId]
  );

  const dayStats = useMemo(() => {
    if (!currentDay) return { totalDistance: 0, moveTimes: [], totalDuration: 0 };
    let totalDistance = 0;
    const moveTimes: number[] = [];
    const spots = [...currentDay.spots].sort((a, b) => a.order - b.order);
    for (let i = 1; i < spots.length; i++) {
      const prev = spots[i - 1];
      const curr = spots[i];
      const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      totalDistance += dist;
      moveTimes.push(Math.round((dist / 40) * 60));
    }
    const totalDuration = spots.reduce((sum, s) => sum + s.duration, 0) + moveTimes.reduce((a, b) => a + b, 0);
    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      moveTimes,
      totalDuration,
    };
  }, [currentDay]);

  const sortedSpots = useMemo(() => {
    if (!currentDay) return [];
    return [...currentDay.spots].sort((a, b) => a.order - b.order);
  }, [currentDay]);

  useEffect(() => {
    if (currentDay && currentTrip && !state.currentDayId) {
      setCurrentDay(currentDay.id);
    }
  }, [currentDay, currentTrip, state.currentDayId, setCurrentDay]);

  const handleAddDay = async () => {
    if (!currentTrip) return;
    await addDay(currentTrip.id);
  };

  const handleAddSpot = async () => {
    if (!currentTrip || !currentDay) return;
    const name = prompt('请输入景点名称：');
    if (!name) return;
    await addSpot(currentTrip.id, currentDay.id, {
      name,
      duration: 60,
      lat: Math.random() * 30 + 30,
      lng: Math.random() * 30 + 100,
    });
  };

  const handleEditSpot = (spot: Spot) => {
    setEditingSpot(spot);
  };

  const handleSaveEdit = async (data: Partial<Spot>) => {
    if (!editingSpot) return;
    await updateSpot(editingSpot.id, data);
    setEditingSpot(null);
  };

  const handleDeleteSpot = async (id: string) => {
    if (!confirm('确定删除这个景点吗？')) return;
    await deleteSpot(id);
  };

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
    setDropTargetId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggingId || draggingId === targetId || !currentTrip || !currentDay) return;

      const currentOrder = sortedSpots.map((s) => s.id);
      const dragIndex = currentOrder.indexOf(draggingId);
      const targetIndex = currentOrder.indexOf(targetId);

      const newOrder = [...currentOrder];
      newOrder.splice(dragIndex, 1);
      newOrder.splice(targetIndex, 0, draggingId);

      setDropTargetId(null);
      setDraggingId(null);

      await reorderSpots(currentTrip.id, currentDay.id, newOrder);
    },
    [draggingId, sortedSpots, currentTrip, currentDay, reorderSpots]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (draggingId && draggingId !== targetId) {
        setDropTargetId(targetId);
      }
    },
    [draggingId]
  );

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: '#faf3e0',
        flexDirection: 'row',
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .plan-layout { flex-direction: column !important; }
          .plan-left { width: 100% !important; min-width: unset !important; max-height: 50vh; border-right: none !important; border-bottom: 1px solid #e8dcc8; }
          .plan-right { width: 100% !important; height: 50vh !important; }
        }
      `}</style>

      <div
        className="plan-left"
        style={{
          width: '30%',
          minWidth: 300,
          borderRight: '1px solid #e8dcc8',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: '#faf3e0',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #e8dcc8', background: 'white' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>
              行程规划
            </h3>
            {currentTrip && currentTrip.days.length < 7 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleAddDay}
                style={{ padding: '4px 10px' }}
              >
                <Calendar size={12} /> 加一天
              </button>
            )}
          </div>

          {currentTrip && currentTrip.days.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {currentTrip.days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setCurrentDay(day.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    border: 'none',
                    background:
                      day.id === currentDay?.id ? '#3498db' : '#f0e8d8',
                    color: day.id === currentDay?.id ? 'white' : '#2c3e50',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (day.id !== currentDay?.id) {
                      e.currentTarget.style.background = '#e8dcc8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (day.id !== currentDay?.id) {
                      e.currentTarget.style.background = '#f0e8d8';
                    }
                  }}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {currentDay && (
          <>
            <div
              style={{
                padding: '12px 16px',
                background: 'white',
                borderBottom: '1px solid #e8dcc8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 2 }}>
                    今日总路程
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>
                    {dayStats.totalDistance} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 2, textAlign: 'right' }}>
                    预计总时长
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50', textAlign: 'right' }}>
                    {Math.floor(dayStats.totalDuration / 60)}h {dayStats.totalDuration % 60}m
                  </div>
                </div>
              </div>
              {dayStats.moveTimes.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#95a5a6' }}>
                  路段移动时间: {dayStats.moveTimes.map((t) => `${t}m`).join(' → ')}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {sortedSpots.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#7f8c8d',
                    fontSize: 13,
                    padding: '24px 0',
                  }}
                >
                  暂无景点，点击下方按钮添加
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sortedSpots.map((spot, index) => (
                    <div
                      key={spot.id}
                      onDragEnter={(e) => handleDragEnter(e, spot.id)}
                    >
                      <SpotCard
                        spot={spot}
                        index={index}
                        onEdit={handleEditSpot}
                        onDelete={handleDeleteSpot}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isDragging={spot.id === draggingId}
                        isDropTarget={spot.id === dropTargetId}
                      />
                    </div>
                  ))}
                  {dropTargetId && draggingId && dropTargetId === sortedSpots[0]?.id && (
                    <div
                      style={{
                        height: 8,
                        margin: '4px 0',
                        border: '2px dashed #3498db',
                        borderRadius: 4,
                        background: 'rgba(52, 152, 219, 0.1)',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                padding: 12,
                borderTop: '1px solid #e8dcc8',
                background: 'white',
              }}
            >
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleAddSpot}
              >
                <Plus size={14} /> 添加景点
              </button>
            </div>
          </>
        )}

        {!currentDay && currentTrip && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 48 }}>📅</div>
            <div style={{ fontSize: 14, color: '#7f8c8d', textAlign: 'center' }}>
              点击「加一天」开始规划行程
            </div>
          </div>
        )}
      </div>

      <div
        className="plan-right"
        style={{
          width: '70%',
          height: '100%',
          padding: 16,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MapPin size={16} color="#3498db" />
          路线预览
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MapCanvas spots={sortedSpots} />
        </div>
      </div>

      <EditModal
        spot={editingSpot}
        onSave={handleSaveEdit}
        onCancel={() => setEditingSpot(null)}
      />
    </div>
  );
}
