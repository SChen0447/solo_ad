import { useEffect } from 'react'
import MapContainer from './map/MapContainer'
import MoodFeed from './sidebar/MoodFeed'
import { useMoodStore, MOOD_CONFIG } from './store/moodStore'
import { generateMockMoods } from './data/mockMoods'
import type { MoodType } from './types'

function NotificationBar() {
  const { notification } = useMoodStore()

  if (!notification) return null

  const config = MOOD_CONFIG[notification.mood as MoodType]

  return (
    <div
      className="notification-bar"
      style={{
        background: `linear-gradient(90deg, ${config.color}40, ${config.gradient}40)`
      }}
    >
      <span className="notification-emoji">{config.emoji}</span>
      <span className="notification-text">
        {notification.distance} 公里外有人刚标记了心情
      </span>
    </div>
  )
}

export default function App() {
  const { moods, addMood, currentMood } = useMoodStore()

  useEffect(() => {
    if (moods.length === 0) {
      const mockMoods = generateMockMoods(150)
      mockMoods.forEach((mood) => {
        addMood({
          mood: mood.mood,
          lat: mood.lat,
          lng: mood.lng,
          location: mood.location
        })
      })
    }
  }, [moods.length, addMood])

  const bgGradient = currentMood
    ? `linear-gradient(135deg, ${MOOD_CONFIG[currentMood].color}10, ${MOOD_CONFIG[currentMood].gradient}10)`
    : 'linear-gradient(135deg, #0f0f1a, #1a1a2e)'

  return (
    <div className="app" style={{ background: bgGradient }}>
      <NotificationBar />

      <div className="app-content">
        <div className="map-container">
          <MapContainer />
        </div>

        <div className="sidebar-container">
          <MoodFeed />
        </div>
      </div>

      <div className="app-footer">
        <span className="footer-text">🌍 心情地图 - 匿名分享你的情绪</span>
      </div>
    </div>
  )
}
