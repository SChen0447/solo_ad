import { useEffect, useRef } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Landmark } from '../data/DataManager'

interface Props {
  landmarks: Landmark[]
  filteredIds: string[]
  onMarkerClick: (id: string) => void
}

function createMarkerIcon(isFiltered: boolean) {
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="marker-circle ${isFiltered ? 'marker-visible' : 'marker-hidden'}" data-visible="${isFiltered}">
        <div class="marker-inner"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

function AnimatedMarker({
  landmark,
  isFiltered,
  onClick,
}: {
  landmark: Landmark
  isFiltered: boolean
  onClick: () => void
}) {
  const markerRef = useRef<L.Marker>(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const el = marker.getElement()
    if (el) {
      el.classList.add('marker-animate-in')
      setTimeout(() => el.classList.remove('marker-animate-in'), 500)
    }
  }, [landmark.id])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const el = marker.getElement()
    if (el) {
      el.style.opacity = isFiltered ? '1' : '0.25'
      el.style.transition = 'opacity 0.3s ease'
      el.style.pointerEvents = 'auto'
    }
  }, [isFiltered])

  const icon = createMarkerIcon(isFiltered)

  return (
    <Marker
      ref={markerRef}
      position={[landmark.lat, landmark.lng]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          onClick()
        },
        mouseover: (e) => {
          const marker = e.target
          const el = marker.getElement()
          if (el) {
            const circle = el.querySelector('.marker-circle') as HTMLElement
            if (circle) {
              circle.style.transform = 'scale(1.35)'
              circle.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }
        },
        mouseout: (e) => {
          const marker = e.target
          const el = marker.getElement()
          if (el) {
            const circle = el.querySelector('.marker-circle') as HTMLElement
            if (circle) {
              circle.style.transform = 'scale(1)'
            }
          }
        },
      }}
    >
      <Popup closeButton={false} className="custom-popup">
        <div className="popup-content">
          <div className="popup-city">{landmark.cityName}</div>
          <div className="popup-date">{landmark.arrivalDate}</div>
          <div className="popup-days">停留 {landmark.stayDays} 天</div>
        </div>
      </Popup>
    </Marker>
  )
}

function MarkersLayer({ landmarks, filteredIds, onMarkerClick }: Props) {
  const filteredSet = new Set(filteredIds)

  return (
    <>
      {landmarks.map((landmark) => (
        <AnimatedMarker
          key={landmark.id}
          landmark={landmark}
          isFiltered={filteredSet.has(landmark.id)}
          onClick={() => onMarkerClick(landmark.id)}
        />
      ))}
    </>
  )
}

export default MarkersLayer
