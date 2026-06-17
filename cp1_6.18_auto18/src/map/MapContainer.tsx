import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { MapContainer as LeafletMap, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng, MoodType, MoodEntry, HeatmapPoint } from '../types'
import { useMoodStore, MOOD_CONFIG } from '../store/moodStore'
import { getAbstractLocation, calculateDistance } from '../data/mockMoods'

const CLUSTER_THRESHOLD = 200
const HEATMAP_GRID_SIZE = 0.5

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

function MoodMarker({ mood }: { mood: MoodEntry }) {
  const map = useMap()
  const markerRef = useRef<L.CircleMarker | null>(null)
  const [isNew, setIsNew] = useState(Date.now() - mood.timestamp < 3000)

  useEffect(() => {
    const config = MOOD_CONFIG[mood.mood]
    const marker = L.circleMarker([mood.lat, mood.lng], {
      radius: 10,
      fillColor: config.color,
      color: config.gradient,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.7,
      className: `mood-marker mood-${mood.mood} ${isNew ? 'marker-new' : ''}`
    })

    marker.addTo(map)
    markerRef.current = marker

    if (isNew) {
      const timer = setTimeout(() => {
        setIsNew(false)
        marker.getElement()?.classList.remove('marker-new')
      }, 2000)
      return () => clearTimeout(timer)
    }

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
      }
    }
  }, [map, mood, isNew])

  return null
}

function HeatmapLayer({ points, zoom }: { points: HeatmapPoint[]; zoom: number }) {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)
  const prevZoomRef = useRef(zoom)

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map)
    }

    const layer = layerRef.current
    const zoomDiff = Math.abs(zoom - prevZoomRef.current)

    layer.eachLayer((l) => {
      const el = (l as L.CircleMarker).getElement()
      if (el) {
        el.classList.add('heatpoint-fade-out')
      }
    })

    setTimeout(() => {
      layer.clearLayers()

      points.forEach((point, index) => {
        const config = MOOD_CONFIG[point.mood]
        const baseRadius = 8 + zoom * 1.5
        const radius = baseRadius + point.intensity * 5

        const heatpoint = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: config.color,
          color: config.gradient,
          weight: point.count > 5 ? 3 : 1,
          opacity: 0.6 + point.intensity * 0.3,
          fillOpacity: 0.3 + point.intensity * 0.4,
          className: `heatpoint heatpoint-${point.mood}`
        })

        if (point.count > 1) {
          const icon = L.divIcon({
            html: `<div class="heatpoint-count">${point.count}</div>`,
            className: 'heatpoint-label',
            iconSize: [24, 24]
          })
          const label = L.marker([point.lat, point.lng], { icon, interactive: false })
          layer.addLayer(label)
        }

        layer.addLayer(heatpoint)

        setTimeout(() => {
          const el = heatpoint.getElement()
          if (el) {
            el.classList.add('heatpoint-fade-in')
          }
        }, index * 20)
      })
    }, zoomDiff > 2 ? 300 : 150)

    prevZoomRef.current = zoom

    return () => {}
  }, [points, zoom, map])

  return null
}

