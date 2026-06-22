import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Action } from '../types';

interface WorkoutTimelineProps {
  actions: Action[];
  restInterval: number;
  onRemoveAction: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const WorkoutTimeline: React.FC<WorkoutTimelineProps> = ({
  actions,
  restInterval,
  onRemoveAction,
  onReorder,
  onDrop,
}) => {
  const [isTraining, setIsTraining] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const totalDuration = actions.reduce((sum, action) => sum + action.duration * action.sets, 0)
    + (actions.length > 0 ? (actions.length - 1) * restInterval : 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTraining = () => {
    if (actions.length === 0) return;
    setIsTraining(true);
    setCurrentIndex(0);
    setIsResting(false);
    setTimeLeft(actions[0].duration);
  };

  const stopTraining = () => {
    setIsTraining(false);
    setCurrentIndex(-1);
    setIsResting(false);
    setTimeLeft(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const nextAction = useCallback(() => {
    if (!isResting && currentIndex < actions.length - 1) {
      setIsResting(true);
      setTimeLeft(restInterval);
    } else if (isResting && currentIndex < actions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setIsResting(false);
      setTimeLeft(actions[nextIdx].duration);
    } else {
      stopTraining();
    }
  }, [currentIndex, isResting, actions, restInterval]);

  useEffect(() => {
    if (isTraining && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            nextAction();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTraining, currentIndex, isResting, nextAction]);

  const handleDragStart = (index: number) => {
    if (isTraining) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isTraining) return;
    setDragOverIndex(index);
  };

  const handleDropItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTraining) return;
    
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(e);
    }
    setDragOverIndex(null);
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '400px',
      }}
      onDragOver={handleDragOverZone}
      onDrop={handleDropZone}
    >
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>
            ⏱️ 训练时间轴
          </h2>
          <div
            style={{
              padding: '6px 14px',
              background: isTraining ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 500,
              color: isTraining ? '#10b981' : '#3b82f6',
            }}
          >
            总时长: {formatTime(totalDuration)}
          </div>
        </div>

        {isTraining && currentIndex >= 0 && (
          <div
            style={{
              background: isResting
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: `2px solid ${isResting ? '#f59e0b' : '#10b981'}`,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: isResting ? '#fcd34d' : '#6ee7b7', marginBottom: '8px' }}>
                {isResting ? '😌 休息中' : '🔥 当前动作'}
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: isResting ? '#f59e0b' : '#10b981',
                  fontFamily: 'monospace',
                }}
              >
                {formatTime(timeLeft)}
              </div>
              <div style={{ fontSize: '16px', color: '#f8fafc', marginTop: '8px' }}>
                {!isResting && actions[currentIndex]?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {currentIndex + 1} / {actions.length}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {actions.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              border: '2px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '40px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '16px', textAlign: 'center' }}>
              将动作拖拽到这里
            </p>
            <p style={{ fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
              从左侧选择动作，拖入时间轴创建训练计划
            </p>
          </div>
        ) : (
          actions.map((action, index) => (
            <div
              key={`${action.id}-${index}`}
              draggable={!isTraining}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDropItem(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: currentIndex === index && !isResting
                  ? 'rgba(16, 185, 129, 0.3)'
                  : currentIndex === index && isResting
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                border: dragOverIndex === index
                  ? '2px dashed #3b82f6'
                  : currentIndex === index
                  ? `2px solid ${isResting ? '#f59e0b' : '#10b981'}`
                  : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: isTraining ? 'default' : 'grab',
                transition: 'all 0.2s ease',
                opacity: draggedIndex === index ? 0.5 : 1,
                transform: dragOverIndex === index && draggedIndex !== index ? 'translateY(4px)' : 'none',
                animation: currentIndex === index && isTraining && !isResting
                  ? 'pulse 1s ease-in-out infinite'
                  : 'none',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: currentIndex === index
                    ? isResting ? '#f59e0b' : '#10b981'
                    : currentIndex > index
                    ? 'rgba(16, 185, 129, 0.5)'
                    : 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: currentIndex >= index ? 'white' : '#94a3b8',
                  flexShrink: 0,
                }}
              >
                {currentIndex > index ? '✓' : index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#f8fafc', marginBottom: '2px' }}>
                  {action.name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {action.muscle} · {action.sets}组 · {action.duration}秒
                </div>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6', minWidth: '50px', textAlign: 'right' }}>
                {formatTime(action.duration * action.sets)}
              </div>

              {!isTraining && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAction(index);
                  }}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {!isTraining ? (
          <button
            onClick={startTraining}
            disabled={actions.length === 0}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '10px',
              border: 'none',
              background: actions.length === 0
                ? 'rgba(100, 116, 139, 0.5)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: actions.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (actions.length > 0) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🚀 开始训练
          </button>
        ) : (
          <button
            onClick={stopTraining}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            ⏹ 结束训练
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default WorkoutTimeline;
