import { useMemo } from 'react'
import type { Task } from './types'
import { calcPriority, getUrgencyColor } from './App'

interface Props {
  tasks: Task[]
  onSchedule: (taskId: string, scheduledStart: number | undefined) => void
}

const urgencyColors: Record<Task['urgency'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e'
}

const urgencyLabels: Record<Task['urgency'], string> = {
  high: '高',
  medium: '中',
  low: '低'
}

const energyLabels: Record<Task['energy'], string> = {
  high: '大',
  medium: '中',
  low: '小'
}

export default function TaskList({ tasks, onSchedule }: Props) {
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => calcPriority(b) - calcPriority(a))
  }, [tasks])

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 12,
      scrollbarWidth: 'thin',
      scrollbarColor: '#d1d5db transparent'
    }}>
      <style>{`
        div::-webkit-scrollbar { width: 6px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        div::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(task => {
          const priority = Math.round(calcPriority(task))
          return (
            <div
              key={task.id}
              draggable
              onDragStart={e => handleDragStart(e, task)}
              style={{
                width: '100%',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'grab',
                transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
                userSelect: 'none'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 6,
                height: '100%',
                backgroundColor: getUrgencyColor(task.urgency),
                transition: 'background-color 0.2s ease'
              }} />
              <div style={{ padding: '12px 14px 12px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#111827',
                    lineHeight: 1.4,
                    flex: 1,
                    marginRight: 8
                  }}>{task.title}</h3>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: '#eff6ff',
                    color: '#3b82f6',
                    whiteSpace: 'nowrap'
                  }}>P{priority}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    background: task.urgency === 'high' ? '#fef2f2' : task.urgency === 'medium' ? '#fffbeb' : '#f0fdf4',
                    color: getUrgencyColor(task.urgency),
                    fontWeight: 500
                  }}>紧急：{urgencyLabels[task.urgency] ?? '中'}</span>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    background: '#f3f4f6', color: '#4b5563', fontWeight: 500
                  }}>精力：{energyLabels[task.energy] ?? '中'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    ⏱ {task.estimatedMinutes}分钟
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    📅 {task.dueDate}
                  </span>
                </div>
                {task.scheduledStart !== undefined && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
                      ✓ 已安排 {String(Math.floor(task.scheduledStart)).padStart(2, '0')}:{String(Math.round((task.scheduledStart % 1) * 60)).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => onSchedule(task.id, undefined)}
                      style={{
                        fontSize: 11, color: '#9ca3af', background: 'none', border: 'none',
                        cursor: 'pointer', padding: 2
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}
                    >取消</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            暂无任务，点击右上角 + 添加
          </div>
        )}
      </div>
    </div>
  )
}
