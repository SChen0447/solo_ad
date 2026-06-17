import { useState, useMemo } from 'react'
import { EmotionProvider } from '@/context/EmotionContext'
import CalendarGrid from '@/components/CalendarGrid'
import StatsPanel from '@/components/StatsPanel'

function AppContent() {
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [animationKey, setAnimationKey] = useState(0)

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]

  const years = useMemo(() => {
    const current = today.getFullYear()
    const result: number[] = []
    for (let y = current - 5; y <= current + 5; y++) {
      result.push(y)
    }
    return result
  }, [today])

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1)
        return 11
      }
      return prev - 1
    })
    setAnimationKey((k) => k + 1)
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1)
        return 0
      }
      return prev + 1
    })
    setAnimationKey((k) => k + 1)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentYear(parseInt(e.target.value))
    setAnimationKey((k) => k + 1)
  }

  const handleToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setAnimationKey((k) => k + 1)
  }

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">
            <span className="title-icon">🌈</span>
            情绪日历
          </h1>
          <p className="app-subtitle">记录每一天的心情变化</p>
        </header>

        <div className="calendar-card">
          <div className="calendar-header">
            <button className="nav-btn" onClick={handlePrevMonth} aria-label="上个月">
              ‹
            </button>

            <div className="month-year-display">
              <h2 className="month-label">{monthNames[currentMonth]}</h2>
              <select
                className="year-selector"
                value={currentYear}
                onChange={handleYearChange}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </div>

            <button className="nav-btn" onClick={handleNextMonth} aria-label="下个月">
              ›
            </button>
          </div>

          <button className="today-btn" onClick={handleToday}>
            今天
          </button>

          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            animationKey={animationKey}
          />
        </div>

        <div className="stats-card">
          <StatsPanel
            year={currentYear}
            month={currentMonth}
            animationKey={animationKey}
          />
        </div>

        <footer className="app-footer">
          <p>点击日期格子记录你的心情 ✨</p>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <EmotionProvider>
      <AppContent />
    </EmotionProvider>
  )
}
