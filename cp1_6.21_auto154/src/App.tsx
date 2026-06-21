import { useEffect, useRef, useState, useCallback } from 'react'
import { SceneManager, type WeatherType } from './scene'
import { WeatherManager } from './weather'

const weatherOptions: { type: WeatherType; name: string; desc: string; icon: string }[] = [
  { type: 'sunny', name: '晴天', desc: '明亮暖色调，阴影清晰，远处有光晕', icon: '☀️' },
  { type: 'cloudy', name: '多云', desc: '柔和冷白色，阴影模糊，树冠轻微摇摆', icon: '⛅' },
  { type: 'rainy', name: '雨天', desc: '灰蓝色调，雨线粒子，地面涟漪', icon: '🌧️' },
  { type: 'snowy', name: '雪天', desc: '白色调，雪花飘落，地面覆盖白雪', icon: '❄️' },
  { type: 'thunderstorm', name: '雷暴', desc: '深灰色调，闪电闪光，暴雨倾盆', icon: '⛈️' },
]

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const weatherManagerRef = useRef<WeatherManager | null>(null)
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const [currentWeather, setCurrentWeather] = useState<WeatherType>('sunny')
  const [windSpeed, setWindSpeed] = useState(3)
  const [timeOfDay, setTimeOfDay] = useState(12)
  const [infoVisible, setInfoVisible] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const sceneManager = new SceneManager(containerRef.current)
    sceneManagerRef.current = sceneManager

    const weatherManager = new WeatherManager(sceneManager)
    weatherManagerRef.current = weatherManager

    weatherManager.setWeather('sunny')

    const animate = (time: number) => {
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      sceneManager.animate(delta)
      weatherManager.animate(delta, time / 1000)

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      weatherManager.dispose()
      sceneManager.dispose()
    }
  }, [])

  const handleWeatherChange = useCallback((weather: WeatherType) => {
    setCurrentWeather(weather)
    setInfoVisible(false)
    
    setTimeout(() => {
      setInfoVisible(true)
    }, 100)

    if (weatherManagerRef.current) {
      weatherManagerRef.current.setWeather(weather)
    }
  }, [])

  const handleWindSpeedChange = useCallback((value: number) => {
    setWindSpeed(value)
    if (weatherManagerRef.current) {
      weatherManagerRef.current.setWindSpeed(value)
    }
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setParams({ windSpeed: value })
    }
  }, [])

  const handleTimeChange = useCallback((value: number) => {
    setTimeOfDay(value)
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setParams({ timeOfDay: value })
    }
  }, [])

  const currentWeatherInfo = weatherOptions.find(w => w.type === currentWeather)

  const formatTime = (hour: number) => {
    const h = Math.floor(hour)
    const m = Math.floor((hour - h) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  return (
    <div className="app-container">
      <div ref={containerRef} className="canvas-container" />

      <div className="weather-switcher">
        {weatherOptions.map((weather) => (
          <button
            key={weather.type}
            className={`weather-button ${currentWeather === weather.type ? 'active' : ''}`}
            onClick={() => handleWeatherChange(weather.type)}
          >
            <span className="weather-icon-btn">{weather.icon}</span>
            <span>{weather.name}</span>
            <span className="underline" />
          </button>
        ))}
      </div>

      <div className="control-panel">
        <div className="panel-title">场景参数</div>

        <div className="control-group">
          <div className="control-label">
            <span>风速</span>
            <span className="control-value">{windSpeed.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={windSpeed}
            onChange={(e) => handleWindSpeedChange(parseFloat(e.target.value))}
            className="slider"
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>时间</span>
            <span className="control-value">{formatTime(timeOfDay)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            step="0.1"
            value={timeOfDay}
            onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
            className="slider"
          />
        </div>
      </div>

      <div className="weather-info" style={{ opacity: infoVisible ? 1 : 0 }}>
        <div className="weather-icon">{currentWeatherInfo?.icon}</div>
        <div className="weather-info-name">{currentWeatherInfo?.name}</div>
        <div className="weather-info-desc">{currentWeatherInfo?.desc}</div>
      </div>
    </div>
  )
}

export default App