export default function MapContainer() {
  const { moods, addMood, getFilteredMoods, setNotification, currentMood } = useMoodStore()
  const [clickPosition, setClickPosition] = useState<LatLng | null>(null)
  const [showSelector, setShowSelector] = useState(false)
  const [zoom, setZoom] = useState(3)
  const [useClustering, setUseClustering] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  const popupRef = useRef<L.Popup | null>(null)

  const filteredMoods = useMemo(() => getFilteredMoods(), [moods, getFilteredMoods])

  useEffect(() => {
    setUseClustering(filteredMoods.length > CLUSTER_THRESHOLD)
  }, [filteredMoods.length])

  const heatmapPoints = useMemo(() => {
    const gridSize = HEATMAP_GRID_SIZE / (zoom / 3)
    const grid = new Map<string, { count: number; moods: Map<MoodType, number>; lat: number; lng: number }>()

    filteredMoods.forEach((mood) => {
      const gridLat = Math.floor(mood.lat / gridSize) * gridSize + gridSize / 2
      const gridLng = Math.floor(mood.lng / gridSize) * gridSize + gridSize / 2
      const key = `${gridLat.toFixed(3)}-${gridLng.toFixed(3)}`

      if (!grid.has(key)) {
        grid.set(key, { count: 0, moods: new Map(), lat: gridLat, lng: gridLng })
      }

      const cell = grid.get(key)!
      cell.count++
      cell.moods.set(mood.mood, (cell.moods.get(mood.mood) || 0) + 1)
    })

    const points: HeatmapPoint[] = []
    grid.forEach((cell) => {
      let dominantMood: MoodType = 'happy'
      let maxCount = 0
      cell.moods.forEach((count, mood) => {
        if (count > maxCount) {
          maxCount = count
          dominantMood = mood
        }
      })

      const intensity = Math.min(1, cell.count / 10)
      points.push({
        lat: cell.lat,
        lng: cell.lng,
        intensity,
        mood: dominantMood,
        count: cell.count
      })
    })

    return points
  }, [filteredMoods, zoom])

  const handleMapClick = useCallback((latlng: LatLng) => {
    setClickPosition(latlng)
    setShowSelector(true)

    if (mapRef.current && popupRef.current) {
      mapRef.current.closePopup()
    }

    if (mapRef.current) {
      const popup = L.popup({
        className: 'mood-popup',
        closeButton: false,
        autoClose: false,
        closeOnClick: false
      })
        .setLatLng([latlng.lat, latlng.lng])
        .setContent('<div id="mood-selector-container"></div>')
        .openOn(mapRef.current)

      popupRef.current = popup
    }
  }, [])

  const handleMoodSelect = useCallback((mood: MoodType) => {
    if (!clickPosition) return

    const location = getAbstractLocation(clickPosition.lat, clickPosition.lng)
    addMood({
      mood,
      lat: clickPosition.lat,
      lng: clickPosition.lng,
      location
    })

    if (filteredMoods.length > 0) {
      const randomMood = filteredMoods[Math.floor(Math.random() * Math.min(10, filteredMoods.length))]
      const distance = calculateDistance(
        clickPosition.lat,
        clickPosition.lng,
        randomMood.lat,
        randomMood.lng
      )
      setNotification({ distance, mood: randomMood.mood })

      setTimeout(() => {
        setNotification(null)
      }, 4000)
    }

    setShowSelector(false)
    setClickPosition(null)

    if (popupRef.current && mapRef.current) {
      mapRef.current.closePopup()
    }
  }, [clickPosition, addMood, filteredMoods, setNotification])

  useEffect(() => {
    if (!showSelector || !clickPosition) return

    const container = document.getElementById('mood-selector-container')
    if (!container) return

    container.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'mood-selector'

    const moodTypes: MoodType[] = ['happy', 'calm', 'sad', 'angry', 'surprised', 'loved']

    moodTypes.forEach((mood) => {
      const config = MOOD_CONFIG[mood]
      const button = document.createElement('button')
      button.className = `mood-btn mood-btn-${mood}`
      button.innerHTML = `<span class="mood-emoji">${config.emoji}</span>`
      button.title = config.name
      button.style.background = `linear-gradient(135deg, ${config.color}40, ${config.gradient}40)`
      button.onclick = () => handleMoodSelect(mood)
      wrapper.appendChild(button)
    })

    container.appendChild(wrapper)
  }, [showSelector, clickPosition, handleMoodSelect])

  useEffect(() => {
    const handleZoom = () => {
      if (mapRef.current) {
        setZoom(mapRef.current.getZoom())
      }
    }

    if (mapRef.current) {
      mapRef.current.on('zoom', handleZoom)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoom', handleZoom)
      }
    }
  }, [])

  const bgGradient = currentMood
    ? `linear-gradient(135deg, ${MOOD_CONFIG[currentMood].color}20, ${MOOD_CONFIG[currentMood].gradient}20)`
    : 'linear-gradient(135deg, #1a1a2e20, #16213e20)'

  return (
    <div className="map-wrapper" style={{ background: bgGradient }}>
      <LeafletMap
        ref={mapRef as any}
        center={[20, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={10}
        worldCopyJump={true}
        className="mood-map"
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxNativeZoom={19}
        />

        <MapClickHandler onMapClick={handleMapClick} />

        <HeatmapLayer points={heatmapPoints} zoom={zoom} />

        {!useClustering &&
          filteredMoods.slice(0, CLUSTER_THRESHOLD).map((mood) => (
            <MoodMarker key={mood.id} mood={mood} />
          ))}
      </LeafletMap>
    </div>
  )
}
