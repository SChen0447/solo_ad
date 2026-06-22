import { useState, useMemo, useRef, useEffect } from 'react'
import type { Task } from '@/types'
import { useApp } from '@/context/AppContext'

interface Props {
  tasks: Task[]
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

const typeLabels: Record<Task['type'], string> = {
  water: '浇水',
  fertilize: '施肥',
  harvest: '收获',
}

export default function CalendarView({ tasks }: Props) {
  const { toggleTask } = useApp()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedDate(null)
      }
    }
    if (selectedDate) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedDate])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date)!.push(t)
    })
    return map
  }, [tasks])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const result: { date: Date; inMonth: boolean }[] = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      result.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        inMonth: false,
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      result.push({ date: new Date(year, month, i), inMonth: true })
    }

    const remaining = 42 - result.length
    for (let i = 1; i <= remaining; i++) {
      result.push({ date: new Date(year, month + 1, i), inMonth: false })
    }

    return result
  }, [currentMonth])

  const goPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const handleDateClick = (date: Date, e: React.MouseEvent) => {
    const key = dateKey(date)
    if (!tasksByDate.has(key)) {
      setSelectedDate(null)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setSelectedDate(key)
    setPopupPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    })
  }

  const selectedTasks = selectedDate ? tasksByDate.get(selectedDate) || [] : []
  const todayStr = dateKey(today)
  const hasOverdue = selectedTasks.some((t) => !t.completed && t.date < todayStr)

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title">
          {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
        </div>
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={goPrevMonth}>
            ‹
          </button>
          <button className="calendar-today-btn" onClick={goToday}>
            今天
          </button>
          <button className="calendar-nav-btn" onClick={goNextMonth}>
            ›
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map(({ date, inMonth }) => {
          const key = dateKey(date)
          const dayTasks = tasksByDate.get(key) || []
          const isToday = isSameDay(date, today)
          const isSelected = selectedDate === key
          const hasWater = dayTasks.some((t) => t.type === 'water')
          const hasFertilize = dayTasks.some((t) => t.type === 'fertilize')
          const hasHarvest = dayTasks.some((t) => t.type === 'harvest')

          return (
            <div
              key={key}
              className={`calendar-cell ${!inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${
                isSelected ? 'selected' : ''
              }`}
              onClick={(e) => handleDateClick(date, e)}
            >
              <div className="calendar-date-number">{date.getDate()}</div>
              {dayTasks.length > 0 && (
                <div className="calendar-markers">
                  {hasHarvest && <span className="calendar-harvest">★</span>}
                  {hasWater && <span className="calendar-dot water" />}
                  {hasFertilize && <span className="calendar-dot fertilize" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && selectedTasks.length > 0 && (
        <div
          ref={popupRef}
          className={`task-popup ${hasOverdue ? 'overdue' : ''}`}
          style={{
            left: popupPos.x,
            top: popupPos.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="task-popup-title">{selectedDate} 待办事项</div>
          {selectedTasks.map((task) => (
            <div key={task.id} className="task-item">
              <button
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task.planId, task.id)}
              >
                {task.completed && '✓'}
              </button>
              <span className={`task-label ${task.completed ? 'completed' : ''}`}>
                {task.plantName}
              </span>
              <span className={`task-type-badge ${task.type}`}>{typeLabels[task.type]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { addDays }
