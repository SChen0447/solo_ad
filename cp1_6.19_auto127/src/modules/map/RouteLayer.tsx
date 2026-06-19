import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import type { Landmark } from '../data/DataManager'

interface Props {
  landmarks: Landmark[]
  filteredIds: string[]
}

function generateCurvePoints(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  segments: number = 30
): [number, number][] {
  const points: [number, number][] = []
  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2
  const dx = lng2 - lng1
  const dy = lat2 - lat1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offset = dist * 0.15

  const perpX = -dy / (dist || 1)
  const perpY = dx / (dist || 1)

  const ctrlLat = midLat + perpY * offset
  const ctrlLng = midLng + perpX * offset

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2
    points.push([lat, lng])
  }

  return points
}

function RouteLayer({ landmarks, filteredIds }: Props) {
  const filteredSet = useMemo(() => new Set(filteredIds), [filteredIds])

  const routeSegments = useMemo(() => {
    const segments: Array<{
      id: string
      positions: [number, number][]
      isFiltered: boolean
    }> = []

    for (let i = 1; i < landmarks.length; i++) {
      const prev = landmarks[i - 1]
      const curr = landmarks[i]
      const isFiltered = filteredSet.has(prev.id) && filteredSet.has(curr.id)
      const positions = generateCurvePoints(prev.lat, prev.lng, curr.lat, curr.lng)
      segments.push({
        id: `${prev.id}-${curr.id}`,
        positions,
        isFiltered,
      })
    }

    return segments
  }, [landmarks, filteredSet])

  return (
    <>
      {routeSegments.map((segment) => (
        <Polyline
          key={segment.id}
          positions={segment.positions}
          pathOptions={{
            color: segment.isFiltered ? '#E8894C' : '#B8A894',
            weight: segment.isFiltered ? 2.5 : 1.5,
            opacity: segment.isFiltered ? 0.9 : 0.25,
            dashArray: '6, 4',
            lineCap: 'round',
            lineJoin: 'round',
          }}
          interactive={false}
        />
      ))}
    </>
  )
}

export default RouteLayer
