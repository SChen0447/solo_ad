import { useMemo } from 'react'
import { useEmotion } from '@/context/EmotionContext'
import { EMOTIONS, EmotionType } from '@/types'

interface StatsPanelProps {
  year: number
  month: number
  animationKey: number
}

export default function StatsPanel({ year, month, animationKey }: StatsPanelProps) {
  const { getMonthRecords } = useEmotion()

  const stats = useMemo(() => {
    const records = getMonthRecords(year, month)
    const countMap: Record<EmotionType, number> = {} as Record<EmotionType, number>

    Object.values(EmotionType).forEach((type) => {
      countMap[type] = 0
    })

    records.forEach((record) => {
      if (countMap[record.emotion] !== undefined) {
        countMap[record.emotion]++
      }
    })

    const maxCount = Math.max(...Object.values(countMap), 1)
    const total = records.length

    return {
      countMap,
      maxCount,
      total
    }
  }, [year, month, getMonthRecords])

  const emotions = Object.values(EMOTIONS)

  return (
    <div className="stats-panel" key={animationKey}>
      <div className="stats-header">
        <h3 className="stats-title">本月情绪统计</h3>
        <span className="stats-total">共 {stats.total} 天记录</span>
      </div>
      <div className="bar-chart">
        {emotions.map((emotion, index) => {
          const count = stats.countMap[emotion.type]
          const heightPercent = stats.maxCount > 0 ? (count / stats.maxCount) * 100 : 0

          return (
            <div key={emotion.type} className="bar-item">
              <div className="bar-label-top">{count > 0 ? count : ''}</div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    background: `linear-gradient(to top, ${emotion.colorEnd}, ${emotion.colorStart})`,
                    height: `${heightPercent}%`,
                    animationDelay: `${index * 80}ms`
                  }}
                />
              </div>
              <div className="bar-emoji">{emotion.emoji}</div>
              <div className="bar-label">{emotion.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
