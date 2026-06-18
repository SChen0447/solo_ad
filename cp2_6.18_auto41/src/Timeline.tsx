import { useState, useRef, useCallback } from 'react'
import type { Task, ScheduleSuggestion } from './types'
import { getUrgencyColor } from './App'

interface Props {
  tasks: Task[]
  suggestions: ScheduleSuggestion[]
  onSchedule: (taskId: string, scheduledStart: number | undefined) => void
}

const HOUR_WIDTH = 60
const ROW_HEIGHT = 80
const DAY_START = 9
const DAY_END = 18
const TOTAL_HOURS = DAY_END - DAY_START

export default function Timeline({ tasks, suggestions, onSchedule }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragInfo, setDragInfo] = useState<{
    taskId: string
    offsetX: number
    currentX: number
    conflict: string | null
  } | null>(null)

  const checkConflict = useCallback((taskId: string, startHour: number, duration: number): Task | null => {
    const endHour = startHour + duration
    for (const t of tasks) {
      if (t.id === taskId || t.scheduledStart === undefined) continue
      const tStart = t.scheduledStart
      const tEnd = tStart + t.estimatedMinutes / 60
      if (startHour < tEnd && endHour > tStart) {
        return t
      }
    }
    return null
  }, [tasks])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId || !scrollRef.current) return
    const rect = scrollRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const startHour = Math.max(DAY_START, Math.min(DAY_END - task.estimatedMinutes / 60, x / HOUR_WIDTH + DAY_START))
    const snappedHour = Math.round(startHour * 4) / 4
    const conflict = checkConflict(taskId, snappedHour, task.estimatedMinutes / 60)
    setDragInfo({
      taskId,
      offsetX: 0,
      currentX: (snappedHour - DAY_START) * HOUR_WIDTH,
      conflict: conflict ? conflict.title : null
    })
  }, [tasks, checkConflict])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!dragInfo || !scrollRef.current) {
      setDragInfo(null)
      return
    }
    const task = tasks.find(t => t.id === dragInfo.taskId)
    if (!task) {
      setDragInfo(null)
      return
    }
    if (!dragInfo.conflict) {
      const startHour = dragInfo.currentX / HOUR_WIDTH + DAY_START
      onSchedule(task.id, startHour)
    }
    setDragInfo(null)
  }, [dragInfo, tasks, onSchedule])

  const handleDragLeave = useCallback(() => {
    setDragInfo(null)
  }, [])

  const hours: number[] = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)

  const scheduledTasks = tasks.filter(t => t.scheduledStart !== undefined)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        background: 'white'
      }}>
        <div style={{ width: 56, minWidth: 56, flexShrink: 0 }} />
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{
            display: 'flex',
            width: TOTAL_HOURS * HOUR_WIDTH + HOUR_WIDTH,
            position: 'relative'
          }}>
            {hours.map((h, i) => (
              <div key={h} style={{
                width: HOUR_WIDTH,
                padding: '10px 0',
                textAlign: 'center',
                fontSize: 12,
                color: i === hours.length - 1 ? '#9ca3af' : (i % 2 === 0 ? '#374151' : '#9ca3af'),
                fontWeight: i % 2 === 0 && i !== hours.length - 1 ? 600 : 400
              }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
          background: '#fcfcfc'
        }}
      >
        <style>{`
          div::-webkit-scrollbar { height: 8px; width: 8px; }
          div::-webkit-scrollbar-track { background: transparent; }
          div::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          div::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        `}</style>
        <div style={{ display: 'flex', width: 'fit-content' }}>
          <div style={{ width: 56, minWidth: 56, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: '#fcfcfc' }} />
          <div
            style={{
              position: 'relative',
              width: TOTAL_HOURS * HOUR_WIDTH + HOUR_WIDTH,
              height: ROW_HEIGHT + 40,
              minHeight: '100%'
            }}
          >
            {hours.map((h, i) => (
              <div key={h} style={{
                position: 'absolute',
                left: i * HOUR_WIDTH,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: '#e5e7eb',
                zIndex: 0
              }} />
            ))}
            {hours.slice(0, -1).map((h, i) => (
              <div key={`half-${h}`} style={{
                position: 'absolute',
                left: i * HOUR_WIDTH + HOUR_WIDTH / 2,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: '#e5e7eb',
                opacity: 0.5,
                zIndex: 0
              }} />
            ))}

            {suggestions.map(sug => {
              const task = tasks.find(t => t.id === sug.taskId)
              if (!task) return null
              const left = (sug.startTime - DAY_START) * HOUR_WIDTH
              const width = (task.estimatedMinutes / 60) * HOUR_WIDTH
              return (
                <div key={`sug-${sug.taskId}`} style={{
                  position: 'absolute',
                  top: 20,
                  left,
                  width,
                  height: ROW_HEIGHT,
                  border: '2px dashed #3b82f6',
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.06)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  <div style={{ padding: 8, fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
                    💡 {task.title}
                  </div>
                </div>
              )
            })}

            {scheduledTasks.map(task => {
              if (task.scheduledStart === undefined) return null
              const left = (task.scheduledStart - DAY_START) * HOUR_WIDTH
              const width = (task.estimatedMinutes / 60) * HOUR_WIDTH
              const isDragging = dragInfo?.taskId === task.id
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('taskId', task.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: isDragging ? dragInfo!.currentX : left,
                    width,
                    minWidth: 60,
                    height: ROW_HEIGHT,
                    background: isDragging && dragInfo!.conflict ? '#fee2e2' : 'white',
                    border: `1px solid ${isDragging && dragInfo!.conflict ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: 10,
                    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: isDragging ? 'none' : 'all 0.25s ease-out',
                    cursor: 'grab',
                    zIndex: isDragging ? 10 : 2,
                    opacity: isDragging && dragInfo!.conflict ? 0.85 : 1,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 5,
                    height: '100%',
                    backgroundColor: getUrgencyColor(task.urgency),
                    transition: 'background-color 0.2s ease'
                  }} />
                  <div style={{ padding: '8px 10px 8px 14px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4
                    }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {String(Math.floor(task.scheduledStart)).padStart(2, '0')}:{String(Math.round((task.scheduledStart % 1) * 60)).padStart(2, '0')} - {String(Math.floor(task.scheduledStart + task.estimatedMinutes / 60)).padStart(2, '0')}:{String(Math.round(((task.scheduledStart + task.estimatedMinutes / 60) % 1) * 60)).padStart(2, '0')}
                    </div>
                    <div style={{ marginTop: 'auto', fontSize: 10, color: '#9ca3af' }}>
                      ⏱ {task.estimatedMinutes}分钟
                    </div>
                  </div>
                </div>
              )
            })}

            {dragInfo && dragInfo.conflict && (
              <div style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 14px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                fontSize: 12,
                color: '#dc2626',
                fontWeight: 500,
                zIndex: 20,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
              }}>
                ⚠️ 与「{dragInfo.conflict}」任务冲突，请调整时间段
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
