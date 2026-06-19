import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import MapContainer from './modules/map/MapContainer'
import SidePanel from './modules/ui/SidePanel'
import StatsCard from './modules/ui/StatsCard'
import { DataManager, type Landmark, type TravelImage } from './modules/data/DataManager'

const dataManager = new DataManager()

const currentYear = new Date().getFullYear()

function App() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([])
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null)
  const [yearRange, setYearRange] = useState<[number, number]>([2000, currentYear])
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    const loaded = dataManager.loadLandmarks()
    setLandmarks(loaded)
    if (loaded.length > 0) {
      const years = loaded.map(l => new Date(l.arrivalDate).getFullYear())
      const minYear = Math.min(...years)
      setYearRange([minYear, currentYear])
    }
  }, [])

  useEffect(() => {
    dataManager.saveLandmarks(landmarks)
  }, [landmarks])

  const handleAddLandmark = useCallback((lat: number, lng: number) => {
    const today = new Date()
    const newLandmark: Landmark = {
      id: uuidv4(),
      cityName: '新地标',
      lat,
      lng,
      arrivalDate: today.toISOString().split('T')[0],
      stayDays: 1,
      images: [],
      notes: '',
    }
    setLandmarks(prev => [...prev, newLandmark])
    setSelectedLandmarkId(newLandmark.id)
  }, [])

  const handleUpdateLandmark = useCallback((id: string, updates: Partial<Landmark>) => {
    setLandmarks(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const handleDeleteLandmark = useCallback((id: string) => {
    setLandmarks(prev => prev.filter(l => l.id !== id))
    if (selectedLandmarkId === id) {
      setSelectedLandmarkId(null)
    }
  }, [selectedLandmarkId])

  const handleAddImages = useCallback((id: string, files: FileList) => {
    const imageFiles = Array.from(files).slice(0, 5)
    const readers = imageFiles.map(file => {
      return new Promise<TravelImage>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            id: uuidv4(),
            title: file.name.replace(/\.[^/.]+$/, ''),
            dataUrl: e.target?.result as string,
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then(newImages => {
      setLandmarks(prev => prev.map(l => {
        if (l.id === id) {
          const combined = [...l.images, ...newImages].slice(0, 5)
          return { ...l, images: combined }
        }
        return l
      }))
    })
  }, [])

  const handleRemoveImage = useCallback((landmarkId: string, imageId: string) => {
    setLandmarks(prev => prev.map(l => {
      if (l.id === landmarkId) {
        return { ...l, images: l.images.filter(img => img.id !== imageId) }
      }
      return l
    }))
  }, [])

  const handleClearAll = useCallback(() => {
    setLandmarks([])
    setSelectedLandmarkId(null)
    setShowClearConfirm(false)
  }, [])

  const selectedLandmark = useMemo(() => {
    return landmarks.find(l => l.id === selectedLandmarkId) || null
  }, [landmarks, selectedLandmarkId])

  const sortedLandmarks = useMemo(() => {
    return [...landmarks].sort((a, b) =>
      new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    )
  }, [landmarks])

  const filteredLandmarks = useMemo(() => {
    return sortedLandmarks.filter(l => {
      const year = new Date(l.arrivalDate).getFullYear()
      return year >= yearRange[0] && year <= yearRange[1]
    })
  }, [sortedLandmarks, yearRange])

  const stats = useMemo(() => {
    const total = filteredLandmarks.length
    let totalKm = 0
    for (let i = 1; i < filteredLandmarks.length; i++) {
      totalKm += dataManager.calculateDistance(
        filteredLandmarks[i - 1].lat, filteredLandmarks[i - 1].lng,
        filteredLandmarks[i].lat, filteredLandmarks[i].lng
      )
    }

    let maxStreak = 0
    let currentStreak = 0
    const byYear = new Map<number, Landmark[]>()
    filteredLandmarks.forEach(l => {
      const y = new Date(l.arrivalDate).getFullYear()
      if (!byYear.has(y)) byYear.set(y, [])
      byYear.get(y)!.push(l)
    })

    byYear.forEach(marks => {
      const sorted = [...marks].sort((a, b) =>
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
      )
      let run = 0
      for (let i = 0; i < sorted.length; i++) {
        run += sorted[i].stayDays
        if (i > 0) {
          const gap = (new Date(sorted[i].arrivalDate).getTime() -
            new Date(sorted[i - 1].arrivalDate).getTime()) / (1000 * 60 * 60 * 24)
          if (gap <= 2) {
            run += Math.floor(gap)
          } else {
            maxStreak = Math.max(maxStreak, run)
            run = sorted[i].stayDays
          }
        }
      }
      maxStreak = Math.max(maxStreak, run)
    })
    currentStreak = maxStreak

    return { total, totalKm: Math.round(totalKm), maxStreak }
  }, [filteredLandmarks])

  return (
    <div className="app">
      <div className="header">
        <div className="logo-area">
          <div className="logo-3d">
            <div className="logo-face logo-front">MemoryMap</div>
            <div className="logo-face logo-back">旅行足迹</div>
          </div>
        </div>

        <div className="year-slider-container">
          <div className="year-label">
            <span>{yearRange[0]}</span>
            <span className="year-divider">—</span>
            <span>{yearRange[1]}</span>
          </div>
          <div className="slider-wrapper">
            <input
              type="range"
              min={2000}
              max={currentYear}
              value={yearRange[0]}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setYearRange(prev => [Math.min(val, prev[1]), prev[1]])
              }}
              className="year-slider year-slider-start"
            />
            <input
              type="range"
              min={2000}
              max={currentYear}
              value={yearRange[1]}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setYearRange(prev => [prev[0], Math.max(val, prev[0])])
              }}
              className="year-slider year-slider-end"
            />
            <div
              className="slider-track"
              style={{
                left: `${((yearRange[0] - 2000) / (currentYear - 2000)) * 100}%`,
                width: `${((yearRange[1] - yearRange[0]) / (currentYear - 2000)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <MapContainer
        landmarks={sortedLandmarks}
        filteredIds={filteredLandmarks.map(l => l.id)}
        onMapClick={handleAddLandmark}
        onMarkerClick={(id) => setSelectedLandmarkId(id)}
      />

      <SidePanel
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmarkId(null)}
        onUpdate={handleUpdateLandmark}
        onDelete={handleDeleteLandmark}
        onAddImages={handleAddImages}
        onRemoveImage={handleRemoveImage}
      />

      <StatsCard
        total={stats.total}
        totalKm={stats.totalKm}
        maxStreak={stats.maxStreak}
      />

      <button
        className="clear-btn"
        onClick={() => setShowClearConfirm(true)}
      >
        清除所有数据
      </button>

      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认清除</h3>
            <p>此操作将永久删除所有旅行数据，且无法恢复。确定要继续吗？</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleClearAll}>
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
