import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, format, isToday
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Note, EmotionType } from '../types'
import NoteCard from './NoteCard'
import '../styles/CalendarView.css'

interface CalendarViewProps {
  notes: Note[]
  onEmotionFilter: (emotion: EmotionType) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function CalendarView({ notes, onEmotionFilter }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>()
    notes.forEach(note => {
      const date = new Date(note.createdAt)
      const key = format(date, 'yyyy-MM-dd')
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(note)
    })
    map.forEach(arr => arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return map
  }, [notes])

  const maxNotesCount = useMemo(() => {
    let max = 0
    notesByDate.forEach(arr => {
      if (arr.length > max) max = arr.length
    })
    return Math.max(max, 1)
  }, [notesByDate])

  const getCountColor = (count: number) => {
    const ratio = count / maxNotesCount
    if (count === 0) return null
    if (ratio <= 0.25) return { bg: '#A8E6CF, fg: '#27ae60'
    if (ratio <= 0.5) return { bg: '#FFEAA7', fg: '#f39c12'
    if (ratio <= 0.75) return { bg: '#fab1a0', fg: '#e17055'
    return { bg: '#FF6B6B', fg: '#c0392b'
  }

  const goToPrevMonth = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setCurrentMonth(subMonths(currentMonth, 1))
      setIsFlipping(false)
    }, 150)
  }

  const goToNextMonth = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setCurrentMonth(addMonths(currentMonth, 1))
      setIsFlipping(false)
    }, 150)
  }

  const goToToday = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setCurrentMonth(new Date())
      setIsFlipping(false)
    }, 150)
  }

  const selectedDateNotes = selectedDate
    ? notesByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : []

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
  }

  const closeModal = () => {
    setSelectedDate(null)
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={goToPrevMonth} title="上个月">
            ◀
          </button>
          <h2 className="calendar-title">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h2>
          <button className="nav-btn" onClick={goToNextMonth} title="下个月">
            ▶
          </button>
        </div>
        <button className="today-btn" onClick={goToToday}>
          今天
        </button>
      </div>

      <div className="calendar-legend">
        <span className="legend-label">便签数量：</span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#A8E6CF' }}></span>
          少
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#FFEAA7' }}></span>
          中
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#FF6B6B' }}></span>
          多
        </span>
      </div>

      <div className={`calendar-grid ${isFlipping ? 'flipping' : ''}`}>
        <div className="weekdays-row">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={`weekday-cell ${idx === 0 || idx === 6 ? 'weekend' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {calendarDays.map((day, index) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayNotes = notesByDate.get(dayKey) || []
          const count = dayNotes.length
          const countColor = getCountColor(count)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const inCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <div
              key={index}
              className={`day-cell
                ${!inCurrentMonth ? 'other-month' : ''}
                ${isToday(day) ? 'today' : ''}
                ${isSelected ? 'selected' : ''}
                ${(index % 7 === 0 || index % 7 === 6) && inCurrentMonth ? 'weekend' : ''}
              `}
              onClick={() => inCurrentMonth && handleDayClick(day)}
            >
              <div className="day-content">
                <span className="day-number">{format(day, 'd')}</span>
                {count > 0 && (
                  <div
                    className="count-badge"
                    style={{
                      backgroundColor: countColor?.bg,
                      color: countColor?.fg
                    }}
                  >
                    {count}
                  </div>
                )}
                {count > 0 && (
                  <div className="note-dots">
                    {dayNotes.slice(0, 3).map((note, i) => {
                      const dotColors: Record<EmotionType, string> = {
                        happy: '#FFD93D',
                        sad: '#74b9ff',
                        angry: '#FF6B6B',
                        calm: '#A8E6CF',
                        surprised: '#DDA0DD'
                      }
                      return (
                        <div
                          key={i}
                          className="emotion-dot"
                          style={{ backgroundColor: dotColors[note.emotion] }}
                          title={note.content.slice(0, 20)}
                        ></div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`day-detail-modal fade-in`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
                </h3>
                <p className="modal-subtitle">
                  {isToday(selectedDate) ? '今天' : ''}
                  {' '}
                  {selectedDateNotes.length > 0
                    ? `共 ${selectedDateNotes.length} 条便签`
                    : '当日无便签记录'}
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedDateNotes.length > 0 ? (
                <div className="timeline-notes">
                  <div className="timeline-line"></div>
                  {selectedDateNotes.map((note, idx) => (
                    <div
                      key={note.id}
                      className={`timeline-item fade-in`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="timeline-marker"></div>
                      <div className="timeline-time">
                        {format(new Date(note.createdAt), 'HH:mm')}
                      </div>
                      <div className="timeline-card-wrapper">
                        <NoteCard
                          note={note}
                          onEmotionClick={onEmotionFilter}
                          highlighted={idx === 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-day">
                  <div className="empty-day-icon">🗓️</div>
                  <h4>这一天没有便签</h4>
                  <p>回到列表视图记录新的灵感吧！</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
