import { useState, useMemo } from 'react'
import { useEmotion } from '@/context/EmotionContext'
import { EMOTIONS, EmotionType } from '@/types'
import EmotionPicker from './EmotionPicker'

interface CalendarGridProps {
  year: number
  month: number
  animationKey: number
}

interface CalendarDay {
  date: Date
  dateStr: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  emotion?: EmotionType
  memo?: string
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export default function CalendarGrid({ year, month, animationKey }: CalendarGridProps) {
  const { getRecordByDate, addOrUpdateRecord, deleteRecord } = useEmotion()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })

  const today = useMemo(() => new Date(), [])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: CalendarDay[] = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dateStr = formatDate(date)
      const record = getRecordByDate(dateStr)
      days.push({
        date,
        dateStr,
        dayOfMonth: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        emotion: record?.emotion,
        memo: record?.memo
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const dateStr = formatDate(date)
      const record = getRecordByDate(dateStr)
      days.push({
        date,
        dateStr,
        dayOfMonth: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        emotion: record?.emotion,
        memo: record?.memo
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      const dateStr = formatDate(date)
      const record = getRecordByDate(dateStr)
      days.push({
        date,
        dateStr,
        dayOfMonth: i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        emotion: record?.emotion,
        memo: record?.memo
      })
    }

    return days
  }, [year, month, getRecordByDate, today])

  const handleDayClick = (day: CalendarDay, event: React.MouseEvent) => {
    if (!day.isCurrentMonth) return
    const rect = event.currentTarget.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    })
    setSelectedDate(day.dateStr)
  }

  const handleEmotionSelect = (emotion: EmotionType, memo?: string) => {
    if (selectedDate) {
      addOrUpdateRecord(selectedDate, emotion, memo)
    }
    setSelectedDate(null)
  }

  const handleClosePicker = () => {
    setSelectedDate(null)
  }

  const handleDelete = () => {
    if (selectedDate) {
      const record = getRecordByDate(selectedDate)
      if (record) {
        deleteRecord(record.id)
      }
    }
    setSelectedDate(null)
  }

  const getDayBackground = (day: CalendarDay): string => {
    if (!day.emotion || !day.isCurrentMonth) return ''
    const emotionInfo = EMOTIONS[day.emotion]
    return `linear-gradient(135deg, ${emotionInfo.colorStart}, ${emotionInfo.colorEnd})`
  }

  const selectedRecord = selectedDate ? getRecordByDate(selectedDate) : undefined

  return (
    <div className="calendar-wrapper">
      <div className="weekday-header">
        {weekDays.map((day, index) => (
          <div key={day} className={`weekday ${index === 0 || index === 6 ? 'weekend' : ''}`}>
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid" key={animationKey}>
        {calendarDays.map((day, index) => (
          <div
            key={day.dateStr}
            className={`day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.emotion && day.isCurrentMonth ? 'has-emotion' : ''}`}
            style={{
              background: getDayBackground(day),
              animationDelay: `${index * 15}ms`
            }}
            onClick={(e) => handleDayClick(day, e)}
          >
            <span className="day-number">{day.dayOfMonth}</span>
            {day.emotion && day.isCurrentMonth && (
              <span className="day-emoji">{EMOTIONS[day.emotion].emoji}</span>
            )}
            {day.memo && day.isCurrentMonth && (
              <div className="memo-tooltip">{day.memo}</div>
            )}
          </div>
        ))}
      </div>

      {selectedDate && (
        <EmotionPicker
          isOpen={!!selectedDate}
          onClose={handleClosePicker}
          onSelect={handleEmotionSelect}
          onDelete={handleDelete}
          selectedEmotion={selectedRecord?.emotion}
          initialMemo={selectedRecord?.memo}
          position={pickerPosition}
          date={selectedDate}
        />
      )}
    </div>
  )
}
