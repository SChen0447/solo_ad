import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity, Conflict, ConflictStatus, POICategory } from '@/types';
import { useTripStore, selectCurrentActivities, selectCurrentConflicts, selectSelectedDayIndex } from '@/stores/useTripStore';
import { ConflictBadge } from './ConflictBadge';

const categoryColors: Record<POICategory, string> = {
  nature: '#4ade80',
  culture: '#60a5fa',
  food: '#fbbf24',
};

const typeIcons: Record<Activity['type'], string> = {
  poi: '📍',
  food: '🍽️',
  transport: '🚗',
};

interface SortableCardProps {
  activity: Activity;
  conflictStatus: ConflictStatus;
  onEdit: (activity: Activity) => void;
  onRemove: (id: string) => void;
  vertical: boolean;
}

function SortableCard({ activity, conflictStatus, onEdit, onRemove, vertical }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = useMemo(() => {
    const baseTransform = CSS.Transform.toString(transform);
    return {
      transform: baseTransform,
      transition,
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 50 : 1,
    };
  }, [transform, transition, isDragging]);

  const statusColor = conflictStatus === 'danger' ? '#e94560' : conflictStatus === 'warning' ? '#ffc107' : '#4ade80';
  const glowClass = conflictStatus === 'danger' ? 'conflict-glow' : '';

  const cardBg = activity.category ? categoryColors[activity.category] + '20' : '#0f346030';

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        minWidth: vertical ? '100%' : '260px',
        width: vertical ? '100%' : '260px',
        flexShrink: 0,
        ...style,
      }}
      className={glowClass}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          background: '#16213e',
          borderRadius: '14px',
          border: `2px solid ${statusColor}`,
          padding: '14px 16px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: statusColor,
        }} />

        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          background: cardBg,
          opacity: 0.5,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
              minWidth: 0,
            }}>
              <span style={{ fontSize: '20px' }}>{typeIcons[activity.type]}</span>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
                boxShadow: `0 0 8px ${statusColor}`,
              }} />
              <h4 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#eaeaea',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }} title={activity.name}>
                {activity.name}
              </h4>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(activity.id);
              }}
              style={{
                background: 'rgba(233, 69, 96, 0.2)',
                border: '1px solid rgba(233, 69, 96, 0.5)',
                color: '#e94560',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            background: 'rgba(233, 69, 96, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(233, 69, 96, 0.25)',
          }}>
            <span style={{ fontSize: '12px' }}>🕐</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#e94560',
              fontFamily: 'monospace',
            }}>
              {activity.startTime} - {activity.endTime}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'rgba(234, 234, 234, 0.5)',
          }}>
            <span>时长 {activity.duration} 分钟</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(activity);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e94560',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              编辑 ✎
            </button>
          </div>

          {activity.notes && (
            <div style={{
              fontSize: '11px',
              color: 'rgba(234, 234, 234, 0.6)',
              padding: '6px 10px',
              background: 'rgba(22, 33, 62, 0.8)',
              borderRadius: '6px',
              lineHeight: 1.4,
              maxHeight: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              📝 {activity.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DroppableAreaProps {
  children: React.ReactNode;
  vertical: boolean;
}

function DroppableArea({ children, vertical }: DroppableAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'timeline-droppable',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: vertical ? 'stretch' : 'flex-start',
        gap: '20px',
        padding: '20px',
        minHeight: vertical ? 'auto' : '220px',
        minWidth: vertical ? 'auto' : '100%',
        background: isOver ? 'rgba(233, 69, 96, 0.05)' : 'transparent',
        borderRadius: '12px',
        border: isOver ? '2px dashed rgba(233, 69, 96, 0.5)' : '2px dashed transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}

interface ArrowConnectorProps {
  vertical: boolean;
}

function ArrowConnector({ vertical }: ArrowConnectorProps) {
  if (vertical) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        height: '20px',
      }}>
        <div style={{
          width: '2px',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(233, 69, 96, 0.6), rgba(233, 69, 96, 0.2))',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '8px solid rgba(233, 69, 96, 0.6)',
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      width: '40px',
      height: '180px',
    }}>
      <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="arrowGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(233, 69, 96, 0.3)" />
            <stop offset="100%" stopColor="rgba(233, 69, 96, 0.8)" />
          </linearGradient>
        </defs>
        <line x1="0" y1="10" x2="32" y2="10" stroke="url(#arrowGrad)" strokeWidth="2" />
        <polygon points="32,4 40,10 32,16" fill="rgba(233, 69, 96, 0.8)" />
      </svg>
    </div>
  );
}

interface TimelineProps {
  vertical?: boolean;
}

export function Timeline({ vertical = false }: TimelineProps) {
  const activities = useTripStore(selectCurrentActivities);
  const conflicts = useTripStore(selectCurrentConflicts);
  const dayIndex = useTripStore(selectSelectedDayIndex);
  const actions = useTripStore((s) => ({
    reorderActivities: s.reorderActivities,
    removeActivity: s.removeActivity,
    updateActivity: s.updateActivity,
    checkConflicts: s.checkConflicts,
  }));

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const checkTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activityConflictStatus = useMemo(() => {
    const statusMap: Record<string, ConflictStatus> = {};
    activities.forEach((a) => { statusMap[a.id] = 'ok'; });

    conflicts.forEach((c) => {
      if (c.type === 'overlap') {
        c.activityIds.forEach((id) => { statusMap[id] = 'danger'; });
      } else if (c.type === 'tight_gap') {
        c.activityIds.forEach((id) => {
          if (statusMap[id] !== 'danger') { statusMap[id] = 'warning'; }
        });
      }
    });

    return statusMap;
  }, [activities, conflicts]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = activities.findIndex((a) => a.id === active.id);
      const newIndex = activities.findIndex((a) => a.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(activities, oldIndex, newIndex);
        actions.reorderActivities(dayIndex, oldIndex, newIndex);

        if (checkTimerRef.current) {
          clearTimeout(checkTimerRef.current);
        }
        checkTimerRef.current = window.setTimeout(() => {
          actions.checkConflicts(dayIndex);
        }, 300);
      }
    }
  }, [activities, dayIndex, actions]);

  const handleRemove = useCallback((id: string) => {
    actions.removeActivity(dayIndex, id);
  }, [dayIndex, actions]);

  const handleEdit = useCallback((activity: Activity) => {
    setEditingActivity(activity);
  }, []);

  const handleSaveEdit = useCallback((updates: Partial<Activity>) => {
    if (editingActivity) {
      actions.updateActivity(dayIndex, editingActivity.id, updates);
      actions.checkConflicts(dayIndex);
      setEditingActivity(null);
    }
  }, [editingActivity, dayIndex, actions]);

  const visibleConflicts = conflicts.filter(c => !dismissedConflicts.has(c.id));

  const activeActivity = activeId ? activities.find(a => a.id === activeId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4), 0 0 15px rgba(233, 69, 96, 0.2); }
          50% { box-shadow: 0 0 0 10px rgba(233, 69, 96, 0), 0 0 25px rgba(233, 69, 96, 0.5); }
        }
        .conflict-glow > div:first-of-type {
          animation: pulseGlow 1.5s infinite;
        }
        @keyframes badgeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {visibleConflicts.length > 0 && (
        <div style={{
          padding: '16px 20px 0',
        }}>
          {visibleConflicts.map((conflict) => (
            <ConflictBadge
              key={conflict.id}
              conflict={conflict}
              onClose={() => {
                setDismissedConflicts(prev => new Set(prev).add(conflict.id));
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflow: vertical ? 'auto' : 'auto hidden',
          minHeight: 0,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activities.map(a => a.id)}
            strategy={vertical ? verticalListSortingStrategy : horizontalListSortingStrategy}
          >
            <DroppableArea vertical={vertical}>
              {activities.length === 0 ? (
                <div style={{
                  width: '100%',
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: 'rgba(234, 234, 234, 0.4)',
                  fontSize: '14px',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
                  <div>暂无行程，请在左侧创建行程或添加活动</div>
                </div>
              ) : (
                activities.map((activity, idx) => (
                  <div key={activity.id} style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: vertical ? 'stretch' : 'flex-start' }}>
                    <SortableCard
                      activity={activity}
                      conflictStatus={activityConflictStatus[activity.id] || 'ok'}
                      onEdit={handleEdit}
                      onRemove={handleRemove}
                      vertical={vertical}
                    />
                    {idx < activities.length - 1 && (
                      <ArrowConnector vertical={vertical} />
                    )}
                  </div>
                ))
              )}
            </DroppableArea>
          </SortableContext>

          <DragOverlay>
            {activeActivity ? (
              <div style={{
                width: vertical ? 'calc(100vw - 60px)' : '260px',
                background: '#16213e',
                borderRadius: '14px',
                border: `2px solid #e94560`,
                padding: '14px 16px',
                boxShadow: '0 20px 50px rgba(233, 69, 96, 0.4)',
                transform: 'scale(1.05)',
                opacity: 0.95,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{typeIcons[activeActivity.type]}</span>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#eaeaea', margin: 0 }}>
                    {activeActivity.name}
                  </h4>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#e94560',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}>
                  {activeActivity.startTime} - {activeActivity.endTime}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {editingActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'modalFadeIn 0.2s ease',
          }}
          onClick={() => setEditingActivity(null)}
        >
          <div
            style={{
              background: '#16213e',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              border: '1px solid rgba(233, 69, 96, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              animation: 'modalScaleIn 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#eaeaea',
              margin: '0 0 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {typeIcons[editingActivity.type]} 编辑活动
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(234,234,234,0.6)', marginBottom: '6px' }}>
                  活动名称
                </label>
                <input
                  type="text"
                  defaultValue={editingActivity.name}
                  id="edit-name"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f3460',
                    border: '1px solid rgba(233, 69, 96, 0.3)',
                    borderRadius: '8px',
                    color: '#eaeaea',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(234,234,234,0.6)', marginBottom: '6px' }}>
                    开始时间
                  </label>
                  <input
                    type="time"
                    defaultValue={editingActivity.startTime}
                    id="edit-start"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f3460',
                      border: '1px solid rgba(233, 69, 96, 0.3)',
                      borderRadius: '8px',
                      color: '#eaeaea',
                      fontSize: '14px',
                      outline: 'none',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(234,234,234,0.6)', marginBottom: '6px' }}>
                    结束时间
                  </label>
                  <input
                    type="time"
                    defaultValue={editingActivity.endTime}
                    id="edit-end"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f3460',
                      border: '1px solid rgba(233, 69, 96, 0.3)',
                      borderRadius: '8px',
                      color: '#eaeaea',
                      fontSize: '14px',
                      outline: 'none',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(234,234,234,0.6)', marginBottom: '6px' }}>
                  备注信息
                </label>
                <textarea
                  defaultValue={editingActivity.notes || ''}
                  id="edit-notes"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f3460',
                    border: '1px solid rgba(233, 69, 96, 0.3)',
                    borderRadius: '8px',
                    color: '#eaeaea',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px',
              }}>
                <button
                  onClick={() => setEditingActivity(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(234, 234, 234, 0.2)',
                    borderRadius: '10px',
                    color: 'rgba(234, 234, 234, 0.7)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const nameEl = document.getElementById('edit-name') as HTMLInputElement;
                    const startEl = document.getElementById('edit-start') as HTMLInputElement;
                    const endEl = document.getElementById('edit-end') as HTMLInputElement;
                    const notesEl = document.getElementById('edit-notes') as HTMLTextAreaElement;

                    const startMin = startEl.value.split(':').reduce((acc, v, i) => acc + parseInt(v) * (i === 0 ? 60 : 1), 0);
                    const endMin = endEl.value.split(':').reduce((acc, v, i) => acc + parseInt(v) * (i === 0 ? 60 : 1), 0);

                    handleSaveEdit({
                      name: nameEl.value,
                      startTime: startEl.value,
                      endTime: endEl.value,
                      duration: Math.max(0, endMin - startMin),
                      notes: notesEl.value,
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #e94560, #c33764)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
