import { useState, useEffect, useRef } from 'react'
import { useMoodStore, MOOD_CONFIG } from '../store/moodStore'
import { getRelativeTime } from '../data/mockMoods'
import type { MoodEntry } from '../types'

interface MoodCardProps {
  mood: MoodEntry
  isNew: boolean
  index: number
}

function MoodCard({ mood, isNew, index }: MoodCardProps) {
  const config = MOOD_CONFIG[mood.mood]
  const [show, setShow] = useState(!isNew)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        setShow(true)
      }, index * 50)
      return () => clearTimeout(timer)
    }
  }, [isNew, index])

  return (
    <div
      ref={cardRef}
      className={`mood-card ${show ? 'mood-card-visible' : 'mood-card-hidden'}`}
      style={{
        borderLeft: `3px solid ${config.color}`,
        animationDelay: `${index * 0.05}s`
      }}
    >
      <div className="mood-card-emoji">{config.emoji}</div>
      <div className="mood-card-content">
        <div className="mood-card-location">{mood.location}</div>
        <div className="mood-card-time">{getRelativeTime(mood.timestamp)}</div>
      </div>
      <div
        className="mood-card-indicator"
        style={{ background: `linear-gradient(135deg, ${config.color}, ${config.gradient})` }}
      />
    </div>
  )
}

export default function MoodFeed() {
  const { moods, timeFilter, setTimeFilter, getFilteredMoods } = useMoodStore()
  const [displayMoods, setDisplayMoods] = useState<MoodEntry[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const prevMoodIdsRef = useRef<Set<string>>(new Set())

  const filteredMoods = getFilteredMoods()

  useEffect(() => {
    const currentIds = new Set(moods.map((m) => m.id))
    const newlyAdded = new Set<string>()

    moods.slice(0, 20).forEach((mood) => {
      if (!prevMoodIdsRef.current.has(mood.id)) {
        newlyAdded.add(mood.id)
      }
    })

    setNewIds(newlyAdded)
    setDisplayMoods(moods.slice(0, 20))
    prevMoodIdsRef.current = currentIds

    const timer = setTimeout(() => {
      setNewIds(new Set())
    }, 2000)

    return () => clearTimeout(timer)
  }, [moods])

  const filters: Array<{ key: 'today' | 'week' | 'month'; label: string }> = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' }
  ]

  return (
    <div className="mood-feed">
      <div className="mood-feed-header">
        <h2 className="mood-feed-title">心情动态</h2>
        <div className="mood-feed-count">
          共 <span className="count-number">{filteredMoods.length}</span> 条
        </div>
      </div>

      <div className="mood-feed-filters">
        {filters.map((filter) => (
          <button
            key={filter.key}
            className={`filter-btn ${timeFilter === filter.key ? 'filter-btn-active' : ''}`}
            onClick={() => setTimeFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mood-feed-legend">
        <div className="legend-title">情绪图例</div>
        <div className="legend-items">
          {Object.entries(MOOD_CONFIG).map(([key, config]) => (
            <div key={key} className="legend-item">
              <span className="legend-emoji">{config.emoji}</span>
              <span className="legend-name">{config.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mood-feed-list">
        {displayMoods.map((mood, index) => (
          <MoodCard
            key={mood.id}
            mood={mood}
            isNew={newIds.has(mood.id)}
            index={index}
          />
        ))}
        {displayMoods.length === 0 && (
          <div className="mood-feed-empty">
            <div className="empty-emoji">🌍</div>
            <div className="empty-text">还没有心情记录</div>
            <div className="empty-hint">点击地图标记你的心情吧</div>
          </div>
        )}
      </div>
    </div>
  )
}
