import React from 'react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { useStore, MoodType } from '../store'

dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)

const moodColors: Record<MoodType, string> = {
  happy: 'var(--mood-happy)',
  calm: 'var(--mood-calm)',
  moved: 'var(--mood-moved)',
  anxious: 'var(--mood-anxious)',
  tired: 'var(--mood-tired)',
  surprise: 'var(--mood-surprise)',
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TimelinePanel() {
  const { currentView, selectedDate, setSelectedDate, entries } = useStore()
  const [animKey, setAnimKey] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    setIsAnimating(true)
    const t = setTimeout(() => setIsAnimating(false), 200)
    return () => clearTimeout(t)
  }, [currentView])

  const today = dayjs()

  const handleDateClick = (date: dayjs.Dayjs) => {
    const iso = date.toISOString()
    if (selectedDate && dayjs(selectedDate).isSame(date, 'day')) {
      setSelectedDate(null)
    } else {
      setSelectedDate(iso)
    }
    setAnimKey(k => k + 1)
  }

  return (
    <div
      key={`${currentView}-${animKey}`}
      className={isAnimating ? 'fade-out' : 'fade-in'}
      style={{ opacity: 1 }}
    >
      {currentView === 'week' ? (
        <WeekView
          today={today}
          selectedDate={selectedDate}
          entries={entries}
          onDateClick={handleDateClick}
        />
      ) : (
        <MonthView
          today={today}
          selectedDate={selectedDate}
          entries={entries}
          onDateClick={handleDateClick}
        />
      )}
    </div>
  )
}

function WeekView({
  today,
  selectedDate,
  entries,
  onDateClick,
}: {
  today: dayjs.Dayjs
  selectedDate: string | null
  entries: ReturnType<typeof useStore.getState>['entries']
  onDateClick: (d: dayjs.Dayjs) => void
}) {
  const startOfWeek = today.startOf('week').add(1, 'day')
  const weekDates = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'))

  const datesWithEntries = React.useMemo(() => {
    const map: Record<string, MoodType[]> = {}
    entries.forEach(e => {
      const key = dayjs(e.date).format('YYYY-MM-DD')
      if (!map[key]) map[key] = []
      map[key].push(e.mood)
    })
    return map
  }, [entries])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 8,
    }}>
      {weekDates.map((date, idx) => {
        const dateKey = date.format('YYYY-MM-DD')
        const isToday = date.isSame(today, 'day')
        const isSelected = selectedDate && dayjs(selectedDate).isSame(date, 'day')
        const hasEntry = datesWithEntries[dateKey]

        return (
          <div
            key={idx}
            onClick={() => onDateClick(date)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 6px',
              borderRadius: 10,
              cursor: 'pointer',
              border: isToday ? '2px solid var(--brand-green-light)' : isSelected ? '2px solid var(--brand-green)' : '2px solid transparent',
              background: isSelected ? 'rgba(46, 125, 111, 0.08)' : 'transparent',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 12,
              color: 'var(--gray-medium)',
              marginBottom: 6,
              fontWeight: 500,
            }}>
              {weekDays[idx]}
            </span>
            <span style={{
              fontSize: 18,
              fontWeight: isToday || isSelected ? 700 : 500,
              color: isToday ? 'var(--brand-green-dark)' : '#333',
              marginBottom: 6,
            }}>
              {date.date()}
            </span>
            {hasEntry && (
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--brand-green)',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function MonthView({
  today,
  selectedDate,
  entries,
  onDateClick,
}: {
  today: dayjs.Dayjs
  selectedDate: string | null
  entries: ReturnType<typeof useStore.getState>['entries']
  onDateClick: (d: dayjs.Dayjs) => void
}) {
  const year = today.year()
  const month = today.month()

  const firstDayOfMonth = dayjs(`${year}-${month + 1}-01`)
  const startDayOfWeek = (firstDayOfMonth.day() + 6) % 7

  const calendarCells: (dayjs.Dayjs | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null)
  }
  const daysInMonth = firstDayOfMonth.daysInMonth()
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(dayjs(`${year}-${month + 1}-${i}`))
  }
  while (calendarCells.length < 42) {
    calendarCells.push(null)
  }

  const datesWithEntries = React.useMemo(() => {
    const map: Record<string, MoodType[]> = {}
    entries.forEach(e => {
      const key = dayjs(e.date).format('YYYY-MM-DD')
      if (!map[key]) map[key] = []
      map[key].push(e.mood)
    })
    return map
  }, [entries])

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 12,
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--deep-brown)',
      }}>
        {today.format('YYYY 年 M 月')}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
      }}>
        {weekDays.map(w => (
          <div key={w} style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--gray-medium)',
            padding: '4px 0',
            fontWeight: 500,
          }}>
            {w}
          </div>
        ))}
        {calendarCells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} style={{ minHeight: 52 }} />
          }
          const dateKey = date.format('YYYY-MM-DD')
          const isToday = date.isSame(today, 'day')
          const isSelected = selectedDate && dayjs(selectedDate).isSame(date, 'day')
          const moods = datesWithEntries[dateKey] || []

          return (
            <div
              key={idx}
              onClick={() => onDateClick(date)}
              style={{
                position: 'relative',
                minHeight: 52,
                padding: '6px 4px',
                borderRadius: 8,
                cursor: 'pointer',
                border: isToday ? '1.5px solid var(--brand-green-light)' : isSelected ? '1.5px solid var(--brand-green)' : '1.5px solid transparent',
                background: isSelected ? 'rgba(46, 125, 111, 0.08)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 4,
                left: 6,
                fontSize: 12,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isToday ? 'var(--brand-green-dark)' : '#444',
              }}>
                {date.date()}
              </span>
              {moods.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                }}>
                  {moods.slice(0, 3).map((m, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: moodColors[m],
                        marginLeft: i > 0 ? -3 : 0,
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
