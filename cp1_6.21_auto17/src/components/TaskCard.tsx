import React from 'react';
import { Task, TaskStatus, TaskScheduleInfo } from '@/types';

interface TaskCardProps {
  task: Task;
  scheduleInfo?: TaskScheduleInfo;
  isCritical: boolean;
  cellWidth: number;
  onPortDragStart: (e: React.MouseEvent, taskId: string, portType: 'output') => void;
  onPortMouseUp: (taskId: string, portType: 'input') => void;
  onCardClick: (task: Task) => void;
  onPortMouseEnter: (taskId: string, portType: 'input') => void;
  onPortMouseLeave: () => void;
}

const statusColors: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  todo: { bg: '#4a5568', text: '#e2e8f0', label: '待办' },
  'in-progress': { bg: '#2b6cb0', text: '#bee3f8', label: '进行中' },
  blocked: { bg: '#c53030', text: '#fed7d7', label: '阻塞' },
  done: { bg: '#2f855a', text: '#c6f6d5', label: '完成' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  scheduleInfo,
  isCritical,
  cellWidth,
  onPortDragStart,
  onCardClick,
  onPortMouseUp,
  onPortMouseEnter,
  onPortMouseLeave,
}) => {
  const statusStyle = statusColors[task.status];
  const duration = Math.max(1, Math.ceil(task.estimatedHours / 8));
  const cardWidth = cellWidth * duration - 12;

  const borderColor = isCritical ? '#ffd700' : '#4a5568';
  const borderWidth = isCritical ? '2px' : '1px';
  const boxShadow = isCritical
    ? '0 0 12px rgba(255, 215, 0, 0.35), inset 0 1px 3px rgba(0,0,0,0.4)'
    : 'inset 0 1px 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25)';

  return (
    <div
      className="task-card-wrapper"
      style={{
        position: 'relative',
        width: cardWidth,
        height: 108,
      }}
    >
      <div
        className="task-card-input-port"
        onMouseUp={() => onPortMouseUp(task.id, 'input')}
        onMouseEnter={() => onPortMouseEnter(task.id, 'input')}
        onMouseLeave={onPortMouseLeave}
        style={{
          position: 'absolute',
          left: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#1a202c',
          border: '2px solid #38b2ac',
          cursor: 'crosshair',
          zIndex: 10,
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#38b2ac';
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 0 8px rgba(56, 178, 172, 0.7)';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#1a202c';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      />

      <div
        onClick={() => onCardClick(task)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          background: 'linear-gradient(145deg, #2d3748 0%, #1a202c 100%)',
          border: `${borderWidth} solid ${borderColor}`,
          boxShadow,
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform =
            'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = isCritical
            ? '0 0 18px rgba(255, 215, 0, 0.5), inset 0 1px 3px rgba(0,0,0,0.4)'
            : 'inset 0 1px 3px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.35)';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flex: 1,
              }}
            >
              {task.name}
            </div>
            <div
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 10,
                background: statusStyle.bg,
                color: statusStyle.text,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {statusStyle.label}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
              fontSize: 11,
              color: '#a0aec0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {task.assignee.charAt(0)}
              </div>
              <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.assignee}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 2,
              }}
            >
              <span style={{ color: '#63b3ed', fontWeight: 600 }}>
                ⏱ {task.estimatedHours}h
              </span>
              {!isCritical && scheduleInfo && scheduleInfo.floatTime > 0 && (
                <span style={{ color: '#9ae6b4', fontSize: 10 }}>
                  浮动 +{scheduleInfo.floatTime.toFixed(1)}d
                </span>
              )}
            </div>
          </div>
        </div>

        {isCritical && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #ffd700, #ffa500, #ffd700)',
              backgroundSize: '200% 100%',
              animation: 'criticalGlow 2s linear infinite',
            }}
          />
        )}
      </div>

      <div
        className="task-card-output-port"
        onMouseDown={(e) => onPortDragStart(e, task.id, 'output')}
        style={{
          position: 'absolute',
          right: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#1a202c',
          border: '2px solid #f56565',
          cursor: 'grab',
          zIndex: 10,
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#f56565';
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 0 8px rgba(245, 101, 101, 0.7)';
          (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#1a202c';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      />
    </div>
  );
};
